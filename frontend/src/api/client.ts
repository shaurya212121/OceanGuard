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
  SlickCharacterization,
  EvaluationMetrics,
  AnalysisJobStatus,
} from '../types';

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

// ─── Scenarios (Spills + Drift + Suspects) ───────────────────────────
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

export function fetchVessel(mmsi: string): Promise<VesselTrack> {
  return api<VesselTrack>(`/vessels/${mmsi}`);
}

export function fetchVesselTrack(mmsi: string): Promise<Array<{ lat: number; lon: number; timestamp: string }>> {
  return api(`/vessels/${mmsi}/track`);
}

// ─── Analysis & SAR Pipeline ─────────────────────────────────────────
export function runHindcast(params: {
  lat: number;
  lon: number;
  hours_back: number;
  current_speed: number;
  current_direction: number;
  wind_speed?: number;
  wind_direction?: number;
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
  polygon_coords?: number[][];
}): Promise<SuspectVessel[]> {
  return api<SuspectVessel[]>('/analysis/score-vessels', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function detectSarSpill(params: {
  center_lat: number;
  center_lon: number;
  sensor?: string;
  file?: File;
}): Promise<SlickCharacterization> {
  const formData = new FormData();
  formData.append('center_lat', params.center_lat.toString());
  formData.append('center_lon', params.center_lon.toString());
  formData.append('sensor', params.sensor || 'Sentinel-1 C-SAR');
  if (params.file) {
    formData.append('file', params.file);
  }

  return fetch(`${BASE}/analysis/detect-sar`, {
    method: 'POST',
    body: formData,
  }).then(res => {
    if (!res.ok) throw new Error(`SAR Detection failed: ${res.statusText}`);
    return res.json();
  });
}

export function createAnalysisJob(params: {
  incident_id: string;
  lat: number;
  lon: number;
  hours_back: number;
}): Promise<{ job_id: string; status: string }> {
  return api<{ job_id: string; status: string }>('/analysis/jobs/create', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function fetchJobStatus(jobId: string): Promise<AnalysisJobStatus> {
  return api<AnalysisJobStatus>(`/analysis/jobs/${jobId}`);
}

// ─── Evaluation Benchmark ───────────────────────────────────────────
export function fetchEvaluationStats(): Promise<EvaluationMetrics> {
  return api<EvaluationMetrics>('/evaluation/stats');
}

export function runEvaluationBenchmark(): Promise<EvaluationMetrics> {
  return api<EvaluationMetrics>('/evaluation/run-benchmark', {
    method: 'POST',
  });
}

// ─── Investigation Dossier Report Export ──────────────────────────────
export function fetchDossierReportUrl(incidentId: string, format: 'json' | 'html' = 'json'): string {
  return `${BASE}/reports/dossier/${incidentId}?format=${format}`;
}
