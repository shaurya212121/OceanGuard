from app.services.sar_pipeline import process_sar_image

def test_sar_pipeline_processing():
    char = process_sar_image(None, 18.5, 70.2)
    assert char.area_sq_km > 0
    assert char.perimeter_km > 0
    assert len(char.polygon_coords) >= 3
    assert char.lookalike_probs.oil_spill > 0
    # Probabilities should sum to approximately 100%
    total_prob = (
        char.lookalike_probs.oil_spill +
        char.lookalike_probs.low_wind_area +
        char.lookalike_probs.ship_wake +
        char.lookalike_probs.biogenic_film +
        char.lookalike_probs.rain_formation
    )
    assert abs(total_prob - 100.0) < 1.0
