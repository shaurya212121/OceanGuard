// ─── Data Provenance ──────────────────────────────────────────────────
export interface DataProvenance {
  data_type: 'REAL_DATA' | 'SYNTHETIC_DEMO_DATA';
  source_name: string;
  is_live: boolean;
}

// ─── Look-Alike Classification Probabilities ─────────────────────────
export interface LookAlikeProbabilities {
  oil_spill: number;
  low_wind_area: number;
  ship_wake: number;
  biogenic_film: number;
  rain_formation: number;
}

// ─── Slick Characterization ──────────────────────────────────────────
export interface SlickCharacterization {
  area_sq_km: number;
  perimeter_km: number;
  centroid_lat: number;
  centroid_lon: number;
  length_km: number;
  width_km: number;
  orientation_deg: number;
  uncertainty_radius_km: number;
  polygon_coords: number[][];
  lookalike_probs: LookAlikeProbabilities;
  sensor: string;
  confidence: number;
}

// ─── Oil Spill Incident ──────────────────────────────────────────────
export interface Spill {
  id: string;
  name: string;
  detected_at: string;
  center_lat: number;
  center_lon: number;
  area_sq_km: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'detected' | 'investigating' | 'resolved';
  polygon_coords: number[][];
  estimated_volume_liters: number;
  spill_type: string;
  provenance?: DataProvenance;
  characterization?: SlickCharacterization;
}

// ─── Vessel Position & Track ────────────────────────────────────────
export interface VesselPosition {
  lat: number;
  lon: number;
  timestamp: string;
  speed_knots: number;
  heading: number;
}

export interface VesselTrack {
  mmsi: string;
  imo_number?: string;
  name: string;
  flag_country: string;
  vessel_type: string;
  positions: VesselPosition[];
}

export interface VesselSummary {
  mmsi: string;
  imo_number?: string;
  name: string;
  vessel_type: string;
  flag_country: string;
  last_known_position: {
    lat: number | null;
    lon: number | null;
    timestamp: string | null;
  };
}

// ─── Explainable Evidence Breakdown ──────────────────────────────────
export interface EvidenceBreakdown {
  spatial_proximity_score: number;
  temporal_consistency_score: number;
  trajectory_intersection_score: number;
  speed_anomaly_score: number;
  ais_gap_score: number;
  counterfactual_iou_score: number;
  vessel_type_compatibility: number;
  counterfactual_iou: number;
  reasons: string[];
}

// ─── Suspect Vessel (Multi-Factor Attribution) ──────────────────────
export interface SuspectVessel {
  mmsi: string;
  imo_number?: string;
  name: string;
  flag_country: string;
  vessel_type: string;
  attribution_evidence_score: number; // 0-100 (formerly guilt_score)
  proximity_km: number;
  had_relevant_speed_drop: boolean;
  had_relevant_ais_gap: boolean;
  time_at_origin: string | null;
  evidence_breakdown: EvidenceBreakdown;
  disclaimer: string;
}

// ─── Source Region ───────────────────────────────────────────────────
export interface SourceRegion {
  polygon_coords: number[][];
  centroid_lat: number;
  centroid_lon: number;
  time_window_start: string;
  time_window_end: string;
  uncertainty_radius_km: number;
}

// ─── Drift Path ──────────────────────────────────────────────────────
export interface DriftPoint {
  lat: number;
  lon: number;
  timestamp: string;
  hours_offset: number;
}

export interface DriftPath {
  forward_path: DriftPoint[];
  backward_path: DriftPoint[];
  origin_estimate: DriftPoint;
  source_region?: SourceRegion;
}

// ─── Full Scenario Package ───────────────────────────────────────────
export interface SpillScenario {
  spill: Spill;
  drift: DriftPath;
  vessels: VesselTrack[];
  suspects: SuspectVessel[];
}

export interface ScenarioListItem {
  id: string;
  name: string;
  severity: string;
  status: string;
  center_coords: [number, number];
  provenance_data_type?: string;
}

// ─── Dashboard Stats & Alert ────────────────────────────────────────
export interface DashboardStats {
  total_spills: number;
  active_investigations: number;
  vessels_tracked: number;
  alerts_today: number;
  total_area_affected_sq_km: number;
  highest_severity: string;
  provenance_data_type?: string;
}

export interface Alert {
  id: string;
  timestamp: string;
  message: string;
  severity: string;
}

// ─── Asynchronous Analysis Job ───────────────────────────────────────
export interface AnalysisJobStatus {
  job_id: string;
  incident_id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  current_stage: string;
  progress_pct: number;
  result?: {
    incident_id: string;
    sar_characterization: SlickCharacterization;
    drift_path: DriftPath;
    suspects: SuspectVessel[];
  };
  error?: string;
  created_at: string;
  updated_at: string;
}

// ─── System Evaluation Metrics ───────────────────────────────────────
export interface EvaluationMetrics {
  is_evaluated: boolean;
  evaluation_dataset_name: string;
  sar_precision: number | null;
  sar_recall: number | null;
  sar_f1_score: number | null;
  sar_iou: number | null;
  false_positive_rate: number | null;
  source_location_error_km: number | null;
  source_time_error_hours: number | null;
  top1_attribution_accuracy: number | null;
  top3_attribution_accuracy: number | null;
  counterfactual_consistency_score: number | null;
}
