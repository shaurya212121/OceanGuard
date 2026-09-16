import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(os.environ.get('SUPABASE_URL'), os.environ.get('SUPABASE_SERVICE_KEY'))

spills = supabase.table('oil_spills').select('id, center_lat, center_lon').execute().data
drifts = supabase.table('drift_paths').select('spill_id, origin_lat, origin_lon').execute().data

drift_dict = {d['spill_id']: d for d in drifts}

print(f"{'Spill Center Lat/Lon':<25} | {'Origin Estimate Lat/Lon'}")
print("-" * 60)
for s in spills:
    spill_id = s['id']
    if spill_id in drift_dict:
        d = drift_dict[spill_id]
        print(f"{s['center_lat']:.4f}, {s['center_lon']:.4f}".ljust(25) + f" | {d['origin_lat']:.4f}, {d['origin_lon']:.4f}")
    else:
        print(f"{s['center_lat']:.4f}, {s['center_lon']:.4f}".ljust(25) + " | NO DRIFT PATH FOUND")
