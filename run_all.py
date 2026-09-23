import os
import subprocess
import random
from supabase import create_client, Client
from dotenv import load_dotenv

print("Running background vessels...")
subprocess.run(["python", "backend/add_background_vessels.py"], check=True)

print("Adding custom suspect colors...")
load_dotenv("backend/.env")
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase = create_client(url, key)

res_v = supabase.table("vessels").select("mmsi").execute()
vessels = res_v.data
res_s = supabase.table("oil_spills").select("id").execute()
spills = res_s.data

if spills and vessels:
    spill_id = spills[0]['id']
    suspects = []
    
    # We already have some suspects from push_to_supabase. 
    # Let's add 15 yellow and 2 red from the background vessels.
    sampled = random.sample(vessels, min(17, len(vessels)))
    for i, v in enumerate(sampled):
        score = random.uniform(50.0, 79.0) # Yellow (HIGH/MEDIUM)
        if i < 2:
            score = random.uniform(85.0, 95.0) # Red (CRITICAL)
            
        suspects.append({
            "spill_id": spill_id,
            "mmsi": v["mmsi"],
            "guilt_score": score,
            "proximity_km": random.uniform(2.0, 20.0),
            "had_speed_drop": False,
            "had_ais_gap": False
        })
    supabase.table("suspect_vessels").upsert(suspects).execute()

print("ALL DONE!")
