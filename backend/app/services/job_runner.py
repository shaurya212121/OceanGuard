import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, Optional

from ..models import AnalysisJobStatus
from .sar_pipeline import process_sar_image
from .drift_engine import simulate_drift_engine
from .attribution_engine import score_vessels_multi_factor
from .data_generator import get_state

# Job state dictionary
JOBS: Dict[str, AnalysisJobStatus] = {}

async def run_job_task(job_id: str, incident_id: str, lat: float, lon: float, hours_back: int, image_bytes: Optional[bytes]):
    try:
        # Stage 1: Ingestion
        JOBS[job_id].current_stage = "INGESTION & PREPROCESSING"
        JOBS[job_id].progress_pct = 15
        await asyncio.sleep(0.3)

        # Stage 2: SAR Segmentation & Characterization
        JOBS[job_id].current_stage = "SAR CHARACTERIZATION & LOOK-ALIKE REJECTION"
        JOBS[job_id].progress_pct = 35
        sar_result = process_sar_image(image_bytes, lat, lon)
        await asyncio.sleep(0.3)

        # Stage 3: Drift Hindcast & Source Region
        JOBS[job_id].current_stage = "PHYSICAL DRIFT HINDCASTING & SOURCE REGION ESTIMATION"
        JOBS[job_id].progress_pct = 60
        now = datetime.utcnow().replace(microsecond=0)
        drift_result = simulate_drift_engine(
            center_lat=sar_result.centroid_lat,
            center_lon=sar_result.centroid_lon,
            start_time=now,
            hours_back=hours_back
        )
        await asyncio.sleep(0.3)

        # Stage 4: AIS Reconstruction & Counterfactual Attribution
        JOBS[job_id].current_stage = "AIS TRACK RECONSTRUCTION & COUNTERFACTUAL OVERLAP VALIDATION"
        JOBS[job_id].progress_pct = 85
        state = get_state()
        vessels = list(state["vessels"].values())
        
        suspects = score_vessels_multi_factor(
            observed_spill_polygon=sar_result.polygon_coords,
            source_region=drift_result.source_region,
            spill_time=now,
            vessels=vessels,
            drift_path=drift_result
        )
        await asyncio.sleep(0.2)

        # Stage 5: Completion
        JOBS[job_id].current_stage = "INVESTIGATION ANALYSIS COMPLETE"
        JOBS[job_id].progress_pct = 100
        JOBS[job_id].status = "COMPLETED"
        JOBS[job_id].result = {
            "incident_id": incident_id,
            "sar_characterization": sar_result.dict(),
            "drift_path": drift_result.dict(),
            "suspects": [s.dict() for s in suspects]
        }
        JOBS[job_id].updated_at = datetime.utcnow().replace(microsecond=0)

    except Exception as e:
        JOBS[job_id].status = "FAILED"
        JOBS[job_id].error = str(e)
        JOBS[job_id].updated_at = datetime.utcnow().replace(microsecond=0)

def create_analysis_job(incident_id: str, lat: float, lon: float, hours_back: int = 12, image_bytes: Optional[bytes] = None) -> str:
    job_id = f"job-{uuid.uuid4().hex[:8]}"
    now = datetime.utcnow().replace(microsecond=0)
    
    job = AnalysisJobStatus(
        job_id=job_id,
        incident_id=incident_id,
        status="PROCESSING",
        current_stage="INITIALIZING ANALYSIS PIPELINE",
        progress_pct=5,
        created_at=now,
        updated_at=now
    )
    JOBS[job_id] = job
    
    asyncio.create_task(run_job_task(job_id, incident_id, lat, lon, hours_back, image_bytes))
    return job_id

def get_job_status(job_id: str) -> Optional[AnalysisJobStatus]:
    return JOBS.get(job_id)
