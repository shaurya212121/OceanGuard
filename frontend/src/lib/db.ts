import supabase from './supabase';

// ── Types matching database schema ────────────────

export type SpillSeverity = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
export type SpillStatus = 'ACTIVE' | 'MONITORING' | 'CONTAINED' | 'RESOLVED';
export type VesselType =
  | 'Crude Oil Tanker' | 'Chemical Tanker' | 'Container Ship'
  | 'Bulk Carrier' | 'LNG Tanker' | 'Product Tanker'
  | 'Fishing Vessel' | 'General Cargo'
  | 'Cargo' | 'Tanker' | 'Fishing' | 'Container' | string;
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertType = 'SPILL_DETECTED' | 'VESSEL_FLAGGED' | 'SAT_LINK' | 'SYSTEM' | 'TRAJECTORY';
export type DriftDirection = 'BACKWARD' | 'FORWARD';

export interface SpillMetadata {
  type: string;
  age: string;
  wind_speed?: number;
  confidence?: string | number;
  confidence_note?: string;
}

export interface OilSpill {
  id: string;
  spill_id: string;
  name: string;
  severity: SpillSeverity;
  status: SpillStatus;
  lat: number;
  lng: number;
  area_km2: number;
  detected_at: string;
  polygon: [number, number][];
  origin_lat: number;
  origin_lng: number;
  forward_drift_lat: number;
  forward_drift_lng: number;
  estimated_volume_liters?: number;
  metadata?: SpillMetadata;
}

export interface Vessel {
  id: string;
  mmsi: string;
  name: string;
  type: VesselType;
  flag: string;
  flag_code: string;
  lat: number;
  lng: number;
  sog: number;
  cog: number;
  length: number | null;
  draft: number | null;
  risk: RiskLevel;
  imo: string | null;
  callsign: string | null;
  last_seen: string;
}

export interface SuspectVessel {
  id: string;
  spill_id: string;
  vessel_id: string;
  mmsi: string;
  name: string;
  type: string;
  flag: string;
  guilt_score: number;
  distance_nm: number;
  last_lat: number;
  last_lng: number;
  aoi_match: number;
}

export interface DriftPath {
  id: string;
  spill_id: string;
  direction: DriftDirection;
  waypoints: [number, number][];
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: SpillSeverity;
  title: string;
  description: string;
  lat: number | null;
  lng: number | null;
  spill_id: string | null;
  vessel_mmsi: string | null;
  timestamp: string;
}

export interface SpillWithSuspects extends OilSpill {
  suspects: SuspectVessel[];
  driftPaths: DriftPath[];
}

// ── Fetch functions ───────────────────────────────

export async function fetchSpills(): Promise<OilSpill[]> {
  const { data, error } = await supabase
    .from('oil_spills')
    .select('*')
    .order('detected_at', { ascending: false });

  if (error) throw error;
  
  return (data || []).map((spill: any) => {
    let metadata: SpillMetadata | undefined;
    if (spill.spill_type && spill.spill_type.startsWith('{')) {
      try { metadata = JSON.parse(spill.spill_type); } catch(e) {}
    }
    return {
      ...spill,
      lat: spill.center_lat,
      lng: spill.center_lon,
      area_km2: spill.area_sq_km,
      polygon: spill.polygon_coords,
      spill_id: spill.id.substring(0, 8).toUpperCase(),
      severity: (spill.severity || 'UNKNOWN').toUpperCase(),
      status: (spill.status || 'UNKNOWN').toUpperCase(),
      metadata,
    };
  }) as OilSpill[];
}

export async function fetchSpillById(spillId: string): Promise<SpillWithSuspects | null> {
  const { data: spill, error: spillError } = await supabase
    .from('oil_spills')
    .select('*')
    .eq('id', spillId)
    .maybeSingle();

  if (spillError) throw spillError;
  if (!spill) return null;

  let metadata: SpillMetadata | undefined;
  if (spill.spill_type && spill.spill_type.startsWith('{')) {
    try { metadata = JSON.parse(spill.spill_type); } catch(e) {}
  }

  const { data: suspects, error: suspectsError } = await supabase
    .from('suspect_vessels')
    .select('*')
    .eq('spill_id', spillId)
    .order('guilt_score', { ascending: false });

  if (suspectsError) throw suspectsError;

  const { data: driftPaths, error: driftError } = await supabase
    .from('drift_paths')
    .select('*')
    .eq('spill_id', spillId);

  if (driftError) throw driftError;

  // Safely extract drift info
  const firstDrift = (driftPaths && driftPaths.length > 0) ? driftPaths[0] : null;
  const origin_lat = firstDrift?.origin_lat || spill.center_lat;
  const origin_lng = firstDrift?.origin_lon || spill.center_lon;
  
  // Forward drift is the last point in forward_path
  let forward_drift_lat = spill.center_lat;
  let forward_drift_lng = spill.center_lon;
  if (firstDrift && firstDrift.forward_path && firstDrift.forward_path.length > 0) {
    const lastPoint = firstDrift.forward_path[firstDrift.forward_path.length - 1];
    forward_drift_lat = lastPoint.lat;
    forward_drift_lng = lastPoint.lon;
  }

  return {
    ...(spill as any),
    lat: spill.center_lat,
    lng: spill.center_lon,
    area_km2: spill.area_sq_km,
    polygon: spill.polygon_coords,
    origin_lat,
    origin_lng,
    forward_drift_lat,
    forward_drift_lng,
    spill_id: spill.id.substring(0, 8).toUpperCase(),
    severity: (spill.severity || 'UNKNOWN').toUpperCase(),
    status: (spill.status || 'UNKNOWN').toUpperCase(),
    metadata,
    suspects: (suspects || []).map((s: any) => ({
      ...s,
      vessel_id: s.mmsi,
      distance_nm: s.proximity_km * 0.539957,
      type: 'Unknown',
      flag: 'Unknown',
      last_lat: 0,
      last_lng: 0,
      aoi_match: s.guilt_score
    })),
    driftPaths: (driftPaths || []).map((d: any) => ({
      ...d,
      direction: 'FORWARD',
      waypoints: (d.forward_path || []).map((p: any) => [p.lat, p.lon])
    })),
  } as SpillWithSuspects;
}

export async function fetchVessels(): Promise<Vessel[]> {
  const [vesselsRes, suspectsRes] = await Promise.all([
    supabase
      .from('vessels')
      .select('*, vessel_positions(lat, lon, speed_knots, heading, timestamp)')
      .order('name', { ascending: true }),
    supabase
      .from('suspect_vessels')
      .select('mmsi, guilt_score')
  ]);

  if (vesselsRes.error) throw vesselsRes.error;
  
  const suspectsMap = new Map();
  if (suspectsRes.data) {
    for (const s of suspectsRes.data) {
      if (!suspectsMap.has(s.mmsi) || suspectsMap.get(s.mmsi) < s.guilt_score) {
        suspectsMap.set(s.mmsi, s.guilt_score);
      }
    }
  }
  
  return (vesselsRes.data || []).map((v: any) => {
    let positions = v.vessel_positions || [];
    positions.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const latestPos = positions[0] || { lat: 0, lon: 0, speed_knots: 0, heading: 0, timestamp: new Date().toISOString() };
    
    let risk = 'LOW';
    if (suspectsMap.has(v.mmsi)) {
      const score = suspectsMap.get(v.mmsi);
      if (score >= 80) risk = 'CRITICAL';
      else if (score >= 50) risk = 'HIGH';
      else risk = 'MEDIUM';
    }
    
    return {
      ...v,
      id: v.mmsi,
      type: v.vessel_type || 'Unknown',
      flag: v.flag_country || 'Unknown',
      flag_code: 'UN',
      lat: latestPos.lat,
      lng: latestPos.lon,
      sog: latestPos.speed_knots,
      cog: latestPos.heading,
      length: null,
      draft: null,
      risk: risk as RiskLevel,
      imo: v.imo_number,
      callsign: null,
      last_seen: latestPos.timestamp
    };
  }) as Vessel[];
}

export async function fetchAlerts(): Promise<Alert[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) throw error;
  
  return (data || []).map((a: any) => ({
    ...a,
    severity: (a.severity || 'UNKNOWN').toUpperCase(),
    title: a.message,
    description: a.message,
    spill_id: null,
    vessel_mmsi: null,
  })) as Alert[];
}

export async function fetchVesselPositions(vesselId: string) {
  const { data, error } = await supabase
    .from('vessel_positions')
    .select('*')
    .eq('mmsi', vesselId)
    .order('timestamp', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
}
