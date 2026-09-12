from fastapi import APIRouter
from typing import List
from ..services.data_generator import get_state
from ..models import DashboardStats, Alert, OilSpill

router = APIRouter()

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    return get_state()["stats"]

@router.get("/alerts", response_model=List[Alert])
async def get_alerts():
    return get_state()["alerts"]

@router.get("/recent-spills", response_model=List[OilSpill])
async def get_recent_spills():
    spills = get_state()["spills"]
    # Sort by detected_at descending (most recent first)
    sorted_spills = sorted(spills, key=lambda x: x.detected_at, reverse=True)
    return sorted_spills[:5]
