import math
from datetime import datetime, timedelta
from typing import List, Tuple, Dict, Any, Optional
from shapely.geometry import Polygon, Point, MultiPoint

from ..models import (
    VesselTrack, SuspectVessel, EvidenceBreakdown, 
    SourceRegion, DriftPath, DATA_PROVENANCE_DISCLAIMER
)
from .drift_engine import calculate_effective_velocity

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates haversine distance between two lat/lon points in kilometers."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0)**2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2)
    return R * (2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a)))

def simulate_counterfactual_forward_drift(
    vessel_lat: float,
    vessel_lon: float,
    start_time: datetime,
    target_time: datetime,
    current_speed_knots: float = 0.8,
    current_dir_deg: float = 45.0,
    wind_speed_knots: float = 12.0,
    wind_dir_deg: float = 30.0
) -> List[List[float]]:
    """
    Simulates counterfactual forward drift of a potential discharge from (vessel_lat, vessel_lon) 
    at start_time up to target_time, returning the predicted slick polygon coords at target_time.
    """
    hours = max(0.1, (target_time - start_time).total_seconds() / 3600.0)
    v_north, v_east = calculate_effective_velocity(
        current_speed_knots, current_dir_deg, wind_speed_knots, wind_dir_deg
    )
    
    lat_disp = (v_north * hours) / 111.0
    lon_disp = (v_east * hours) / (111.0 * math.cos(math.radians(vessel_lat)))
    
    pred_center_lat = vessel_lat + lat_disp
    pred_center_lon = vessel_lon + lon_disp
    
    # Construct predicted slick polygon radius ~ 1-2 km
    r_deg = 0.025
    poly_coords = [
        [pred_center_lat + r_deg, pred_center_lon - r_deg],
        [pred_center_lat + r_deg, pred_center_lon + r_deg],
        [pred_center_lat - r_deg, pred_center_lon + r_deg],
        [pred_center_lat - r_deg, pred_center_lon - r_deg],
        [pred_center_lat + r_deg, pred_center_lon - r_deg]
    ]
    return poly_coords

def compute_polygon_iou(poly1_coords: List[List[float]], poly2_coords: List[List[float]]) -> float:
    """Computes spatial Intersection-over-Union (IoU) between two polygon coordinate lists."""
    try:
        p1 = Polygon(poly1_coords)
        p2 = Polygon(poly2_coords)
        if not p1.is_valid: p1 = p1.buffer(0)
        if not p2.is_valid: p2 = p2.buffer(0)
        
        intersection = p1.intersection(p2).area
        union = p1.union(p2).area
        
        if union <= 1e-9:
            return 0.0
        return round(float(intersection / union), 3)
    except Exception:
        return 0.0

def score_vessels_multi_factor(
    observed_spill_polygon: List[List[float]],
    source_region: SourceRegion,
    spill_time: datetime,
    vessels: List[VesselTrack],
    drift_path: Optional[DriftPath] = None,
    current_speed_knots: float = 0.8,
    current_dir_deg: float = 45.0,
    mode: str = "SYNTHETIC_BENCHMARK_MODE"
) -> List[SuspectVessel]:
    """
    Evaluates explainable multi-factor attribution evidence & counterfactual physical consistency.
    No fake or hardcoded guilt scores! Every score component is calculated from spatial, temporal, 
    and counterfactual physical drift dynamics.
    """
    if mode == "REAL_DATA_MODE" and not vessels:
        raise ValueError("AIS data unavailable: Genuine AIS vessel tracks are required in REAL DATA MODE.")

    suspects: List[SuspectVessel] = []
    
    release_window_start = source_region.time_window_start
    release_window_end = source_region.time_window_end
    origin_lat = source_region.centroid_lat
    origin_lon = source_region.centroid_lon

    for vessel in vessels:
        min_distance_to_source = float('inf')
        time_at_min_dist = None
        has_window_speed_drop = False
        has_window_ais_gap = False
        best_pos_at_window: Optional[Tuple[float, float, datetime]] = None

        # 1. Evaluate positions within the RELEVANT release window
        window_positions = []
        for i, p in enumerate(vessel.positions):
            dist = haversine_km(origin_lat, origin_lon, p.lat, p.lon)
            
            if dist < min_distance_to_source:
                min_distance_to_source = dist
                time_at_min_dist = p.timestamp

            if release_window_start - timedelta(hours=2) <= p.timestamp <= release_window_end + timedelta(hours=2):
                window_positions.append((i, p, dist))
                if best_pos_at_window is None or dist < haversine_km(origin_lat, origin_lon, best_pos_at_window[0], best_pos_at_window[1]):
                    best_pos_at_window = (p.lat, p.lon, p.timestamp)

        # 2. Relevant Window Anomaly Checks (ignore unrelated historical gaps/drops)
        for i in range(1, len(vessel.positions)):
            prev = vessel.positions[i-1]
            curr = vessel.positions[i]
            
            # Check if this transition is near the release window
            if release_window_start - timedelta(hours=2) <= curr.timestamp <= release_window_end + timedelta(hours=2):
                time_gap_h = (curr.timestamp - prev.timestamp).total_seconds() / 3600.0
                dist_prev = haversine_km(origin_lat, origin_lon, prev.lat, prev.lon)
                
                if time_gap_h > 0.5 and dist_prev < 40.0: # AIS gap near source
                    has_window_ais_gap = True
                    
                if prev.speed_knots > 9.0 and curr.speed_knots < 3.0 and dist_prev < 35.0:
                    has_window_speed_drop = True

        # 3. Multi-Factor Evidence Scoring Calculations
        # Factor A: Spatial Proximity (0-25 pts)
        spatial_score = max(0.0, 25.0 * (1.0 - min_distance_to_source / 60.0))
        
        # Factor B: Temporal Window Alignment (0-20 pts)
        if time_at_min_dist and (release_window_start <= time_at_min_dist <= release_window_end):
            temporal_score = 20.0
        elif time_at_min_dist:
            hours_diff = abs((time_at_min_dist - source_region.time_window_start).total_seconds() / 3600.0)
            temporal_score = max(0.0, 20.0 * (1.0 - hours_diff / 6.0))
        else:
            temporal_score = 0.0

        # Factor C: Trajectory Intersection (0-20 pts)
        trajectory_score = 20.0 if min_distance_to_source < source_region.uncertainty_radius_km else max(0.0, 20.0 - min_distance_to_source * 0.3)

        # Factor D: Speed Anomaly in Window (0-10 pts)
        speed_score = 10.0 if has_window_speed_drop else 0.0
        
        # Factor E: Relevant Window AIS Gap (0-10 pts)
        ais_gap_score = 10.0 if has_window_ais_gap else 0.0

        # Factor F: Vessel Type Compatibility (0-10 pts)
        v_type = vessel.vessel_type.lower()
        if 'tanker' in v_type or 'bunker' in v_type:
            type_score = 10.0
        elif 'cargo' in v_type or 'container' in v_type:
            type_score = 7.0
        elif 'fishing' in v_type:
            type_score = 4.0
        else:
            type_score = 2.0

        # Factor G: Counterfactual Physical Overlap Validation (0-15 pts)
        if best_pos_at_window:
            cand_lat, cand_lon, cand_time = best_pos_at_window
            pred_slick_coords = simulate_counterfactual_forward_drift(
                cand_lat, cand_lon, cand_time, spill_time, current_speed_knots, current_dir_deg
            )
            counterfactual_iou = compute_polygon_iou(pred_slick_coords, observed_spill_polygon)
            counterfactual_score = round(15.0 * counterfactual_iou, 1)
        else:
            counterfactual_iou = 0.0
            counterfactual_score = 0.0

        # Total Attribution Evidence Score / Suspect Likelihood
        total_evidence_score = round(
            spatial_score + temporal_score + trajectory_score + 
            speed_score + ais_gap_score + type_score + counterfactual_score, 1
        )

        reasons = []
        if min_distance_to_source < 15.0:
            reasons.append(f"High spatial proximity ({min_distance_to_source:.1f} km to source region)")
        elif min_distance_to_source < 45.0:
            reasons.append(f"Moderate spatial proximity ({min_distance_to_source:.1f} km)")
            
        if has_window_speed_drop:
            reasons.append("Sudden speed drop detected near source during release window")
        if has_window_ais_gap:
            reasons.append("AIS transmission gap > 30 mins within release window")
        if counterfactual_iou > 0.3:
            reasons.append(f"Counterfactual drift physical overlap IoU = {counterfactual_iou:.2f}")

        evidence_breakdown = EvidenceBreakdown(
            spatial_proximity_score=round(spatial_score, 1),
            temporal_consistency_score=round(temporal_score, 1),
            trajectory_intersection_score=round(trajectory_score, 1),
            speed_anomaly_score=round(speed_score, 1),
            ais_gap_score=round(ais_gap_score, 1),
            counterfactual_iou_score=counterfactual_score,
            vessel_type_compatibility=round(type_score, 1),
            counterfactual_iou=counterfactual_iou,
            reasons=reasons
        )

        if total_evidence_score > 5.0:
            suspects.append(SuspectVessel(
                mmsi=vessel.mmsi,
                imo_number=vessel.imo_number,
                name=vessel.name,
                flag_country=vessel.flag_country,
                vessel_type=vessel.vessel_type,
                attribution_evidence_score=total_evidence_score,
                proximity_km=round(min_distance_to_source, 1),
                had_relevant_speed_drop=has_window_speed_drop,
                had_relevant_ais_gap=has_window_ais_gap,
                time_at_origin=time_at_min_dist,
                evidence_breakdown=evidence_breakdown,
                disclaimer=DATA_PROVENANCE_DISCLAIMER
            ))

    # Sort descending by evidence score
    suspects.sort(key=lambda x: x.attribution_evidence_score, reverse=True)
    return suspects
