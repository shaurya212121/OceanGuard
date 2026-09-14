from fastapi import APIRouter
from ..models import EvaluationMetrics
from ..services.evaluation import get_default_un_evaluated_metrics, run_synthetic_ground_truth_benchmark

router = APIRouter()

EVALUATION_CACHE: EvaluationMetrics = get_default_un_evaluated_metrics()

@router.get("/stats", response_model=EvaluationMetrics)
async def get_evaluation_stats():
    """Returns current system evaluation metrics or 'Not Yet Evaluated' status."""
    return EVALUATION_CACHE

@router.post("/run-benchmark", response_model=EvaluationMetrics)
async def execute_ground_truth_benchmark():
    """Executes synthetic ground-truth benchmark and returns empirically calculated metrics."""
    global EVALUATION_CACHE
    EVALUATION_CACHE = run_synthetic_ground_truth_benchmark()
    return EVALUATION_CACHE
