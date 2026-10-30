# db.py
import os
from contextlib import asynccontextmanager
from tortoise import Tortoise
from dotenv import load_dotenv

load_dotenv()  # reads .env if present

@asynccontextmanager
async def lifespan(app):
    db_url = os.getenv(
        "DATABASE_URL",
        "postgres://postgres:sana@localhost:5432/solar_forecast"
    )
    await Tortoise.init(db_url=db_url, modules={"models": ["models"]})
    await Tortoise.generate_schemas()  # auto-create tables in dev
    try:
        yield
    finally:
        await Tortoise.close_connections()
