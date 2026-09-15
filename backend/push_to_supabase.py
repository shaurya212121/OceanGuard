
import os
import io
import uuid
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

from app.services.cv.pipeline import detect_oil_spill
from app.models import OilSpill
from app.services.data_generator import generate_vessels
from app.services.drift_simulator import simulate_drift
from app.services.vessel_scorer import score_vessels

class_1_dir = Path("data/csiro_dataset/kaggle/data/Class_1")
image_paths = sorted([p for p in class_1_dir.iterdir() if p.suffix.lower() == ".jpg"])[:5]

base_time = datetime.utcnow()
spills = []

print("Running Real CV Pipeline on 5 CSIRO dataset images...")
coords = [
    (18.5, 70.2, 18.0, 70.7),
    (11.8, 72.5, 11.3, 73.0),
    (14.2, 82.8, 13.7, 83.3),
    (9.5, 75.2, 9.0, 75.7),
    (20.1, 87.5, 19.6, 88.0)
]

stages_used = {"classifier": 0, "unet": 0, "classical": 0}

for idx, img_path in enumerate(image_paths):
    with open(img_path, "rb") as f:
        img_bytes = f.read()
    
    tl_lat, tl_lon, br_lat, br_lon = coords[idx]
    
    res = detect_oil_spill(
        image_bytes=img_bytes,
        top_left_lat=tl_lat,
        top_left_lon=tl_lon,
        bottom_right_lat=br_lat,
        bottom_right_lon=br_lon,
        pixel_size_m=40.0,
        classification_threshold=0.5
    )
    
    if res.spill_detected and res.primary_polygon_latlon:
        spill = OilSpill(
            id=str(uuid.uuid4()),
            name=f"Real Detection - {img_path.name}",
            detected_at=base_time,
            center_lat=res.primary_centroid_lat,
            center_lon=res.primary_centroid_lon,
            area_sq_km=res.total_area_sq_km,
            severity="HIGH" if res.total_area_sq_km > 50 else "MODERATE",
            status="ACTIVE",
            polygon_coords=res.primary_polygon_latlon,
            estimated_volume_liters=res.total_area_sq_km * 1000 * 2,
            spill_type="unknown"
        )
        spills.append(spill)
        
        stages_used["classifier"] += 1 if res.classification_mode == "cnn" else 0
        stages_used["unet"] += 1 if res.mode == "unet" else 0
        stages_used["classical"] += 1 if res.mode == "classical" else 0

print("Upserting to Supabase...")
for spill in spills:
    print(f"Upserting spill: {spill.id}")
    supabase.table("oil_spills").upsert(spill.model_dump(mode="json")).execute()
    
    drift = simulate_drift(spill.center_lat, spill.center_lon, base_time, hours_back=24, hours_forward=48, current_speed_knots=1.5, current_direction_deg=180.0)
    drift_dict = drift.model_dump(mode="json")
    drift_dict["spill_id"] = spill.id
    drift_dict["origin_lat"] = drift_dict["origin_estimate"]["lat"]
    drift_dict["origin_lon"] = drift_dict["origin_estimate"]["lon"]
    drift_dict["origin_timestamp"] = drift_dict["origin_estimate"]["timestamp"]
    del drift_dict["origin_estimate"]
    supabase.table("drift_paths").upsert(drift_dict).execute()
    
    vessels = generate_vessels(base_time, count=5)
    for v in vessels:
        supabase.table("vessels").upsert(v.model_dump(mode="json", exclude={"positions"})).execute()
        position_batch = []
        for p in v.positions:
            p_dict = p.model_dump(mode="json")
            p_dict["mmsi"] = v.mmsi
            position_batch.append(p_dict)
        if position_batch:
            supabase.table("vessel_positions").upsert(position_batch).execute()
    
    suspects = score_vessels(drift.origin_estimate.lat, drift.origin_estimate.lon, base_time, vessels)
    for s in suspects:
        s_dict = s.model_dump(mode="json")
        s_dict["spill_id"] = spill.id
        for key in ["imo_number", "name", "flag_country", "vessel_type"]:
            s_dict.pop(key, None)
        supabase.table("suspect_vessels").upsert(s_dict).execute()

print("Push complete!")
