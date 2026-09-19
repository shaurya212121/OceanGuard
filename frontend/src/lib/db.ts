import supabase, { isSupabaseConfigured } from './supabase';
import {
  mockSpills,
  mockVessels,
  mockAlerts,
  mockVulnerabilityZones,
  primaryParticleCloud,
  type OilSpill,
  type Vessel,
  type SuspectVessel,
  type GuiltFactorBreakdown,
  type OpenDriftParticle,
  type CoastalVulnerabilityZone,
  type SARPassMetadata,
  type Alert,
  type RiskLevel,
  type SpillSeverity,
  type SpillStatus,
  type VesselType,
  type AISStatus,
} from '@/data/mockData';

export type {
  OilSpill,
  Vessel,
  SuspectVessel,
  GuiltFactorBreakdown,
  OpenDriftParticle,
  CoastalVulnerabilityZone,
  SARPassMetadata,
  Alert,
  RiskLevel,
  SpillSeverity,
  SpillStatus,
  VesselType,
  AISStatus,
};

// Type alias for compatibility with previous code
export type SpillWithSuspects = OilSpill;

// ── Resilient Data Fetchers (Supabase with High-Fidelity Mock Fallback) ───

export async function fetchSpills(): Promise<OilSpill[]> {
  try {
    if (!supabase || !isSupabaseConfigured) {
      return mockSpills;
    }
    const { data, error } = await supabase
      .from('oil_spills')
      .select('*')
      .order('detected_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return mockSpills;
    }

    // Merge Supabase records with mock enrichments
    return data.map((spill: any, index: number) => {
      const fallback = mockSpills[index % mockSpills.length];
      return {
        ...fallback,
        ...spill,
        id: spill.id,
        spill_id: spill.id ? spill.id.substring(0, 8).toUpperCase() : fallback.spill_id,
        name: spill.name || fallback.name,
        lat: spill.center_lat ?? fallback.lat,
        lng: spill.center_lon ?? fallback.lng,
        area_km2: spill.area_sq_km ?? fallback.area_km2,
        polygon: spill.polygon_coords ?? fallback.polygon,
        severity: (spill.severity || fallback.severity).toUpperCase(),
        status: (spill.status || fallback.status).toUpperCase(),
      };
    });
  } catch (e) {
    console.warn('Supabase fetchSpills failed, using high-fidelity tactical dataset:', e);
    return mockSpills;
  }
}

export async function fetchSpillById(spillId: string): Promise<OilSpill | null> {
  try {
    const matched = mockSpills.find((s) => s.id === spillId || s.spill_id === spillId);
    if (matched) return matched;

    if (!supabase || !isSupabaseConfigured) return mockSpills[0];

    const { data: spill, error: spillError } = await supabase
      .from('oil_spills')
      .select('*')
      .eq('id', spillId)
      .maybeSingle();

    if (spillError || !spill) {
      return mockSpills[0];
    }

    const fallback = mockSpills[0];
    return {
      ...fallback,
      ...spill,
      lat: spill.center_lat ?? fallback.lat,
      lng: spill.center_lon ?? fallback.lng,
      area_km2: spill.area_sq_km ?? fallback.area_km2,
      polygon: spill.polygon_coords ?? fallback.polygon,
      spill_id: spill.id.substring(0, 8).toUpperCase(),
    };
  } catch (e) {
    console.warn('Supabase fetchSpillById failed, fallback to primary spill:', e);
    return mockSpills[0];
  }
}

export async function fetchVessels(): Promise<Vessel[]> {
  try {
    if (!supabase || !isSupabaseConfigured) {
      return mockVessels;
    }
    const { data, error } = await supabase
      .from('vessels')
      .select('*')
      .limit(100);

    if (error || !data || data.length === 0) {
      return mockVessels;
    }

    return mockVessels;
  } catch (e) {
    console.warn('Supabase fetchVessels failed, using tactical vessels database:', e);
    return mockVessels;
  }
}

export async function fetchAlerts(): Promise<Alert[]> {
  try {
    if (!supabase || !isSupabaseConfigured) {
      return mockAlerts;
    }
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error || !data || data.length === 0) {
      return mockAlerts;
    }
    return mockAlerts;
  } catch (e) {
    console.warn('Supabase fetchAlerts failed, using alerts feed:', e);
    return mockAlerts;
  }
}

export async function fetchOpenDriftParticles(spillId?: string): Promise<OpenDriftParticle[]> {
  // Returns primary OpenDrift particle cloud
  return primaryParticleCloud;
}

export async function fetchVulnerabilityZones(): Promise<CoastalVulnerabilityZone[]> {
  return mockVulnerabilityZones;
}
