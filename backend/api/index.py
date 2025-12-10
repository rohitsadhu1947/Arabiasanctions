"""Vercel Serverless Function Entry Point"""
import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

# Initialize database on cold start
from app.database import init_db, SessionLocal, init_demo_data

try:
    init_db()
    db = SessionLocal()
    init_demo_data(db)
    db.close()
except Exception as e:
    print(f"Database initialization error: {e}")

# Export the FastAPI app for Vercel
app = app

