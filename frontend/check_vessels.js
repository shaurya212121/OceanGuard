import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://pghunrmvdtufzxajckvp.supabase.co', 'sb_publishable_-SZvbd-_7w-m49PoPzCtMg_o6XjN4r7');

async function test() {
  const { data, error } = await supabase.from('vessels').select('*, vessel_positions(*)').limit(1);
  console.log(error ? error : 'Data length: ' + data.length);
  if (data && data.length > 0) {
    console.log('vessel_positions length:', data[0].vessel_positions ? data[0].vessel_positions.length : 'undefined');
  }
}
test();
