"""
Module 1 - full pipeline entrypoint.

Two-stage hybrid pipeline:

  Stage 1 (Classification / Screening) - SpillClassifier rapidly screens
    the image - or, for scenes larger than `patch_size`, each patch of it
    - to decide whether it likely contains an oil slick at all. This is
    the cheap step, meant to run over large volumes of satellite tiles.

  Stage 2 (Segmentation) - only the image/patches that pass Stage 1 are
    handed to SpillSegmenter (U-Net, or its classical fallback) for the
    expensive pixel-wise boundary extraction. Patches that screen
    negative never reach Stage 2 at all.

SAR image bytes -> preprocess -> classify -> [segment -> geometry -> age]
-> structured result ready to feed Module 2 (drift) and Module 3 (AIS
attribution), and to populate the existing `OilSpill` schema.
"""

from __future__ import annotations

import base64
import io
from dataclasses import dataclass
from typing import List, Optional, Tuple

import numpy as np
from PIL import Image

from .preprocessing import preprocess
from .classification import SpillClassifier, ClassificationResult
from .segmentation import SpillSegmenter
from .tiling import split_into_patches, stitch_masks
from .geometry import extract_regions, GeoBounds, SpillRegion
from .age_heuristic import estimate_age, AgeEstimate

# Module-level singletons so the (possibly large) model weights are
# loaded once, not on every request.
_SEGMENTER: Optional[SpillSegmenter] = None
_CLASSIFIER: Optional[SpillClassifier] = None


def get_segmenter() -> SpillSegmenter:
    global _SEGMENTER
    if _SEGMENTER is None:
        _SEGMENTER = SpillSegmenter()
    return _SEGMENTER


def get_classifier() -> SpillClassifier:
    global _CLASSIFIER
    if _CLASSIFIER is None:
        _CLASSIFIER = SpillClassifier()
    return _CLASSIFIER


@dataclass
class DetectionResult:
    mode: str                          # segmentation mode ("unet"/"classical"), or "<classification_mode>_negative" if Stage 2 never ran
    spill_detected: bool               # overall verdict after both stages
    classification_mode: str           # "cnn" or "heuristic" (Stage 1)
    classification_confidence: float   # max spill probability seen across screened patches
    patches_screened: int
    patches_flagged: int               # how many patches Stage 1 handed to Stage 2
    confidence: float                  # Stage 2 segmentation confidence (0 if Stage 2 never ran)
    regions: List[SpillRegion]
    age: AgeEstimate
    overlay_png_base64: str
    total_area_sq_km: Optional[float]
    primary_centroid_lat: Optional[float]
    primary_centroid_lon: Optional[float]
    primary_polygon_latlon: Optional[List[List[float]]]
    primary_polygon_px: Optional[List[List[float]]]


def _make_overlay(original_gray: np.ndarray, oil_mask: Optional[np.ndarray]) -> str:
    """Red-tinted overlay of the detected oil mask on the original image, as base64 PNG.

    If `oil_mask` is None (Stage 1 screened everything negative, so
    Stage 2 never ran), this just returns the plain grayscale image -
    there's nothing to highlight.
    """
    rgb = np.stack([original_gray] * 3, axis=-1).astype(np.uint8)
    if oil_mask is not None and oil_mask.any():
        overlay = rgb.copy()
        overlay[oil_mask] = [255, 60, 60]
        rgb = (0.55 * rgb + 0.45 * overlay).astype(np.uint8)

    buf = io.BytesIO()
    Image.fromarray(rgb).save(buf, format="PNG")
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
    patch_size: int = 512,
    patch_overlap: int = 32,
    classification_threshold: float = 0.55,
    force_segmentation: bool = False,
) -> DetectionResult:
    """Run the full two-stage Module 1 pipeline on a raw SAR/EO image file's bytes.

    Stage 1 screens the image - or, if it's larger than `patch_size`,
    each patch of it - and Stage 2 only runs on the image/patches that
    screen positive. This is what lets the pipeline "efficiently handle
    massive amounts of satellite data": most open-water tiles never reach
    the expensive pixel-wise model at all.

    Set `force_segmentation=True` to bypass the Stage 1 gate (e.g. to
    debug the segmenter directly, or for chips you already know contain a
    spill) - Stage 1 still runs and is reported, it just no longer decides
    whether Stage 2 executes.

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

    classifier = get_classifier()
    classifier.threshold = classification_threshold
    segmenter = get_segmenter()

    patches = split_into_patches(processed, patch_size=patch_size, overlap=patch_overlap)

    classification_results: List[ClassificationResult] = []
    positive_masks: List[Tuple[np.ndarray, int, int]] = []
    seg_confidences: List[float] = []
    seg_mode: Optional[str] = None

    for patch in patches:
        cls_result = classifier.classify(patch.array)
        classification_results.append(cls_result)

        if not (cls_result.is_spill or force_segmentation):
            continue  # Stage 1 negative: skip the expensive Stage 2 model entirely

        seg_result = segmenter.segment(patch.array)
        seg_mode = seg_result.mode
        if seg_result.oil_mask.any():
            positive_masks.append((seg_result.oil_mask, patch.x_offset, patch.y_offset))
            seg_confidences.append(seg_result.confidence)

    patches_flagged = sum(1 for r in classification_results if r.is_spill)
    max_classification_conf = max((r.spill_probability for r in classification_results), default=0.0)
    classification_mode = classification_results[0].mode if classification_results else classifier.mode

    spill_detected = bool(positive_masks)

    if not spill_detected:
        # Nothing survived Stage 1 (or Stage 2 found no actual oil pixels
        # in the patches it did run on) - skip geometry/age extraction
        # entirely and return a cheap "no spill" result.
        return DetectionResult(
            mode=f"{classification_mode}_negative",
            spill_detected=False,
            classification_mode=classification_mode,
            classification_confidence=max_classification_conf,
            patches_screened=len(patches),
            patches_flagged=patches_flagged,
            confidence=0.0,
            regions=[],
            age=estimate_age([]),
            overlay_png_base64=_make_overlay(processed, None),
            total_area_sq_km=0.0,
            primary_centroid_lat=None,
            primary_centroid_lon=None,
            primary_polygon_latlon=None,
            primary_polygon_px=None,
        )

    full_oil_mask = stitch_masks(processed.shape[:2], positive_masks)

    bounds = None
    if None not in (top_left_lat, top_left_lon, bottom_right_lat, bottom_right_lon):
        bounds = GeoBounds(
            top_left_lat=top_left_lat,
            top_left_lon=top_left_lon,
            bottom_right_lat=bottom_right_lat,
            bottom_right_lon=bottom_right_lon,
        )

    regions = extract_regions(
        full_oil_mask,
        bounds=bounds,
        pixel_size_m=pixel_size_m,
        min_area_px=min_area_px,
    )

    age = estimate_age(regions)
    overlay_b64 = _make_overlay(processed, full_oil_mask)

    total_area = sum(r.area_sq_km for r in regions if r.area_sq_km is not None) if regions else 0.0
    primary = regions[0] if regions else None

    return DetectionResult(
        mode=seg_mode or "classical",
        spill_detected=True,
        classification_mode=classification_mode,
        classification_confidence=max_classification_conf,
        patches_screened=len(patches),
        patches_flagged=patches_flagged,
        confidence=float(np.mean(seg_confidences)) if seg_confidences else 0.0,
        regions=regions,
        age=age,
        overlay_png_base64=overlay_b64,
        total_area_sq_km=total_area,
        primary_centroid_lat=primary.centroid_lat if primary else None,
        primary_centroid_lon=primary.centroid_lon if primary else None,
        primary_polygon_latlon=primary.polygon_latlon if primary else None,
        primary_polygon_px=primary.polygon_px if primary else None,
    )
