// ─────────────────────────────────────────────────────────────────────────────
// OceanGuard Tactical Defense Command Console — High-Fidelity Tactical Mock Data
// ─────────────────────────────────────────────────────────────────────────────

export type VesselType =
  | 'Crude Oil Tanker'
  | 'Chemical Tanker'
  | 'Product Tanker'
  | 'LNG Tanker'
  | 'Container Ship'
  | 'Bulk Carrier'
  | 'General Cargo'
  | 'Fishing Vessel';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type SpillSeverity = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
export type SpillStatus = 'ACTIVE' | 'MONITORING' | 'CONTAINED' | 'RESOLVED';
export type AISStatus = 'ACTIVE' | 'INTERMITTENT' | 'SILENT';

export interface GuiltFactorBreakdown {
  spatiotemporal_proximity: number; // 0-100: Distance & time alignment to backward drift release window
  ais_anomaly_score: number;        // 0-100: Deliberate AIS blackout / Kalman-smoothed gap
  trajectory_speed_vector: number;  // 0-100: Loitering or sudden course divergence
  vessel_discharge_risk: number;    // 0-100: Crude tanker / chemical carrier discharge rating
  radar_corroboration: number;      // 0-100: Dark Vessel Radar Corroboration (SAR target detection without AIS)
}

export interface SuspectVessel {
  id: string;
  spill_id: string;
  vessel_id: string;
  mmsi: string;
  name: string;
  imo: string;
  type: VesselType;
  flag: string;
  flag_code: string;
  guilt_score: number;
  factors: GuiltFactorBreakdown;
  distance_nm: number;
  time_offset_hrs: number;
  last_lat: number;
  last_lng: number;
  sog: number;
  cog: number;
  aoi_match: number;
  ais_status: AISStatus;
  gap_duration_mins: number;
  dwt: number;
  length_m: number;
  draft_m: number;
  built_year: number;
  owner_operator: string;
  pi_club: string; // Protection and Indemnity club (insurer)
  radar_sar_matched: boolean;
  radar_rcs_m2: number; // Radar Cross Section
  track_points: [number, number, string][]; // [lat, lng, timestamp]
}

export interface OpenDriftParticle {
  id: number;
  base_lat: number;
  base_lng: number;
  time_offsets: Record<number, [number, number]>; // key: hours (-48 to +72), val: [lat, lng]
  droplet_size_um: number; // micrometers
  weathering_state: 'FRESH' | 'EMULSIFIED' | 'DISPERSED' | 'BEACHED';
}

export interface CoastalVulnerabilityZone {
  id: string;
  name: string;
  type: 'CORAL_REEF' | 'FISHERY_ZONE' | 'MANGROVE_SANCTUARY' | 'DESALINATION_PLANT' | 'MARINE_PARK';
  esi_index: number; // Environmental Sensitivity Index (1 - 10)
  polygon: [number, number][];
  distance_to_spill_nm: number;
  estimated_impact_hrs: number;
}

export interface SARPassMetadata {
  satellite: string;
  orbit_pass: string;
  sensor_mode: string;
  polarization: string;
  incidence_angle_deg: number;
  resolution_m: number;
  look_alike_probability: number;
  wind_speed_ms: number;
  wave_height_m: number;
  segmentation_confidence: number;
  raw_chip_url: string;
  mask_chip_url: string;
  bounds: [[number, number], [number, number]]; // Leaflet LatLngBounds
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
  estimated_volume_liters: number;
  detected_at: string;
  polygon: [number, number][];
  origin_lat: number;
  origin_lng: number;
  forward_drift_lat: number;
  forward_drift_lng: number;
  drift_velocity_kts: number;
  drift_heading_deg: number;
  current_speed_kts: number;
  current_direction_deg: number;
  wind_speed_kts: number;
  wind_direction_deg: number;
  sar_metadata: SARPassMetadata;
  suspects: SuspectVessel[];
  vulnerability_zones: CoastalVulnerabilityZone[];
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
  length: number;
  draft: number;
  dwt: number;
  risk: RiskLevel;
  risk_score: number;
  ais_status: AISStatus;
  imo: string;
  callsign: string;
  last_seen: string;
  in_spill_aoi: boolean;
  destination: string;
  eta: string;
  track_history: [number, number][];
}

export interface Alert {
  id: string;
  type: 'SPILL_DETECTED' | 'VESSEL_FLAGGED' | 'SAT_LINK' | 'SYSTEM' | 'TRAJECTORY' | 'DARK_VESSEL';
  severity: SpillSeverity;
  title: string;
  description: string;
  timestamp: string;
  lat?: number;
  lng?: number;
  spill_id?: string;
  vessel_mmsi?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Detailed 120-Particle OpenDrift Simulation Generation
// ─────────────────────────────────────────────────────────────────────────────

function generateParticleCloud(originLat: number, originLng: number, spillLat: number, spillLng: number, forwardLat: number, forwardLng: number): OpenDriftParticle[] {
  const particles: OpenDriftParticle[] = [];
  const hours = [-48, -36, -24, -12, -6, -3, 0, 3, 6, 12, 24, 36, 48, 60, 72];
  
  for (let i = 0; i < 110; i++) {
    const seedAngle = (i / 110) * Math.PI * 2;
    const seedRadius = (Math.sin(i * 13) * 0.5 + 0.5) * 0.025; // 0 to ~2.5 km variance
    
    const timeOffsets: Record<number, [number, number]> = {};
    
    hours.forEach((h) => {
      let centerLat: number;
      let centerLng: number;
      let spreadFactor: number;

      if (h <= 0) {
        // Interpolate between originLat/originLng and spillLat/spillLng
        const t = (h + 48) / 48; // 0 at -48h, 1 at 0h
        centerLat = originLat + (spillLat - originLat) * t;
        centerLng = originLng + (spillLng - originLng) * t;
        // As we go back in time, uncertainty/spread slightly contracts toward the release pipe/vessel
        spreadFactor = 0.5 + 0.5 * t;
      } else {
        // Interpolate between spillLat/spillLng and forwardLat/forwardLng
        const t = h / 72; // 0 at 0h, 1 at 72h
        centerLat = spillLat + (forwardLat - spillLat) * t;
        centerLng = spillLng + (forwardLng - spillLng) * t;
        // As time advances, turbulent diffusion expands the slick
        spreadFactor = 1.0 + t * 2.2;
      }

      // Add turbulent Gaussian jitter
      const jitterLat = Math.sin(seedAngle + h * 0.2) * seedRadius * spreadFactor + ((i % 5) - 2) * 0.003 * spreadFactor;
      const jitterLng = Math.cos(seedAngle + h * 0.2) * seedRadius * spreadFactor + ((i % 7) - 3) * 0.003 * spreadFactor;

      timeOffsets[h] = [
        Number((centerLat + jitterLat).toFixed(5)),
        Number((centerLng + jitterLng).toFixed(5)),
      ];
    });

    particles.push({
      id: i + 1,
      base_lat: spillLat,
      base_lng: spillLng,
      time_offsets: timeOffsets,
      droplet_size_um: 20 + (i % 80) * 4,
      weathering_state: i > 80 ? 'EMULSIFIED' : i > 40 ? 'FRESH' : 'DISPERSED',
    });
  }

  return particles;
}

export const primaryParticleCloud = generateParticleCloud(
  19.4200, 71.3000, // Origin (-48h)
  19.3000, 71.4000, // Spill Center (T=0)
  19.1500, 71.5500  // Forward Projection (+72h)
);

// ─────────────────────────────────────────────────────────────────────────────
// Coastal Vulnerability Zones
// ─────────────────────────────────────────────────────────────────────────────

export const mockVulnerabilityZones: CoastalVulnerabilityZone[] = [
  {
    id: 'cvz-1',
    name: 'Gulf of Mannar Coral Reef Biosphere',
    type: 'CORAL_REEF',
    esi_index: 9.8,
    distance_to_spill_nm: 35.4,
    estimated_impact_hrs: 44.5,
    polygon: [
      [9.1500, 79.0500],
      [9.2500, 79.1500],
      [9.2000, 79.2000],
      [9.1000, 79.1000],
    ],
  },
  {
    id: 'cvz-2',
    name: 'Sundarbans Mangrove Reserve',
    type: 'MANGROVE_SANCTUARY',
    esi_index: 10.0,
    distance_to_spill_nm: 65.1,
    estimated_impact_hrs: 81.0,
    polygon: [
      [21.8500, 88.8500],
      [21.9500, 88.9500],
      [21.9000, 89.0500],
      [21.8000, 88.9500],
    ],
  },
  {
    id: 'cvz-3',
    name: 'Chilika Lake Fishery & Bird Sanctuary',
    type: 'FISHERY_ZONE',
    esi_index: 8.4,
    distance_to_spill_nm: 45.3,
    estimated_impact_hrs: 58.2,
    polygon: [
      [19.6500, 85.2500],
      [19.7500, 85.3500],
      [19.7000, 85.4500],
      [19.6000, 85.3000],
    ],
  },
  {
    id: 'cvz-4',
    name: 'Gulf of Kutch Marine National Park',
    type: 'MARINE_PARK',
    esi_index: 9.2,
    distance_to_spill_nm: 25.0,
    estimated_impact_hrs: 32.0,
    polygon: [
      [22.4500, 69.1500],
      [22.5500, 69.2500],
      [22.5000, 69.3500],
      [22.4000, 69.2000],
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Oil Spills with 5-Factor Suspect Attribution
// ─────────────────────────────────────────────────────────────────────────────

export const mockSpills: OilSpill[] = [
  {
    id: 's1',
    spill_id: 'OG-2026-0913-001',
    name: 'Mumbai High Offshore — ONGC Basin',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    lat: 19.3000,
    lng: 71.4000,
    area_km2: 4.82,
    estimated_volume_liters: 4820000, // 4.82 ML
    detected_at: '2026-09-13T06:42:00Z',
    origin_lat: 19.4200,
    origin_lng: 71.3000,
    forward_drift_lat: 19.1500,
    forward_drift_lng: 71.5500,
    drift_velocity_kts: 1.4,
    drift_heading_deg: 135,
    current_speed_kts: 0.9,
    current_direction_deg: 140,
    wind_speed_kts: 12.8,
    wind_direction_deg: 310,
    polygon: [
      [19.3000, 71.4000],
      [19.2800, 71.4200],
      [19.2500, 71.4000],
      [19.2400, 71.3700],
      [19.2600, 71.3500],
      [19.2800, 71.3400],
      [19.3100, 71.3600],
      [19.3200, 71.3800],
    ],
    sar_metadata: {
      satellite: 'Sentinel-1A SAR-C',
      orbit_pass: 'Relative Orbit #114 / Frame 489',
      sensor_mode: 'Interferometric Wide Swath (IW)',
      polarization: 'VV + VH Co-Polarized',
      incidence_angle_deg: 38.4,
      resolution_m: 10.0,
      look_alike_probability: 4.2, // Low lookalike false-positive risk
      wind_speed_ms: 6.4,
      wave_height_m: 1.1,
      segmentation_confidence: 96.8,
      raw_chip_url: '/sample_sar/spill_class_1_01840.jpg',
      mask_chip_url: '/sample_sar/spill_class_1_01841.jpg',
      bounds: [
        [19.1500, 71.2500],
        [19.4500, 71.6000],
      ],
    },
    vulnerability_zones: [mockVulnerabilityZones[3]],
    suspects: [
      {
        id: 'sus-1',
        spill_id: 's1',
        vessel_id: 'v101',
        mmsi: '419000123',
        name: 'INS VIKRANT SHADOW',
        imo: '9486712',
        type: 'Crude Oil Tanker',
        flag: 'India',
        flag_code: 'IN',
        guilt_score: 94.2,
        factors: {
          spatiotemporal_proximity: 97.5,
          ais_anomaly_score: 95.0,
          trajectory_speed_vector: 92.0,
          vessel_discharge_risk: 94.0,
          radar_corroboration: 92.5,
        },
        distance_nm: 2.1,
        time_offset_hrs: -0.8,
        last_lat: 19.4200,
        last_lng: 71.3000,
        sog: 9.5,
        cog: 145,
        aoi_match: 96.5,
        ais_status: 'INTERMITTENT',
        gap_duration_mins: 47,
        dwt: 308500,
        length_m: 333,
        draft_m: 21.4,
        built_year: 2017,
        owner_operator: 'Shipping Corporation of India',
        pi_club: 'The London P&I Club',
        radar_sar_matched: true,
        radar_rcs_m2: 34200,
        track_points: [
          [19.5000, 71.2000, '2026-09-13T05:00:00Z'],
          [19.4600, 71.2500, '2026-09-13T05:30:00Z'],
          [19.4200, 71.3000, '2026-09-13T06:00:00Z'],
          [19.3800, 71.3400, '2026-09-13T06:45:00Z'],
          [19.3400, 71.3800, '2026-09-13T07:15:00Z'],
        ],
      },
      {
        id: 'sus-2',
        spill_id: 's1',
        vessel_id: 'v102',
        mmsi: '538090145',
        name: 'KRISHNA CARRIER',
        imo: '9345678',
        type: 'Crude Oil Tanker',
        flag: 'Marshall Islands',
        flag_code: 'MH',
        guilt_score: 87.4,
        factors: {
          spatiotemporal_proximity: 88.0,
          ais_anomaly_score: 89.0,
          trajectory_speed_vector: 91.0,
          vessel_discharge_risk: 86.0,
          radar_corroboration: 83.0,
        },
        distance_nm: 25.8,
        time_offset_hrs: -2.1,
        last_lat: 18.9500,
        last_lng: 72.1000,
        sog: 0.2,
        cog: 12,
        aoi_match: 84.0,
        ais_status: 'INTERMITTENT',
        gap_duration_mins: 32,
        dwt: 298000,
        length_m: 330,
        draft_m: 20.8,
        built_year: 2014,
        owner_operator: 'Gulf Tanker Fleet Holdings',
        pi_club: 'Gard AS (Norway)',
        radar_sar_matched: true,
        radar_rcs_m2: 31500,
        track_points: [
          [19.1000, 71.9000, '2026-09-13T04:30:00Z'],
          [19.0500, 72.0000, '2026-09-13T05:15:00Z'],
          [18.9500, 72.1000, '2026-09-13T06:30:00Z'],
        ],
      },
      {
        id: 'sus-3',
        spill_id: 's1',
        vessel_id: 'v103',
        mmsi: '538090146',
        name: 'SAMUDRA PRABHA',
        imo: '9013456',
        type: 'Crude Oil Tanker',
        flag: 'Marshall Islands',
        flag_code: 'MH',
        guilt_score: 71.8,
        factors: {
          spatiotemporal_proximity: 74.0,
          ais_anomaly_score: 82.0,
          trajectory_speed_vector: 68.0,
          vessel_discharge_risk: 76.0,
          radar_corroboration: 59.0,
        },
        distance_nm: 45.5,
        time_offset_hrs: -3.5,
        last_lat: 18.5000,
        last_lng: 70.8000,
        sog: 4.5,
        cog: 110,
        aoi_match: 65.0,
        ais_status: 'SILENT',
        gap_duration_mins: 195,
        dwt: 310000,
        length_m: 333,
        draft_m: 21.8,
        built_year: 2012,
        owner_operator: 'Eagle Navigation S.A.',
        pi_club: 'Britannia P&I Club',
        radar_sar_matched: false,
        radar_rcs_m2: 0,
        track_points: [
          [18.8000, 70.4000, '2026-09-13T03:00:00Z'],
          [18.5000, 70.8000, '2026-09-13T06:15:00Z'],
        ],
      },
      {
        id: 'sus-4',
        spill_id: 's1',
        vessel_id: 'v104',
        mmsi: '352008817',
        name: 'ARABIAN FORTUNE',
        imo: '9584112',
        type: 'Crude Oil Tanker',
        flag: 'Panama',
        flag_code: 'PA',
        guilt_score: 58.2,
        factors: {
          spatiotemporal_proximity: 56.0,
          ais_anomaly_score: 48.0,
          trajectory_speed_vector: 62.0,
          vessel_discharge_risk: 75.0,
          radar_corroboration: 50.0,
        },
        distance_nm: 65.2,
        time_offset_hrs: -5.0,
        last_lat: 20.1000,
        last_lng: 69.5000,
        sog: 11.8,
        cog: 92,
        aoi_match: 48.0,
        ais_status: 'ACTIVE',
        gap_duration_mins: 0,
        dwt: 319000,
        length_m: 333,
        draft_m: 21.2,
        built_year: 2019,
        owner_operator: 'Legacy Shipping Corp',
        pi_club: 'NorthStandard P&I',
        radar_sar_matched: false,
        radar_rcs_m2: 0,
        track_points: [
          [20.3000, 69.1000, '2026-09-13T04:00:00Z'],
          [20.1000, 69.5000, '2026-09-13T09:01:00Z'],
        ],
      },
    ],
  },
  {
    id: 's2',
    spill_id: 'OG-2026-0913-002',
    name: 'Visakhapatnam Offshore — Godavari Basin',
    severity: 'HIGH',
    status: 'MONITORING',
    lat: 17.0000,
    lng: 82.5000,
    area_km2: 2.34,
    estimated_volume_liters: 2340000,
    detected_at: '2026-09-13T07:15:00Z',
    origin_lat: 17.0500,
    origin_lng: 82.4500,
    forward_drift_lat: 16.9500,
    forward_drift_lng: 82.5800,
    drift_velocity_kts: 1.1,
    drift_heading_deg: 120,
    current_speed_kts: 1.2,
    current_direction_deg: 115,
    wind_speed_kts: 15.2,
    wind_direction_deg: 330,
    polygon: [
      [17.0000, 82.5000],
      [16.9800, 82.5100],
      [16.9700, 82.5000],
      [16.9750, 82.4800],
      [16.9900, 82.4700],
      [17.0100, 82.4800],
      [17.0150, 82.4950],
    ],
    sar_metadata: {
      satellite: 'Sentinel-1B SAR-C',
      orbit_pass: 'Relative Orbit #042 / Frame 210',
      sensor_mode: 'StripMap (SM)',
      polarization: 'VV + VH',
      incidence_angle_deg: 41.2,
      resolution_m: 9.5,
      look_alike_probability: 8.5,
      wind_speed_ms: 7.8,
      wave_height_m: 1.4,
      segmentation_confidence: 94.1,
      raw_chip_url: '/sample_sar/spill_class_1_01842.jpg',
      mask_chip_url: '/sample_sar/spill_class_1_01843.jpg',
      bounds: [
        [16.9000, 82.4000],
        [17.1500, 82.6000],
      ],
    },
    vulnerability_zones: [mockVulnerabilityZones[2]],
    suspects: [
      {
        id: 'sus-21',
        spill_id: 's2',
        vessel_id: 'v105',
        mmsi: '636008817',
        name: 'KRISHNA NAVIGATOR',
        imo: '9584112',
        type: 'Crude Oil Tanker',
        flag: 'Liberia',
        flag_code: 'LR',
        guilt_score: 89.6,
        factors: {
          spatiotemporal_proximity: 94.0,
          ais_anomaly_score: 86.0,
          trajectory_speed_vector: 88.0,
          vessel_discharge_risk: 92.0,
          radar_corroboration: 88.0,
        },
        distance_nm: 1.8,
        time_offset_hrs: -0.6,
        last_lat: 17.0000,
        last_lng: 82.5000,
        sog: 11.8,
        cog: 92,
        aoi_match: 91.5,
        ais_status: 'INTERMITTENT',
        gap_duration_mins: 28,
        dwt: 319000,
        length_m: 333,
        draft_m: 21.2,
        built_year: 2019,
        owner_operator: 'Navigational Maritime',
        pi_club: 'NorthStandard P&I',
        radar_sar_matched: true,
        radar_rcs_m2: 32800,
        track_points: [
          [17.0800, 82.4000, '2026-09-13T06:00:00Z'],
          [17.0400, 82.4600, '2026-09-13T06:45:00Z'],
          [17.0000, 82.5000, '2026-09-13T07:15:00Z'],
        ],
      },
    ],
  },
  {
    id: 's3',
    spill_id: 'OG-2026-0913-003',
    name: 'Gulf of Kutch — Kandla Approach Channel',
    severity: 'MODERATE',
    status: 'CONTAINED',
    lat: 22.8000,
    lng: 69.6000,
    area_km2: 1.15,
    estimated_volume_liters: 1150000,
    detected_at: '2026-09-13T05:30:00Z',
    origin_lat: 22.8200,
    origin_lng: 69.5800,
    forward_drift_lat: 22.7800,
    forward_drift_lng: 69.6400,
    drift_velocity_kts: 0.8,
    drift_heading_deg: 155,
    current_speed_kts: 0.6,
    current_direction_deg: 160,
    wind_speed_kts: 8.5,
    wind_direction_deg: 290,
    polygon: [
      [22.8000, 69.6000],
      [22.7900, 69.6100],
      [22.7800, 69.6000],
      [22.7750, 69.5850],
      [22.7900, 69.5750],
      [22.8050, 69.5850],
    ],
    sar_metadata: {
      satellite: 'Sentinel-1A SAR-C',
      orbit_pass: 'Relative Orbit #114 / Frame 491',
      sensor_mode: 'Interferometric Wide Swath (IW)',
      polarization: 'VV + VH',
      incidence_angle_deg: 35.8,
      resolution_m: 10.0,
      look_alike_probability: 12.0,
      wind_speed_ms: 4.4,
      wave_height_m: 0.8,
      segmentation_confidence: 91.2,
      raw_chip_url: '/sample_sar/spill_class_1_01840.jpg',
      mask_chip_url: '/sample_sar/spill_class_1_01841.jpg',
      bounds: [
        [22.7000, 69.5000],
        [22.9000, 69.7000],
      ],
    },
    vulnerability_zones: [mockVulnerabilityZones[3]],
    suspects: [
      {
        id: 'sus-31',
        spill_id: 's3',
        vessel_id: 'v106',
        mmsi: '256002451',
        name: 'NARMADA SPIRIT',
        imo: '9421188',
        type: 'Chemical Tanker',
        flag: 'Malta',
        flag_code: 'MT',
        guilt_score: 76.5,
        factors: {
          spatiotemporal_proximity: 82.0,
          ais_anomaly_score: 74.0,
          trajectory_speed_vector: 78.0,
          vessel_discharge_risk: 76.0,
          radar_corroboration: 72.0,
        },
        distance_nm: 2.5,
        time_offset_hrs: -1.2,
        last_lat: 22.8000,
        last_lng: 69.6000,
        sog: 8.3,
        cog: 180,
        aoi_match: 78.0,
        ais_status: 'ACTIVE',
        gap_duration_mins: 14,
        dwt: 45000,
        length_m: 183,
        draft_m: 10.2,
        built_year: 2011,
        owner_operator: 'Nordic Chemical Fleets SA',
        pi_club: 'Skuld P&I',
        radar_sar_matched: true,
        radar_rcs_m2: 18500,
        track_points: [
          [22.8800, 69.5200, '2026-09-13T04:00:00Z'],
          [22.8400, 69.5600, '2026-09-13T04:45:00Z'],
          [22.8000, 69.6000, '2026-09-13T05:30:00Z'],
        ],
      },
    ],
  },
  {
    id: 's4',
    spill_id: 'OG-2026-0912-018',
    name: 'Palk Strait — Tuticorin Anchorage',
    severity: 'LOW',
    status: 'RESOLVED',
    lat: 8.8000,
    lng: 78.2000,
    area_km2: 0.65,
    estimated_volume_liters: 650000,
    detected_at: '2026-09-12T14:20:00Z',
    origin_lat: 8.8200,
    origin_lng: 78.1800,
    forward_drift_lat: 8.7800,
    forward_drift_lng: 78.2400,
    drift_velocity_kts: 0.6,
    drift_heading_deg: 140,
    current_speed_kts: 0.5,
    current_direction_deg: 135,
    wind_speed_kts: 6.2,
    wind_direction_deg: 270,
    polygon: [
      [8.8000, 78.2000],
      [8.7950, 78.2050],
      [8.7900, 78.2000],
      [8.7920, 78.1900],
      [8.7980, 78.1880],
    ],
    sar_metadata: {
      satellite: 'Sentinel-1A SAR-C',
      orbit_pass: 'Relative Orbit #071 / Frame 302',
      sensor_mode: 'Interferometric Wide Swath (IW)',
      polarization: 'VV + VH',
      incidence_angle_deg: 32.1,
      resolution_m: 10.0,
      look_alike_probability: 21.0,
      wind_speed_ms: 3.2,
      wave_height_m: 0.6,
      segmentation_confidence: 88.4,
      raw_chip_url: '/sample_sar/nospill_class_0_03692.jpg',
      mask_chip_url: '/sample_sar/nospill_class_0_03693.jpg',
      bounds: [
        [8.7500, 78.1000],
        [8.8500, 78.3000],
      ],
    },
    vulnerability_zones: [mockVulnerabilityZones[0]],
    suspects: [
      {
        id: 'sus-41',
        spill_id: 's4',
        vessel_id: 'v107',
        mmsi: '563017642',
        name: 'MAERSK CHENNAI',
        imo: '9631996',
        type: 'Container Ship',
        flag: 'Singapore',
        flag_code: 'SG',
        guilt_score: 34.1,
        factors: {
          spatiotemporal_proximity: 42.0,
          ais_anomaly_score: 15.0,
          trajectory_speed_vector: 24.0,
          vessel_discharge_risk: 38.0,
          radar_corroboration: 51.0,
        },
        distance_nm: 7.2,
        time_offset_hrs: -4.8,
        last_lat: 8.8000,
        last_lng: 78.2000,
        sog: 16.5,
        cog: 270,
        aoi_match: 28.0,
        ais_status: 'ACTIVE',
        gap_duration_mins: 0,
        dwt: 110000,
        length_m: 366,
        draft_m: 13.8,
        built_year: 2015,
        owner_operator: 'A.P. Moller - Maersk',
        pi_club: 'Standard Club',
        radar_sar_matched: false,
        radar_rcs_m2: 0,
        track_points: [
          [8.7500, 78.4000, '2026-09-12T12:00:00Z'],
          [8.8000, 78.2000, '2026-09-12T14:20:00Z'],
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Vessels Registry Database (Indian Waters)
// ─────────────────────────────────────────────────────────────────────────────

export const mockVessels: Vessel[] = [
  {
    id: 'v101', mmsi: '419000123', name: 'INS VIKRANT SHADOW', type: 'Crude Oil Tanker', flag: 'India', flag_code: 'IN',
    lat: 19.4200, lng: 71.3000, sog: 9.5, cog: 145, length: 333, draft: 21.4, dwt: 308500, risk: 'CRITICAL', risk_score: 94,
    ais_status: 'INTERMITTENT', last_seen: '2026-09-13T06:00:00Z', imo: '9486712', callsign: 'VW2A', in_spill_aoi: true,
    destination: 'MUMBAI JNPT', eta: '2026-09-14 18:00',
    track_history: [[19.50, 71.20], [19.46, 71.25], [19.4200, 71.3000]],
  },
  {
    id: 'v102', mmsi: '538090145', name: 'KRISHNA CARRIER', type: 'Crude Oil Tanker', flag: 'Marshall Islands', flag_code: 'MH',
    lat: 18.9500, lng: 72.1000, sog: 0.2, cog: 12, length: 330, draft: 20.8, dwt: 298000, risk: 'HIGH', risk_score: 87,
    ais_status: 'INTERMITTENT', last_seen: '2026-09-13T06:30:00Z', imo: '9345678', callsign: 'V7B2391', in_spill_aoi: true,
    destination: 'MUMBAI OFFSHORE', eta: '2026-09-13 06:00',
    track_history: [[19.10, 71.90], [19.05, 72.00], [18.9500, 72.1000]],
  },
  {
    id: 'v103', mmsi: '538090146', name: 'SAMUDRA PRABHA', type: 'Crude Oil Tanker', flag: 'Marshall Islands', flag_code: 'MH',
    lat: 18.5000, lng: 70.8000, sog: 4.5, cog: 110, length: 333, draft: 21.8, dwt: 310000, risk: 'CRITICAL', risk_score: 72,
    ais_status: 'SILENT', last_seen: '2026-09-13T06:15:00Z', imo: '9013456', callsign: 'V7D5673', in_spill_aoi: true,
    destination: 'KOCHI', eta: '2026-09-16 20:00',
    track_history: [[18.80, 70.40], [18.65, 70.60], [18.5000, 70.8000]],
  },
  {
    id: 'v104', mmsi: '352008817', name: 'ARABIAN FORTUNE', type: 'Crude Oil Tanker', flag: 'Panama', flag_code: 'PA',
    lat: 20.1000, lng: 69.5000, sog: 11.8, cog: 92, length: 333, draft: 21.2, dwt: 319000, risk: 'MEDIUM', risk_score: 58,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T09:01:00Z', imo: '9584112', callsign: 'H3PA2', in_spill_aoi: true,
    destination: 'KANDLA', eta: '2026-09-14 06:00',
    track_history: [[20.40, 69.00], [20.25, 69.25], [20.1000, 69.5000]],
  },
  {
    id: 'v105', mmsi: '636008817', name: 'KRISHNA NAVIGATOR', type: 'Crude Oil Tanker', flag: 'Liberia', flag_code: 'LR',
    lat: 17.0000, lng: 82.5000, sog: 11.8, cog: 92, length: 333, draft: 21.2, dwt: 319000, risk: 'HIGH', risk_score: 89,
    ais_status: 'INTERMITTENT', last_seen: '2026-09-13T07:15:00Z', imo: '9584112', callsign: 'A8XY2', in_spill_aoi: true,
    destination: 'VISAKHAPATNAM', eta: '2026-09-13 10:00',
    track_history: [[17.10, 82.35], [17.05, 82.42], [17.0000, 82.5000]],
  },
  {
    id: 'v106', mmsi: '256002451', name: 'NARMADA SPIRIT', type: 'Chemical Tanker', flag: 'Malta', flag_code: 'MT',
    lat: 22.8000, lng: 69.6000, sog: 8.3, cog: 180, length: 183, draft: 10.2, dwt: 45000, risk: 'HIGH', risk_score: 76,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T08:55:00Z', imo: '9421188', callsign: '9HAZ8', in_spill_aoi: true,
    destination: 'MUNDRA', eta: '2026-09-13 11:30',
    track_history: [[22.90, 69.50], [22.85, 69.55], [22.8000, 69.6000]],
  },
  {
    id: 'v107', mmsi: '563017642', name: 'MAERSK CHENNAI', type: 'Container Ship', flag: 'Singapore', flag_code: 'SG',
    lat: 8.8000, lng: 78.2000, sog: 16.5, cog: 270, length: 366, draft: 13.8, dwt: 110000, risk: 'LOW', risk_score: 34,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T09:10:00Z', imo: '9631996', callsign: '9VAZ3', in_spill_aoi: true,
    destination: 'TUTICORIN', eta: '2026-09-13 14:00',
    track_history: [[8.70, 78.40], [8.75, 78.30], [8.8000, 78.2000]],
  },
  {
    id: 'v108', mmsi: '419111222', name: 'ICG SHAURYA', type: 'Vessel', flag: 'India', flag_code: 'IN',
    lat: 19.2000, lng: 72.8000, sog: 22.5, cog: 290, length: 105, draft: 4.5, dwt: 2000, risk: 'LOW', risk_score: 5,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T09:00:00Z', imo: '0000000', callsign: 'VWC2', in_spill_aoi: false,
    destination: 'MUMBAI PATROL', eta: '2026-09-13 23:00',
    track_history: [[18.90, 72.90], [19.05, 72.85], [19.2000, 72.8000]],
  },
  {
    id: 'v109', mmsi: '419333444', name: 'ONGC SUPPORT 1', type: 'General Cargo', flag: 'India', flag_code: 'IN',
    lat: 19.3500, lng: 71.5000, sog: 12.0, cog: 310, length: 85, draft: 5.2, dwt: 3500, risk: 'LOW', risk_score: 12,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T08:30:00Z', imo: '8912345', callsign: 'VWAX', in_spill_aoi: true,
    destination: 'MUMBAI HIGH', eta: '2026-09-13 12:00',
    track_history: [[19.20, 71.65], [19.28, 71.58], [19.3500, 71.5000]],
  },
  {
    id: 'v110', mmsi: '419555666', name: 'DESH VIBHUTI', type: 'Crude Oil Tanker', flag: 'India', flag_code: 'IN',
    lat: 13.1000, lng: 80.5000, sog: 14.2, cog: 180, length: 274, draft: 16.0, dwt: 150000, risk: 'LOW', risk_score: 18,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T09:15:00Z', imo: '9283746', callsign: 'VWRC', in_spill_aoi: false,
    destination: 'CHENNAI', eta: '2026-09-13 14:30',
    track_history: [[13.40, 80.55], [13.25, 80.52], [13.1000, 80.5000]],
  },
  {
    id: 'v111', mmsi: '353000011', name: 'MSC KERALA', type: 'Container Ship', flag: 'Panama', flag_code: 'PA',
    lat: 9.9500, lng: 76.1000, sog: 18.5, cog: 145, length: 330, draft: 14.2, dwt: 120000, risk: 'LOW', risk_score: 22,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T09:05:00Z', imo: '9654321', callsign: 'H3RC2', in_spill_aoi: false,
    destination: 'KOCHI', eta: '2026-09-13 11:00',
    track_history: [[10.20, 75.80], [10.05, 75.95], [9.9500, 76.1000]],
  },
  {
    id: 'v112', mmsi: '477123456', name: 'COSCO HALDIA', type: 'Bulk Carrier', flag: 'Hong Kong', flag_code: 'HK',
    lat: 21.0000, lng: 88.0000, sog: 11.2, cog: 45, length: 225, draft: 12.5, dwt: 75000, risk: 'LOW', risk_score: 15,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T08:50:00Z', imo: '9451234', callsign: 'VRX8', in_spill_aoi: false,
    destination: 'HALDIA', eta: '2026-09-14 08:00',
    track_history: [[20.70, 87.70], [20.85, 87.85], [21.0000, 88.0000]],
  },
  {
    id: 'v113', mmsi: '419777888', name: 'INS TARKASH', type: 'Vessel', flag: 'India', flag_code: 'IN',
    lat: 15.4000, lng: 73.0000, sog: 18.0, cog: 330, length: 125, draft: 5.5, dwt: 4000, risk: 'LOW', risk_score: 8,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T09:20:00Z', imo: '0000000', callsign: 'VWTK', in_spill_aoi: false,
    destination: 'GOA', eta: '2026-09-13 16:00',
    track_history: [[15.10, 73.20], [15.25, 73.10], [15.4000, 73.0000]],
  },
  {
    id: 'v114', mmsi: '636098765', name: 'MANGALORE DAWN', type: 'Product Tanker', flag: 'Liberia', flag_code: 'LR',
    lat: 12.9000, lng: 74.6000, sog: 13.4, cog: 90, length: 180, draft: 11.2, dwt: 50000, risk: 'MEDIUM', risk_score: 42,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T08:45:00Z', imo: '9345123', callsign: 'A8XY3', in_spill_aoi: false,
    destination: 'NEW MANGALORE', eta: '2026-09-13 13:00',
    track_history: [[12.90, 74.30], [12.90, 74.45], [12.9000, 74.6000]],
  },
  {
    id: 'v115', mmsi: '419999000', name: 'PARADIP STAR', type: 'Bulk Carrier', flag: 'India', flag_code: 'IN',
    lat: 20.2000, lng: 86.8000, sog: 10.5, cog: 315, length: 190, draft: 13.0, dwt: 60000, risk: 'LOW', risk_score: 14,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T09:10:00Z', imo: '9234123', callsign: 'VWPS', in_spill_aoi: false,
    destination: 'PARADIP', eta: '2026-09-13 15:30',
    track_history: [[19.90, 87.10], [20.05, 86.95], [20.2000, 86.8000]],
  },
  {
    id: 'v116', mmsi: '538000111', name: 'DARK SHADOW (SUSPECT)', type: 'Crude Oil Tanker', flag: 'Marshall Islands', flag_code: 'MH',
    lat: 18.0000, lng: 71.0000, sog: 14.0, cog: 180, length: 300, draft: 20.0, dwt: 250000, risk: 'CRITICAL', risk_score: 95,
    ais_status: 'SILENT', last_seen: '2026-09-13T05:00:00Z', imo: '9123888', callsign: 'V7X1', in_spill_aoi: false,
    destination: 'UNKNOWN', eta: 'UNAVAILABLE',
    track_history: [[18.50, 71.00], [18.25, 71.00], [18.0000, 71.0000]],
  },
  {
    id: 'v117', mmsi: '419888777', name: 'SAGAR NIDHI', type: 'Vessel', flag: 'India', flag_code: 'IN',
    lat: 10.5000, lng: 75.2000, sog: 8.5, cog: 90, length: 104, draft: 5.5, dwt: 3000, risk: 'LOW', risk_score: 10,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T09:05:00Z', imo: '9392236', callsign: 'VWSN', in_spill_aoi: false,
    destination: 'LAKSHADWEEP SEA', eta: '2026-09-15 12:00',
    track_history: [[10.50, 74.90], [10.50, 75.05], [10.5000, 75.2000]],
  },
  {
    id: 'v118', mmsi: '372111222', name: 'EVER GREEN INDIA', type: 'Container Ship', flag: 'Panama', flag_code: 'PA',
    lat: 11.0000, lng: 74.0000, sog: 20.5, cog: 320, length: 400, draft: 15.5, dwt: 220000, risk: 'LOW', risk_score: 16,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T09:12:00Z', imo: '9811111', callsign: 'H3EG', in_spill_aoi: false,
    destination: 'NHAVA SHEVA', eta: '2026-09-14 20:00',
    track_history: [[10.50, 74.50], [10.75, 74.25], [11.0000, 74.0000]],
  },
  {
    id: 'v119', mmsi: '256999888', name: 'VALLETTA TRADER', type: 'General Cargo', flag: 'Malta', flag_code: 'MT',
    lat: 16.5000, lng: 83.0000, sog: 12.0, cog: 45, length: 150, draft: 8.5, dwt: 20000, risk: 'MEDIUM', risk_score: 38,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T08:58:00Z', imo: '9234888', callsign: '9HVT', in_spill_aoi: false,
    destination: 'GANGAVARAM', eta: '2026-09-13 18:00',
    track_history: [[16.20, 82.70], [16.35, 82.85], [16.5000, 83.0000]],
  },
  {
    id: 'v120', mmsi: '419100200', name: 'DESH SHAKTI', type: 'Crude Oil Tanker', flag: 'India', flag_code: 'IN',
    lat: 21.5000, lng: 70.0000, sog: 13.5, cog: 300, length: 274, draft: 16.2, dwt: 150000, risk: 'LOW', risk_score: 20,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T09:15:00Z', imo: '9283747', callsign: 'VWDS', in_spill_aoi: false,
    destination: 'SIKKA', eta: '2026-09-14 02:00',
    track_history: [[21.20, 70.30], [21.35, 70.15], [21.5000, 70.0000]],
  },
  {
    id: 'v121', mmsi: '477222333', name: 'HONG KONG EXPRESS', type: 'Container Ship', flag: 'Hong Kong', flag_code: 'HK',
    lat: 14.0000, lng: 81.5000, sog: 19.0, cog: 20, length: 366, draft: 14.5, dwt: 130000, risk: 'LOW', risk_score: 12,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T09:08:00Z', imo: '9654111', callsign: 'VRHK', in_spill_aoi: false,
    destination: 'SINGAPORE', eta: '2026-09-17 10:00',
    track_history: [[13.60, 81.30], [13.80, 81.40], [14.0000, 81.5000]],
  },
  {
    id: 'v122', mmsi: '419400500', name: 'ICG VARUNA', type: 'Vessel', flag: 'India', flag_code: 'IN',
    lat: 8.5000, lng: 77.0000, sog: 20.0, cog: 90, length: 105, draft: 4.8, dwt: 2100, risk: 'LOW', risk_score: 5,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T09:00:00Z', imo: '0000000', callsign: 'VWVR', in_spill_aoi: false,
    destination: 'KANYAKUMARI PATROL', eta: '2026-09-13 14:00',
    track_history: [[8.50, 76.70], [8.50, 76.85], [8.5000, 77.0000]],
  },
  {
    id: 'v123', mmsi: '538000222', name: 'MARSHALL STAR', type: 'Product Tanker', flag: 'Marshall Islands', flag_code: 'MH',
    lat: 19.8000, lng: 72.5000, sog: 11.5, cog: 180, length: 185, draft: 11.0, dwt: 45000, risk: 'MEDIUM', risk_score: 45,
    ais_status: 'INTERMITTENT', last_seen: '2026-09-13T08:40:00Z', imo: '9420000', callsign: 'V7MS', in_spill_aoi: false,
    destination: 'MUMBAI', eta: '2026-09-13 16:00',
    track_history: [[20.10, 72.50], [19.95, 72.50], [19.8000, 72.5000]],
  },
  {
    id: 'v124', mmsi: '636000333', name: 'AFRICAN SUN', type: 'Bulk Carrier', flag: 'Liberia', flag_code: 'LR',
    lat: 17.5000, lng: 84.0000, sog: 12.5, cog: 225, length: 190, draft: 12.8, dwt: 55000, risk: 'LOW', risk_score: 18,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T09:12:00Z', imo: '9333444', callsign: 'A8AS', in_spill_aoi: false,
    destination: 'KAKINADA', eta: '2026-09-14 08:00',
    track_history: [[17.80, 84.30], [17.65, 84.15], [17.5000, 84.0000]],
  },
  {
    id: 'v125', mmsi: '419600700', name: 'AMBUJA MUKUND', type: 'General Cargo', flag: 'India', flag_code: 'IN',
    lat: 21.0000, lng: 71.5000, sog: 9.0, cog: 270, length: 120, draft: 6.5, dwt: 10000, risk: 'LOW', risk_score: 15,
    ais_status: 'ACTIVE', last_seen: '2026-09-13T09:05:00Z', imo: '9123455', callsign: 'VWAM', in_spill_aoi: false,
    destination: 'PIPAVAV', eta: '2026-09-13 19:00',
    track_history: [[21.00, 71.80], [21.00, 71.65], [21.0000, 71.5000]],
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// Tactical Alerts
// ─────────────────────────────────────────────────────────────────────────────

export const mockAlerts: Alert[] = [
  {
    id: 'a1', type: 'SPILL_DETECTED', severity: 'CRITICAL',
    title: 'CRITICAL SPILL: Mumbai High Offshore',
    description: '4.82 km² slick confirmed via Sentinel-1A SAR pass. Hydrodynamic backward drift traces origin to 19.4200° N, 71.3000° E.',
    timestamp: '2026-09-13T06:42:00Z', lat: 19.3000, lng: 71.4000, spill_id: 's1',
  },
  {
    id: 'a2', type: 'VESSEL_FLAGGED', severity: 'CRITICAL',
    title: 'PRIME SUSPECT FLAGGED: INS VIKRANT SHADOW',
    description: 'MMSI 419000123 composite guilt score 94.2%. 47-min deliberate AIS transponder blackout during backward drift release window.',
    timestamp: '2026-09-13T06:55:00Z', vessel_mmsi: '419000123', spill_id: 's1',
  },
  {
    id: 'a3', type: 'DARK_VESSEL', severity: 'HIGH',
    title: 'DARK VESSEL DETECTED: RADAR TARGET S-104',
    description: 'Radar RCS 34,200 m² corroborated by SAR imagery at 19.4200° N, 71.3000° E with no active AIS carrier transmission.',
    timestamp: '2026-09-13T07:10:00Z', lat: 19.4200, lng: 71.3000, spill_id: 's1',
  },
  {
    id: 'a4', type: 'SPILL_DETECTED', severity: 'HIGH',
    title: 'Spill Detected: Visakhapatnam Offshore',
    description: '2.34 km² crude oil slick identified near Godavari Basin. Forward drift heading 120° toward coastline.',
    timestamp: '2026-09-13T07:15:00Z', lat: 17.0000, lng: 82.5000, spill_id: 's2',
  },
  {
    id: 'a5', type: 'TRAJECTORY', severity: 'MODERATE',
    title: 'Forward Projection: Marine Park Threat',
    description: 'OpenDrift forward forecast indicates Gulf of Kutch Marine National Park impact window in 32.0 hours under current 0.8 kts surface drift.',
    timestamp: '2026-09-13T08:00:00Z', spill_id: 's3',
  },
  {
    id: 'a6', type: 'SAT_LINK', severity: 'LOW',
    title: 'Sentinel-1A SAR Pass Active',
    description: 'Orbital pass #114 telemetry confirmed. Synthetic Aperture Radar downlink lock established with ISRO Ground Station (128 kbps).',
    timestamp: '2026-09-13T08:30:00Z',
  },
  {
    id: 'a7', type: 'VESSEL_FLAGGED', severity: 'HIGH',
    title: 'Vessel Flagged: KRISHNA CARRIER',
    description: 'MMSI 538090145 guilt score 87.4%. Stationary in anchorage zone with suspicious engine load and heat signature.',
    timestamp: '2026-09-13T08:45:00Z', vessel_mmsi: '538090145', spill_id: 's1',
  },
  {
    id: 'a8', type: 'SYSTEM', severity: 'LOW',
    title: 'U-Net Oil Segmentation Inference Completed',
    description: 'AI model processed 128 SAR tiles with 96.8% confidence. Biogenic look-alike probability filtered to 4.2%.',
    timestamp: '2026-09-13T09:10:00Z',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Data (Spills over time, suspect distributions, ML metrics)
// ─────────────────────────────────────────────────────────────────────────────

export const spillsTrend7D = [
  { date: '09-07', total: 3, critical: 1, minor: 2 },
  { date: '09-08', total: 5, critical: 2, minor: 3 },
  { date: '09-09', total: 2, critical: 0, minor: 2 },
  { date: '09-10', total: 7, critical: 3, minor: 4 },
  { date: '09-11', total: 4, critical: 1, minor: 3 },
  { date: '09-12', total: 6, critical: 2, minor: 4 },
  { date: '09-13', total: 4, critical: 1, minor: 3 },
];

export const spillsTrend30D = [
  { date: 'Wk 1', total: 14, critical: 4, minor: 10 },
  { date: 'Wk 2', total: 19, critical: 6, minor: 13 },
  { date: 'Wk 3', total: 24, critical: 9, minor: 15 },
  { date: 'Wk 4', total: 17, critical: 5, minor: 12 },
];

export const suspectVesselDistribution = [
  { type: 'Crude Oil Tanker', count: 18, critical: 12 },
  { type: 'Chemical Tanker', count: 8, critical: 4 },
  { type: 'Product Tanker', count: 6, critical: 2 },
  { type: 'Bulk Carrier', count: 4, critical: 1 },
  { type: 'Container Ship', count: 3, critical: 0 },
  { type: 'General Cargo', count: 3, critical: 0 },
  { type: 'Fishing Vessel', count: 2, critical: 0 },
];

export const modelDetectionMetrics = {
  overall_precision: 0.948,   // 94.8%
  overall_recall: 0.962,      // 96.2%
  f1_score: 0.955,            // 95.5%
  false_alarm_rate: 0.038,    // 3.8% on look-alikes
  total_sar_chips_screened: 14850,
  oil_slicks_confirmed: 342,
  lookalikes_rejected: 1284,  // Wind shadows, low wind slicks, algal blooms
  confusion_matrix: {
    true_positive: 329,
    false_negative: 13,
    false_positive: 51,
    true_negative: 14457,
  },
  lookalike_categories: [
    { name: 'Low Wind Shadows (< 3 m/s)', rejection_rate: 98.2, count: 680 },
    { name: 'Biogenic Algal Bloom Surfactants', rejection_rate: 96.4, count: 340 },
    { name: 'Rain Cells / Squall Signatures', rejection_rate: 97.9, count: 195 },
    { name: 'Internal Ocean Wave Crests', rejection_rate: 99.1, count: 69 },
  ],
};
