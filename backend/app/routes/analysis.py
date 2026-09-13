from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Dict, Any
from ..models import (
    DriftPath, SuspectVessel, SlickCharacterization, 
    AnalysisJobStatus, SourceRegion, GeoTIFFValidationResponse
)
from ..services.drift_engine import simulate_drift_engine
from ..services.attribution_engine import score_vessels_multi_factor
from ..services.sar_pipeline import process_sar_image, extract_geotiff_metadata
from ..services.job_runner import create_analysis_job, get_job_status
from ..database import db_get_all_incidents, db_get_incident_by_id
from ..config import OPERATING_MODE

router = APIRouter()

class HindcastRequest(BaseModel):
    lat: float
    lon: float
    hours_back: int = 12
    current_speed: float = 0.8
    current_direction: float = 45.0
    wind_speed: float = 12.0
    wind_direction: float = 30.0
    mode: Optional[str] = None
    real_grid_data: Optional[Dict[str, Any]] = None

class ScoreRequest(BaseModel):
    origin_lat: float
    origin_lon: float
    origin_time: datetime
    polygon_coords: Optional[List[List[float]]] = None
    mode: Optional[str] = None
    vessels_input: Optional[List[Dict[str, Any]]] = None

class CreateJobRequest(BaseModel):
    incident_id: str
    lat: float
    lon: float
    hours_back: int = 12

@router.post("/validate-geotiff", response_model=GeoTIFFValidationResponse)
async def validate_geotiff_file(file: UploadFile = File(...)):
    """Validates GeoTIFF headers and extracts CRS, bounds, resolution, and polarization metadata."""
    if not file:
        raise HTTPException(status_code=422, detail="No file uploaded.")
    image_bytes = await file.read()
    return extract_geotiff_metadata(image_bytes)

@router.post("/hindcast", response_model=DriftPath)
async def hindcast_drift(req: HindcastRequest):
    current_mode = req.mode or OPERATING_MODE
    now = datetime.utcnow().replace(microsecond=0)
    try:
        return simulate_drift_engine(
            center_lat=req.lat,
            center_lon=req.lon,
            start_time=now,
            hours_back=req.hours_back,
            hours_forward=12,
            current_speed_knots=req.current_speed,
            current_dir_deg=req.current_direction,
            wind_speed_knots=req.wind_speed,
            wind_dir_deg=req.wind_direction,
            mode=current_mode,
            real_grid_data=req.real_grid_data
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

@router.post("/score-vessels", response_model=List[SuspectVessel])
async def analyze_vessels(req: ScoreRequest):
    current_mode = req.mode or OPERATING_MODE
    
    # Query SQLite database for vessels
    vessels = []
    if req.vessels_input:
        from ..models import VesselTrack, VesselPosition
        for v in req.vessels_input:
            vessels.append(VesselTrack(
                mmsi=v.get('mmsi', ''),
                imo_number=v.get('imo_number'),
                name=v.get('name', 'Unknown'),
                flag_country=v.get('flag_country', 'Unknown'),
                vessel_type=v.get('vessel_type', 'Cargo'),
                positions=[VesselPosition(**p) for p in v.get('positions', [])]
            ))
    else:
        from ..services.data_generator import get_state
        state = get_state()
        vessels = list(state["vessels"].values())
        
    if current_mode == "REAL_DATA_MODE" and not req.vessels_input:
        raise HTTPException(
            status_code=422,
            detail="Analysis unavailable: Genuine AIS tracks required in REAL DATA MODE. Synthetic fallbacks are disabled."
        )

    source_region = SourceRegion(
        polygon_coords=req.polygon_coords or [
            [req.origin_lat + 0.05, req.origin_lon - 0.05],
            [req.origin_lat + 0.05, req.origin_lon + 0.05],
            [req.origin_lat - 0.05, req.origin_lon + 0.05],
            [req.origin_lat - 0.05, req.origin_lon - 0.05]
        ],
        centroid_lat=req.origin_lat,
        centroid_lon=req.origin_lon,
        time_window_start=req.origin_time,
        time_window_end=req.origin_time,
        uncertainty_radius_km=15.0
    )
    
    try:
        return score_vessels_multi_factor(
            observed_spill_polygon=req.polygon_coords or [],
            source_region=source_region,
            spill_time=datetime.utcnow().replace(microsecond=0),
            vessels=vessels,
            current_speed_knots=0.8,
            current_dir_deg=45.0,
            mode=current_mode
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

@router.post("/detect-sar", response_model=SlickCharacterization)
async def detect_sar_spill(
    center_lat: float = Form(18.5),
    center_lon: float = Form(70.2),
    sensor: str = Form("Sentinel-1 C-SAR"),
    mode: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    current_mode = mode or OPERATING_MODE

    if current_mode == "REAL_DATA_MODE" and not file:
        raise HTTPException(
            status_code=422,
            detail="Analysis unavailable: No valid satellite input supplied. In REAL DATA MODE, a genuine GeoTIFF/PNG satellite product file is required."
        )

    image_bytes = None
    if file:
        image_bytes = await file.read()

    try:
        return process_sar_image(image_bytes, center_lat, center_lon, sensor, mode=current_mode)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

@router.post("/jobs/create", response_model=Dict[str, str])
async def trigger_analysis_job(req: CreateJobRequest):
    job_id = create_analysis_job(req.incident_id, req.lat, req.lon, req.hours_back)
    return {"job_id": job_id, "status": "QUEUED"}

@router.get("/jobs/{job_id}", response_model=AnalysisJobStatus)
async def fetch_job_status(job_id: str):
    job = get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
