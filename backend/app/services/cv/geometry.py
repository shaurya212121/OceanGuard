"""
Module 1 - Geometry extraction

Turns a binary oil-mask into: polygon(s), area, centroid, perimeter -
using skimage to trace region contours and Shapely to build/measure
polygons, matching the OceanGuard `OilSpill` schema's `polygon_coords`,
`area_sq_km`, `center_lat`, `center_lon` fields.

Georeferencing: this module works in pixel space and converts to
lat/lon via a simple bilinear affine transform defined by the image's
four corner coordinates (top-left / bottom-right lat-lon). This mirrors
the simplified equirectangular approximation already used elsewhere in
this repo (drift_simulator.py, data_generator.py), rather than pulling
in a full GDAL/rasterio dependency. If you have true SAR product
geolocation grids (GCPs), swap `pixel_to_latlon` for a proper transform.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Tuple

import numpy as np
from shapely.geometry import Polygon, MultiPolygon
from skimage import measure


EARTH_RADIUS_KM = 6371.0


@dataclass
class GeoBounds:
    """Corner coordinates of the image, for pixel -> lat/lon conversion."""
    top_left_lat: float
    top_left_lon: float
    bottom_right_lat: float
    bottom_right_lon: float


@dataclass
class SpillRegion:
    polygon_latlon: Optional[List[List[float]]]   # [[lat, lon], ...] if georeferenced
    polygon_px: List[List[float]]                  # [[x, y], ...] pixel coords (always present)
    area_sq_km: Optional[float]
    area_sq_px: float
    perimeter_km: Optional[float]
    perimeter_px: float
    centroid_lat: Optional[float]
    centroid_lon: Optional[float]
    centroid_px: Tuple[float, float]


def pixel_to_latlon(x: float, y: float, height: int, width: int, bounds: GeoBounds) -> Tuple[float, float]:
    """Bilinear interpolation of pixel (x, y) into (lat, lon) using image corners."""
    fx = x / max(width - 1, 1)
    fy = y / max(height - 1, 1)
    lat = bounds.top_left_lat + fy * (bounds.bottom_right_lat - bounds.top_left_lat)
    lon = bounds.top_left_lon + fx * (bounds.bottom_right_lon - bounds.top_left_lon)
    return lat, lon


def _km_per_pixel(height: int, width: int, bounds: GeoBounds) -> Tuple[float, float]:
    """Approximate km-per-pixel in x and y, using the image's geographic span."""
    lat_span_km = abs(bounds.bottom_right_lat - bounds.top_left_lat) * 111.0
    mean_lat = (bounds.top_left_lat + bounds.bottom_right_lat) / 2
    lon_span_km = abs(bounds.bottom_right_lon - bounds.top_left_lon) * 111.0 * np.cos(np.radians(mean_lat))
    km_per_px_y = lat_span_km / max(height - 1, 1)
    km_per_px_x = lon_span_km / max(width - 1, 1)
    return km_per_px_x, km_per_px_y


def extract_regions(
    oil_mask: np.ndarray,
    bounds: Optional[GeoBounds] = None,
    pixel_size_m: float = 10.0,
    min_area_px: int = 30,
) -> List[SpillRegion]:
    """Trace connected components in the binary mask into georeferenced polygons.

    Parameters
    ----------
    oil_mask : np.ndarray (bool)
        Binary mask from segmentation.py.
    bounds : GeoBounds | None
        Corner lat/lon of the image. If provided, polygons + area/perimeter
        are returned in real-world units (lat/lon, sq km, km). If None,
        only pixel-space geometry is returned, with area/perimeter
        approximated via `pixel_size_m` (meters/pixel - Sentinel-1 GRD IW
        is ~10m, which is the default).
    min_area_px : int
        Discard tiny regions (residual noise after morphology) below this
        pixel count.
    """
    height, width = oil_mask.shape
    labeled = measure.label(oil_mask, connectivity=2)
    regions = []

    px_area_km2 = (pixel_size_m / 1000.0) ** 2
    px_len_km = pixel_size_m / 1000.0

    if bounds is not None:
        km_per_px_x, km_per_px_y = _km_per_pixel(height, width, bounds)

    for prop in measure.regionprops(labeled):
        if prop.area < min_area_px:
            continue

        # Trace the outer contour of this region for a clean polygon boundary
        region_mask = labeled == prop.label
        contours = measure.find_contours(region_mask.astype(float), level=0.5)
        if not contours:
            continue
        # Use the longest contour (outer boundary)
        contour = max(contours, key=len)
        # skimage contours are (row, col) = (y, x); shapely wants (x, y)
        coords_px = [(float(c[1]), float(c[0])) for c in contour]

        try:
            poly = Polygon(coords_px)
            if not poly.is_valid:
                poly = poly.buffer(0)
            if poly.is_empty:
                continue
        except Exception:
            continue

        area_px = poly.area
        perimeter_px = poly.length
        centroid_px = (poly.centroid.x, poly.centroid.y)

        polygon_latlon = None
        centroid_lat = centroid_lon = None
        area_sq_km = perimeter_km = None

        if bounds is not None:
            polygon_latlon = [
                list(pixel_to_latlon(x, y, height, width, bounds)) for x, y in coords_px
            ]
            centroid_lat, centroid_lon = pixel_to_latlon(centroid_px[0], centroid_px[1], height, width, bounds)
            area_sq_km = area_px * km_per_px_x * km_per_px_y
            perimeter_km = perimeter_px * ((km_per_px_x + km_per_px_y) / 2)
        else:
            area_sq_km = area_px * px_area_km2
            perimeter_km = perimeter_px * px_len_km

        regions.append(
            SpillRegion(
                polygon_latlon=polygon_latlon,
                polygon_px=[list(c) for c in coords_px],
                area_sq_km=area_sq_km,
                area_sq_px=area_px,
                perimeter_km=perimeter_km,
                perimeter_px=perimeter_px,
                centroid_lat=centroid_lat,
                centroid_lon=centroid_lon,
                centroid_px=centroid_px,
            )
        )

    # Largest first - usually the primary slick of interest
    regions.sort(key=lambda r: r.area_sq_px, reverse=True)
    return regions
