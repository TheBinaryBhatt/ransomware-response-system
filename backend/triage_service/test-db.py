import asyncio
from core.database import engine, Base


async def test_db():
    try:
        async with engine.begin() as conn:
            print("Database connected successfully!")
            await conn.run_sync(Base.metadata.create_all)
            print("Tables created!")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(test_db())
