import os
import random
import uuid
import math
from datetime import datetime, timedelta
from typing import List, Dict, Any

from ..models import (
    OilSpill, VesselPosition, VesselTrack, SuspectVessel, 
    DriftPoint, DriftPath, SpillScenario, DashboardStats, Alert
)
from .drift_simulator import simulate_drift
from .vessel_scorer import score_vessels

def generate_polygon(center_lat: float, center_lon: float, num_points: int = 10, radius_deg: float = 0.1) -> List[List[float]]:
    points = []
    angle_step = 2 * math.pi / num_points
    for i in range(num_points):
        angle = i * angle_step
        # Add some randomness to radius
        r = radius_deg * random.uniform(0.5, 1.5)
        # Convert to lat/lon offsets
        d_lat = r * math.cos(angle)
        d_lon = r * math.sin(angle) / math.cos(math.radians(center_lat))
        points.append([center_lat + d_lat, center_lon + d_lon])
    # Close the polygon
    points.append(points[0])
    return points

def generate_vessels(base_time: datetime, count: int = 15) -> List[VesselTrack]:
    vessels = []
    vessel_types = ['Cargo', 'Tanker', 'Fishing', 'Container']
    flags = ['Panama', 'Liberia', 'Marshall Islands', 'India', 'Singapore', 'China']
    
    for i in range(count):
        vessel = VesselTrack(
            mmsi=f"353{random.randint(100000, 999999)}",
            imo_number=f"IMO{random.randint(1000000, 9999999)}",
            name=f"MV Vessel_{i}",
            flag_country=random.choice(flags),
            vessel_type=random.choice(vessel_types),
            positions=[]
        )
        
        # Start somewhere in Indian ocean
        start_lat = random.uniform(8.0, 22.0)
        start_lon = random.uniform(65.0, 85.0)
        
        # General heading
        heading = random.uniform(0, 360)
        speed = random.uniform(8.0, 16.0)
        
        current_lat = start_lat
        current_lon = start_lon
        
        # 48 hours, every 30 mins -> 96 points
        for j in range(96):
            dt = base_time - timedelta(hours=48) + timedelta(minutes=j*30)
            
            # Simple linear movement
            speed_kmh = speed * 1.852
            d_lat = (speed_kmh * math.cos(math.radians(heading))) / 111.0 * 0.5 # 0.5 hours
            d_lon = (speed_kmh * math.sin(math.radians(heading))) / (111.0 * math.cos(math.radians(current_lat))) * 0.5
            
            current_lat += d_lat
            current_lon += d_lon
            
            vessel.positions.append(VesselPosition(
                lat=current_lat,
                lon=current_lon,
                timestamp=dt,
                speed_knots=speed,
                heading=heading
            ))
            
            # Randomly change heading slightly
            heading = (heading + random.uniform(-5, 5)) % 360
            
        vessels.append(vessel)
    return vessels

def generate_guilty_vessel(base_time: datetime, origin_lat: float, origin_lon: float, spill_time: datetime) -> VesselTrack:
    # Guilty vessel MV Darkwater
    vessel = VesselTrack(
        mmsi="636098765",
        imo_number="IMO9876543",
        name="MV Darkwater",
        flag_country="Liberia",
        vessel_type="Tanker",
        positions=[]
    )
    
    # Path that passes through origin at spill_time
    # Let's construct it backwards and forwards from origin
    
    # Pre-spill: approaching from south-west at 12 knots
    heading_pre = 45 # NE
    speed_pre = 12.0
    
    # Spill: at origin, speed drops to 2 knots
    # AIS goes dark for 45 mins right after
    
    # Post-spill: speeding away SW at 14 knots
    heading_post = 225 # SW
    speed_post = 14.0
    
    for j in range(96):
        dt = base_time - timedelta(hours=48) + timedelta(minutes=j*30)
        
        time_diff_hours = (dt - spill_time).total_seconds() / 3600.0
        
        if time_diff_hours < 0: # Pre-spill
            # Reconstruct position before spill
            speed_kmh = speed_pre * 1.852
            dist = speed_kmh * abs(time_diff_hours)
            lat_offset = (dist * math.cos(math.radians(heading_pre+180))) / 111.0
            lon_offset = (dist * math.sin(math.radians(heading_pre+180))) / (111.0 * math.cos(math.radians(origin_lat)))
            
            vessel.positions.append(VesselPosition(
                lat=origin_lat + lat_offset,
                lon=origin_lon + lon_offset,
                timestamp=dt,
                speed_knots=speed_pre,
                heading=heading_pre
            ))
        elif time_diff_hours == 0: # At origin
            vessel.positions.append(VesselPosition(
                lat=origin_lat,
                lon=origin_lon,
                timestamp=dt,
                speed_knots=2.0,
                heading=heading_pre
            ))
        elif 0 < time_diff_hours <= 0.75: # Gap
            pass # AIS Gap
        else: # Post-spill
            speed_kmh = speed_post * 1.852
            dist = speed_kmh * (time_diff_hours - 0.75)
            lat_offset = (dist * math.cos(math.radians(heading_post))) / 111.0
            lon_offset = (dist * math.sin(math.radians(heading_post))) / (111.0 * math.cos(math.radians(origin_lat)))
            
            vessel.positions.append(VesselPosition(
                lat=origin_lat + lat_offset,
                lon=origin_lon + lon_offset,
                timestamp=dt,
                speed_knots=speed_post,
                heading=heading_post
            ))
            
    return vessel


def generate_all_data() -> Dict[str, Any]:
    base_time = datetime.utcnow()
    
    # Spills
    spill1_time = base_time - timedelta(hours=6)
    spill1 = OilSpill(
        id=str(uuid.uuid4()),
        name="Arabian Sea Spill",
        detected_at=spill1_time,
        center_lat=18.5,
        center_lon=70.2,
        area_sq_km=45.2,
        severity="critical",
        status="investigating",
        polygon_coords=generate_polygon(18.5, 70.2, 12, 0.15),
        estimated_volume_liters=1500000.0,
        spill_type="crude"
    )
    
    spill2_time = base_time - timedelta(hours=18)
    spill2 = OilSpill(
        id=str(uuid.uuid4()),
        name="Lakshadweep Corridor Spill",
        detected_at=spill2_time,
        center_lat=11.8,
        center_lon=72.5,
        area_sq_km=12.5,
        severity="medium",
        status="detected",
        polygon_coords=generate_polygon(11.8, 72.5, 8, 0.08),
        estimated_volume_liters=500000.0,
        spill_type="refined"
    )
    
    spill3_time = base_time - timedelta(hours=36)
    spill3 = OilSpill(
        id=str(uuid.uuid4()),
        name="Bay of Bengal Incident",
        detected_at=spill3_time,
        center_lat=14.2,
        center_lon=82.8,
        area_sq_km=2.1,
        severity="low",
        status="resolved",
        polygon_coords=generate_polygon(14.2, 82.8, 10, 0.05),
        estimated_volume_liters=50000.0,
        spill_type="unknown"
    )
    
    # Drifts
    drift1 = simulate_drift(spill1.center_lat, spill1.center_lon, base_time, 12, 12, 0.5, 45) # current towards NE
    drift2 = simulate_drift(spill2.center_lat, spill2.center_lon, base_time, 24, 12, 0.3, 90)
    drift3 = simulate_drift(spill3.center_lat, spill3.center_lon, base_time, 48, 12, 0.4, 180)
    
    # Vessels
    vessels = generate_vessels(base_time, 14)
    guilty_vessel = generate_guilty_vessel(base_time, drift1.origin_estimate.lat, drift1.origin_estimate.lon, spill1_time)
    vessels.append(guilty_vessel)
    
    # Load real AIS data if available
    csv_path = os.path.join(os.path.dirname(__file__), '../../data/sample_ais.csv')
    if os.path.exists(csv_path):
        from .ais_loader import load_ais_csv
        try:
            real_vessels = load_ais_csv(csv_path)
            if real_vessels:
                vessels.extend(real_vessels)
        except Exception as e:
            print(f"Error loading real AIS data: {e}")
            
    # Score for scenario 1
    suspects1 = score_vessels(drift1.origin_estimate.lat, drift1.origin_estimate.lon, spill1_time, vessels)
    suspects2 = score_vessels(drift2.origin_estimate.lat, drift2.origin_estimate.lon, spill2_time, vessels)
    suspects3 = score_vessels(drift3.origin_estimate.lat, drift3.origin_estimate.lon, spill3_time, vessels)
    
    scenario1 = SpillScenario(spill=spill1, drift=drift1, vessels=vessels, suspects=suspects1)
    scenario2 = SpillScenario(spill=spill2, drift=drift2, vessels=vessels, suspects=suspects2)
    scenario3 = SpillScenario(spill=spill3, drift=drift3, vessels=vessels, suspects=suspects3)
    
    alerts = [
        Alert(id=str(uuid.uuid4()), timestamp=base_time-timedelta(hours=5), message="Critical: Large crude oil spill detected in Arabian Sea", severity="critical"),
        Alert(id=str(uuid.uuid4()), timestamp=base_time-timedelta(hours=4), message="Warning: Vessel 636098765 exhibited AIS gap near spill origin", severity="high"),
        Alert(id=str(uuid.uuid4()), timestamp=base_time-timedelta(hours=2), message="Info: Drift model updated for Bay of Bengal incident", severity="info"),
        Alert(id=str(uuid.uuid4()), timestamp=base_time-timedelta(hours=1), message="Warning: Spill approaching Lakshadweep marine sanctuary", severity="medium")
    ]
    
    stats = DashboardStats(
        total_spills=3,
        active_investigations=2,
        vessels_tracked=len(vessels),
        alerts_today=4,
        total_area_affected_sq_km=59.8,
        highest_severity="critical"
    )
    
    return {
        "scenarios": {
            scenario1.spill.id: scenario1,
            scenario2.spill.id: scenario2,
            scenario3.spill.id: scenario3
        },
        "vessels": {v.mmsi: v for v in vessels},
        "alerts": alerts,
        "stats": stats,
        "spills": [spill1, spill2, spill3]
    }

GLOBAL_STATE = None

def init_global_state():
    global GLOBAL_STATE
    GLOBAL_STATE = generate_all_data()

def get_state():
    if GLOBAL_STATE is None:
        init_global_state()
    return GLOBAL_STATE
