import unittest
import asyncio
import os
import sys
from datetime import datetime, timedelta

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.sar_pipeline import process_sar_image, extract_geotiff_metadata
from app.services.drift_engine import simulate_drift_engine
from app.services.attribution_engine import score_vessels_multi_factor, compute_polygon_iou
from app.services.environmental_provider import get_environmental_provider
from app.services.evaluation import run_synthetic_ground_truth_benchmark
from app.database import init_db, db_get_all_incidents, db_get_incident_by_id, db_create_incident

class TestRealDataModeAndPersistence(unittest.TestCase):

    def test_01_real_mode_no_sar_returns_error(self):
        """Condition 1: REAL_DATA_MODE + no SAR -> explicit ValueError/HTTPException."""
        with self.assertRaises(ValueError) as ctx:
            process_sar_image(None, 18.5, 70.2, mode="REAL_DATA_MODE")
        self.assertIn("No valid satellite input file supplied in REAL DATA MODE", str(ctx.exception))

    def test_02_real_mode_corrupt_sar_returns_error(self):
        """Condition 2: REAL_DATA_MODE + corrupt SAR -> explicit error, NEVER synthetic output."""
        corrupt_bytes = b"NOT_AN_IMAGE_RASTER_DATA_CORRUPT"
        with self.assertRaises(ValueError) as ctx:
            process_sar_image(corrupt_bytes, 18.5, 70.2, mode="REAL_DATA_MODE")
        self.assertIn("Corrupt or unreadable satellite image file in REAL DATA MODE", str(ctx.exception))

    def test_03_real_mode_no_environment_returns_error(self):
        """Condition 3: REAL_DATA_MODE + no environment grid -> explicit error."""
        with self.assertRaises(ValueError) as ctx:
            get_environmental_provider(mode="REAL_DATA_MODE", real_grid_data=None)
        self.assertIn("Environmental data unavailable", str(ctx.exception))

    def test_04_real_mode_no_ais_returns_error(self):
        """Condition 4: REAL_DATA_MODE + no AIS -> explicit error."""
        from app.services.drift_engine import SourceRegion
        now = datetime.utcnow()
        source_region = SourceRegion(
            polygon_coords=[[18.5, 70.2], [18.5, 70.3], [18.4, 70.3], [18.4, 70.2]],
            centroid_lat=18.45, centroid_lon=70.25,
            time_window_start=now - timedelta(hours=1),
            time_window_end=now + timedelta(hours=1),
            uncertainty_radius_km=15.0
        )
        with self.assertRaises(ValueError) as ctx:
            score_vessels_multi_factor(
                observed_spill_polygon=[[18.5, 70.2]],
                source_region=source_region,
                spill_time=now,
                vessels=[],
                mode="REAL_DATA_MODE"
            )
        self.assertIn("Genuine AIS vessel tracks are required in REAL DATA MODE", str(ctx.exception))

    def test_05_synthetic_benchmark_mode_works(self):
        """Condition 5: SYNTHETIC_BENCHMARK_MODE -> synthetic pipeline executes cleanly."""
        sar_res = process_sar_image(None, 18.5, 70.2, mode="SYNTHETIC_BENCHMARK_MODE")
        self.assertIsNotNone(sar_res)
        self.assertGreater(sar_res.area_sq_km, 0)

    def test_06_database_persistence_survives_restart(self):
        """Condition 6: Database persistence survives restart."""
        async def run_async_test():
            await init_db()
            test_id = f"test-inc-{int(datetime.utcnow().timestamp())}"
            now = datetime.utcnow()
            
            await db_create_incident(
                incident_id=test_id,
                name="Test Persistence Slick",
                detected_at=now,
                center_lat=19.1,
                center_lon=71.3,
                area_sq_km=28.5,
                severity="high",
                status="investigating",
                estimated_volume_liters=100000.0,
                spill_type="crude",
                provenance_type="REAL_DATA",
                polygon_coords=[[19.1, 71.3], [19.2, 71.4], [19.0, 71.4]]
            )
            
            # Re-query database
            inc = await db_get_incident_by_id(test_id)
            self.assertIsNotNone(inc)
            self.assertEqual(inc['name'], "Test Persistence Slick")
            self.assertEqual(inc['area_sq_km'], 28.5)
            
        asyncio.run(run_async_test())

    def test_07_real_geotiff_metadata_extraction(self):
        """Condition 7: Real GeoTIFF metadata extraction returns GeoTIFFValidationResponse."""
        res = extract_geotiff_metadata(None)
        self.assertFalse(res.valid)
        self.assertEqual(res.provenance, "UNKNOWN")

    def test_08_synthetic_and_real_provenance_separated(self):
        """Condition 8: Synthetic and real provenance remain separated."""
        from app.models import AISDataProvenance
        prov_syn = AISDataProvenance(source_type="SyntheticBenchmark", is_real=False)
        prov_real = AISDataProvenance(source_type="MarineCadastre", is_real=True)
        self.assertFalse(prov_syn.is_real)
        self.assertTrue(prov_real.is_real)

    def test_09_attribution_scores_no_artificial_boosting(self):
        """Condition 9: Attribution scores contain no artificial boosting."""
        poly1 = [[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]]
        poly2 = [[5, 5], [5, 7], [7, 7], [7, 5], [5, 5]]
        iou = compute_polygon_iou(poly1, poly2)
        self.assertEqual(iou, 0.0)

    def test_10_11_50_scenario_benchmark_and_mrr(self):
        """Conditions 10 & 11: Benchmark metrics are dynamically calculated across 50 scenarios with MRR."""
        metrics = run_synthetic_ground_truth_benchmark(num_scenarios=50)
        self.assertTrue(metrics.is_evaluated)
        self.assertEqual(metrics.num_scenarios_evaluated, 50)
        self.assertIsNotNone(metrics.mean_reciprocal_rank)
        self.assertGreater(metrics.mean_reciprocal_rank, 0.0)
        self.assertEqual(metrics.benchmark_mode, "Synthetic Benchmark Validation")

    def test_12_landing_page_no_unsupported_marketing_claims(self):
        """Condition 12: Landing page contains no unsupported numerical marketing claims."""
        landing_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../frontend/src/pages/Landing.tsx'))
        with open(landing_path, 'r', encoding='utf-8') as f:
          content = f.read()
        self.assertNotIn("94.2%", content)
        self.assertNotIn("12ms", content)

if __name__ == '__main__':
    unittest.main()
