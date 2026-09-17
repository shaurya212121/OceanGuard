import math
from shapely.geometry import Point, Polygon, LineString
from typing import List, Dict, Any, Optional
from datetime import datetime
from ..models import DriftPath, Alert
import uuid

# Hardcoded sensitive zones with approximate bounding polygons
SENSITIVE_ZONES = [
    {
        "name": "Gulf of Mannar Marine National Park",
        "polygon": Polygon([
            (78.1, 8.7), (79.2, 9.3), (79.3, 9.1), (78.2, 8.5)
        ])
    },
    {
        "name": "Lakshadweep Marine Sanctuary",
        "polygon": Polygon([
            (71.5, 10.0), (73.5, 12.0), (74.0, 10.5), (72.0, 8.0)
        ])
    },
    {
        "name": "Sundarbans Reserve Forest",
        "polygon": Polygon([
            (88.0, 22.0), (89.5, 22.2), (89.5, 21.5), (88.0, 21.5)
        ])
    },
    {
        "name": "Malvan Marine Sanctuary",
        "polygon": Polygon([
            (73.4, 16.1), (73.5, 16.1), (73.5, 16.0), (73.4, 16.0)
        ])
    },
    {
        "name": "Gulf of Kutch Marine National Park",
        "polygon": Polygon([
            (69.0, 22.5), (70.5, 22.8), (70.5, 22.3), (69.0, 22.2)
        ])
    }
]

def check_ecological_threats(spill_id: str, drift: DriftPath, base_time: datetime) -> List[Alert]:
    alerts = []
    
    if not drift.forward_path or len(drift.forward_path) < 2:
        return alerts
        
    # Convert forward path points to a LineString (lon, lat for shapely)
    path_coords = [(pt.lon, pt.lat) for pt in drift.forward_path]
    forward_line = LineString(path_coords)
    
    for zone in SENSITIVE_ZONES:
        if forward_line.intersects(zone["polygon"]):
            # Find approximate time of impact
            impact_time = None
            for pt in drift.forward_path:
                if Point(pt.lon, pt.lat).within(zone["polygon"]):
                    impact_time = pt.timestamp
                    break
                    
            # If line intersects but points don't strictly fall inside (e.g. straddles line), 
            # approximate with the first point.
            if not impact_time:
                impact_time = drift.forward_path[0].timestamp
                
            hours_to_impact = (impact_time - base_time).total_seconds() / 3600.0
            if hours_to_impact <= 0:
                msg = f"CRITICAL: Spill {spill_id[:8]} is currently inside or has already impacted {zone['name']}."
            else:
                msg = f"CRITICAL: Spill {spill_id[:8]} forward drift trajectory intersects {zone['name']}. Estimated impact in {hours_to_impact:.1f} hours."
            
            alerts.append(Alert(
                id=str(uuid.uuid4()),
                timestamp=base_time,
                message=msg,
                severity="critical"
            ))
            
    return alerts
