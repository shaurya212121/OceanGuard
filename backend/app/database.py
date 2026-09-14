import aiosqlite
import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from .config import DATABASE_PATH

async def get_db():
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db

async def init_db():
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    async with aiosqlite.connect(DATABASE_PATH) as db:
        # Create persistent tables
        await db.execute('''
            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                detected_at TEXT NOT NULL,
                center_lat REAL NOT NULL,
                center_lon REAL NOT NULL,
                area_sq_km REAL NOT NULL,
                severity TEXT NOT NULL,
                status TEXT NOT NULL,
                estimated_volume_liters REAL NOT NULL,
                spill_type TEXT NOT NULL,
                data_provenance_type TEXT DEFAULT 'SYNTHETIC_DEMO_DATA',
                polygon_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        ''')

        await db.execute('''
            CREATE TABLE IF NOT EXISTS satellite_observations (
                id TEXT PRIMARY KEY,
                incident_id TEXT NOT NULL,
                sensor TEXT NOT NULL,
                acquisition_time TEXT NOT NULL,
                resolution_m REAL NOT NULL,
                confidence REAL NOT NULL,
                lookalike_probs_json TEXT NOT NULL,
                characterization_json TEXT NOT NULL,
                FOREIGN KEY (incident_id) REFERENCES incidents(id)
            )
        ''')

        await db.execute('''
            CREATE TABLE IF NOT EXISTS drift_runs (
                id TEXT PRIMARY KEY,
                incident_id TEXT NOT NULL,
                run_at TEXT NOT NULL,
                hours_back INTEGER NOT NULL,
                hours_forward INTEGER NOT NULL,
                current_speed_knots REAL NOT NULL,
                current_direction_deg REAL NOT NULL,
                wind_speed_knots REAL NOT NULL,
                wind_direction_deg REAL NOT NULL,
                origin_lat REAL NOT NULL,
                origin_lon REAL NOT NULL,
                origin_timestamp TEXT NOT NULL,
                source_region_json TEXT NOT NULL,
                drift_points_json TEXT NOT NULL,
                FOREIGN KEY (incident_id) REFERENCES incidents(id)
            )
        ''')

        await db.execute('''
            CREATE TABLE IF NOT EXISTS vessels (
                mmsi TEXT PRIMARY KEY,
                imo_number TEXT,
                name TEXT NOT NULL,
                vessel_type TEXT NOT NULL,
                flag_country TEXT NOT NULL,
                last_lat REAL,
                last_lon REAL,
                last_seen TEXT
            )
        ''')

        await db.execute('''
            CREATE TABLE IF NOT EXISTS ais_positions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                mmsi TEXT NOT NULL,
                lat REAL NOT NULL,
                lon REAL NOT NULL,
                timestamp TEXT NOT NULL,
                speed_knots REAL NOT NULL,
                heading REAL NOT NULL,
                FOREIGN KEY (mmsi) REFERENCES vessels(mmsi)
            )
        ''')

        await db.execute('''
            CREATE TABLE IF NOT EXISTS attribution_candidates (
                id TEXT PRIMARY KEY,
                incident_id TEXT NOT NULL,
                mmsi TEXT NOT NULL,
                attribution_evidence_score REAL NOT NULL,
                proximity_km REAL NOT NULL,
                had_relevant_speed_drop INTEGER NOT NULL,
                had_relevant_ais_gap INTEGER NOT NULL,
                counterfactual_iou REAL NOT NULL,
                evidence_breakdown_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (incident_id) REFERENCES incidents(id),
                FOREIGN KEY (mmsi) REFERENCES vessels(mmsi)
            )
        ''')

        await db.execute('''
            CREATE TABLE IF NOT EXISTS analysis_jobs (
                id TEXT PRIMARY KEY,
                incident_id TEXT NOT NULL,
                status TEXT NOT NULL,
                current_stage TEXT NOT NULL,
                progress_pct INTEGER NOT NULL,
                result_json TEXT,
                error TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        ''')

        await db.execute('''
            CREATE TABLE IF NOT EXISTS evaluation_benchmark_runs (
                id TEXT PRIMARY KEY,
                run_at TEXT NOT NULL,
                benchmark_mode TEXT NOT NULL,
                num_scenarios INTEGER NOT NULL,
                metrics_json TEXT NOT NULL
            )
        ''')

        await db.commit()
        
    await seed_db_if_empty()

async def seed_db_if_empty():
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    async with aiosqlite.connect(DATABASE_PATH) as db:
        async with db.execute('SELECT COUNT(*) FROM incidents') as cursor:
            row = await cursor.fetchone()
            count = row[0] if row else 0
            
        if count == 0:
            from .services.data_generator import generate_all_data
            data = generate_all_data()
            now_iso = datetime.utcnow().isoformat() + "Z"
            
            for s_id, scenario in data["scenarios"].items():
                spill = scenario.spill
                drift = scenario.drift
                suspects = scenario.suspects
                
                await db.execute('''
                    INSERT OR REPLACE INTO incidents (
                        id, name, detected_at, center_lat, center_lon, area_sq_km,
                        severity, status, estimated_volume_liters, spill_type,
                        data_provenance_type, polygon_json, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    spill.id, spill.name, spill.detected_at.isoformat(), spill.center_lat, spill.center_lon,
                    spill.area_sq_km, spill.severity, spill.status, spill.estimated_volume_liters,
                    spill.spill_type, spill.provenance.data_type, json.dumps(spill.polygon_coords), now_iso
                ))
                
                if spill.characterization:
                    await db.execute('''
                        INSERT OR REPLACE INTO satellite_observations (
                            id, incident_id, sensor, acquisition_time, resolution_m, confidence,
                            lookalike_probs_json, characterization_json
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        f"obs-{spill.id}", spill.id, spill.characterization.sensor, spill.detected_at.isoformat(),
                        10.0, spill.characterization.confidence,
                        json.dumps(spill.characterization.lookalike_probs.dict()),
                        json.dumps(spill.characterization.dict(), default=str)
                    ))
                    
                if drift:
                    await db.execute('''
                        INSERT OR REPLACE INTO drift_runs (
                            id, incident_id, run_at, hours_back, hours_forward, current_speed_knots,
                            current_direction_deg, wind_speed_knots, wind_direction_deg, origin_lat,
                            origin_lon, origin_timestamp, source_region_json, drift_points_json
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        f"drift-{spill.id}", spill.id, now_iso, 12, 12, 0.8, 45.0, 12.0, 30.0,
                        drift.origin_estimate.lat, drift.origin_estimate.lon, drift.origin_estimate.timestamp.isoformat(),
                        json.dumps(drift.source_region.dict(), default=str) if drift.source_region else "{}",
                        json.dumps({"forward": [p.dict() for p in drift.forward_path], "backward": [p.dict() for p in drift.backward_path]}, default=str)
                    ))
                    
                for s in suspects:
                    await db.execute('''
                        INSERT OR REPLACE INTO attribution_candidates (
                            id, incident_id, mmsi, attribution_evidence_score, proximity_km,
                            had_relevant_speed_drop, had_relevant_ais_gap, counterfactual_iou,
                            evidence_breakdown_json, created_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        f"cand-{spill.id}-{s.mmsi}", spill.id, s.mmsi, s.attribution_evidence_score,
                        s.proximity_km, 1 if s.had_relevant_speed_drop else 0,
                        1 if s.had_relevant_ais_gap else 0, s.evidence_breakdown.counterfactual_iou,
                        json.dumps(s.evidence_breakdown.dict(), default=str), now_iso
                    ))
                    
            for mmsi, vessel in data["vessels"].items():
                last_pos = vessel.positions[-1] if vessel.positions else None
                await db.execute('''
                    INSERT OR REPLACE INTO vessels (
                        mmsi, imo_number, name, vessel_type, flag_country, last_lat, last_lon, last_seen
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    vessel.mmsi, vessel.imo_number, vessel.name, vessel.vessel_type, vessel.flag_country,
                    last_pos.lat if last_pos else None, last_pos.lon if last_pos else None,
                    last_pos.timestamp.isoformat() if last_pos else None
                ))
                
                for p in vessel.positions:
                    await db.execute('''
                        INSERT INTO ais_positions (mmsi, lat, lon, timestamp, speed_knots, heading)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (vessel.mmsi, p.lat, p.lon, p.timestamp.isoformat(), p.speed_knots, p.heading))
                    
            await db.commit()

async def db_get_all_incidents() -> List[Dict[str, Any]]:
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute('SELECT * FROM incidents ORDER BY detected_at DESC') as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

async def db_get_incident_by_id(incident_id: str) -> Optional[Dict[str, Any]]:
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute('SELECT * FROM incidents WHERE id = ?', (incident_id,)) as cursor:
            row = await cursor.fetchone()
            if not row:
                return None
            inc = dict(row)
            inc['polygon_coords'] = json.loads(inc['polygon_json'])
            
            # Fetch satellite obs
            async with db.execute('SELECT * FROM satellite_observations WHERE incident_id = ?', (incident_id,)) as c_obs:
                r_obs = await c_obs.fetchone()
                if r_obs:
                    inc['satellite_observation'] = dict(r_obs)
                    inc['satellite_observation']['characterization'] = json.loads(r_obs['characterization_json'])
                    
            # Fetch drift run
            async with db.execute('SELECT * FROM drift_runs WHERE incident_id = ? ORDER BY run_at DESC LIMIT 1', (incident_id,)) as c_drift:
                r_drift = await c_drift.fetchone()
                if r_drift:
                    inc['drift_run'] = dict(r_drift)
                    inc['drift_run']['source_region'] = json.loads(r_drift['source_region_json'])
                    inc['drift_run']['drift_points'] = json.loads(r_drift['drift_points_json'])

            # Fetch attribution candidates
            async with db.execute('SELECT * FROM attribution_candidates WHERE incident_id = ? ORDER BY attribution_evidence_score DESC', (incident_id,)) as c_cand:
                r_cands = await c_cand.fetchall()
                cands = []
                for r in r_cands:
                    d = dict(r)
                    d['evidence_breakdown'] = json.loads(d['evidence_breakdown_json'])
                    cands.append(d)
                inc['suspects'] = cands
                
            return inc

async def db_create_incident(
    incident_id: str,
    name: str,
    detected_at: datetime,
    center_lat: float,
    center_lon: float,
    area_sq_km: float,
    severity: str,
    status: str,
    estimated_volume_liters: float,
    spill_type: str,
    provenance_type: str,
    polygon_coords: List[List[float]]
):
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    async with aiosqlite.connect(DATABASE_PATH) as db:
        now_iso = datetime.utcnow().isoformat() + "Z"
        await db.execute('''
            INSERT OR REPLACE INTO incidents (
                id, name, detected_at, center_lat, center_lon, area_sq_km,
                severity, status, estimated_volume_liters, spill_type,
                data_provenance_type, polygon_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            incident_id, name, detected_at.isoformat(), center_lat, center_lon,
            area_sq_km, severity, status, estimated_volume_liters, spill_type,
            provenance_type, json.dumps(polygon_coords), now_iso
        ))
        await db.commit()
