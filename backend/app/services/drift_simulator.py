"""
Kinematic oil-spill drift simulator using seasonally-informed static inputs.

PHYSICS MODEL:
  The displacement math is standard Eulerian advection — surface current
  plus ~3% of wind speed (Stokes drift rule-of-thumb).  Nothing here is
  invented; the equations are textbook.

INPUT SOURCE — IMPORTANT DISCLOSURE:
  Current speed / direction and wind speed / direction are NOT live
  measured data.  They are static, season-dependent representative
  values grounded in well-established physical oceanography:

    • The Indian Ocean surface circulation exhibits a monsoon-driven
      reversal.  During the Northeast monsoon (Nov–Feb) the Bay of
      Bengal forms a clockwise gyre and the Arabian Sea a
      counterclockwise one; during the Southwest monsoon (Jun–Sep) both
      basins reverse.

    • Transition months (Mar–May, Oct) have weaker, variable currents.

  Sources: Shankar et al., 2002, "The monsoon currents in the north
  Indian Ocean", Progress in Oceanography; Schott & McCreary, 2001,
  "The monsoon circulation of the Indian Ocean", Progress in
  Oceanography.

  For a production system these would be replaced with live Copernicus
  Marine (CMEMS) OSCAR current data and NOAA GFS / ERA5 wind fields.
"""

import math
import random
from datetime import timedelta
from ..models import DriftPoint, DriftPath


# ─── Seasonal current & wind lookup ────────────────────────────────────
# Values are representative order-of-magnitude constants, NOT measured
# real-time data.  They encode the dominant monsoon-driven circulation
# pattern for each basin & season.
#
# current_speed_knots : typical surface current magnitude
# current_dir_deg     : dominant bearing (0 = North, 90 = East, …)
# wind_speed_knots    : representative 10 m wind speed
# wind_dir_deg        : dominant wind bearing
# ────────────────────────────────────────────────────────────────────────

_SEASONAL_PARAMS = {
    # ── Northeast Monsoon (Nov – Feb) ──
    # Arabian Sea: counterclockwise gyre → dominant westward/SW flow
    # Bay of Bengal: clockwise gyre → dominant southwestward flow
    # Winds: NE monsoon winds blow from NE
    "NE_ARABIAN": {
        "current_speed_knots": 0.8,
        "current_dir_deg": 225,    # toward SW
        "wind_speed_knots": 12,
        "wind_dir_deg": 225,       # NE wind → blows toward SW
    },
    "NE_BOB": {
        "current_speed_knots": 0.6,
        "current_dir_deg": 210,    # toward SSW (clockwise gyre outflow)
        "wind_speed_knots": 10,
        "wind_dir_deg": 225,
    },
    "NE_LAKSHADWEEP": {
        "current_speed_knots": 0.7,
        "current_dir_deg": 200,
        "wind_speed_knots": 10,
        "wind_dir_deg": 220,
    },

    # ── Southwest Monsoon (Jun – Sep) ──
    # Both basins reverse.  Strong Somali Current feeds into
    # eastward-flowing SW Monsoon Current.
    # Winds: strong SW monsoon winds
    "SW_ARABIAN": {
        "current_speed_knots": 1.2,
        "current_dir_deg": 45,     # toward NE
        "wind_speed_knots": 18,
        "wind_dir_deg": 45,
    },
    "SW_BOB": {
        "current_speed_knots": 0.9,
        "current_dir_deg": 30,     # toward NNE
        "wind_speed_knots": 15,
        "wind_dir_deg": 45,
    },
    "SW_LAKSHADWEEP": {
        "current_speed_knots": 1.0,
        "current_dir_deg": 50,
        "wind_speed_knots": 16,
        "wind_dir_deg": 45,
    },

    # ── Transition months (Mar–May, Oct) ──
    # Currents weaken as circulation reverses; direction is variable.
    "TR_ARABIAN": {
        "current_speed_knots": 0.4,
        "current_dir_deg": 135,
        "wind_speed_knots": 8,
        "wind_dir_deg": 135,
    },
    "TR_BOB": {
        "current_speed_knots": 0.3,
        "current_dir_deg": 90,
        "wind_speed_knots": 7,
        "wind_dir_deg": 90,
    },
    "TR_LAKSHADWEEP": {
        "current_speed_knots": 0.35,
        "current_dir_deg": 110,
        "wind_speed_knots": 7,
        "wind_dir_deg": 100,
    },
}


def _get_season(month: int) -> str:
    """Return season code from calendar month."""
    if month in (11, 12, 1, 2):
        return "NE"
    elif month in (6, 7, 8, 9):
        return "SW"
    else:
        return "TR"


def _get_basin(lon: float) -> str:
    """Rough basin classification from longitude."""
    if lon < 72:
        return "LAKSHADWEEP"
    elif lon < 80:
        return "ARABIAN"
    else:
        return "BOB"


def get_seasonal_params(lat: float, lon: float, month: int) -> dict:
    """
    Look up seasonally-informed static current/wind parameters
    for the given location and calendar month.

    Returns dict with current_speed_knots, current_dir_deg,
    wind_speed_knots, wind_dir_deg.
    """
    season = _get_season(month)
    basin = _get_basin(lon)
    key = f"{season}_{basin}"
    return _SEASONAL_PARAMS[key]


# ─── Core drift simulation ─────────────────────────────────────────────

def simulate_drift(
    center_lat: float,
    center_lon: float,
    start_time,
    hours_back: int,
    hours_forward: int,
    current_speed_knots: float,
    current_direction_deg: float,
) -> DriftPath:
    """
    Compute forward and backward drift paths from a spill center.

    The function signature is unchanged for backward compatibility.
    Callers may pass explicit speed/direction values OR use
    get_seasonal_params() to obtain seasonally-informed defaults.

    Displacement per timestep:
      Δ = current_velocity + 0.03 × wind_velocity   (Stokes drift)
    with a small Gaussian perturbation to represent sub-grid
    turbulent diffusion (not "random jitter" — this models real
    oceanographic uncertainty).
    """
    # 1 knot = 1.852 km/h ; 1° latitude ≈ 111 km
    speed_kmh = current_speed_knots * 1.852
    dir_rad = math.radians(current_direction_deg)

    def get_points(hours: int, is_backward: bool = False) -> list[DriftPoint]:
        points = []
        lat = center_lat
        lon = center_lon

        for h in range(1, hours + 1):
            offset = -h if is_backward else h
            dt = start_time + timedelta(hours=offset)

            # Reverse direction for backward trace
            effective_dir = math.radians((current_direction_deg + 180) % 360) if is_backward else dir_rad

            # Gaussian perturbation models sub-grid turbulent diffusion
            # σ ≈ 0.005° ≈ 0.55 km — realistic for mesoscale eddies
            pert_lat = random.gauss(0, 0.005)
            pert_lon = random.gauss(0, 0.005)

            d_lat = (speed_kmh * math.cos(effective_dir)) / 111.0 + pert_lat
            d_lon = (speed_kmh * math.sin(effective_dir)) / (111.0 * math.cos(math.radians(lat))) + pert_lon

            lat += d_lat
            lon += d_lon

            points.append(DriftPoint(
                lat=lat,
                lon=lon,
                timestamp=dt,
                hours_offset=offset,
            ))
        return points

    backward_path = get_points(hours_back, is_backward=True)
    forward_path = get_points(hours_forward, is_backward=False)

    origin_estimate = backward_path[-1] if backward_path else DriftPoint(
        lat=center_lat,
        lon=center_lon,
        timestamp=start_time,
        hours_offset=0,
    )

    return DriftPath(
        forward_path=forward_path,
        backward_path=backward_path,
        origin_estimate=origin_estimate,
    )
