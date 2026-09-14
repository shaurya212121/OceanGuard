"""
Module 1 - full pipeline entrypoint.

SAR image bytes -> preprocess -> segment -> extract geometry -> age heuristic
-> structured result ready to feed Module 2 (drift) and Module 3 (AIS
attribution), and to populate the existing `OilSpill` schema.
"""

from __future__ import annotations

import base64
import io
from dataclasses import dataclass, field
from typing import List, Optional

import numpy as np
from PIL import Image

from .preprocessing import preprocess
from .segmentation import SpillSegmenter
from .geometry import extract_regions, GeoBounds, SpillRegion
from .age_heuristic import estimate_age, AgeEstimate

# Module-level singleton so the (possibly large) U-Net weights are loaded once,
# not on every request.
_SEGMENTER: Optional[SpillSegmenter] = None


def get_segmenter() -> SpillSegmenter:
    global _SEGMENTER
    if _SEGMENTER is None:
        _SEGMENTER = SpillSegmenter()
    return _SEGMENTER


@dataclass
class DetectionResult:
    mode: str                          # "unet" or "classical"
    confidence: float
    regions: List[SpillRegion]
    age: AgeEstimate
    overlay_png_base64: str
    total_area_sq_km: Optional[float]
    primary_centroid_lat: Optional[float]
    primary_centroid_lon: Optional[float]
    primary_polygon_latlon: Optional[List[List[float]]]
    primary_polygon_px: Optional[List[List[float]]]


def _make_overlay(original_gray: np.ndarray, oil_mask: np.ndarray) -> str:
    """Red-tinted overlay of the detected oil mask on the original image, as base64 PNG."""
    rgb = np.stack([original_gray] * 3, axis=-1).astype(np.uint8)
    overlay = rgb.copy()
    overlay[oil_mask] = [255, 60, 60]
    blended = (0.55 * rgb + 0.45 * overlay).astype(np.uint8)

    buf = io.BytesIO()
    Image.fromarray(blended).save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def detect_oil_spill(
    image_bytes: bytes,
    pixel_size_m: float = 10.0,
    already_calibrated: bool = True,
    speckle_method: str = "lee",
    top_left_lat: Optional[float] = None,
    top_left_lon: Optional[float] = None,
    bottom_right_lat: Optional[float] = None,
    bottom_right_lon: Optional[float] = None,
    land_mask: Optional[np.ndarray] = None,
    min_area_px: int = 30,
) -> DetectionResult:
    """Run the full Module 1 pipeline on a raw SAR/EO image file's bytes.

    If all four georeferencing corners are provided, polygons/centroid are
    returned as real lat/lon and area/perimeter in km. Otherwise everything
    is returned in pixel space plus an area approximated from
    `pixel_size_m` (meters/pixel; Sentinel-1 GRD IW default ~10m).
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("L")
    raw = np.array(img)

    processed = preprocess(
        raw,
        already_calibrated=already_calibrated,
        speckle_method=speckle_method,
        land_mask=land_mask,
    )

    segmenter = get_segmenter()
    seg_result = segmenter.segment(processed)

    bounds = None
    if None not in (top_left_lat, top_left_lon, bottom_right_lat, bottom_right_lon):
        bounds = GeoBounds(
            top_left_lat=top_left_lat,
            top_left_lon=top_left_lon,
            bottom_right_lat=bottom_right_lat,
            bottom_right_lon=bottom_right_lon,
        )

    regions = extract_regions(
        seg_result.oil_mask,
        bounds=bounds,
        pixel_size_m=pixel_size_m,
        min_area_px=min_area_px,
    )

    age = estimate_age(regions)
    overlay_b64 = _make_overlay(processed, seg_result.oil_mask)

    total_area = sum(r.area_sq_km for r in regions if r.area_sq_km is not None) if regions else 0.0
    primary = regions[0] if regions else None

    return DetectionResult(
        mode=seg_result.mode,
        confidence=seg_result.confidence,
        regions=regions,
        age=age,
        overlay_png_base64=overlay_b64,
        total_area_sq_km=total_area,
        primary_centroid_lat=primary.centroid_lat if primary else None,
        primary_centroid_lon=primary.centroid_lon if primary else None,
        primary_polygon_latlon=primary.polygon_latlon if primary else None,
        primary_polygon_px=primary.polygon_px if primary else None,
    )
