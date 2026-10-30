# test_db_connection.py
import asyncio
import os
import sys
from dotenv import load_dotenv
from tortoise import Tortoise

# Add the current directory to python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_connection():
    load_dotenv()
    db_url = os.getenv(
        "DATABASE_URL",
        "postgres://postgres:sana@localhost:5432/solar_forecast"
    )
    print(f"Testing database connection using URL: {db_url}")
    
    try:
        # Initialize Tortoise
        await Tortoise.init(db_url=db_url, modules={"models": ["models"]})
        print("Initialization successful!")
        
        # Verify connection by executing a dummy raw SQL query
        conn = Tortoise.get_connection("default")
        # For Postgres/SQLite, we can execute a simple SELECT 1
        res = await conn.execute_query("SELECT 1;")
        print(f"Connection test query 'SELECT 1;' succeeded. Result: {res}")
        
        # Check if tables exist
        # We can try to query the Forecast model
        from models import Forecast
        count = await Forecast.all().count()
        print(f"Successfully queried 'Forecast' model. Current count: {count}")
        
    except Exception as e:
        print(f"\n[ERROR] Failed to connect/query database: {type(e).__name__}: {e}")
        print("Details:")
        import traceback
        traceback.print_exc()
    finally:
        try:
            await Tortoise.close_connections()
            print("Connections closed.")
        except Exception:
            pass

if __name__ == "__main__":
    asyncio.run(test_connection())
