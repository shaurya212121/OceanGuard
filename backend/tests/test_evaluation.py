from app.services.evaluation import get_default_un_evaluated_metrics, run_synthetic_ground_truth_benchmark

def test_un_evaluated_default_metrics():
    metrics = get_default_un_evaluated_metrics()
    assert metrics.is_evaluated is False
    assert metrics.sar_precision is None
    assert metrics.top1_attribution_accuracy is None

def test_run_synthetic_ground_truth_benchmark():
    metrics = run_synthetic_ground_truth_benchmark(num_scenarios=50)
    assert metrics.is_evaluated is True
    assert metrics.num_scenarios_evaluated == 50
    assert metrics.sar_precision is not None
    assert metrics.sar_precision > 0
    assert metrics.sar_iou > 0
    assert metrics.top1_attribution_accuracy > 80.0
    assert metrics.mean_reciprocal_rank is not None
    assert metrics.mean_reciprocal_rank > 0.8
