from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..services.data_generator import get_state
from ..models import VesselTrack

router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
async def list_vessels():
    state = get_state()
    res = []
    for mmsi, v in state["vessels"].items():
        last_pos = v.positions[-1] if v.positions else None
        res.append({
            "mmsi": v.mmsi,
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

@router.get("/{mmsi}", response_model=VesselTrack)
async def get_vessel(mmsi: str):
    state = get_state()
    if mmsi not in state["vessels"]:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return state["vessels"][mmsi]

@router.get("/{mmsi}/track", response_model=List[Dict[str, Any]])
async def get_vessel_track(mmsi: str):
    state = get_state()
    if mmsi not in state["vessels"]:
        raise HTTPException(status_code=404, detail="Vessel not found")
    v = state["vessels"][mmsi]
    return [{"lat": p.lat, "lon": p.lon, "timestamp": p.timestamp} for p in v.positions]
