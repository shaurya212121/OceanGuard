from fastapi import APIRouter
from typing import List, Dict, Any
from datetime import datetime
from ..database import db_get_all_incidents
from ..models import DashboardStats, Alert

router = APIRouter()

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    incidents = await db_get_all_incidents()
    total_area = sum(inc.get('area_sq_km', 0.0) for inc in incidents)
    active_count = sum(1 for inc in incidents if inc.get('status') == 'investigating')
    
    return DashboardStats(
        total_spills=len(incidents),
        active_investigations=active_count,
        vessels_tracked=15,
        alerts_today=4,
        total_area_affected_sq_km=round(total_area, 1),
        highest_severity="critical",
        provenance_data_type="SYNTHETIC_DEMO_DATA"
    )

@router.get("/alerts", response_model=List[Alert])
async def get_alerts():
    from ..services.data_generator import get_state
    return get_state()["alerts"]

@router.get("/recent-spills", response_model=List[Dict[str, Any]])
async def get_recent_spills():
    incidents = await db_get_all_incidents()
    return incidents[:5]
