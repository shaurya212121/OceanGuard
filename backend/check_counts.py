import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(os.environ.get('SUPABASE_URL'), os.environ.get('SUPABASE_SERVICE_KEY'))

tables = ['oil_spills', 'drift_paths', 'suspect_vessels', 'vessels', 'vessel_positions']
print("Table Row Counts:")
print("-" * 30)
for t in tables:
    res = supabase.table(t).select('*').execute()
    print(f"{t:<20} | {len(res.data)}")
