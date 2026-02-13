from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

from . import models, schemas
from .database import engine, get_db

# Create the database tables on startup
# In a real production app, we would use Alembic migrations,
# but for our MVP, this is perfect.
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Vademecum Germanicum API")


@app.get("/")
def read_root():
    return {"message": "Willkommen! The API is alive and connected to DB."}


@app.post("/words/", response_model=schemas.WordRead)
def create_word(word: schemas.WordCreate, db: Session = Depends(get_db)):
    # Create the SQLAlchemy model instance
    db_word = models.Word(**word.model_dump())

    db.add(db_word)
    db.commit()
    db.refresh(db_word)
    return db_word


@app.get("/words/", response_model=list[schemas.WordRead])
def read_words(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    words = db.query(models.Word).offset(skip).limit(limit).all()
    return words
