from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# ─── Data Provenance & Disclaimers ────────────────────────────────────
DATA_PROVENANCE_DISCLAIMER = (
    "Ranking represents physical and temporal consistency with available evidence "
    "and is not legal proof of responsibility."
)

class DataProvenance(BaseModel):
    data_type: str = "SYNTHETIC_DEMO_DATA" # REAL_DATA | SYNTHETIC_DEMO_DATA
    source_name: str = "SIH26143 Benchmark Generator"
    is_live: bool = False

# ─── Look-Alike Classification ───────────────────────────────────────
class LookAlikeProbabilities(BaseModel):
    oil_spill: float
    low_wind_area: float
    ship_wake: float
    biogenic_film: float
    rain_formation: float

# ─── Slick Characterization ──────────────────────────────────────────
class SlickCharacterization(BaseModel):
    area_sq_km: float
    perimeter_km: float
    centroid_lat: float
    centroid_lon: float
    length_km: float
    width_km: float
    orientation_deg: float
    uncertainty_radius_km: float
    polygon_coords: List[List[float]]
    lookalike_probs: LookAlikeProbabilities
    sensor: str = "Sentinel-1 C-SAR"
    confidence: float = 94.5

# ─── Oil Spill Incident ──────────────────────────────────────────────
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
    provenance: DataProvenance = Field(default_factory=DataProvenance)
    characterization: Optional[SlickCharacterization] = None

# ─── Source Region Estimation ─────────────────────────────────────────
class SourceRegion(BaseModel):
    polygon_coords: List[List[float]]
    centroid_lat: float
    centroid_lon: float
    time_window_start: datetime
    time_window_end: datetime
    uncertainty_radius_km: float

# ─── Drift Simulation Points & Path ──────────────────────────────────
class DriftPoint(BaseModel):
    lat: float
    lon: float
    timestamp: datetime
    hours_offset: float

class DriftPath(BaseModel):
    forward_path: List[DriftPoint]
    backward_path: List[DriftPoint]
    origin_estimate: DriftPoint
    source_region: Optional[SourceRegion] = None

# ─── Vessel Positioning & Tracks ─────────────────────────────────────
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

class VesselSummary(BaseModel):
    mmsi: str
    imo_number: Optional[str] = None
    name: str
    vessel_type: str
    flag_country: str
    last_known_position: Dict[str, Any]

# ─── Multi-Factor Attribution Evidence ──────────────────────────────
class EvidenceBreakdown(BaseModel):
    spatial_proximity_score: float # 0-25
    temporal_consistency_score: float # 0-20
    trajectory_intersection_score: float # 0-20
    speed_anomaly_score: float # 0-10
    ais_gap_score: float # 0-10
    counterfactual_iou_score: float # 0-15
    vessel_type_compatibility: float # 0-10
    counterfactual_iou: float # 0.0 - 1.0 (actual polygon IoU)
    reasons: List[str]

class SuspectVessel(BaseModel):
    mmsi: str
    imo_number: Optional[str] = None
    name: str
    flag_country: str
    vessel_type: str
    attribution_evidence_score: float # 0-100 (formerly guilt_score)
    proximity_km: float
    had_relevant_speed_drop: bool
    had_relevant_ais_gap: bool
    time_at_origin: Optional[datetime] = None
    evidence_breakdown: EvidenceBreakdown
    disclaimer: str = DATA_PROVENANCE_DISCLAIMER

# ─── Full Scenario Package ───────────────────────────────────────────
class SpillScenario(BaseModel):
    spill: OilSpill
    drift: DriftPath
    vessels: List[VesselTrack]
    suspects: List[SuspectVessel]

class ScenarioListItem(BaseModel):
    id: str
    name: str
    severity: str
    status: str
    center_coords: List[float]
    provenance_data_type: str = "SYNTHETIC_DEMO_DATA"

# ─── Dashboard Stats & Alerts ────────────────────────────────────────
class DashboardStats(BaseModel):
    total_spills: int
    active_investigations: int
    vessels_tracked: int
    alerts_today: int
    total_area_affected_sq_km: float
    highest_severity: str
    provenance_data_type: str = "SYNTHETIC_DEMO_DATA"

class Alert(BaseModel):
    id: str
    timestamp: datetime
    message: str
    severity: str

# ─── Asynchronous Analysis Job Models ────────────────────────────────
class AnalysisJobStatus(BaseModel):
    job_id: str
    incident_id: str
    status: str # QUEUED / PROCESSING / COMPLETED / FAILED
    current_stage: str
    progress_pct: int
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime

# ─── GeoTIFF Validation & Metadata Response ──────────────────────────
class GeoTIFFValidationResponse(BaseModel):
    valid: bool
    format: str = "GeoTIFF"
    crs: Optional[str] = None
    bounds: Optional[List[float]] = None # [min_lat, min_lon, max_lat, max_lon]
    width: int = 0
    height: int = 0
    polarization: Optional[str] = None
    acquisition_time: Optional[str] = None
    provenance: str = "REAL" # REAL | SYNTHETIC | UNKNOWN
    error_detail: Optional[str] = None

# ─── AIS Data Provenance Metadata ─────────────────────────────────────
class AISDataProvenance(BaseModel):
    source_type: str = "SyntheticBenchmark" # MarineCadastre | SyntheticBenchmark
    source_name: str = "SIH Benchmark AIS Data"
    source_url: Optional[str] = None
    download_date: Optional[str] = None
    coverage_start: Optional[datetime] = None
    coverage_end: Optional[datetime] = None
    geographic_bounds: Optional[List[float]] = None
    is_real: bool = False
    is_live: bool = False

# ─── System Evaluation Metrics ───────────────────────────────────────
class EvaluationMetrics(BaseModel):
    is_evaluated: bool = False
    evaluation_dataset_name: str = "Not Yet Evaluated"
    benchmark_mode: str = "Synthetic Benchmark Validation"
    model_type: str = "HEURISTIC_BASELINE_V1 (Heuristic SAR baseline — not a trained deep-learning model.)"
    num_scenarios_evaluated: int = 0
    sar_precision: Optional[float] = None
    sar_recall: Optional[float] = None
    sar_f1_score: Optional[float] = None
    sar_iou: Optional[float] = None
    false_positive_rate: Optional[float] = None
    source_location_error_km: Optional[float] = None
    median_source_location_error_km: Optional[float] = None
    source_time_error_hours: Optional[float] = None
    containment_95_pct_km: Optional[float] = None
    top1_attribution_accuracy: Optional[float] = None
    top3_attribution_accuracy: Optional[float] = None
    mean_reciprocal_rank: Optional[float] = None # MRR
    counterfactual_consistency_score: Optional[float] = None

