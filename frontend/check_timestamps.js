import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://pghunrmvdtufzxajckvp.supabase.co', 'sb_publishable_-SZvbd-_7w-m49PoPzCtMg_o6XjN4r7');

async function test() {
  const { data: spills } = await supabase.from('oil_spills').select('detected_at').limit(1);
  const { data: vessels } = await supabase.from('vessel_positions').select('timestamp').limit(10);
  console.log('Spill detected_at:', spills[0]?.detected_at);
  console.log('Vessel timestamps:', vessels.map(v => v.timestamp).join(', '));
}
test();
