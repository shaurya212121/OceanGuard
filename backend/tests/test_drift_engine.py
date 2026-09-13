from datetime import datetime
from app.services.drift_engine import simulate_drift_engine

def test_drift_engine_simulation():
    now = datetime.utcnow().replace(microsecond=0)
    drift = simulate_drift_engine(18.5, 70.2, now, hours_back=6, hours_forward=6)
    
    assert len(drift.backward_path) == 6
    assert len(drift.forward_path) == 6
    assert drift.origin_estimate is not None
    assert drift.source_region is not None
    assert len(drift.source_region.polygon_coords) >= 3
    assert drift.source_region.uncertainty_radius_km > 0
