import re

with open("frontend/src/pages/LiveTacticalMap.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add AnimatedVessel component
animated_vessel = """
function AnimatedVessel({ vessel, currentHour, baseTimeMs }: { vessel: Vessel, currentHour: number, baseTimeMs: number }) {
  const color = riskColor(vessel.risk);
  
  const allPoints = useMemo(() => {
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
  }, [vessel.positions, baseTimeMs]);

  const currentPos = useMemo(() => {
    if (allPoints.length === 0) return [vessel.lat, vessel.lng] as [number, number];
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
  }, [allPoints, currentHour, vessel]);

  return (
    <CircleMarker
      center={currentPos}
      radius={4}
      pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 1.5 }}
    >
      <Tooltip sticky>
        <div className="font-sans text-xs">
          <div className="font-bold mb-1" style={{ color }}>{vessel.name}</div>
          <div className="text-ocean-text-dim text-[10px]">Type: {vessel.type}</div>
          <div className="text-ocean-text-dim text-[10px]">Flag: {vessel.flag}</div>
          <div className="text-ocean-text-dim text-[10px] mt-1">SOG: {vessel.sog}kts | COG: {vessel.cog}°</div>
        </div>
      </Tooltip>
    </CircleMarker>
  );
}
"""

content = content.replace("export default function LiveTacticalMap() {", animated_vessel + "\nexport default function LiveTacticalMap() {")

# Find baseTimeMs
state_anchor = "const [playSpeed, setPlaySpeed] = useState(1);\n"
new_state = """const [playSpeed, setPlaySpeed] = useState(1);
  const baseTimeMs = spills.length > 0 ? new Date(spills[0].detected_at).getTime() : Date.now();
"""
content = content.replace(state_anchor, new_state)

# Replace the static vessel rendering loop
old_vessel_render = """          {/* Vessels */}
          {showVessels && filteredVessels.map((v) => (
            <CircleMarker
              key={v.id}
              center={[v.lat, v.lng]}
              radius={4}
              pathOptions={{
                color: riskColor(v.risk),
                fillColor: riskColor(v.risk),
                fillOpacity: 0.8,
                weight: 1.5,
              }}
            >
              <Tooltip sticky>
                <div className="font-sans text-xs">
                  <div className="font-bold mb-1" style={{ color: riskColor(v.risk) }}>{v.name}</div>
                  <div className="text-ocean-text-dim text-[10px]">Type: {v.type}</div>
                  <div className="text-ocean-text-dim text-[10px]">Flag: {v.flag}</div>
                  <div className="text-ocean-text-dim text-[10px] mt-1">SOG: {v.sog}kts | COG: {v.cog}°</div>
                </div>
              </Tooltip>
            </CircleMarker>
          ))}"""

new_vessel_render = """          {/* Vessels */}
          {showVessels && filteredVessels.map((v) => (
            <AnimatedVessel key={v.id} vessel={v} currentHour={currentHour} baseTimeMs={baseTimeMs} />
          ))}"""

content = content.replace(old_vessel_render, new_vessel_render)

# Now, we also need to adjust `minHour` and `maxHour` calculation to include vessels, otherwise vessels might be outside the scrubber's boundaries if they have different hours.
# In the Python backend, vessels are generated exactly for T-48h to T=0. So the spills' -48h to +72h already covers the vessel times perfectly! No need to adjust global bounds.

with open("frontend/src/pages/LiveTacticalMap.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("LiveTacticalMap updated for animated vessels!")
