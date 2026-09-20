import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.from('oil_spills').select('*, drift_paths(*)').limit(1);
  if (error) {
    console.error('Error with join:', error.message);
  } else {
    console.log('Join successful! Has drift_paths:', !!data[0].drift_paths);
  }
}
test();
