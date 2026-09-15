// ──────────────────────────────────────────────
// OceanGuard AI — Mock Maritime Surveillance Data
// ──────────────────────────────────────────────

export type VesselType =
  | 'Crude Oil Tanker'
  | 'Chemical Tanker'
  | 'Container Ship'
  | 'Bulk Carrier'
  | 'LNG Tanker'
  | 'Product Tanker'
  | 'Fishing Vessel'
  | 'General Cargo';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type SpillSeverity = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
export type SpillStatus = 'ACTIVE' | 'MONITORING' | 'CONTAINED' | 'RESOLVED';

export interface Vessel {
  id: string;
  mmsi: string;
  name: string;
  type: VesselType;
  flag: string;
  flagCode: string;
  lat: number;
  lng: number;
  sog: number; // speed over ground (knots)
  cog: number; // course over ground (degrees)
  length: number;
  draft: number;
  risk: RiskLevel;
  lastSeen: string; // ISO timestamp
  imo: string;
  callsign: string;
}

export interface Spill {
  id: string;
  spillId: string;
  name: string;
  severity: SpillSeverity;
  status: SpillStatus;
  lat: number;
  lng: number;
  areaKm2: number;
  detectedAt: string;
  polygon: [number, number][];
  originLat: number;
  originLng: number;
  forwardDriftLat: number;
  forwardDriftLng: number;
  suspects: SuspectVessel[];
}

export interface SuspectVessel {
  vesselId: string;
  mmsi: string;
  name: string;
  type: VesselType;
  flag: string;
  guiltScore: number;
  distanceNm: number;
  lastPosition: { lat: number; lng: number };
  aoiMatch: number; // area of interest match %
}

export interface Alert {
  id: string;
  type: 'SPILL_DETECTED' | 'VESSEL_FLAGGED' | 'SAT_LINK' | 'SYSTEM' | 'TRAJECTORY';
  severity: SpillSeverity;
  title: string;
  description: string;
  timestamp: string;
  lat?: number;
  lng?: number;
  spillId?: string;
  vesselMmsi?: string;
}

// ── Vessels ──────────────────────────────────────

export const vessels: Vessel[] = [
  {
    id: 'v1', mmsi: '636019825', name: 'EVER GIVEN', type: 'Container Ship', flag: 'Panama', flagCode: 'PA',
    lat: 25.0429, lng: 55.1716, sog: 14.2, cog: 87, length: 399, draft: 14.5, risk: 'LOW',
    lastSeen: '2026-09-13T08:42:00Z', imo: '9811000', callsign: 'H3RC',
  },
  {
    id: 'v2', mmsi: '538008817', name: 'NEW LEGACY', type: 'Crude Oil Tanker', flag: 'Marshall Islands', flagCode: 'MH',
    lat: 26.0857, lng: 52.0438, sog: 11.8, cog: 92, length: 333, draft: 21.2, risk: 'HIGH',
    lastSeen: '2026-09-13T09:01:00Z', imo: '9584112', callsign: 'V7A4381',
  },
  {
    id: 'v3', mmsi: '477552800', name: 'OCEANIC STAR', type: 'Crude Oil Tanker', flag: 'Hong Kong', flagCode: 'HK',
    lat: 24.4712, lng: 57.2894, sog: 9.5, cog: 45, length: 300, draft: 18.7, risk: 'CRITICAL',
    lastSeen: '2026-09-13T07:15:00Z', imo: '9486712', callsign: 'VRQM6',
  },
  {
    id: 'v4', mmsi: '256002451', name: 'NORDIC SPIRIT', type: 'Chemical Tanker', flag: 'Malta', flagCode: 'MT',
    lat: 25.3128, lng: 54.6843, sog: 8.3, cog: 180, length: 183, draft: 10.2, risk: 'MEDIUM',
    lastSeen: '2026-09-13T08:55:00Z', imo: '9421188', callsign: '9HAZ8',
  },
  {
    id: 'v5', mmsi: '636017642', name: 'MAERSK SELETAR', type: 'Container Ship', flag: 'Singapore', flagCode: 'SG',
    lat: 23.8871, lng: 56.4187, sog: 16.5, cog: 270, length: 366, draft: 13.8, risk: 'LOW',
    lastSeen: '2026-09-13T09:10:00Z', imo: '9631996', callsign: '9VAZ3',
  },
  {
    id: 'v6', mmsi: '311044700', name: 'ARCTIC PRINCESS', type: 'LNG Tanker', flag: 'Bahamas', flagCode: 'BS',
    lat: 26.4156, lng: 55.8234, sog: 13.1, cog: 315, length: 288, draft: 11.5, risk: 'LOW',
    lastSeen: '2026-09-13T08:30:00Z', imo: '9398016', callsign: 'C6XS5',
  },
  {
    id: 'v7', mmsi: '566672000', name: 'PACIFIC DAWN', type: 'Bulk Carrier', flag: 'Singapore', flagCode: 'SG',
    lat: 24.8956, lng: 53.2014, sog: 10.2, cog: 135, length: 295, draft: 17.3, risk: 'MEDIUM',
    lastSeen: '2026-09-13T08:20:00Z', imo: '9456712', callsign: '9V9874',
  },
  {
    id: 'v8', mmsi: '636016784', name: 'CMA CGM TIGRIS', type: 'Container Ship', flag: 'Liberia', flagCode: 'LR',
    lat: 25.6178, lng: 56.8421, sog: 18.7, cog: 90, length: 350, draft: 12.1, risk: 'LOW',
    lastSeen: '2026-09-13T09:05:00Z', imo: '9712345', callsign: 'A8XY2',
  },
  {
    id: 'v9', mmsi: '477171200', name: 'GREATWALL VOYAGER', type: 'Product Tanker', flag: 'Hong Kong', flagCode: 'HK',
    lat: 23.5412, lng: 54.9287, sog: 7.8, cog: 225, length: 228, draft: 13.4, risk: 'HIGH',
    lastSeen: '2026-09-13T07:45:00Z', imo: '9554321', callsign: 'VRTR8',
  },
  {
    id: 'v10', mmsi: '273456789', name: 'VOLGA TRADER', type: 'General Cargo', flag: 'Russia', flagCode: 'RU',
    lat: 26.8923, lng: 53.5478, sog: 6.5, cog: 200, length: 140, draft: 7.8, risk: 'MEDIUM',
    lastSeen: '2026-09-13T08:00:00Z', imo: '9123456', callsign: 'UBLY3',
  },
  {
    id: 'v11', mmsi: '636092345', name: 'MSC RITA', type: 'Container Ship', flag: 'Panama', flagCode: 'PA',
    lat: 24.2156, lng: 55.6178, sog: 15.3, cog: 45, length: 366, draft: 13.2, risk: 'LOW',
    lastSeen: '2026-09-13T09:00:00Z', imo: '9687654', callsign: 'H3RT2',
  },
  {
    id: 'v12', mmsi: '563015400', name: 'STENA POLARIS', type: 'Crude Oil Tanker', flag: 'Sweden', flagCode: 'SE',
    lat: 27.0412, lng: 56.2945, sog: 10.8, cog: 180, length: 250, draft: 15.6, risk: 'MEDIUM',
    lastSeen: '2026-09-13T08:40:00Z', imo: '9234567', callsign: 'SELP8',
  },
  {
    id: 'v13', mmsi: '538090145', name: 'AL SAADIYA', type: 'Crude Oil Tanker', flag: 'Marshall Islands', flagCode: 'MH',
    lat: 24.6847, lng: 55.8412, sog: 0.0, cog: 0, length: 333, draft: 22.1, risk: 'CRITICAL',
    lastSeen: '2026-09-13T06:30:00Z', imo: '9345678', callsign: 'V7B2391',
  },
  {
    id: 'v14', mmsi: '470821000', name: 'GULF SKY', type: 'Chemical Tanker', flag: 'UAE', flagCode: 'AE',
    lat: 25.8478, lng: 54.1523, sog: 9.2, cog: 90, length: 170, draft: 9.5, risk: 'MEDIUM',
    lastSeen: '2026-09-13T08:50:00Z', imo: '9456789', callsign: 'A6XY7',
  },
  {
    id: 'v15', mmsi: '311000123', name: 'BARENTS SEA', type: 'LNG Tanker', flag: 'Bahamas', flagCode: 'BS',
    lat: 23.2147, lng: 58.0412, sog: 14.0, cog: 270, length: 280, draft: 10.8, risk: 'LOW',
    lastSeen: '2026-09-13T09:15:00Z', imo: '9567890', callsign: 'C6TR5',
  },
  {
    id: 'v16', mmsi: '636014578', name: 'HAPAG LLOYD HAMBURG', type: 'Container Ship', flag: 'Panama', flagCode: 'PA',
    lat: 26.5412, lng: 54.3178, sog: 17.5, cog: 315, length: 366, draft: 12.8, risk: 'LOW',
    lastSeen: '2026-09-13T09:08:00Z', imo: '9678901', callsign: 'H3PG4',
  },
  {
    id: 'v17', mmsi: '566671234', name: 'SHINYO OCEAN', type: 'Bulk Carrier', flag: 'Singapore', flagCode: 'SG',
    lat: 25.1523, lng: 53.4878, sog: 11.0, cog: 45, length: 300, draft: 16.2, risk: 'MEDIUM',
    lastSeen: '2026-09-13T08:35:00Z', imo: '9789012', callsign: '9V4521',
  },
  {
    id: 'v18', mmsi: '477552801', name: 'BLUE DOLPHIN', type: 'Product Tanker', flag: 'Hong Kong', flagCode: 'HK',
    lat: 24.0312, lng: 56.7421, sog: 8.7, cog: 270, length: 228, draft: 12.8, risk: 'HIGH',
    lastSeen: '2026-09-13T07:50:00Z', imo: '9890123', callsign: 'VRQM7',
  },
  {
    id: 'v19', mmsi: '273456790', name: 'NEVA RIVER', type: 'General Cargo', flag: 'Russia', flagCode: 'RU',
    lat: 27.2156, lng: 54.8421, sog: 5.8, cog: 180, length: 145, draft: 7.2, risk: 'LOW',
    lastSeen: '2026-09-13T08:10:00Z', imo: '9901234', callsign: 'UBLY4',
  },
  {
    id: 'v20', mmsi: '563015401', name: 'NORDIC ORION', type: 'Bulk Carrier', flag: 'Sweden', flagCode: 'SE',
    lat: 26.7845, lng: 55.4178, sog: 10.5, cog: 90, length: 295, draft: 17.8, risk: 'MEDIUM',
    lastSeen: '2026-09-13T08:45:00Z', imo: '9012345', callsign: 'SENO3',
  },
  {
    id: 'v21', mmsi: '538008818', name: 'FRONT MAJESTIC', type: 'Crude Oil Tanker', flag: 'Marshall Islands', flagCode: 'MH',
    lat: 23.6412, lng: 57.4178, sog: 12.0, cog: 135, length: 333, draft: 20.5, risk: 'HIGH',
    lastSeen: '2026-09-13T08:25:00Z', imo: '9124567', callsign: 'V7C4562',
  },
  {
    id: 'v22', mmsi: '636017643', name: 'ONE OLYMPUS', type: 'Container Ship', flag: 'Singapore', flagCode: 'SG',
    lat: 25.8478, lng: 57.2014, sog: 19.2, cog: 270, length: 400, draft: 14.2, risk: 'LOW',
    lastSeen: '2026-09-13T09:12:00Z', imo: '9235678', callsign: '9VOC5',
  },
  {
    id: 'v23', mmsi: '311044701', name: 'ARCTIC AURORA', type: 'LNG Tanker', flag: 'Bahamas', flagCode: 'BS',
    lat: 24.5412, lng: 58.2156, sog: 13.5, cog: 315, length: 288, draft: 11.2, risk: 'LOW',
    lastSeen: '2026-09-13T09:05:00Z', imo: '9346789', callsign: 'C6AA4',
  },
  {
    id: 'v24', mmsi: '470821001', name: 'PEARL OF MUSANDAM', type: 'Chemical Tanker', flag: 'UAE', flagCode: 'AE',
    lat: 26.0412, lng: 56.3178, sog: 8.5, cog: 45, length: 175, draft: 9.8, risk: 'MEDIUM',
    lastSeen: '2026-09-13T08:55:00Z', imo: '9457890', callsign: 'A6PM2',
  },
  {
    id: 'v25', mmsi: '566672001', name: 'STAR OF INDIA', type: 'Bulk Carrier', flag: 'Singapore', flagCode: 'SG',
    lat: 23.4178, lng: 55.8412, sog: 10.8, cog: 180, length: 295, draft: 16.5, risk: 'LOW',
    lastSeen: '2026-09-13T08:40:00Z', imo: '9568901', callsign: '9VSO1',
  },
  {
    id: 'v26', mmsi: '477171201', name: 'SILK ROAD EXPRESS', type: 'Product Tanker', flag: 'Hong Kong', flagCode: 'HK',
    lat: 25.4178, lng: 54.2156, sog: 7.2, cog: 225, length: 228, draft: 13.2, risk: 'HIGH',
    lastSeen: '2026-09-13T07:35:00Z', imo: '9679012', callsign: 'VRSX4',
  },
  {
    id: 'v27', mmsi: '636016785', name: 'EVER ACE', type: 'Container Ship', flag: 'Panama', flagCode: 'PA',
    lat: 24.8412, lng: 57.5412, sog: 16.8, cog: 90, length: 400, draft: 13.5, risk: 'LOW',
    lastSeen: '2026-09-13T09:10:00Z', imo: '9780123', callsign: 'H3EA6',
  },
  {
    id: 'v28', mmsi: '273456791', name: 'AMUR VOYAGER', type: 'General Cargo', flag: 'Russia', flagCode: 'RU',
    lat: 27.5412, lng: 53.2156, sog: 6.2, cog: 200, length: 142, draft: 7.5, risk: 'LOW',
    lastSeen: '2026-09-13T08:05:00Z', imo: '9891234', callsign: 'UBLY5',
  },
  {
    id: 'v29', mmsi: '563015402', name: 'STENA CONCEPT', type: 'Crude Oil Tanker', flag: 'Sweden', flagCode: 'SE',
    lat: 26.2156, lng: 56.8412, sog: 11.2, cog: 180, length: 250, draft: 15.2, risk: 'MEDIUM',
    lastSeen: '2026-09-13T08:30:00Z', imo: '9902345', callsign: 'SESC2',
  },
  {
    id: 'v30', mmsi: '538090146', name: 'EAGLE PASSAGE', type: 'Crude Oil Tanker', flag: 'Marshall Islands', flagCode: 'MH',
    lat: 24.2156, lng: 53.8412, sog: 0.0, cog: 0, length: 333, draft: 21.8, risk: 'CRITICAL',
    lastSeen: '2026-09-13T06:15:00Z', imo: '9013456', callsign: 'V7D5673',
  },
];

// ── Oil Spills ────────────────────────────────────

export const spills: Spill[] = [
  {
    id: 's1',
    spillId: 'OG-2026-0913-001',
    name: 'Persian Gulf — Sector 7A',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    lat: 24.4712,
    lng: 57.2894,
    areaKm2: 4.8,
    detectedAt: '2026-09-13T06:42:00Z',
    originLat: 24.5520,
    originLng: 57.2100,
    forwardDriftLat: 24.3800,
    forwardDriftLng: 57.3800,
    polygon: [
      [24.4712, 57.2894],
      [24.4520, 57.3050],
      [24.4300, 57.2900],
      [24.4200, 57.2600],
      [24.4350, 57.2350],
      [24.4600, 57.2250],
      [24.4850, 57.2400],
      [24.4900, 57.2700],
    ],
    suspects: [
      { vesselId: 'v3', mmsi: '477552800', name: 'OCEANIC STAR', type: 'Crude Oil Tanker', flag: 'Hong Kong',
        guiltScore: 94, distanceNm: 2.1, lastPosition: { lat: 24.5520, lng: 57.2100 }, aoiMatch: 96 },
      { vesselId: 'v13', mmsi: '538090145', name: 'AL SAADIYA', type: 'Crude Oil Tanker', flag: 'Marshall Islands',
        guiltScore: 87, distanceNm: 3.8, lastPosition: { lat: 24.6847, lng: 55.8412 }, aoiMatch: 82 },
      { vesselId: 'v30', mmsi: '538090146', name: 'EAGLE PASSAGE', type: 'Crude Oil Tanker', flag: 'Marshall Islands',
        guiltScore: 71, distanceNm: 6.5, lastPosition: { lat: 24.2156, lng: 53.8412 }, aoiMatch: 64 },
      { vesselId: 'v2', mmsi: '538008817', name: 'NEW LEGACY', type: 'Crude Oil Tanker', flag: 'Marshall Islands',
        guiltScore: 58, distanceNm: 9.2, lastPosition: { lat: 26.0857, lng: 52.0438 }, aoiMatch: 45 },
    ],
  },
  {
    id: 's2',
    spillId: 'OG-2026-0913-002',
    name: 'Strait of Hormuz — Western Approach',
    severity: 'HIGH',
    status: 'MONITORING',
    lat: 26.0857,
    lng: 52.0438,
    areaKm2: 2.3,
    detectedAt: '2026-09-13T07:15:00Z',
    originLat: 26.1200,
    originLng: 51.9800,
    forwardDriftLat: 26.0400,
    forwardDriftLng: 52.1200,
    polygon: [
      [26.0857, 52.0438],
      [26.0700, 52.0600],
      [26.0500, 52.0500],
      [26.0450, 52.0250],
      [26.0600, 52.0100],
      [26.0850, 52.0200],
      [26.0900, 52.0350],
    ],
    suspects: [
      { vesselId: 'v2', mmsi: '538008817', name: 'NEW LEGACY', type: 'Crude Oil Tanker', flag: 'Marshall Islands',
        guiltScore: 89, distanceNm: 1.8, lastPosition: { lat: 26.0857, lng: 52.0438 }, aoiMatch: 91 },
      { vesselId: 'v21', mmsi: '538008818', name: 'FRONT MAJESTIC', type: 'Crude Oil Tanker', flag: 'Marshall Islands',
        guiltScore: 63, distanceNm: 5.4, lastPosition: { lat: 23.6412, lng: 57.4178 }, aoiMatch: 52 },
      { vesselId: 'v12', mmsi: '563015400', name: 'STENA POLARIS', type: 'Crude Oil Tanker', flag: 'Sweden',
        guiltScore: 41, distanceNm: 8.7, lastPosition: { lat: 27.0412, lng: 56.2945 }, aoiMatch: 33 },
    ],
  },
  {
    id: 's3',
    spillId: 'OG-2026-0913-003',
    name: 'Gulf of Oman — Offshore Fujairah',
    severity: 'MODERATE',
    status: 'CONTAINED',
    lat: 25.3128,
    lng: 54.6843,
    areaKm2: 1.1,
    detectedAt: '2026-09-13T05:30:00Z',
    originLat: 25.3400,
    originLng: 54.6200,
    forwardDriftLat: 25.2800,
    forwardDriftLng: 54.7500,
    polygon: [
      [25.3128, 54.6843],
      [25.3000, 54.6950],
      [25.2850, 54.6850],
      [25.2800, 54.6650],
      [25.2950, 54.6550],
      [25.3100, 54.6650],
    ],
    suspects: [
      { vesselId: 'v4', mmsi: '256002451', name: 'NORDIC SPIRIT', type: 'Chemical Tanker', flag: 'Malta',
        guiltScore: 76, distanceNm: 2.5, lastPosition: { lat: 25.3128, lng: 54.6843 }, aoiMatch: 78 },
      { vesselId: 'v14', mmsi: '470821000', name: 'GULF SKY', type: 'Chemical Tanker', flag: 'UAE',
        guiltScore: 52, distanceNm: 4.1, lastPosition: { lat: 25.8478, lng: 54.1523 }, aoiMatch: 48 },
    ],
  },
  {
    id: 's4',
    spillId: 'OG-2026-0912-018',
    name: 'Arabian Sea — North Basin',
    severity: 'LOW',
    status: 'RESOLVED',
    lat: 23.8871,
    lng: 56.4187,
    areaKm2: 0.6,
    detectedAt: '2026-09-12T14:20:00Z',
    originLat: 23.9000,
    originLng: 56.3800,
    forwardDriftLat: 23.8600,
    forwardDriftLng: 56.4600,
    polygon: [
      [23.8871, 56.4187],
      [23.8800, 56.4250],
      [23.8700, 56.4200],
      [23.8750, 56.4100],
      [23.8850, 56.4080],
    ],
    suspects: [
      { vesselId: 'v5', mmsi: '636017642', name: 'MAERSK SELETAR', type: 'Container Ship', flag: 'Singapore',
        guiltScore: 34, distanceNm: 7.2, lastPosition: { lat: 23.8871, lng: 56.4187 }, aoiMatch: 28 },
    ],
  },
];

// ── Alerts ───────────────────────────────────────

export const alerts: Alert[] = [
  {
    id: 'a1', type: 'SPILL_DETECTED', severity: 'CRITICAL',
    title: 'New Oil Spill Detected',
    description: 'Sector 7A — 4.8 km² slick identified via SAR satellite pass. Backward drift analysis initiated.',
    timestamp: '2026-09-13T06:42:00Z', lat: 24.4712, lng: 57.2894, spillId: 'OG-2026-0913-001',
  },
  {
    id: 'a2', type: 'VESSEL_FLAGGED', severity: 'CRITICAL',
    title: 'Vessel Flagged — OCEANIC STAR',
    description: 'MMSI 477552800 within 2.1 NM of spill origin. Guilt score: 94%. AIS gap of 47 minutes detected.',
    timestamp: '2026-09-13T06:55:00Z', vesselMmsi: '477552800', spillId: 'OG-2026-0913-001',
  },
  {
    id: 'a3', type: 'SPILL_DETECTED', severity: 'HIGH',
    title: 'New Oil Spill Detected',
    description: 'Strait of Hormuz western approach — 2.3 km² slick. Monitoring trajectory.',
    timestamp: '2026-09-13T07:15:00Z', lat: 26.0857, lng: 52.0438, spillId: 'OG-2026-0913-002',
  },
  {
    id: 'a4', type: 'VESSEL_FLAGGED', severity: 'HIGH',
    title: 'Vessel Flagged — NEW LEGACY',
    description: 'MMSI 538008817 within 1.8 NM of spill origin. Guilt score: 89%. Speed anomaly: 11.8 kts in restricted zone.',
    timestamp: '2026-09-13T07:28:00Z', vesselMmsi: '538008817', spillId: 'OG-2026-0913-002',
  },
  {
    id: 'a5', type: 'TRAJECTORY', severity: 'MODERATE',
    title: 'Forward Drift Projection Updated',
    description: 'Spill OG-2026-0913-003 projected to reach Fujairah coast in 18 hours at current current velocity.',
    timestamp: '2026-09-13T08:00:00Z', spillId: 'OG-2026-0913-003',
  },
  {
    id: 'a6', type: 'VESSEL_FLAGGED', severity: 'HIGH',
    title: 'Vessel Flagged — AL SAADIYA',
    description: 'MMSI 538090145 stationary near spill zone. Guilt score: 87%. Engine activity detected during AIS gap.',
    timestamp: '2026-09-13T08:12:00Z', vesselMmsi: '538090145', spillId: 'OG-2026-0913-001',
  },
  {
    id: 'a7', type: 'SAT_LINK', severity: 'LOW',
    title: 'Satellite Pass Scheduled',
    description: 'Sentinel-1 SAR pass over Gulf of Oman in 2h 14m. Auto-scan queued for sectors 5–9.',
    timestamp: '2026-09-13T08:30:00Z',
  },
  {
    id: 'a8', type: 'SYSTEM', severity: 'LOW',
    title: 'AIS Feed Refreshed',
    description: '1,847 vessel positions updated. 3 gaps detected and flagged for review.',
    timestamp: '2026-09-13T08:45:00Z',
  },
  {
    id: 'a9', type: 'VESSEL_FLAGGED', severity: 'HIGH',
    title: 'Vessel Flagged — EAGLE PASSAGE',
    description: 'MMSI 538090146 drifting near spill zone. Guilt score: 71%. No AIS transmission for 3h 15m.',
    timestamp: '2026-09-13T08:50:00Z', vesselMmsi: '538090146', spillId: 'OG-2026-0913-001',
  },
  {
    id: 'a10', type: 'TRAJECTORY', severity: 'MODERATE',
    title: 'Backward Drift Complete',
    description: 'Spill OG-2026-0913-002 origin traced to 26.12°N, 51.98°E. Suspect correlation pending.',
    timestamp: '2026-09-13T09:00:00Z', spillId: 'OG-2026-0913-002',
  },
  {
    id: 'a11', type: 'SAT_LINK', severity: 'LOW',
    title: 'SAT-LINK Handover Complete',
    description: 'Ground station handover from GS-Alpha to GS-Bravo. Latency: 42ms. Feed stable.',
    timestamp: '2026-09-13T09:05:00Z',
  },
  {
    id: 'a12', type: 'SYSTEM', severity: 'LOW',
    title: 'Model Retraining Complete',
    description: 'Oil detection CNN retrained on 12,400 new SAR tiles. Accuracy: 96.2% (+0.3%).',
    timestamp: '2026-09-13T09:10:00Z',
  },
];

// ── Analytics Data ───────────────────────────────

export const spillsOverTime = [
  { date: '2026-09-07', spills: 3, critical: 1 },
  { date: '2026-09-08', spills: 5, critical: 2 },
  { date: '2026-09-09', spills: 2, critical: 0 },
  { date: '2026-09-10', spills: 7, critical: 3 },
  { date: '2026-09-11', spills: 4, critical: 1 },
  { date: '2026-09-12', spills: 6, critical: 2 },
  { date: '2026-09-13', spills: 4, critical: 1 },
];

export const suspectVesselTypes = [
  { type: 'Crude Oil Tanker', count: 14 },
  { type: 'Chemical Tanker', count: 6 },
  { type: 'Product Tanker', count: 5 },
  { type: 'Container Ship', count: 3 },
  { type: 'Bulk Carrier', count: 4 },
  { type: 'LNG Tanker', count: 1 },
  { type: 'General Cargo', count: 2 },
  { type: 'Fishing Vessel', count: 3 },
];

export const alertSeverityBreakdown = [
  { name: 'CRITICAL', value: 8, color: '#FF2A5F' },
  { name: 'HIGH', value: 15, color: '#FBBF24' },
  { name: 'MODERATE', value: 22, color: '#0EA5E9' },
  { name: 'LOW', value: 35, color: '#475569' },
];

export const kpiStats = {
  totalSpills: 4,
  activeInvestigations: 2,
  vesselsTracked: 1847,
  criticalAlerts: 3,
  resolvedToday: 1,
  avgResponseTime: '4h 12m',
};
