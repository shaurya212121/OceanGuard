import os
import random
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_KEY')

supabase: Client = create_client(url, key)

res = supabase.table('vessels').select('mmsi').execute()
vessels = res.data

suspect_res = supabase.table('suspect_vessels').select('mmsi').execute()
suspect_mmsis = {s['mmsi'] for s in suspect_res.data}

vessels = [v for v in vessels if v['mmsi'] not in suspect_mmsis]

if len(vessels) > 100:
    to_delete = random.sample(vessels, len(vessels) - 75)
    print(f"Deleting {len(to_delete)} background vessels...")
    for v in to_delete:
        supabase.table('vessel_positions').delete().eq('mmsi', v['mmsi']).execute()
        supabase.table('vessels').delete().eq('mmsi', v['mmsi']).execute()
    print("Done!")
