
import os
import io
import uuid
import math
import random
from pathlib import Path
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

from app.services.cv.pipeline import detect_oil_spill
from app.models import OilSpill, VesselTrack, VesselPosition
from app.services.data_generator import generate_vessels
from app.services.drift_simulator import simulate_drift
from app.services.vessel_scorer import score_vessels
from app.services.ecological_threats import check_ecological_threats

# ---------------------------------------------------------------------------
# Guilty vessel generator — creates a vessel whose track deliberately passes
# within 5-15 km of a spill's drift origin, with a speed drop and AIS gap
# so that vessel_scorer flags it as a suspect.
# ---------------------------------------------------------------------------

SUSPECT_NAMES = [
    "MV Darkwater", "MT Shadow Tide", "MV Night Horizon",
    "MT Black Current", "MV Ghost Wake", "MT Phantom Drift",
    "MV Iron Serpent", "MT Storm Veil", "MV Crimson Hull",
    "MT Deep Whisper",
]
SUSPECT_FLAGS = ["Liberia", "Panama", "Marshall Islands", "Comoros", "Honduras"]
SUSPECT_TYPES = ["Tanker", "Cargo", "Tanker", "Tanker", "Cargo"]  # bias toward tankers

_suspect_counter = 0


def generate_guilty_vessel_near(
    origin_lat: float,
    origin_lon: float,
    spill_time: datetime,
    base_time: datetime,
) -> VesselTrack:
    """Create a vessel that passes within 5-15 km of origin around spill_time,
    drops speed from ~12 kn to ~2 kn, then has a 45-min AIS gap, then flees."""
    global _suspect_counter
    idx = _suspect_counter % len(SUSPECT_NAMES)
    _suspect_counter += 1

    vessel = VesselTrack(
        mmsi=f"636{random.randint(100000, 999999)}",
        imo_number=f"IMO{random.randint(1000000, 9999999)}",
        name=SUSPECT_NAMES[idx],
        flag_country=random.choice(SUSPECT_FLAGS),
        vessel_type=random.choice(SUSPECT_TYPES),
        positions=[],
    )

    # Offset the closest-approach point 5-15 km from origin (random bearing)
    offset_km = random.uniform(5, 12)
    bearing = random.uniform(0, 360)
    closest_lat = origin_lat + (offset_km * math.cos(math.radians(bearing))) / 111.0
    closest_lon = origin_lon + (offset_km * math.sin(math.radians(bearing))) / (
        111.0 * math.cos(math.radians(origin_lat))
    )

    heading_pre = random.uniform(30, 70)  # approaching NE-ish
    heading_post = (heading_pre + 180 + random.uniform(-30, 30)) % 360
    speed_pre = random.uniform(11, 14)
    speed_post = random.uniform(13, 16)

    # Build 96 position reports across 48 hours, every 30 min
    for j in range(96):
        dt = base_time - timedelta(hours=48) + timedelta(minutes=j * 30)
        time_diff_hours = (dt - spill_time).total_seconds() / 3600.0

        if time_diff_hours < -0.25:
            # Pre-spill: approaching closest_lat/lon
            speed_kmh = speed_pre * 1.852
            dist = speed_kmh * abs(time_diff_hours + 0.25)  # hours before closest approach
            lat_off = (dist * math.cos(math.radians(heading_pre + 180))) / 111.0
            lon_off = (dist * math.sin(math.radians(heading_pre + 180))) / (
                111.0 * math.cos(math.radians(closest_lat))
            )
            vessel.positions.append(
                VesselPosition(
                    lat=closest_lat + lat_off,
                    lon=closest_lon + lon_off,
                    timestamp=dt,
                    speed_knots=speed_pre + random.uniform(-0.5, 0.5),
                    heading=heading_pre + random.uniform(-3, 3),
                )
            )
        elif -0.25 <= time_diff_hours <= 0:
            # At closest approach — speed drops to ~2 knots
            vessel.positions.append(
                VesselPosition(
                    lat=closest_lat + random.uniform(-0.002, 0.002),
                    lon=closest_lon + random.uniform(-0.002, 0.002),
                    timestamp=dt,
                    speed_knots=random.uniform(1.5, 3.0),
                    heading=heading_pre,
                )
            )
        elif 0 < time_diff_hours <= 0.75:
            # AIS GAP — skip this position entirely
            pass
        else:
            # Post-spill: fleeing
            speed_kmh = speed_post * 1.852
            dist = speed_kmh * (time_diff_hours - 0.75)
            lat_off = (dist * math.cos(math.radians(heading_post))) / 111.0
            lon_off = (dist * math.sin(math.radians(heading_post))) / (
                111.0 * math.cos(math.radians(closest_lat))
            )
            vessel.positions.append(
                VesselPosition(
                    lat=closest_lat + lat_off,
                    lon=closest_lon + lon_off,
                    timestamp=dt,
                    speed_knots=speed_post + random.uniform(-0.5, 0.5),
                    heading=heading_post + random.uniform(-3, 3),
                )
            )

    return vessel


# ---------------------------------------------------------------------------
# Main script
# ---------------------------------------------------------------------------
random.seed(42)

class_1_dir = Path("data/csiro_dataset/kaggle/data/Class_1")
image_paths = sorted([p for p in class_1_dir.iterdir() if p.suffix.lower() == ".jpg"])

base_time = datetime.utcnow()
spills = []
drifts = []

print("Running Real CV Pipeline -- scanning images until 5 spills detected...")
coords = [
    (18.5, 70.2, 18.46, 70.24),
    (11.8, 72.5, 11.76, 72.54),
    (14.2, 82.8, 14.16, 82.84),
    (9.5, 75.2, 9.46, 75.24),
    (20.1, 87.5, 20.06, 87.54),
]

spills_pushed = 0

for img_path in image_paths:
    if spills_pushed >= 5:
        break

    with open(img_path, "rb") as f:
        img_bytes = f.read()

    tl_lat, tl_lon, br_lat, br_lon = coords[spills_pushed]

    res = detect_oil_spill(
        image_bytes=img_bytes,
        top_left_lat=tl_lat,
        top_left_lon=tl_lon,
        bottom_right_lat=br_lat,
        bottom_right_lon=br_lon,
        pixel_size_m=10.0,
        classification_threshold=0.55,
    )

    if res.spill_detected and res.primary_polygon_latlon:
        spill_id_stable = str(uuid.uuid5(uuid.NAMESPACE_URL, f"oceanguard_{img_path.name}"))
        spill = OilSpill(
            id=spill_id_stable,
            name=f"Real Detection - {img_path.name}",
            detected_at=base_time,
            center_lat=res.primary_centroid_lat,
            center_lon=res.primary_centroid_lon,
            area_sq_km=res.total_area_sq_km,
            severity="HIGH" if res.total_area_sq_km > 2 else "MODERATE",
            status="ACTIVE",
            polygon_coords=res.primary_polygon_latlon,
            estimated_volume_liters=res.total_area_sq_km * 1000 * 2,
            spill_type="unknown",
        )
        drift = simulate_drift(
            spill.center_lat, spill.center_lon, base_time,
            hours_back=24, hours_forward=48,
            current_speed_knots=1.5, current_direction_deg=180.0,
        )
        spills.append(spill)
        drifts.append(drift)
        spills_pushed += 1
        print(f"  [+] Spill {spills_pushed}: {img_path.name} -- area {res.total_area_sq_km:.2f} km2")

print(f"\nDetected {len(spills)} spills. Generating vessels...")

# 1. Generate 40 random background vessels (Indian Ocean traffic)
all_vessels: list[VesselTrack] = generate_vessels(base_time, count=40)
print(f"  -> 40 background vessels generated")

# 2. For each spill, create 2 guilty vessels near the drift origin
for i, (spill, drift) in enumerate(zip(spills, drifts)):
    origin_lat = drift.origin_estimate.lat
    origin_lon = drift.origin_estimate.lon
    origin_time = drift.origin_estimate.timestamp

    for g in range(2):
        guilty = generate_guilty_vessel_near(origin_lat, origin_lon, origin_time, base_time)
        all_vessels.append(guilty)
        print(f"  -> Guilty vessel '{guilty.name}' placed ~8km from spill {i+1} origin ({origin_lat:.2f}, {origin_lon:.2f})")

print(f"\nTotal vessels: {len(all_vessels)}")

# ---------------------------------------------------------------------------
# Upsert everything to Supabase (Idempotent)
# ---------------------------------------------------------------------------
print("\nUpserting spills + drift paths...")
for spill, drift in zip(spills, drifts):
    print(f"  Upserting spill: {spill.id}")
    supabase.table("oil_spills").upsert(spill.model_dump(mode="json")).execute()

    # Clear old child records to prevent duplication (since they lack UUID primary keys)
    supabase.table("drift_paths").delete().eq("spill_id", spill.id).execute()
    supabase.table("suspect_vessels").delete().eq("spill_id", spill.id).execute()

    drift_dict = drift.model_dump(mode="json")
    drift_dict["spill_id"] = spill.id
    drift_dict["origin_lat"] = drift_dict["origin_estimate"]["lat"]
    drift_dict["origin_lon"] = drift_dict["origin_estimate"]["lon"]
    drift_dict["origin_timestamp"] = drift_dict["origin_estimate"]["timestamp"]
    del drift_dict["origin_estimate"]
    supabase.table("drift_paths").insert(drift_dict).execute()

print("Upserting vessels + positions...")
for v in all_vessels:
    # Clear old positions for this vessel to prevent duplication
    supabase.table("vessel_positions").delete().eq("mmsi", v.mmsi).execute()
    
    supabase.table("vessels").upsert(v.model_dump(mode="json", exclude={"positions"})).execute()
    position_batch = []
    for p in v.positions:
        p_dict = p.model_dump(mode="json")
        p_dict["mmsi"] = v.mmsi
        position_batch.append(p_dict)
    if position_batch:
        supabase.table("vessel_positions").insert(position_batch).execute()

print("Scoring vessels against each spill's drift origin...")
total_suspects = 0
for spill, drift in zip(spills, drifts):
    suspects = score_vessels(
        drift.origin_estimate.lat, drift.origin_estimate.lon,
        base_time, all_vessels,
    )
    for s in suspects:
        s_dict = s.model_dump(mode="json")
        s_dict["spill_id"] = spill.id
        for key in ["imo_number", "name", "flag_country", "vessel_type"]:
            s_dict.pop(key, None)
        supabase.table("suspect_vessels").insert(s_dict).execute()
    print(f"  Spill {spill.id[:8]}.. -> {len(suspects)} suspects (scores: {[s.guilt_score for s in suspects]})")
    total_suspects += len(suspects)
    
    # Ecological Threat Check
    alerts = check_ecological_threats(spill.id, drift, base_time)
    for alert in alerts:
        a_dict = alert.model_dump(mode="json")
        supabase.table("alerts").upsert(a_dict).execute()
        print(f"  -> Generated Alert: {alert.message}")
        
# ---------------------------------------------------------------------------
# Final row counts
# ---------------------------------------------------------------------------
print("\n" + "=" * 50)
print("FINAL TABLE ROW COUNTS")
print("=" * 50)
for table in ["oil_spills", "drift_paths", "suspect_vessels", "vessels", "vessel_positions", "alerts"]:
    rows = supabase.table(table).select("*").execute().data
    print(f"  {table:<20} | {len(rows)}")
print("=" * 50)
print(f"Total suspects inserted: {total_suspects}")
print("Push complete!")
