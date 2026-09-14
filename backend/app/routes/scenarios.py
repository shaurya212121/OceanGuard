from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from ..database import db_get_all_incidents, db_get_incident_by_id
from ..models import SpillScenario, DriftPath, SuspectVessel, ScenarioListItem

router = APIRouter()

@router.get("/", response_model=List[ScenarioListItem])
async def list_scenarios():
    incidents = await db_get_all_incidents()
    res = []
    for inc in incidents:
        polygon = [18.5, 70.2]
        if inc.get('center_lat') and inc.get('center_lon'):
            polygon = [inc['center_lat'], inc['center_lon']]
            
        res.append(ScenarioListItem(
            id=inc['id'],
            name=inc['name'],
            severity=inc['severity'],
            status=inc['status'],
            center_coords=polygon,
            provenance_data_type=inc.get('data_provenance_type', 'SYNTHETIC_DEMO_DATA')
        ))
    return res

@router.get("/{scenario_id}", response_model=Dict[str, Any])
async def get_scenario(scenario_id: str):
    inc = await db_get_incident_by_id(scenario_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return inc

@router.get("/{scenario_id}/drift", response_model=Dict[str, Any])
async def get_scenario_drift(scenario_id: str):
    inc = await db_get_incident_by_id(scenario_id)
    if not inc or 'drift_run' not in inc:
        raise HTTPException(status_code=404, detail="Drift data not found")
    return inc['drift_run']

@router.get("/{scenario_id}/suspects", response_model=List[Dict[str, Any]])
async def get_scenario_suspects(scenario_id: str):
    inc = await db_get_incident_by_id(scenario_id)
    if not inc or 'suspects' not in inc:
        raise HTTPException(status_code=404, detail="Suspect data not found")
    return inc['suspects']
