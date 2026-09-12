import math
from datetime import timedelta
from typing import List
from ..models import VesselTrack, SuspectVessel

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return distance

def score_vessels(spill_origin_lat: float, spill_origin_lon: float, spill_time, vessels: List[VesselTrack]) -> List[SuspectVessel]:
    suspects = []
    
    time_window_start = spill_time - timedelta(hours=6)
    time_window_end = spill_time + timedelta(hours=6)
    
    for vessel in vessels:
        min_distance = float('inf')
        time_at_min_distance = None
        speed_drop = False
        ais_gap = False
        
        # Check positions within time window
        relevant_positions = []
        for p in vessel.positions:
            if time_window_start <= p.timestamp <= time_window_end:
                relevant_positions.append(p)
                dist = haversine_distance(spill_origin_lat, spill_origin_lon, p.lat, p.lon)
                if dist < min_distance:
                    min_distance = dist
                    time_at_min_distance = p.timestamp
                    
        # Check speed drop and gaps
        for i in range(1, len(vessel.positions)):
            prev = vessel.positions[i-1]
            curr = vessel.positions[i]
            
            # AIS gap
            time_diff = (curr.timestamp - prev.timestamp).total_seconds() / 3600
            if time_diff > 0.5: # 30 mins
                ais_gap = True
                
            # Speed drop
            if prev.speed_knots > 10 and curr.speed_knots < 3:
                # Need to check if this was near origin
                dist_prev = haversine_distance(spill_origin_lat, spill_origin_lon, prev.lat, prev.lon)
                if dist_prev < 50:
                    speed_drop = True
        
        score = 0
        reasons = []
        
        if min_distance < 10:
            score += 30
            reasons.append(f"High proximity ({min_distance:.1f} km)")
        elif min_distance < 50:
            score += 15
            reasons.append(f"Moderate proximity ({min_distance:.1f} km)")
            
        if speed_drop:
            score += 30
            reasons.append("Sudden speed drop detected near origin")
            
        if ais_gap:
            score += 25
            reasons.append("AIS transmission gap > 30 minutes")
            
        if score > 0:
            suspects.append(SuspectVessel(
                mmsi=vessel.mmsi,
                imo_number=vessel.imo_number,
                name=vessel.name,
                flag_country=vessel.flag_country,
                vessel_type=vessel.vessel_type,
                guilt_score=score,
                proximity_km=min_distance,
                had_speed_drop=speed_drop,
                had_ais_gap=ais_gap,
                time_at_origin=time_at_min_distance,
                reasons=reasons
            ))
            
    suspects.sort(key=lambda x: x.guilt_score, reverse=True)
    return suspects
