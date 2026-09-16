import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(os.environ.get('SUPABASE_URL'), os.environ.get('SUPABASE_SERVICE_KEY'))

supabase.table('vessels').delete().neq('mmsi', '0').execute()
print("All wiped!")
