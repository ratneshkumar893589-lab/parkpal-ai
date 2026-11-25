
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Load backend/.env
load_dotenv(Path(__file__).resolve().parent / ".env")

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SECRET_KEY")

if not url or not key:
    raise RuntimeError("Supabase credentials are missing from backend/.env")

client = create_client(url, key)

response = (
    client.table("parking_locations")
    .select("id, name")
    .execute()
)

print("Supabase connection successful!")
print("Records retrieved:", len(response.data))

for item in response.data:
    print("-", item["name"])
