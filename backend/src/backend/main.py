import os
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload

from . import auth, models, schemas
from .database import engine, get_db
from .enrichment import WordEnrichment, enrich_word

# Create the database tables on startup (no replace if they exist)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Vademecum Germanicum API")

# Add Middleware to allow communication between Frontend and Backend
cors_allowed_origins = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
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
    """Construct a Sense ORM instance with its grammar patterns and example sentences.

    difficulty_level/last_reviewed_at are only set when provided (e.g. by a data
    import restoring prior review state) — leaving them unset lets the column
    default (difficulty_level=Medium, last_reviewed_at=NULL) apply as before.
    """
    sense_kwargs = {
        "meaning_summary": sense_data.meaning_summary,
        "register": sense_data.register,
    }
    if sense_data.difficulty_level is not None:
        sense_kwargs["difficulty_level"] = sense_data.difficulty_level
    if sense_data.last_reviewed_at is not None:
        sense_kwargs["last_reviewed_at"] = sense_data.last_reviewed_at
    db_sense = models.Sense(**sense_kwargs)
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


@app.post("/auth/register", response_model=schemas.Token)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)) -> schemas.Token:
    """Create a new account, restricted to the ALLOWED_USERNAMES allow-list.

    Args:
        user: Validated request body (username, plaintext password).
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        A bearer token for the new account, so the caller is immediately logged in.

    Raises:
        HTTPException (403): If the username is not on the allow-list.
        HTTPException (409): If the username already exists
                             (constraint: users_username_key UNIQUE (username)).
    """
    if user.username not in auth.get_allowed_usernames():
        raise HTTPException(status_code=403, detail="This app is invite-only.")

    db_user = models.User(
        username=user.username, hashed_password=auth.hash_password(user.password)
    )
    try:
        db.add(db_user)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="A user with this username already exists."
        )

    access_token = auth.create_access_token({"sub": db_user.username})
    return schemas.Token(access_token=access_token)


@app.post("/auth/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
) -> schemas.Token:
    """Verify credentials and issue a bearer token.

    Uses OAuth2PasswordRequestForm (form-encoded, not JSON) so the built-in
    Swagger /docs "Authorize" button works with zero extra code.

    Args:
        form_data: Form-encoded username/password.
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        A bearer token for the authenticated account.

    Raises:
        HTTPException (401): If the username is unknown or the password is wrong.
    """
    db_user = (
        db.query(models.User).filter(models.User.username == form_data.username).first()
    )
    if not db_user or not auth.verify_password(form_data.password, db_user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth.create_access_token({"sub": db_user.username})
    return schemas.Token(access_token=access_token)


@app.get("/senses/", response_model=list[schemas.SenseWithWordRead])
def read_senses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> list[schemas.SenseWithWordRead]:
    """Return all senses with their parent word's key fields embedded.

    Joins Sense with Word to include word, translation, gender, and category
    in each response item, avoiding frontend joins. Uses selectinload for
    grammar_patterns and example_sentences to prevent N+1 queries.

    Args:
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        List of Sense ORM instances with Word fields accessible, serialized
        as list[SenseWithWordRead] by FastAPI.
    """
    senses = (
        db.query(models.Sense)
        .join(models.Word, models.Sense.word_id == models.Word.id)
        .filter(models.Word.user_id == current_user.id)
        .options(
            selectinload(models.Sense.word),
            selectinload(models.Sense.grammar_patterns),
            selectinload(models.Sense.example_sentences),
        )
        .all()
    )
    return [
        schemas.SenseWithWordRead(
            id=sense.id,
            meaning_summary=sense.meaning_summary,
            register=sense.register,
            difficulty_level=sense.difficulty_level,
            last_reviewed_at=sense.last_reviewed_at,
            grammar_patterns=sense.grammar_patterns,
            example_sentences=sense.example_sentences,
            word=sense.word.word,
            translation=sense.word.translation,
            gender=sense.word.gender,
            category=sense.word.category,
            word_plural=sense.word.word_plural,
            auxiliary_verb=sense.word.auxiliary_verb,
            principal_forms=sense.word.principal_forms,
        )
        for sense in senses
    ]


@app.put("/senses/{sense_id}/review", response_model=schemas.SenseRead)
def update_sense_review(
    sense_id: int,
    review_update: schemas.SenseReviewUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> models.Sense:
    """Validate difficulty level, stamp last_reviewed_at, and persist the update.

    Validates that the incoming difficulty_level string is a member of
    DifficultyLevelEnum. Sets last_reviewed_at to datetime.now(timezone.utc) on the
    server side, keeping timestamp authority in the backend.
    Use `from datetime import datetime, timezone` — datetime.utcnow() is deprecated.

    Args:
        sense_id: Primary key of the sense to update.
        review_update: Request body carrying the chosen difficulty_level string.
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        The updated Sense ORM instance, serialized as SenseRead.

    Raises:
        HTTPException (404): If no sense with sense_id exists in the database.
        HTTPException (422): If difficulty_level is not a valid DifficultyLevelEnum value.
    """
    db_sense = (
        db.query(models.Sense)
        .join(models.Word, models.Sense.word_id == models.Word.id)
        .options(
            selectinload(models.Sense.grammar_patterns),
            selectinload(models.Sense.example_sentences),
        )
        .filter(models.Sense.id == sense_id, models.Word.user_id == current_user.id)
        .first()
    )

    if not db_sense:
        raise HTTPException(
            status_code=404, detail=f"🚨 Sense with ID {sense_id} not found!"
        )

    db_sense.difficulty_level = review_update.difficulty_level
    db_sense.last_reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(db_sense)
    return db_sense


@app.post("/words/enrich", response_model=WordEnrichment)
async def enrich_word_endpoint(
    request: schemas.WordEnrichRequest,
    current_user: models.User = Depends(auth.get_current_user),
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
def create_word(
    word: schemas.WordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> models.Word:
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
        HTTPException (409): If the word value already exists for this user
                             (constraint: words_user_id_word_key UNIQUE (user_id, word)).
        HTTPException (422): Raised automatically by FastAPI/Pydantic if
                             validation constraints are violated (e.g., empty senses list).
    """
    db_word = models.Word(
        **word.model_dump(exclude={"senses"}), user_id=current_user.id
    )
    for sense_data in word.senses:
        db_word.senses.append(_build_sense_orm(sense_data))

    try:
        db.add(db_word)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="A word with this spelling already exists."
        )
    return _load_word_with_senses(db, db_word.id)


@app.get("/words/", response_model=list[schemas.WordRead])
def read_words(
    response: Response,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> list[models.Word]:
    """List words with their full sense graph, avoiding N+1 queries.

    Uses `selectinload` to eager-load `senses → grammar_patterns` and
    `senses → example_sentences` in two additional SELECT statements rather
    than one query per word row. The search filter applies case-insensitive
    ILIKE on `word` and `translation`.

    Args:
        response: FastAPI response object, used to attach the X-Total-Count header.
        skip: Number of rows to offset.
        limit: Maximum number of rows to return.
        search: If provided, filters by case-insensitive match on `word` or `translation`.
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        List of `Word` ORM instances with sense children pre-loaded.
    """
    query = (
        db.query(models.Word)
        .filter(models.Word.user_id == current_user.id)
        .options(
            selectinload(models.Word.senses).selectinload(models.Sense.grammar_patterns),
            selectinload(models.Word.senses).selectinload(models.Sense.example_sentences),
        )
    )

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                models.Word.word.ilike(search_filter),
                models.Word.translation.ilike(search_filter),
            )
        )

    response.headers["X-Total-Count"] = str(query.count())
    return query.offset(skip).limit(limit).all()


@app.put("/words/{word_id}", response_model=schemas.WordRead)
def update_word(
    word_id: int,
    word_update: schemas.WordUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
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
    db_word = (
        db.query(models.Word)
        .filter(models.Word.id == word_id, models.Word.user_id == current_user.id)
        .first()
    )

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
def delete_word(
    word_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Remove a word from the database by its ID.
    """

    # Retrieve word from db to be deleted
    db_word = (
        db.query(models.Word)
        .filter(models.Word.id == word_id, models.Word.user_id == current_user.id)
        .first()
    )

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


@app.post("/resources/", response_model=schemas.ResourceRead)
def create_resource(
    resource: schemas.ResourceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> models.Resource:
    """Persist a new external learning resource.

    Args:
        resource: Validated request body.
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        The persisted `Resource` ORM instance, serialized as `ResourceRead`.

    Raises:
        HTTPException (409): If a resource with the same URL already exists for
                             this user (constraint: resources_user_id_url_key
                             UNIQUE (user_id, url)).
    """
    db_resource = models.Resource(**resource.model_dump(), user_id=current_user.id)
    try:
        db.add(db_resource)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="A resource with this URL already exists."
        )
    db.refresh(db_resource)
    return db_resource


@app.get("/resources/", response_model=list[schemas.ResourceRead])
def read_resources(
    response: Response,
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> list[models.Resource]:
    """List resources, optionally filtered by a case-insensitive match on name or description.

    Args:
        response: FastAPI response object, used to attach the X-Total-Count header.
        skip: Number of rows to offset.
        limit: Maximum number of rows to return.
        search: If provided, filters by case-insensitive match on `name` or `description`.
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        List of `Resource` ORM instances.
    """
    query = db.query(models.Resource).filter(models.Resource.user_id == current_user.id)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                models.Resource.name.ilike(search_filter),
                models.Resource.description.ilike(search_filter),
            )
        )

    response.headers["X-Total-Count"] = str(query.count())

    return query.offset(skip).limit(limit).all()


@app.put("/resources/{resource_id}", response_model=schemas.ResourceRead)
def update_resource(
    resource_id: int,
    resource_update: schemas.ResourceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> models.Resource:
    """Partially update a resource's fields.

    Args:
        resource_id: Primary key of the resource to update.
        resource_update: Partial update payload; all fields are optional.
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        The updated `Resource` ORM instance, serialized as `ResourceRead`.

    Raises:
        HTTPException (404): If no resource with `resource_id` exists in the database.
        HTTPException (409): If the updated URL collides with another resource's URL.
    """
    db_resource = (
        db.query(models.Resource)
        .filter(
            models.Resource.id == resource_id,
            models.Resource.user_id == current_user.id,
        )
        .first()
    )

    if not db_resource:
        raise HTTPException(
            status_code=404, detail=f"🚨 Resource with ID {resource_id} not found!"
        )

    update_data = resource_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_resource, key, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="A resource with this URL already exists."
        )
    db.refresh(db_resource)
    return db_resource


@app.delete("/resources/{resource_id}", status_code=204)
def delete_resource(
    resource_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Remove a resource from the database by its ID.
    """
    db_resource = (
        db.query(models.Resource)
        .filter(
            models.Resource.id == resource_id,
            models.Resource.user_id == current_user.id,
        )
        .first()
    )

    if not db_resource:
        raise HTTPException(
            status_code=404, detail=f"🚨 Resource with ID {resource_id} not found!"
        )

    db.delete(db_resource)
    db.commit()

    return None


@app.post("/topics/", response_model=schemas.TopicRead)
def create_topic(
    topic: schemas.TopicCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> models.Topic:
    """Persist a new topic.

    Args:
        topic: Validated request body.
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        The persisted `Topic` ORM instance, serialized as `TopicRead`.

    Raises:
        HTTPException (409): If a topic with the same label already exists for
                             this user (constraint: topics_user_id_label_key
                             UNIQUE (user_id, label)).
    """
    db_topic = models.Topic(**topic.model_dump(), user_id=current_user.id)
    try:
        db.add(db_topic)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="A topic with this label already exists."
        )
    db.refresh(db_topic)
    return db_topic


@app.get("/topics/", response_model=list[schemas.TopicRead])
def read_topics(
    response: Response,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> list[models.Topic]:
    """List topics.

    Args:
        response: FastAPI response object, used to attach the X-Total-Count header.
        skip: Number of rows to offset.
        limit: Maximum number of rows to return.
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        List of `Topic` ORM instances.
    """
    query = db.query(models.Topic).filter(models.Topic.user_id == current_user.id)
    response.headers["X-Total-Count"] = str(query.count())
    return query.offset(skip).limit(limit).all()


@app.put("/topics/{topic_id}", response_model=schemas.TopicRead)
def update_topic(
    topic_id: int,
    topic_update: schemas.TopicUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
) -> models.Topic:
    """Partially update a topic's fields.

    Args:
        topic_id: Primary key of the topic to update.
        topic_update: Partial update payload; all fields are optional.
        db: SQLAlchemy session injected by FastAPI.

    Returns:
        The updated `Topic` ORM instance, serialized as `TopicRead`.

    Raises:
        HTTPException (404): If no topic with `topic_id` exists in the database.
        HTTPException (409): If the updated label collides with another topic's label.
    """
    db_topic = (
        db.query(models.Topic)
        .filter(models.Topic.id == topic_id, models.Topic.user_id == current_user.id)
        .first()
    )

    if not db_topic:
        raise HTTPException(
            status_code=404, detail=f"🚨 Topic with ID {topic_id} not found!"
        )

    update_data = topic_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_topic, key, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="A topic with this label already exists."
        )
    db.refresh(db_topic)
    return db_topic


@app.delete("/topics/{topic_id}", status_code=204)
def delete_topic(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Remove a topic from the database by its ID.
    """
    db_topic = (
        db.query(models.Topic)
        .filter(models.Topic.id == topic_id, models.Topic.user_id == current_user.id)
        .first()
    )

    if not db_topic:
        raise HTTPException(
            status_code=404, detail=f"🚨 Topic with ID {topic_id} not found!"
        )

    db.delete(db_topic)
    db.commit()

    return None
