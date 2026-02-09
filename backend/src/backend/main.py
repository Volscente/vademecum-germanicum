import os

from fastapi import FastAPI

app = FastAPI(title="Vademecum Germanicum API")


@app.get("/")
def read_root():
    return {"message": "Willkommen! The API is alive."}


@app.get("/db-check")
def check_env():
    # This proves our .env -> docker-compose -> backend flow works
    db_url = os.getenv("DATABASE_URL")
    return {"database_url_configured": bool(db_url), "status": "Ready to connect"}
