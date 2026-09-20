import re

with open("frontend/src/pages/LiveTacticalMap.tsx", "r", encoding="utf-8") as f:
    content = f.read()

animated_spill_code = """
function AnimatedSpill({ spill, currentHour }: { spill: OilSpill, currentHour: number }) {
  const color = spill.severity === 'CRITICAL' ? '#FF2A5F' : '#00F0FF';
  
  const driftData = spill.driftPaths?.[0];
  const backwardPath = driftData?.backward_path || [];
  const forwardPath = driftData?.forward_path || [];
  
  const allPoints = useMemo(() => {
    const pts = [...backwardPath, ...forwardPath];
    pts.sort((a, b) => a.hours_offset - b.hours_offset);
    return pts;
  }, [backwardPath, forwardPath]);

  const activeTrail = useMemo(() => {
    return allPoints.filter(p => p.hours_offset <= currentHour).map(p => [p.lat, p.lon] as [number, number]);
  }, [allPoints, currentHour]);

  const currentPos = useMemo(() => {
    if (allPoints.length === 0) return [spill.lat, spill.lng] as [number, number];
    const minHour = allPoints[0].hours_offset;
    const maxHour = allPoints[allPoints.length - 1].hours_offset;
    
    if (currentHour <= minHour) return [allPoints[0].lat, allPoints[0].lon] as [number, number];
    if (currentHour >= maxHour) return [allPoints[allPoints.length - 1].lat, allPoints[allPoints.length - 1].lon] as [number, number];
    for (let i = 0; i < allPoints.length - 1; i++) {
      if (allPoints[i].hours_offset <= currentHour && allPoints[i+1].hours_offset >= currentHour) {
        const p1 = allPoints[i];
        const p2 = allPoints[i+1];
        const ratio = (currentHour - p1.hours_offset) / (p2.hours_offset - p1.hours_offset || 1);
        return [
          p1.lat + (p2.lat - p1.lat) * ratio,
          p1.lon + (p2.lon - p1.lon) * ratio
        ] as [number, number];
      }
    }
    return [allPoints[0].lat, allPoints[0].lon] as [number, number];
  }, [allPoints, currentHour, spill]);

  return (
    <>
      <Polygon
        positions={spill.polygon}
        pathOptions={{ color, fillColor: color, fillOpacity: 0.1, weight: 1, dashArray: '4 4' }}
      />
      
      {activeTrail.length > 0 && (
        <Polyline
          positions={activeTrail}
          pathOptions={{ color, weight: 2, opacity: 0.6 }}
        />
      )}

      <CircleMarker
        center={currentPos}
        radius={5}
        pathOptions={{ color, fillColor: color, fillOpacity: 1, weight: 2 }}
      >
        <Tooltip sticky>
          <div className="font-mono text-[10px]">
            <div className="text-[#00f0ff] font-bold">{spill.spill_id}</div>
            <div className="text-slate-300">{spill.name}</div>
            <div className="text-slate-400">{spill.area_km2} sq km - {spill.severity}</div>
            <div className="text-slate-400">STATUS: {spill.status}</div>
          </div>
        </Tooltip>
      </CircleMarker>
    </>
  );
}
"""

content = content.replace("export default function LiveTacticalMap() {", animated_spill_code + "\nexport default function LiveTacticalMap() {")

old_render_regex = r'\{\s*showSpills\s*&&\s*spills\.map\(\(spill\)\s*=>\s*\{.*?</Polygon>\s*\);\s*\}\)\s*\}'
new_render = """          {showSpills && spills.map((spill) => (
            <AnimatedSpill key={spill.id} spill={spill} currentHour={currentHour} />
          ))}"""

content = re.sub(old_render_regex, new_render, content, flags=re.DOTALL)

with open("frontend/src/pages/LiveTacticalMap.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Phase 2 LiveTacticalMap replacement complete.")
