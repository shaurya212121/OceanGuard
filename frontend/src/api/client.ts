import type {
  DashboardStats,
  Alert,
  Spill,
  ScenarioListItem,
  SpillScenario,
  VesselSummary,
  VesselTrack,
  DriftPath,
  SuspectVessel,
} from '../types';

// ─── Helper ──────────────────────────────────────────────────────────

const BASE = '/api/v1';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText} — ${path}`);
  }
  return res.json() as Promise<T>;
}

// ─── Dashboard ───────────────────────────────────────────────────────

export function fetchDashboardStats(): Promise<DashboardStats> {
  return api<DashboardStats>('/dashboard/stats');
}

export function fetchAlerts(): Promise<Alert[]> {
  return api<Alert[]>('/dashboard/alerts');
}

export function fetchRecentSpills(): Promise<Spill[]> {
  return api<Spill[]>('/dashboard/recent-spills');
}

// ─── Scenarios (spills + drift + suspects) ───────────────────────────

export function fetchScenarios(): Promise<ScenarioListItem[]> {
  return api<ScenarioListItem[]>('/scenarios/');
}

export function fetchScenario(scenarioId: string): Promise<SpillScenario> {
  return api<SpillScenario>(`/scenarios/${scenarioId}`);
}

export function fetchScenarioDrift(scenarioId: string): Promise<DriftPath> {
  return api<DriftPath>(`/scenarios/${scenarioId}/drift`);
}

export function fetchScenarioSuspects(scenarioId: string): Promise<SuspectVessel[]> {
  return api<SuspectVessel[]>(`/scenarios/${scenarioId}/suspects`);
}

// ─── Vessels ─────────────────────────────────────────────────────────

export function fetchVessels(): Promise<VesselSummary[]> {
  return api<VesselSummary[]>('/vessels/');
}

export function fetchVessel(imo: string): Promise<VesselTrack> {
  return api<VesselTrack>(`/vessels/${imo}`);
}

export function fetchVesselTrack(imo: string): Promise<Array<{ lat: number; lon: number; timestamp: string }>> {
  return api(`/vessels/${imo}/track`);
}

// ─── Analysis (on-demand) ────────────────────────────────────────────

export function runHindcast(params: {
  lat: number;
  lon: number;
  hours_back: number;
  current_speed: number;
  current_direction: number;
}): Promise<DriftPath> {
  return api<DriftPath>('/analysis/hindcast', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function runVesselScoring(params: {
  origin_lat: number;
  origin_lon: number;
  origin_time: string;
}): Promise<SuspectVessel[]> {
  return api<SuspectVessel[]>('/analysis/score-vessels', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
