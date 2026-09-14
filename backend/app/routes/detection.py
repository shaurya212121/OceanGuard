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
    image: UploadFile = File(..., description="SAR or EO image chip (PNG/JPEG)"),
    pixel_size_m: float = Form(10.0, description="Meters per pixel, e.g. Sentinel-1 GRD IW ~10m"),
    already_calibrated: bool = Form(True, description="False if raw linear-power SAR needs dB conversion"),
    speckle_method: str = Form("lee", description="'lee' or 'median'"),
    top_left_lat: Optional[float] = Form(None),
    top_left_lon: Optional[float] = Form(None),
    bottom_right_lat: Optional[float] = Form(None),
    bottom_right_lon: Optional[float] = Form(None),
    min_area_px: int = Form(30, description="Discard regions smaller than this many pixels"),
):
    """
    Module 1: Detect and characterise oil spill(s) in an uploaded SAR/EO image.

    Returns segmented region polygon(s), area, centroid, perimeter, a
    fragmentation-based age heuristic, and a visual overlay. If the four
    georeferencing corner params are supplied, geometry is returned in real
    lat/lon + km; otherwise it's in pixel space (scaled by pixel_size_m).

    Automatically uses a trained U-Net if a checkpoint is present at
    backend/app/services/cv/weights/unet_oilspill.pt, otherwise falls back
    to classical adaptive-threshold + morphology segmentation.
    """
    if image.content_type not in ("image/png", "image/jpeg", "image/jpg", "image/tiff", None):
        # Some clients don't set content_type reliably; don't hard-block, just warn via 415 only for clearly wrong types
        pass

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
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Detection failed: {e}")

    return SpillDetectionResponse(
        mode=result.mode,
        confidence=result.confidence,
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
