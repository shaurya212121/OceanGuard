import re

with open("frontend/src/pages/LiveTacticalMap.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix imports
content = content.replace(
    "import { useState, useEffect, useRef } from 'react';",
    "import { useState, useEffect, useRef, useMemo } from 'react';\nimport { Play, Pause } from 'lucide-react';"
)
content = content.replace(
    "import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, ZoomControl } from 'react-leaflet';",
    "import { MapContainer, TileLayer, Polygon, CircleMarker, Polyline, Tooltip, ZoomControl } from 'react-leaflet';"
)

# Add states
state_anchor = "const [loading, setLoading] = useState(true);\n  const mapRef = useRef<L.Map | null>(null);"
new_states = """const [loading, setLoading] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

  const [currentHour, setCurrentHour] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);

  // Global time bounds across all spills
  const { minHour, maxHour } = useMemo(() => {
    let min = -48;
    let max = 72;
    if (spills.length > 0) {
      let found = false;
      min = Infinity;
      max = -Infinity;
      spills.forEach(spill => {
        const driftData = spill.driftPaths?.[0];
        if (driftData) {
          const bp = driftData.backward_path || [];
          const fp = driftData.forward_path || [];
          if (bp.length > 0) { min = Math.min(min, bp[0].hours_offset); found = true; }
          if (fp.length > 0) { max = Math.max(max, fp[fp.length - 1].hours_offset); found = true; }
        }
      });
      if (!found) { min = -48; max = 72; }
    }
    return { minHour: min, maxHour: max };
  }, [spills]);

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
  }, [isPlaying, playSpeed, maxHour]);"""
content = content.replace(state_anchor, new_states)

with open("frontend/src/pages/LiveTacticalMap.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Phase 1 LiveTacticalMap replacement complete.")
