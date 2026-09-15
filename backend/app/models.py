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
    mmsi: str
    imo_number: Optional[str] = None
    name: str
    flag_country: str
    vessel_type: str
    positions: List[VesselPosition]

class SuspectVessel(BaseModel):
    mmsi: str
    imo_number: Optional[str] = None
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

# --- Module 1: CV oil spill detection (two-stage hybrid pipeline) ---

class SpillRegionResult(BaseModel):
    polygon_latlon: Optional[List[List[float]]] = None
    polygon_px: List[List[float]]
    area_sq_km: Optional[float] = None
    perimeter_km: Optional[float] = None
    centroid_lat: Optional[float] = None
    centroid_lon: Optional[float] = None

class AgeEstimateResult(BaseModel):
    fragmentation_index: Optional[float] = None  # None/NaN when no regions were detected
    num_fragments: int
    bucket: str  # "fresh" | "intermediate" | "weathered" | "unknown"
    note: str

class SpillDetectionResponse(BaseModel):
    spill_detected: bool  # overall verdict after both stages
    mode: str  # segmentation mode ("unet"/"classical"), or "<classification_mode>_negative" if Stage 2 never ran
    confidence: float  # Stage 2 segmentation confidence (0 if Stage 2 never ran)
    classification_mode: str  # "cnn" or "heuristic" - Stage 1
    classification_confidence: float  # max spill probability seen across screened patches
    patches_screened: int
    patches_flagged: int  # patches Stage 1 handed to Stage 2
    total_area_sq_km: float
    primary_centroid_lat: Optional[float] = None
    primary_centroid_lon: Optional[float] = None
    primary_polygon_latlon: Optional[List[List[float]]] = None
    primary_polygon_px: Optional[List[List[float]]] = None
    regions: List[SpillRegionResult]
    age: AgeEstimateResult
    overlay_png_base64: str
