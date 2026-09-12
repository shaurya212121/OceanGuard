// ─── Oil Spill ───────────────────────────────────────────────────────
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
}

// ─── Vessel (list endpoint summary) ──────────────────────────────────
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

// ─── Vessel Position (single AIS ping) ───────────────────────────────
export interface VesselPosition {
  lat: number;
  lon: number;
  timestamp: string;
  speed_knots: number;
  heading: number;
}

// ─── Full Vessel Track ───────────────────────────────────────────────
export interface VesselTrack {
  mmsi: string;
  imo_number?: string;
  name: string;
  flag_country: string;
  vessel_type: string;
  positions: VesselPosition[];
}

// ─── Suspect Vessel ──────────────────────────────────────────────────
export interface SuspectVessel {
  mmsi: string;
  imo_number?: string;
  name: string;
  flag_country: string;
  vessel_type: string;
  guilt_score: number;
  proximity_km: number;
  had_speed_drop: boolean;
  had_ais_gap: boolean;
  time_at_origin: string | null;
  reasons: string[];
}

// ─── Drift Simulation ────────────────────────────────────────────────
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
}

// ─── Full Scenario (spill + drift + vessels + suspects) ──────────────
export interface SpillScenario {
  spill: Spill;
  drift: DriftPath;
  vessels: VesselTrack[];
  suspects: SuspectVessel[];
}

// ─── Scenario list item (from GET /scenarios/) ──────────────────────
export interface ScenarioListItem {
  id: string;
  name: string;
  severity: string;
  status: string;
  center_coords: [number, number];
}

// ─── Dashboard ───────────────────────────────────────────────────────
export interface DashboardStats {
  total_spills: number;
  active_investigations: number;
  vessels_tracked: number;
  alerts_today: number;
  total_area_affected_sq_km: number;
  highest_severity: string;
}

// ─── Alert ───────────────────────────────────────────────────────────
export interface Alert {
  id: string;
  timestamp: string;
  message: string;
  severity: string;
}
