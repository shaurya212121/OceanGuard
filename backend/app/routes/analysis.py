from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime
from typing import List
from ..models import DriftPath, SuspectVessel
from ..services.drift_simulator import simulate_drift
from ..services.vessel_scorer import score_vessels
from ..services.data_generator import get_state

router = APIRouter()

class HindcastRequest(BaseModel):
    lat: float
    lon: float
    hours_back: int
    current_speed: float
    current_direction: float

class ScoreRequest(BaseModel):
    origin_lat: float
    origin_lon: float
    origin_time: datetime

@router.post("/hindcast", response_model=DriftPath)
async def hindcast_drift(req: HindcastRequest):
    return simulate_drift(
        center_lat=req.lat,
        center_lon=req.lon,
        start_time=datetime.utcnow(), # use current time as start for arbitrary analysis
        hours_back=req.hours_back,
        hours_forward=12,
        current_speed_knots=req.current_speed,
        current_direction_deg=req.current_direction
    )

@router.post("/score-vessels", response_model=List[SuspectVessel])
async def analyze_vessels(req: ScoreRequest):
    state = get_state()
    vessels = list(state["vessels"].values())
    return score_vessels(
        spill_origin_lat=req.origin_lat,
        spill_origin_lon=req.origin_lon,
        spill_time=req.origin_time,
        vessels=vessels
    )
