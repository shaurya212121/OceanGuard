import math
import random
from datetime import timedelta
from ..models import DriftPoint, DriftPath

def simulate_drift(center_lat: float, center_lon: float, start_time, hours_back: int, hours_forward: int, current_speed_knots: float, current_direction_deg: float) -> DriftPath:
    # 1 knot = 1.852 km/h
    # 1 degree of latitude is approx 111 km
    speed_kmh = current_speed_knots * 1.852
    
    # Calculate displacement per hour in degrees
    dir_rad = math.radians(current_direction_deg)
    
    # Add some randomness to drift
    def get_points(hours, is_backward=False):
        points = []
        current_lat = center_lat
        current_lon = center_lon
        
        for h in range(1, hours + 1):
            offset = -h if is_backward else h
            dt = start_time + timedelta(hours=offset)
            
            # Reverse direction for backward
            effective_dir = math.radians((current_direction_deg + 180) % 360) if is_backward else dir_rad
            
            # Perturbation
            pert_lat = random.uniform(-0.01, 0.01)
            pert_lon = random.uniform(-0.01, 0.01)
            
            d_lat = (speed_kmh * math.cos(effective_dir)) / 111.0 + pert_lat
            # Adjust lon displacement based on lat
            d_lon = (speed_kmh * math.sin(effective_dir)) / (111.0 * math.cos(math.radians(current_lat))) + pert_lon
            
            current_lat += d_lat
            current_lon += d_lon
            
            points.append(DriftPoint(
                lat=current_lat,
                lon=current_lon,
                timestamp=dt,
                hours_offset=offset
            ))
        return points

    backward_path = get_points(hours_back, is_backward=True)
    forward_path = get_points(hours_forward, is_backward=False)
    
    origin_estimate = backward_path[-1] if backward_path else DriftPoint(
        lat=center_lat,
        lon=center_lon,
        timestamp=start_time,
        hours_offset=0
    )
    
    return DriftPath(
        forward_path=forward_path,
        backward_path=backward_path,
        origin_estimate=origin_estimate
    )
