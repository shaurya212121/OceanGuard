import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://pghunrmvdtufzxajckvp.supabase.co', 'sb_publishable_-SZvbd-_7w-m49PoPzCtMg_o6XjN4r7');

async function test() {
  const { data: vessels } = await supabase.from('vessel_positions').select('timestamp, mmsi').order('timestamp', { ascending: true });
  if(vessels.length > 0) {
     const v1 = vessels.filter(v => v.mmsi === vessels[0].mmsi);
     console.log('Vessel 1 min:', v1[0].timestamp);
     console.log('Vessel 1 max:', v1[v1.length-1].timestamp);
  }
}
test();
