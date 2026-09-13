from abc import ABC, abstractmethod
from datetime import datetime
from typing import Tuple, Optional, Dict, Any
import math

class EnvironmentalProvider(ABC):
    @abstractmethod
    def get_velocity(self, t: datetime, lat: float, lon: float) -> Tuple[float, float]:
        """Returns net physical forcing drift vector (v_north_kmh, v_east_kmh) at time t and location (lat, lon)."""
        pass

    @property
    @abstractmethod
    def is_real(self) -> bool:
        pass

class SyntheticEnvironmentalProvider(EnvironmentalProvider):
    def __init__(
        self,
        current_speed_knots: float = 0.8,
        current_dir_deg: float = 45.0,
        wind_speed_knots: float = 12.0,
        wind_dir_deg: float = 30.0
    ):
        self.c_speed_knots = current_speed_knots
        self.c_dir_deg = current_dir_deg
        self.w_speed_knots = wind_speed_knots
        self.w_dir_deg = wind_dir_deg

    @property
    def is_real(self) -> bool:
        return False

    def get_velocity(self, t: datetime, lat: float, lon: float) -> Tuple[float, float]:
        # Spatial variation: 10% perturbation based on spatial position to simulate a continuous grid
        var_factor = 1.0 + 0.1 * math.sin(lat * 5.0 + lon * 5.0)
        
        c_speed_kmh = (self.c_speed_knots * var_factor) * 1.852
        c_rad = math.radians(self.c_dir_deg)
        c_north = c_speed_kmh * math.cos(c_rad)
        c_east = c_speed_kmh * math.sin(c_rad)
        
        # Wind leeway (3% rule + 15 deg Coriolis deflection)
        w_leeway_speed_kmh = ((self.w_speed_knots * var_factor) * 1.852) * 0.03
        w_rad = math.radians((self.w_dir_deg + 15.0) % 360)
        w_north = w_leeway_speed_kmh * math.cos(w_rad)
        w_east = w_leeway_speed_kmh * math.sin(w_rad)
        
        return (c_north + w_north), (c_east + w_east)

class NetCDFEnvironmentalProvider(EnvironmentalProvider):
    def __init__(self, grid_data: Dict[str, Any]):
        self.grid_data = grid_data

    @property
    def is_real(self) -> bool:
        return True

    def get_velocity(self, t: datetime, lat: float, lon: float) -> Tuple[float, float]:
        if not self.grid_data:
            raise ValueError("NetCDF spatial environmental grid data is empty or uninitialized.")
            
        u_c = float(self.grid_data.get('u_curr', 0.5))
        v_c = float(self.grid_data.get('v_curr', 0.5))
        u_w = float(self.grid_data.get('u_wind', 2.0))
        v_w = float(self.grid_data.get('v_wind', 2.0))
        
        v_north = (v_c * 1.852) + (v_w * 1.852 * 0.03)
        v_east = (u_c * 1.852) + (u_w * 1.852 * 0.03)
        return v_north, v_east

def get_environmental_provider(
    mode: str,
    current_speed_knots: float = 0.8,
    current_dir_deg: float = 45.0,
    wind_speed_knots: float = 12.0,
    wind_dir_deg: float = 30.0,
    real_grid_data: Optional[Dict[str, Any]] = None
) -> EnvironmentalProvider:
    if mode == "REAL_DATA_MODE":
        if not real_grid_data:
            raise ValueError("Environmental data unavailable: Real environmental wind/current grid input is required in REAL DATA MODE.")
        return NetCDFEnvironmentalProvider(real_grid_data)
    return SyntheticEnvironmentalProvider(current_speed_knots, current_dir_deg, wind_speed_knots, wind_dir_deg)
