from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

from ..models import (
    SpillDetectionResponse,
    SpillRegionResult,
    AgeEstimateResult,
)
from ..services.cv import detect_oil_spill

router = APIRouter()


@router.post("/detect-spill", response_model=SpillDetectionResponse)
async def detect_spill(
    image: UploadFile = File(..., description="SAR or EO image - a small chip, or a large scene (PNG/JPEG)"),
    pixel_size_m: float = Form(10.0, description="Meters per pixel, e.g. Sentinel-1 GRD IW ~10m"),
    already_calibrated: bool = Form(True, description="False if raw linear-power SAR needs dB conversion"),
    speckle_method: str = Form("lee", description="'lee' or 'median'"),
    top_left_lat: Optional[float] = Form(None),
    top_left_lon: Optional[float] = Form(None),
    bottom_right_lat: Optional[float] = Form(None),
    bottom_right_lon: Optional[float] = Form(None),
    min_area_px: int = Form(30, description="Discard regions smaller than this many pixels"),
    patch_size: int = Form(512, description="Stage 1 screens the image in patches this large (px); scenes at or below this size are screened whole"),
    patch_overlap: int = Form(32, description="Overlap (px) between adjacent patches, so a slick straddling a patch boundary isn't missed"),
    classification_threshold: float = Form(0.55, description="Stage 1 spill-probability threshold above which a patch is passed to Stage 2 segmentation"),
    force_segmentation: bool = Form(False, description="Bypass the Stage 1 gate and run Stage 2 on every patch regardless (debugging / known-positive chips)"),
):
    """
    Module 1: Two-stage hybrid detection of oil spill(s) in an uploaded SAR/EO image.

    Stage 1 (classification/screening) rapidly screens the image - or,
    for scenes larger than `patch_size`, each patch of it - for the
    likely presence of a slick. Only patches that pass Stage 1 are handed
    to Stage 2 (pixel-wise segmentation), which extracts precise
    boundaries, area, centroid, perimeter, and a fragmentation-based age
    heuristic. Patches that screen negative in Stage 1 never reach the
    (much more expensive) segmentation model.

    Both stages auto-upgrade from lightweight fallbacks (heuristic
    screening / classical adaptive thresholding) to trained models the
    moment checkpoints are present at:
      backend/app/services/cv/weights/classifier_oilspill.pt   (Stage 1)
      backend/app/services/cv/weights/unet_oilspill.pt          (Stage 2)
    - no route/service code changes needed either way.

    If the four georeferencing corner params are supplied, geometry is
    returned in real lat/lon + km; otherwise it's in pixel space (scaled
    by pixel_size_m).
    """
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty file upload")

    try:
        result = detect_oil_spill(
            image_bytes=image_bytes,
            pixel_size_m=pixel_size_m,
            already_calibrated=already_calibrated,
            speckle_method=speckle_method,
            top_left_lat=top_left_lat,
            top_left_lon=top_left_lon,
            bottom_right_lat=bottom_right_lat,
            bottom_right_lon=bottom_right_lon,
            min_area_px=min_area_px,
            patch_size=patch_size,
            patch_overlap=patch_overlap,
            classification_threshold=classification_threshold,
            force_segmentation=force_segmentation,
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Detection failed: {e}")

    return SpillDetectionResponse(
        spill_detected=result.spill_detected,
        mode=result.mode,
        confidence=result.confidence,
        classification_mode=result.classification_mode,
        classification_confidence=result.classification_confidence,
        patches_screened=result.patches_screened,
        patches_flagged=result.patches_flagged,
        total_area_sq_km=result.total_area_sq_km or 0.0,
        primary_centroid_lat=result.primary_centroid_lat,
        primary_centroid_lon=result.primary_centroid_lon,
        primary_polygon_latlon=result.primary_polygon_latlon,
        primary_polygon_px=result.primary_polygon_px,
        regions=[
            SpillRegionResult(
                polygon_latlon=r.polygon_latlon,
                polygon_px=r.polygon_px,
                area_sq_km=r.area_sq_km,
                perimeter_km=r.perimeter_km,
                centroid_lat=r.centroid_lat,
                centroid_lon=r.centroid_lon,
            )
            for r in result.regions
        ],
        age=AgeEstimateResult(
            fragmentation_index=result.age.fragmentation_index,
            num_fragments=result.age.num_fragments,
            bucket=result.age.bucket,
            note=result.age.note,
        ),
        overlay_png_base64=result.overlay_png_base64,
    )
