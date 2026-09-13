import unittest
import sys
import os

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from tests.test_sar_pipeline import test_sar_pipeline_processing
from tests.test_drift_engine import test_drift_engine_simulation
from tests.test_attribution_engine import test_attribution_engine_scoring, test_polygon_iou_calculation
from tests.test_evaluation import test_un_evaluated_default_metrics, test_run_synthetic_ground_truth_benchmark
from tests.test_real_mode_and_persistence import TestRealDataModeAndPersistence

def run_tests():
    print("==================================================")
    print("   Running OceanGuard AI Automated Test Suite")
    print("==================================================")
    
    print("\n[1/6] Testing SAR Processing Pipeline...")
    test_sar_pipeline_processing()
    print("  [OK] SAR Processing & Look-Alike Probabilities Passed")
    
    print("\n[2/6] Testing Environmental Drift Engine...")
    test_drift_engine_simulation()
    print("  [OK] Particle Ensemble Drift & Source Region Passed")
    
    print("\n[3/6] Testing Multi-Factor Attribution Engine...")
    test_attribution_engine_scoring()
    print("  [OK] Multi-Factor Evidence Scoring Passed")
    
    print("\n[4/6] Testing Counterfactual Polygon IoU...")
    test_polygon_iou_calculation()
    print("  [OK] Counterfactual Overlap IoU Calculation Passed")
    
    print("\n[5/6] Testing 50-Scenario Benchmark & MRR Evaluation...")
    test_un_evaluated_default_metrics()
    test_run_synthetic_ground_truth_benchmark()
    print("  [OK] 50-Scenario Empirical Benchmark & MRR Passed")
    
    print("\n[6/6] Testing REAL_DATA_MODE Constraints & SQLite Persistence...")
    suite = unittest.TestLoader().loadTestsFromTestCase(TestRealDataModeAndPersistence)
    runner = unittest.TextTestRunner(verbosity=1)
    result = runner.run(suite)
    if not result.wasSuccessful():
        sys.exit(1)
    print("  [OK] REAL_DATA_MODE Strict Failure & Database Persistence Passed")
    
    print("\n==================================================")
    print("   ALL TESTS PASSED SUCCESSFULLY! (6/6 SUITES PASSED)")
    print("==================================================")

if __name__ == '__main__':
    run_tests()
