from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from . import models, schemas
from .database import engine, get_db
from .enrichment import WordEnrichment, enrich_word

# Create the database tables on startup (no replace if they exist)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Vademecum Germanicum API")

# Add Middleware to allow communication between Frontend and Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _load_word_with_senses(db: Session, word_id: int) -> models.Word | None:
    """Fetch a single Word with its full sense graph eager-loaded."""
    return (
        db.query(models.Word)
        .options(
            selectinload(models.Word.senses).selectinload(models.Sense.grammar_patterns),
            selectinload(models.Word.senses).selectinload(models.Sense.example_sentences),
        )
        .filter(models.Word.id == word_id)
        .first()
    )


def _build_sense_orm(sense_data: schemas.SenseCreate) -> models.Sense:
    """Construct a Sense ORM instance with its grammar patterns and example sentences."""
    db_sense = models.Sense(
        meaning_summary=sense_data.meaning_summary,
        register=sense_data.register,
    )
    for gp in sense_data.grammar_patterns:
        db_sense.grammar_patterns.append(
            models.GrammarPattern(preposition=gp.preposition, case=gp.case)
        )
    for es in sense_data.example_sentences:
        db_sense.example_sentences.append(
            models.ExampleSentence(german=es.german, english=es.english)
        )
    return db_sense


@app.get("/")
def read_root():
    return {"message": "Willkommen! The API is alive and connected to DB."}


@app.post("/words/enrich", response_model=WordEnrichment)
async def enrich_word_endpoint(
    request: schemas.WordEnrichRequest,
) -> WordEnrichment:
    """Enrich a German word via LLM and return structured metadata.

    Accepts a word string, delegates to the enrichment module,
    and returns validated field values for frontend form pre-fill.

    Args:
        request: Request body containing the word to enrich.

    Returns:
        WordEnrichment with populated metadata fields.

    Raises:
        HTTPException (422): If enrichment fails due to LLM or validation errors.
    """
    return await enrich_word(request.word)


@app.post("/words/", response_model=schemas.WordRead)
def create_word(word: schemas.WordCreate, db: Session = Depends(get_db)) -> models.Word:
    """Persist a new word with its full sense graph in a single transaction.

    Builds a `Word` ORM instance from the validated `WordCreate` body, then
    constructs nested `Sense`, `GrammarPattern`, and `ExampleSentence` instances
    and appends them to `word.senses`. The cascade relationship handles child
    inserts automatically when `db.add(db_word)` is called.

    Args:
        word: Validated request body; Pydantic enforces `min_length=1` on
              `senses`, `grammar_patterns`, and `example_sentences`.
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        The persisted `Word` ORM instance, serialized as `WordRead` by FastAPI.

    Raises:
        HTTPException (422): Raised automatically by FastAPI/Pydantic if
                             validation constraints are violated (e.g., empty senses list).
    """
    db_word = models.Word(**word.model_dump(exclude={"senses"}))
    for sense_data in word.senses:
        db_word.senses.append(_build_sense_orm(sense_data))

    db.add(db_word)
    db.commit()
    return _load_word_with_senses(db, db_word.id)


@app.get("/words/", response_model=list[schemas.WordRead])
def read_words(
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    db: Session = Depends(get_db),
) -> list[models.Word]:
    """List words with their full sense graph, avoiding N+1 queries.

    Uses `selectinload` to eager-load `senses → grammar_patterns` and
    `senses → example_sentences` in two additional SELECT statements rather
    than one query per word row. The search filter applies case-insensitive
    ILIKE on `word` and `translation`.

    Args:
        skip: Number of rows to offset.
        limit: Maximum number of rows to return.
        search: If provided, filters by case-insensitive match on `word` or `translation`.
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        List of `Word` ORM instances with sense children pre-loaded.
    """
    query = db.query(models.Word).options(
        selectinload(models.Word.senses).selectinload(models.Sense.grammar_patterns),
        selectinload(models.Word.senses).selectinload(models.Sense.example_sentences),
    )

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                models.Word.word.ilike(search_filter),
                models.Word.translation.ilike(search_filter),
            )
        )

    return query.offset(skip).limit(limit).all()


@app.put("/words/{word_id}", response_model=schemas.WordRead)
def update_word(
    word_id: int, word_update: schemas.WordUpdate, db: Session = Depends(get_db)
) -> models.Word:
    """Partially update a word's scalar fields and optionally replace its sense list.

    Scalar fields are patched using `exclude_unset`. If `senses` is present in
    the request body, the existing `Sense` children are deleted via cascade and
    replaced with the new list in the same transaction. If `senses` is absent,
    existing senses are untouched.

    Args:
        word_id: Primary key of the word to update.
        word_update: Partial update payload; all fields are optional.
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        The updated `Word` ORM instance, serialized as `WordRead`.

    Raises:
        HTTPException (404): If no word with `word_id` exists in the database.
        HTTPException (400): If `word`, when provided, is an empty or whitespace-only string.
    """
    db_word = db.query(models.Word).filter(models.Word.id == word_id).first()

    if not db_word:
        raise HTTPException(
            status_code=404, detail=f"🚨 Word with ID {word_id} not found!"
        )

    update_data = word_update.model_dump(exclude_unset=True)
    senses_present = "senses" in update_data
    update_data.pop("senses", None)

    if "word" in update_data and (
        update_data["word"] is None or update_data["word"].strip() == ""
    ):
        raise HTTPException(
            status_code=400, detail="🚨 The 'word' field cannot be null or empty."
        )

    if "translation" in update_data and (
        update_data["translation"] is None or update_data["translation"].strip() == ""
    ):
        raise HTTPException(
            status_code=400,
            detail="🚨 The 'translation' field cannot be null or empty.",
        )

    for key, value in update_data.items():
        setattr(db_word, key, value)

    if senses_present:
        db_word.senses.clear()
        for sense_data in word_update.senses:
            db_word.senses.append(_build_sense_orm(sense_data))

    db.commit()
    return _load_word_with_senses(db, word_id)


@app.delete("/words/{word_id}", status_code=204)
def delete_word(word_id: int, db: Session = Depends(get_db)):
    """
    Remove a word from the database by its ID.
    """

    # Retrieve word from db to be deleted
    db_word = db.query(models.Word).filter(models.Word.id == word_id).first()

    # Check if word is in the db
    if not db_word:
        raise HTTPException(
            status_code=404, detail=f"🚨 Word with ID {word_id} not found!"
        )

    # Delete word and commit
    db.delete(db_word)
    db.commit()

    # Returning None with status 204 is standard for a successful DELETE
    return None
