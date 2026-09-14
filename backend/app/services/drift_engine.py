import math
import random
import numpy as np
from datetime import datetime, timedelta
from typing import List, Tuple, Dict, Any, Optional
from shapely.geometry import MultiPoint, Polygon

from ..models import DriftPoint, DriftPath, SourceRegion
from .environmental_provider import EnvironmentalProvider, get_environmental_provider

def calculate_effective_velocity(
    current_speed_knots: float,
    current_dir_deg: float,
    wind_speed_knots: float,
    wind_dir_deg: float
) -> Tuple[float, float]:
    """
    Computes net physical forcing drift vector:
    Ocean current velocity + Wind leeway drift factor (approx 3.0% of wind speed with 15 deg Coriolis leeway deflection).
    Returns (v_north_kmh, v_east_kmh).
    """
    c_speed_kmh = current_speed_knots * 1.852
    c_rad = math.radians(current_dir_deg)
    c_north = c_speed_kmh * math.cos(c_rad)
    c_east = c_speed_kmh * math.sin(c_rad)
    
    w_leeway_speed_kmh = (wind_speed_knots * 1.852) * 0.03
    w_rad = math.radians((wind_dir_deg + 15.0) % 360)
    w_north = w_leeway_speed_kmh * math.cos(w_rad)
    w_east = w_leeway_speed_kmh * math.sin(w_rad)
    
    return (c_north + w_north), (c_east + w_east)

def simulate_drift_engine(
    center_lat: float,
    center_lon: float,
    start_time: datetime,
    hours_back: int = 12,
    hours_forward: int = 12,
    current_speed_knots: float = 0.8,
    current_dir_deg: float = 45.0,
    wind_speed_knots: float = 12.0,
    wind_dir_deg: float = 30.0,
    num_particles: int = 20,
    mode: str = "SYNTHETIC_BENCHMARK_MODE",
    env_provider: Optional[EnvironmentalProvider] = None,
    real_grid_data: Optional[Dict[str, Any]] = None
) -> DriftPath:
    """
    Executes a multi-particle Lagrangian turbulent drift simulation using an EnvironmentalProvider.
    Generates deterministic backward trajectory, forward forecast, and a 
    probabilistic Source Region (Convex Hull) with release time window.
    """
    if env_provider is None:
        env_provider = get_environmental_provider(
            mode=mode,
            current_speed_knots=current_speed_knots,
            current_dir_deg=current_dir_deg,
            wind_speed_knots=wind_speed_knots,
            wind_dir_deg=wind_dir_deg,
            real_grid_data=real_grid_data
        )

    # 1. Backward Trajectory (Hindcast) & Particle Ensemble
    backward_points: List[DriftPoint] = []
    curr_lat = center_lat
    curr_lon = center_lon
    
    particles = np.zeros((num_particles, 2))
    particles[:, 0] = center_lat
    particles[:, 1] = center_lon

    for h in range(1, hours_back + 1):
        dt = start_time - timedelta(hours=h)
        v_north_kmh, v_east_kmh = env_provider.get_velocity(dt, curr_lat, curr_lon)
        lat_deg_per_h = v_north_kmh / 111.0
        lon_deg_per_h = v_east_kmh / (111.0 * math.cos(math.radians(max(-85.0, min(85.0, curr_lat)))))

        curr_lat -= lat_deg_per_h
        curr_lon -= lon_deg_per_h
        
        diffusion = 0.003 * math.sqrt(h)
        particles[:, 0] -= lat_deg_per_h + np.random.normal(0, diffusion, size=num_particles)
        particles[:, 1] -= lon_deg_per_h + np.random.normal(0, diffusion, size=num_particles)
        
        backward_points.append(DriftPoint(
            lat=round(curr_lat, 5),
            lon=round(curr_lon, 5),
            timestamp=dt,
            hours_offset=-h
        ))

    # The origin estimate is the mean of the backward path at max hours_back
    origin_estimate = backward_points[-1] if backward_points else DriftPoint(
        lat=center_lat, lon=center_lon, timestamp=start_time, hours_offset=0
    )

    # 2. Construct Probable Source Region (Convex Hull polygon of particle cloud)
    shapely_points = MultiPoint(particles.tolist())
    hull = shapely_points.convex_hull
    # Buffer slightly for safety margin
    source_poly = hull.buffer(0.015)
    
    if hasattr(source_poly, 'exterior'):
        source_coords = [[round(p[0], 5), round(p[1], 5)] for p in source_poly.exterior.coords]
    else:
        # Fallback bounding box
        min_y, min_x, max_y, max_x = particles[:, 0].min(), particles[:, 1].min(), particles[:, 0].max(), particles[:, 1].max()
        source_coords = [
            [round(min_y - 0.01, 5), round(min_x - 0.01, 5)],
            [round(max_y + 0.01, 5), round(min_x - 0.01, 5)],
            [round(max_y + 0.01, 5), round(max_x + 0.01, 5)],
            [round(min_y - 0.01, 5), round(max_x + 0.01, 5)],
            [round(min_y - 0.01, 5), round(min_x - 0.01, 5)]
        ]

    origin_time = start_time - timedelta(hours=hours_back)
    source_region = SourceRegion(
        polygon_coords=source_coords,
        centroid_lat=round(float(shapely_points.centroid.x), 5),
        centroid_lon=round(float(shapely_points.centroid.y), 5),
        time_window_start=origin_time - timedelta(hours=1),
        time_window_end=origin_time + timedelta(hours=1),
        uncertainty_radius_km=round(float(np.std(particles) * 111.0 + 2.0), 2)
    )

    # 3. Forward Trajectory (Forecast)
    forward_points: List[DriftPoint] = []
    curr_lat_f = center_lat
    curr_lon_f = center_lon

    for h in range(1, hours_forward + 1):
        dt = start_time + timedelta(hours=h)
        curr_lat_f += lat_deg_per_h
        curr_lon_f += lon_deg_per_h
        
        forward_points.append(DriftPoint(
            lat=round(curr_lat_f, 5),
            lon=round(curr_lon_f, 5),
            timestamp=dt,
            hours_offset=h
        ))

    return DriftPath(
        forward_path=forward_points,
        backward_path=backward_points,
        origin_estimate=origin_estimate,
        source_region=source_region
    )
