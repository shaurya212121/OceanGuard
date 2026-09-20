import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://pghunrmvdtufzxajckvp.supabase.co', 'sb_publishable_-SZvbd-_7w-m49PoPzCtMg_o6XjN4r7');

async function check() {
  const { data: spills } = await supabase.from('oil_spills').select('detected_at').limit(1);
  const baseTimeMs = new Date(spills[0].detected_at).getTime();

  const { data: vessels } = await supabase.from('vessels').select('mmsi, vessel_positions(timestamp)');
  
  for(let i=0; i<vessels.length; i++) {
    let v = vessels[i];
    if(!v.vessel_positions || v.vessel_positions.length === 0) continue;
    
    let offsets = v.vessel_positions.map(p => (new Date(p.timestamp).getTime() - baseTimeMs) / 3600000);
    let min = Math.min(...offsets);
    let max = Math.max(...offsets);
    if(i < 5 || min > 72 || max < -48) {
      console.log('Vessel ' + v.mmsi + ': ' + v.vessel_positions.length + ' points, Span: ' + min.toFixed(2) + 'h to ' + max.toFixed(2) + 'h, Dur: ' + (max-min).toFixed(2) + 'h');
    }
  }
}
check();
