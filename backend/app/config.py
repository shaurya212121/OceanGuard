import os

DATABASE_PATH = os.getenv('DATABASE_PATH', 'data/oceanguard.db')
CORS_ORIGINS = ['http://localhost:5173', 'http://localhost:3000']
