import re

with open("frontend/src/pages/LiveTacticalMap.tsx", "r", encoding="utf-8") as f:
    content = f.read()

old_use_memo = """  const allPoints = useMemo(() => {
    if (!vessel.positions || vessel.positions.length === 0) return [];
    // Convert absolute timestamp to relative hours_offset
    const pts = vessel.positions.map((p: any) => ({
      lat: p.lat,
      lon: p.lon,
      hours_offset: (new Date(p.timestamp).getTime() - baseTimeMs) / 3600000
    }));
    // Sort ascending
    pts.sort((a: any, b: any) => a.hours_offset - b.hours_offset);
    return pts;
  }, [vessel.positions, baseTimeMs]);"""

new_use_memo = """  const allPoints = useMemo(() => {
    if (!vessel.positions || vessel.positions.length === 0) return [];
    
    // Find the latest timestamp for this vessel to align it to T=0
    const latestTime = Math.max(...vessel.positions.map((p: any) => new Date(p.timestamp).getTime()));
    
    // Convert absolute timestamp to relative hours_offset, shifted so its last known position is at T=0
    const pts = vessel.positions.map((p: any) => ({
      lat: p.lat,
      lon: p.lon,
      hours_offset: (new Date(p.timestamp).getTime() - latestTime) / 3600000
    }));
    // Sort ascending
    pts.sort((a: any, b: any) => a.hours_offset - b.hours_offset);
    return pts;
  }, [vessel.positions]);"""

content = content.replace(old_use_memo, new_use_memo)

with open("frontend/src/pages/LiveTacticalMap.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Vessel alignment patch applied")
