from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_
from sqlalchemy.orm import Session

from . import models, schemas
from .database import engine, get_db

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


@app.get("/")
def read_root():
    return {"message": "Willkommen! The API is alive and connected to DB."}


@app.post("/words/", response_model=schemas.WordRead)
def create_word(word: schemas.WordCreate, db: Session = Depends(get_db)):
    """
    Create a word in the database and return it.
    """
    # Create the SQLAlchemy model instance
    db_word = models.Word(**word.model_dump())

    db.add(db_word)
    db.commit()
    db.refresh(db_word)  # Refresh database to get the saved word back for returning it
    return db_word


@app.get("/words/", response_model=list[schemas.WordRead])
def read_words(
    skip: int = 0,
    limit: int = 100,
    search: str | None = None,  # 2. Add optional search parameter
    db: Session = Depends(get_db),
):
    """
    Get matching words from the database with optional search filtering.
    """
    query = db.query(models.Word)

    # Apply case-insensitive filter if search string is provided
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                models.Word.word.ilike(search_filter),
                models.Word.translation.ilike(search_filter),
            )
        )

    words = query.offset(skip).limit(limit).all()
    return words


@app.put("/words/{word_id}", response_model=schemas.WordRead)
def update_word(
    word_id: int, word_update: schemas.WordUpdate, db: Session = Depends(get_db)
):
    """
    Update an existing word in the database.
    """
    # Retrieve word from db to be updated
    db_word = db.query(models.Word).filter(models.Word.id == word_id).first()

    if not db_word:
        raise HTTPException(
            status_code=404, detail=f"🚨 Word with ID {word_id} not found!"
        )

    # Instance the ORM object from the Pydantic, excluding the unset fields
    update_data = word_update.model_dump(exclude_unset=True)

    # Check for required fields
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

    # Update the fields in the word retrieved from db
    for key, value in update_data.items():
        setattr(db_word, key, value)

    db.commit()
    db.refresh(db_word)
    return db_word


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
