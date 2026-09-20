import re

with open("frontend/src/pages/InvestigationsDesk.tsx", "r", encoding="utf-8") as f:
    content = f.read()

import_line = "import { useState, useEffect, useRef } from 'react';"
new_imports = "import { useState, useEffect, useRef, useMemo } from 'react';\nimport { Play, Pause } from 'lucide-react';"
content = content.replace(import_line, new_imports)

states_anchor = "const [selectedSpill, setSelectedSpill] = useState<SpillWithSuspects | null>(null);"
new_states = states_anchor + """
  const [currentHour, setCurrentHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
"""
content = content.replace(states_anchor, new_states)

drift_anchor = "const backwardDrift: [number, number][] = ["
new_drift_logic = """
  const driftData = selectedSpill?.driftPaths?.[0];
  const backwardPath = driftData?.backward_path || [];
  const forwardPath = driftData?.forward_path || [];
  
  const allPoints = useMemo(() => {
    const pts = [...backwardPath, ...forwardPath];
    pts.sort((a, b) => a.hours_offset - b.hours_offset);
    return pts;
  }, [backwardPath, forwardPath]);

  const minHour = allPoints.length ? allPoints[0].hours_offset : -48;
  const maxHour = allPoints.length ? allPoints[allPoints.length - 1].hours_offset : 72;

  useEffect(() => {
    if (isPlaying && currentHour >= maxHour) setIsPlaying(false);
  }, [currentHour, maxHour, isPlaying]);

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentHour(prev => Math.min(prev + (0.5 * playSpeed), maxHour));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playSpeed, maxHour]);

  const activeTrail = useMemo(() => {
    return allPoints.filter(p => p.hours_offset <= currentHour).map(p => [p.lat, p.lon] as [number, number]);
  }, [allPoints, currentHour]);

  const currentPos = useMemo(() => {
    if (allPoints.length === 0) return [selectedSpill?.lat || 0, selectedSpill?.lng || 0] as [number, number];
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
  }, [allPoints, currentHour, minHour, maxHour, selectedSpill]);

  const backwardDrift: [number, number][] = ["""
content = content.replace(drift_anchor, new_drift_logic)

with open("frontend/src/pages/InvestigationsDesk.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Phase 1 replacement complete.")
