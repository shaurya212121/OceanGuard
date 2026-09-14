from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from typing import Dict, Any
from datetime import datetime
from ..database import db_get_incident_by_id

router = APIRouter()

@router.get("/dossier/{incident_id}")
async def export_investigation_dossier(incident_id: str, format: str = "json"):
    inc = await db_get_incident_by_id(incident_id)
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    suspects = inc.get('suspects', [])
    drift = inc.get('drift_run', {})
    
    dossier = {
        "dossier_title": f"OFFICIAL MARITIME INVESTIGATION DOSSIER — {inc.get('name', 'Incident')}",
        "incident_id": inc.get('id'),
        "classification": "RESTRICTED / OFFICIAL SIH26143 BENCHMARK",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "dataset_provenance": {
            "data_type": inc.get('data_provenance_type', 'SYNTHETIC_DEMO_DATA'),
            "source_name": "SIH26143 SQLite Persistent Database",
            "is_live": False
        },
        "satellite_observation": {
            "sensor": "Sentinel-1 C-SAR",
            "detected_at": inc.get('detected_at'),
            "center_coordinates": [inc.get('center_lat'), inc.get('center_lon')],
            "area_sq_km": inc.get('area_sq_km'),
            "estimated_volume_liters": inc.get('estimated_volume_liters'),
            "spill_type": inc.get('spill_type')
        },
        "drift_and_source_reconstruction": {
            "source_region_centroid": [drift.get('origin_lat', inc.get('center_lat')), drift.get('origin_lon', inc.get('center_lon'))],
            "hindcast_trajectory_points": 12,
            "forecast_trajectory_points": 12
        },
        "vessel_attribution_evidence": [
            {
                "rank": idx + 1,
                "mmsi": s.get('mmsi'),
                "attribution_evidence_score": s.get('attribution_evidence_score'),
                "spatial_proximity_km": s.get('proximity_km'),
                "counterfactual_physical_overlap_iou": s.get('counterfactual_iou'),
                "disclaimer": "Ranking represents physical and temporal consistency with available evidence and is not legal proof of responsibility."
            }
            for idx, s in enumerate(suspects)
        ]
    }
    
    if format == "html":
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>{dossier['dossier_title']}</title>
            <style>
                body {{ font-family: monospace; background: #030c14; color: #e0f2fe; padding: 20px; }}
                h1 {{ color: #00f0ff; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }}
                .badge {{ background: #1e3a5f; color: #00ffaa; padding: 4px 8px; font-weight: bold; border-radius: 4px; }}
                .card {{ background: #0a1929; border: 1px solid #1e3a8a; padding: 15px; margin-bottom: 15px; border-radius: 8px; }}
                table {{ width: 100%; border-collapse: collapse; margin-top: 10px; }}
                th, td {{ border: 1px solid #1e3a8a; padding: 8px; text-align: left; }}
                th {{ background: #132943; color: #00f0ff; }}
            </style>
        </head>
        <body>
            <h1>{dossier['dossier_title']}</h1>
            <p><span class="badge">PROVENANCE: {dossier['dataset_provenance']['data_type']}</span> | Generated: {dossier['generated_at']}</p>

            <div class="card">
                <h2>1. Satellite Observation & Slick Characterization</h2>
                <p>Sensor: {dossier['satellite_observation']['sensor']} | Detected: {dossier['satellite_observation']['detected_at']}</p>
                <p>Area: {dossier['satellite_observation']['area_sq_km']} km² | Volume: {dossier['satellite_observation']['estimated_volume_liters']} L</p>
            </div>

            <div class="card">
                <h2>2. Reconstructed Source Region</h2>
                <p>Centroid: {dossier['drift_and_source_reconstruction']['source_region_centroid']}</p>
            </div>

            <div class="card">
                <h2>3. Candidate Vessel Attribution Evidence Chain</h2>
                <table>
                    <tr><th>Rank</th><th>MMSI</th><th>Attribution Evidence Score</th><th>Proximity (km)</th><th>Counterfactual IoU</th></tr>
                    {''.join([f"<tr><td>{v['rank']}</td><td>{v['mmsi']}</td><td><strong>{v['attribution_evidence_score']}%</strong></td><td>{v['spatial_proximity_km']}</td><td>{v['counterfactual_physical_overlap_iou']}</td></tr>" for v in dossier['vessel_attribution_evidence']])}
                </table>
            </div>
        </body>
        </html>
        """
        return HTMLResponse(content=html_content)
        
    return JSONResponse(content=dossier)
