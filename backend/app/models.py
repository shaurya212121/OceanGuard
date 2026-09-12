from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import json

class OilSpill(BaseModel):
    id: str
    name: str
    detected_at: datetime
    center_lat: float
    center_lon: float
    area_sq_km: float
    severity: str # low/medium/high/critical
    status: str # detected/investigating/resolved
    polygon_coords: List[List[float]]
    estimated_volume_liters: float
    spill_type: str # crude/refined/unknown

class VesselPosition(BaseModel):
    lat: float
    lon: float
    timestamp: datetime
    speed_knots: float
    heading: float

class VesselTrack(BaseModel):
    imo_number: str
    name: str
    flag_country: str
    vessel_type: str
    positions: List[VesselPosition]

class SuspectVessel(BaseModel):
    imo_number: str
    name: str
    flag_country: str
    vessel_type: str
    guilt_score: float # 0-100
    proximity_km: float
    had_speed_drop: bool
    had_ais_gap: bool
    time_at_origin: Optional[datetime] = None
    reasons: List[str]

class DriftPoint(BaseModel):
    lat: float
    lon: float
    timestamp: datetime
    hours_offset: float

class DriftPath(BaseModel):
    forward_path: List[DriftPoint]
    backward_path: List[DriftPoint]
    origin_estimate: DriftPoint

class SpillScenario(BaseModel):
    spill: OilSpill
    drift: DriftPath
    vessels: List[VesselTrack]
    suspects: List[SuspectVessel]

class DashboardStats(BaseModel):
    total_spills: int
    active_investigations: int
    vessels_tracked: int
    alerts_today: int
    total_area_affected_sq_km: float
    highest_severity: str

class Alert(BaseModel):
    id: str
    timestamp: datetime
    message: str
    severity: str
