from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
    # Create the SQLAlchemy model instance
    db_word = models.Word(**word.model_dump())

    db.add(db_word)
    db.commit()
    db.refresh(db_word)  # Refresh database to get the saved word back for returning it
    return db_word


@app.get("/words/", response_model=list[schemas.WordRead])
def read_words(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    words = db.query(models.Word).offset(skip).limit(limit).all()
    return words
