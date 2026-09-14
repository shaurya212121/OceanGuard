from datetime import datetime, timedelta
from app.services.attribution_engine import score_vessels_multi_factor, compute_polygon_iou
from app.services.drift_engine import simulate_drift_engine
from app.services.sar_pipeline import process_sar_image
from app.services.data_generator import generate_vessels, generate_guilty_vessel

def test_attribution_engine_scoring():
    now = datetime.utcnow().replace(microsecond=0)
    spill_time = now - timedelta(hours=6)
    
    sar_res = process_sar_image(None, 18.5, 70.2)
    drift = simulate_drift_engine(18.5, 70.2, spill_time, hours_back=6)
    
    vessels = generate_vessels(now, 5)
    guilty_vessel = generate_guilty_vessel(now, drift.origin_estimate.lat, drift.origin_estimate.lon, spill_time)
    vessels.append(guilty_vessel)
    
    suspects = score_vessels_multi_factor(
        observed_spill_polygon=sar_res.polygon_coords,
        source_region=drift.source_region,
        spill_time=spill_time,
        vessels=vessels
    )
    
    assert len(suspects) > 0
    # Guilty vessel should rank #1
    assert suspects[0].mmsi == guilty_vessel.mmsi
    assert suspects[0].attribution_evidence_score > 50.0
    assert suspects[0].evidence_breakdown is not None
    assert suspects[0].disclaimer != ""

def test_polygon_iou_calculation():
    poly1 = [[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]]
    poly2 = [[1, 1], [1, 3], [3, 3], [3, 1], [1, 1]]
    
    iou = compute_polygon_iou(poly1, poly2)
    assert 0.0 < iou < 1.0
