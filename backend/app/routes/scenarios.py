from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..services.data_generator import get_state
from ..models import SpillScenario, DriftPath, SuspectVessel

router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
async def list_scenarios():
    state = get_state()
    res = []
    for s_id, s in state["scenarios"].items():
        res.append({
            "id": s.spill.id,
            "name": s.spill.name,
            "severity": s.spill.severity,
            "status": s.spill.status,
            "center_coords": [s.spill.center_lat, s.spill.center_lon]
        })
    return res

@router.get("/{scenario_id}", response_model=SpillScenario)
async def get_scenario(scenario_id: str):
    state = get_state()
    if scenario_id not in state["scenarios"]:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return state["scenarios"][scenario_id]

@router.get("/{scenario_id}/drift", response_model=DriftPath)
async def get_scenario_drift(scenario_id: str):
    state = get_state()
    if scenario_id not in state["scenarios"]:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return state["scenarios"][scenario_id].drift

@router.get("/{scenario_id}/suspects", response_model=List[SuspectVessel])
async def get_scenario_suspects(scenario_id: str):
    state = get_state()
    if scenario_id not in state["scenarios"]:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return state["scenarios"][scenario_id].suspects
