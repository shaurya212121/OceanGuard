from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..services.data_generator import get_state
from ..models import VesselTrack

router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
async def list_vessels():
    state = get_state()
    res = []
    for imo, v in state["vessels"].items():
        last_pos = v.positions[-1] if v.positions else None
        res.append({
            "imo_number": v.imo_number,
            "name": v.name,
            "vessel_type": v.vessel_type,
            "flag_country": v.flag_country,
            "last_known_position": {
                "lat": last_pos.lat if last_pos else None,
                "lon": last_pos.lon if last_pos else None,
                "timestamp": last_pos.timestamp if last_pos else None
            }
        })
    return res

@router.get("/{imo_number}", response_model=VesselTrack)
async def get_vessel(imo_number: str):
    state = get_state()
    if imo_number not in state["vessels"]:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return state["vessels"][imo_number]

@router.get("/{imo_number}/track", response_model=List[Dict[str, Any]])
async def get_vessel_track(imo_number: str):
    state = get_state()
    if imo_number not in state["vessels"]:
        raise HTTPException(status_code=404, detail="Vessel not found")
    v = state["vessels"][imo_number]
    return [{"lat": p.lat, "lon": p.lon, "timestamp": p.timestamp} for p in v.positions]
