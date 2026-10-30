import asyncio
import os
from tortoise import Tortoise
from dotenv import load_dotenv

load_dotenv()

async def alter_db():
    db_url = os.getenv(
        "DATABASE_URL",
        "postgres://postgres:sana@localhost:5432/solar_forecast"
    )
    await Tortoise.init(db_url=db_url, modules={"models": ["models"]})

    # Get connection and execute
    conn = Tortoise.get_connection("default")
    await conn.execute_query("DROP TABLE IF EXISTS forecast CASCADE;")

    # Recreate schemas
    await Tortoise.generate_schemas()

    await Tortoise.close_connections()

if __name__ == "__main__":
    asyncio.run(alter_db())
