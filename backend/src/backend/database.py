"""
Manage PostgreSQL connections.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# URL is passed from docker-compose.yml
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL is None:
    raise ValueError("🚨 DATABASE_URL is not defined")

# The engine is the "starting point" for any SQLAlchemy application
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Test connection
    pool_size=5,  # Connections
    max_overflow=10,  # Max connections
)

# Each instance of the SessionLocal class will be a database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Get a DB session for each API request
def get_db():
    db = SessionLocal()
    try:
        yield db  # Ensure to keep conncetion open until route does its work
    finally:
        db.close()
