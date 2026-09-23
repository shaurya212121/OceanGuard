import os
import random
from datetime import datetime, timezone
from supabase import create_client, Client
from app.services.data_generator import generate_vessels
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Missing Supabase credentials in backend/.env!")
    exit(1)

supabase: Client = create_client(url, key)
base_time = datetime.now(timezone.utc)

print("Generating 250 background vessels...")
vessels = generate_vessels(base_time, count=150)

print("Pushing vessels to Supabase...")
for i, v in enumerate(vessels):
    supabase.table("vessels").upsert(v.model_dump(mode="json", exclude={"positions"})).execute()
    position_batch = []
    for p in v.positions:
        p_dict = p.model_dump(mode="json")
        p_dict["mmsi"] = v.mmsi
        position_batch.append(p_dict)
    if position_batch:
        supabase.table("vessel_positions").upsert(position_batch).execute()
        
    if i % 25 == 0:
        print(f"Pushed {i} vessels...")

print("Background vessels populated successfully!")
