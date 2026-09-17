import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(os.environ.get('SUPABASE_URL'), os.environ.get('SUPABASE_SERVICE_KEY'))

supabase.table('alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
supabase.table('suspect_vessels').delete().neq('spill_id', '00000000-0000-0000-0000-000000000000').execute()
supabase.table('drift_paths').delete().neq('spill_id', '00000000-0000-0000-0000-000000000000').execute()
supabase.table('oil_spills').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
supabase.table('vessel_positions').delete().neq('id', -1).execute()
supabase.table('vessels').delete().neq('mmsi', '0').execute()
print("All wiped!")
