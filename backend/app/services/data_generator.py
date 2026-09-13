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
        elif abs(time_diff_hours) < 0.25: # At origin
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


from .drift_engine import simulate_drift_engine
from .attribution_engine import score_vessels_multi_factor
from .sar_pipeline import process_sar_image
from ..models import DataProvenance

def generate_all_data() -> Dict[str, Any]:
    base_time = datetime.utcnow().replace(microsecond=0)
    
    # Characterize Spills with SAR Pipeline
    char1 = process_sar_image(None, 18.5, 70.2)
    char2 = process_sar_image(None, 11.8, 72.5)
    char3 = process_sar_image(None, 14.2, 82.8)

    spill1_time = base_time - timedelta(hours=6)
    spill1 = OilSpill(
        id="scenario-1",
        name="Arabian Sea Incident",
        detected_at=spill1_time,
        center_lat=18.5,
        center_lon=70.2,
        area_sq_km=char1.area_sq_km,
        severity="critical",
        status="investigating",
        polygon_coords=char1.polygon_coords,
        estimated_volume_liters=1500000.0,
        spill_type="crude",
        provenance=DataProvenance(data_type="SYNTHETIC_DEMO_DATA", source_name="SIH Benchmark Scenario 1", is_live=False),
        characterization=char1
    )
    
    spill2_time = base_time - timedelta(hours=18)
    spill2 = OilSpill(
        id="scenario-2",
        name="Lakshadweep Corridor Incident",
        detected_at=spill2_time,
        center_lat=11.8,
        center_lon=72.5,
        area_sq_km=char2.area_sq_km,
        severity="medium",
        status="detected",
        polygon_coords=char2.polygon_coords,
        estimated_volume_liters=500000.0,
        spill_type="refined",
        provenance=DataProvenance(data_type="SYNTHETIC_DEMO_DATA", source_name="SIH Benchmark Scenario 2", is_live=False),
        characterization=char2
    )
    
    spill3_time = base_time - timedelta(hours=36)
    spill3 = OilSpill(
        id="scenario-3",
        name="Bay of Bengal Slick",
        detected_at=spill3_time,
        center_lat=14.2,
        center_lon=82.8,
        area_sq_km=char3.area_sq_km,
        severity="low",
        status="resolved",
        polygon_coords=char3.polygon_coords,
        estimated_volume_liters=50000.0,
        spill_type="unknown",
        provenance=DataProvenance(data_type="SYNTHETIC_DEMO_DATA", source_name="SIH Benchmark Scenario 3", is_live=False),
        characterization=char3
    )
    
    # Drifts using physical drift_engine
    drift1 = simulate_drift_engine(spill1.center_lat, spill1.center_lon, spill1_time, hours_back=6, hours_forward=12, current_speed_knots=0.8, current_dir_deg=45)
    drift2 = simulate_drift_engine(spill2.center_lat, spill2.center_lon, spill2_time, hours_back=18, hours_forward=12, current_speed_knots=0.4, current_dir_deg=90)
    drift3 = simulate_drift_engine(spill3.center_lat, spill3.center_lon, spill3_time, hours_back=24, hours_forward=12, current_speed_knots=0.5, current_dir_deg=180)
    
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
            print(f"Error loading AIS data: {e}")
            
    # Multi-factor explainable attribution scoring
    suspects1 = score_vessels_multi_factor(spill1.polygon_coords, drift1.source_region, spill1_time, vessels, drift1)
    suspects2 = score_vessels_multi_factor(spill2.polygon_coords, drift2.source_region, spill2_time, vessels, drift2)
    suspects3 = score_vessels_multi_factor(spill3.polygon_coords, drift3.source_region, spill3_time, vessels, drift3)
    
    scenario1 = SpillScenario(spill=spill1, drift=drift1, vessels=vessels, suspects=suspects1)
    scenario2 = SpillScenario(spill=spill2, drift=drift2, vessels=vessels, suspects=suspects2)
    scenario3 = SpillScenario(spill=spill3, drift=drift3, vessels=vessels, suspects=suspects3)
    
    alerts = [
        Alert(id=str(uuid.uuid4()), timestamp=base_time-timedelta(hours=5), message="Critical: SAR Slick detected in Arabian Sea", severity="critical"),
        Alert(id=str(uuid.uuid4()), timestamp=base_time-timedelta(hours=4), message="Warning: Vessel 636098765 exhibited AIS gap near spill origin window", severity="high"),
        Alert(id=str(uuid.uuid4()), timestamp=base_time-timedelta(hours=2), message="Info: Particle drift model updated for Bay of Bengal incident", severity="info"),
        Alert(id=str(uuid.uuid4()), timestamp=base_time-timedelta(hours=1), message="Warning: Predicted drift trajectory approaching marine area", severity="medium")
    ]
    
    stats = DashboardStats(
        total_spills=3,
        active_investigations=2,
        vessels_tracked=len(vessels),
        alerts_today=4,
        total_area_affected_sq_km=round(spill1.area_sq_km + spill2.area_sq_km + spill3.area_sq_km, 1),
        highest_severity="critical",
        provenance_data_type="SYNTHETIC_DEMO_DATA"
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
