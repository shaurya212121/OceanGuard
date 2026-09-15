/*
# OceanGuard AI — Maritime Surveillance Schema

Creates the full database schema for the OceanGuard AI maritime oil spill
detection and vessel attribution system. This is a single-tenant app with
no sign-in screen, so all tables use anon+authenticated public access policies.

## 1. New Tables

- `oil_spills` — detected oil spill events with polygon coordinates, severity, status,
  origin point, and forward drift projection.
- `vessels` — registry of all tracked commercial vessels with MMSI, name, type,
  flag, IMO, callsign, dimensions, and risk level.
- `vessel_positions` — time-series AIS position reports (lat, lng, sog, cog)
  linked to vessels.
- `suspect_vessels` — vessels flagged as suspects for a specific spill, with
  guilt score, distance, and area-of-interest match.
- `drift_paths` — backward and forward drift trajectory waypoints for each spill.
- `alerts` — system alert notifications (spill detected, vessel flagged, etc.).

## 2. Security (RLS)

All tables have RLS enabled with anon+authenticated CRUD policies since this
is a single-tenant dashboard with no authentication — the anon-key frontend
needs full read/write access to all data.

## 3. Important Notes

- All coordinate columns use double precision for lat/lng.
- Polygon coordinates are stored as JSONB arrays of [lat, lng] pairs.
- Timestamps are timestamptz with UTC default.
- Enum-like columns use TEXT with CHECK constraints for valid values.
- Foreign keys link suspect_vessels → oil_spills, vessel_positions → vessels,
  drift_paths → oil_spills, alerts → oil_spills (nullable).
*/

-- ── oil_spills ──────────────────────────────────
CREATE TABLE IF NOT EXISTS oil_spills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spill_id text UNIQUE NOT NULL,
  name text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('CRITICAL','HIGH','MODERATE','LOW')),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','MONITORING','CONTAINED','RESOLVED')),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  area_km2 double precision NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  polygon jsonb NOT NULL DEFAULT '[]'::jsonb,
  origin_lat double precision NOT NULL,
  origin_lng double precision NOT NULL,
  forward_drift_lat double precision NOT NULL,
  forward_drift_lng double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE oil_spills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_oil_spills" ON oil_spills;
CREATE POLICY "anon_select_oil_spills" ON oil_spills FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_oil_spills" ON oil_spills;
CREATE POLICY "anon_insert_oil_spills" ON oil_spills FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_oil_spills" ON oil_spills;
CREATE POLICY "anon_update_oil_spills" ON oil_spills FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_oil_spills" ON oil_spills;
CREATE POLICY "anon_delete_oil_spills" ON oil_spills FOR DELETE
  TO anon, authenticated USING (true);

-- ── vessels ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS vessels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mmsi text UNIQUE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('Crude Oil Tanker','Chemical Tanker','Container Ship','Bulk Carrier','LNG Tanker','Product Tanker','Fishing Vessel','General Cargo')),
  flag text NOT NULL,
  flag_code text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  sog double precision NOT NULL DEFAULT 0,
  cog double precision NOT NULL DEFAULT 0,
  length double precision,
  draft double precision,
  risk text NOT NULL DEFAULT 'LOW' CHECK (risk IN ('CRITICAL','HIGH','MEDIUM','LOW')),
  imo text,
  callsign text,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vessels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_vessels" ON vessels;
CREATE POLICY "anon_select_vessels" ON vessels FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_vessels" ON vessels;
CREATE POLICY "anon_insert_vessels" ON vessels FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_vessels" ON vessels;
CREATE POLICY "anon_update_vessels" ON vessels FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_vessels" ON vessels;
CREATE POLICY "anon_delete_vessels" ON vessels FOR DELETE
  TO anon, authenticated USING (true);

-- ── vessel_positions ─────────────────────────────
CREATE TABLE IF NOT EXISTS vessel_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vessel_id uuid NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  sog double precision NOT NULL DEFAULT 0,
  cog double precision NOT NULL DEFAULT 0,
  heading double precision,
  timestamp timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vessel_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_vessel_positions" ON vessel_positions;
CREATE POLICY "anon_select_vessel_positions" ON vessel_positions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_vessel_positions" ON vessel_positions;
CREATE POLICY "anon_insert_vessel_positions" ON vessel_positions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_vessel_positions" ON vessel_positions;
CREATE POLICY "anon_update_vessel_positions" ON vessel_positions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_vessel_positions" ON vessel_positions;
CREATE POLICY "anon_delete_vessel_positions" ON vessel_positions FOR DELETE
  TO anon, authenticated USING (true);

-- ── suspect_vessels ──────────────────────────────
CREATE TABLE IF NOT EXISTS suspect_vessels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spill_id uuid NOT NULL REFERENCES oil_spills(id) ON DELETE CASCADE,
  vessel_id uuid NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  mmsi text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  flag text NOT NULL,
  guilt_score integer NOT NULL CHECK (guilt_score >= 0 AND guilt_score <= 100),
  distance_nm double precision NOT NULL,
  last_lat double precision NOT NULL,
  last_lng double precision NOT NULL,
  aoi_match integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE suspect_vessels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_suspect_vessels" ON suspect_vessels;
CREATE POLICY "anon_select_suspect_vessels" ON suspect_vessels FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_suspect_vessels" ON suspect_vessels;
CREATE POLICY "anon_insert_suspect_vessels" ON suspect_vessels FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_suspect_vessels" ON suspect_vessels;
CREATE POLICY "anon_update_suspect_vessels" ON suspect_vessels FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_suspect_vessels" ON suspect_vessels;
CREATE POLICY "anon_delete_suspect_vessels" ON suspect_vessels FOR DELETE
  TO anon, authenticated USING (true);

-- ── drift_paths ─────────────────────────────────
CREATE TABLE IF NOT EXISTS drift_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spill_id uuid NOT NULL REFERENCES oil_spills(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('BACKWARD','FORWARD')),
  waypoints jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE drift_paths ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_drift_paths" ON drift_paths;
CREATE POLICY "anon_select_drift_paths" ON drift_paths FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_drift_paths" ON drift_paths;
CREATE POLICY "anon_insert_drift_paths" ON drift_paths FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_drift_paths" ON drift_paths;
CREATE POLICY "anon_update_drift_paths" ON drift_paths FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_drift_paths" ON drift_paths;
CREATE POLICY "anon_delete_drift_paths" ON drift_paths FOR DELETE
  TO anon, authenticated USING (true);

-- ── alerts ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('SPILL_DETECTED','VESSEL_FLAGGED','SAT_LINK','SYSTEM','TRAJECTORY')),
  severity text NOT NULL CHECK (severity IN ('CRITICAL','HIGH','MODERATE','LOW')),
  title text NOT NULL,
  description text NOT NULL,
  lat double precision,
  lng double precision,
  spill_id uuid REFERENCES oil_spills(id) ON DELETE SET NULL,
  vessel_mmsi text,
  timestamp timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_alerts" ON alerts;
CREATE POLICY "anon_select_alerts" ON alerts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_alerts" ON alerts;
CREATE POLICY "anon_insert_alerts" ON alerts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_alerts" ON alerts;
CREATE POLICY "anon_update_alerts" ON alerts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_alerts" ON alerts;
CREATE POLICY "anon_delete_alerts" ON alerts FOR DELETE
  TO anon, authenticated USING (true);

-- ── Indexes ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vessels_mmsi ON vessels(mmsi);
CREATE INDEX IF NOT EXISTS idx_vessels_risk ON vessels(risk);
CREATE INDEX IF NOT EXISTS idx_vessel_positions_vessel_id ON vessel_positions(vessel_id);
CREATE INDEX IF NOT EXISTS idx_suspect_vessels_spill_id ON suspect_vessels(spill_id);
CREATE INDEX IF NOT EXISTS idx_drift_paths_spill_id ON drift_paths(spill_id);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_oil_spills_severity ON oil_spills(severity);
