import aiosqlite
import os
from .config import DATABASE_PATH

async def get_db():
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db

async def init_db():
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    async with aiosqlite.connect(DATABASE_PATH) as db:
        # We don't actually need complex tables for the demo since we generate data in memory,
        # but here's a placeholder schema if needed later.
        await db.execute('''
            CREATE TABLE IF NOT EXISTS spills (
                id TEXT PRIMARY KEY,
                data TEXT
            )
        ''')
        await db.commit()
