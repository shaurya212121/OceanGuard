import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://pghunrmvdtufzxajckvp.supabase.co', 'sb_publishable_-SZvbd-_7w-m49PoPzCtMg_o6XjN4r7');

async function check() {
  const { data: spills } = await supabase.from('oil_spills').select('detected_at').limit(1);
  const baseTimeMs = new Date(spills[0].detected_at).getTime();

  let hasNextPage = true;
  let offset = 0;
  let totalVessels = 0;
  let outOfRange = 0;
  let shortSpans = 0;
  
  while(hasNextPage) {
    const { data: vessels } = await supabase.from('vessels').select('mmsi, vessel_positions(timestamp)').range(offset, offset + 999);
    if(!vessels || vessels.length === 0) break;
    
    totalVessels += vessels.length;
    for(let v of vessels) {
      if(!v.vessel_positions || v.vessel_positions.length === 0) continue;
      
      let offsets = v.vessel_positions.map(p => (new Date(p.timestamp).getTime() - baseTimeMs) / 3600000);
      let min = Math.min(...offsets);
      let max = Math.max(...offsets);
      
      if(min > 72 || max < -48) {
        outOfRange++;
      } else if (max - min < 10) {
        shortSpans++;
        // console.log('Short span:', v.mmsi, min.toFixed(2), 'to', max.toFixed(2));
      }
    }
    offset += vessels.length;
    if(vessels.length < 1000) hasNextPage = false;
  }
  
  console.log('Total vessels checked:', totalVessels);
  console.log('Completely out of [-48, 72] range:', outOfRange);
  console.log('Short spans (< 10 hours):', shortSpans);
}
check();
