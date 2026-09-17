import os
from supabase import create_client
from dotenv import load_dotenv
load_dotenv('backend/.env')
supabase = create_client(os.environ.get('SUPABASE_URL'), os.environ.get('SUPABASE_SERVICE_KEY'))
for t in ['oil_spills', 'drift_paths', 'suspect_vessels', 'vessels', 'vessel_positions', 'alerts']:
    res = supabase.table(t).select('*', count='exact').limit(1).execute()
    print(f'{t}: {res.count}')
