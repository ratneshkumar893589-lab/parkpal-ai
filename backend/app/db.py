
"""Supabase database configuration for ParkPal AI."""

import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from backend/.env
BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
    raise RuntimeError(
        "SUPABASE_URL or SUPABASE_SECRET_KEY is missing from backend/.env"
    )

# Create Supabase connection
supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
)
