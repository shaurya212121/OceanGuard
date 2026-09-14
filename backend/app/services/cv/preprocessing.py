"""
Module 1 - Preprocessing
-------------------------
SAR images are noisy (speckle) and often contain land, which must be masked
out before segmentation so the model / thresholder doesn't confuse coastline
shadow with an oil slick.

Three steps, matching the spec table:
  1. calibrate            -> radiometric calibration (sigma0 normalization)
  2. speckle_filter        -> Lee or median filter to suppress speckle noise
  3. mask_land             -> zero out land pixels using an optional polygon
                               mask (coastline) or a supplied raster mask

NOTE on calibration: true SAR radiometric calibration (converting raw DN
values to sigma-nought backscatter, in dB) needs the product's calibration
LUTs, which only ship with Level-1 SAR products (e.g. Sentinel-1 .SAFE /
GeoTIFF with accompanying annotation XML), not a plain PNG/JPEG chip. Most
public oil-spill datasets (e.g. the Krestenitis "Oil Spill Detection
Dataset" / SOS dataset) are already calibrated + quantized to 8-bit
grayscale PNGs. `calibrate()` therefore:
  - if given a raw linear-scale SAR array, converts to dB (10*log10) and
    normalizes to 0-255, OR
  - if given an already-8-bit image, is a documented no-op passthrough.
Swap in true LUT-based calibration if you're working from raw .SAFE data.
"""

from __future__ import annotations

import numpy as np
from scipy.ndimage import median_filter as _scipy_median_filter
from scipy.ndimage import uniform_filter


def calibrate(image: np.ndarray, already_calibrated: bool = True) -> np.ndarray:
    """Radiometric calibration / normalization to an 8-bit grayscale array.

    Parameters
    ----------
    image : np.ndarray
        Input SAR image. Either uint8 (already calibrated/quantized, e.g.
        from a public dataset) or a raw linear-power float array.
    already_calibrated : bool
        Set False if `image` is raw linear-scale SAR backscatter (not dB,
        not 8-bit) and needs dB conversion + normalization.
    """
    img = np.asarray(image)

    if img.ndim == 3:
        # Collapse to single channel (grayscale) - SAR intensity is single-band.
        img = img.mean(axis=2)

    if already_calibrated:
        return _to_uint8(img)

    # Raw linear power -> dB (sigma0), avoiding log(0)
    eps = 1e-6
    db = 10.0 * np.log10(np.clip(img.astype(np.float64), eps, None))
    return _to_uint8(db)


def _to_uint8(arr: np.ndarray) -> np.ndarray:
    arr = arr.astype(np.float64)
    lo, hi = np.percentile(arr, 1), np.percentile(arr, 99)
    if hi <= lo:
        lo, hi = arr.min(), arr.max() if arr.max() > arr.min() else arr.min() + 1
    scaled = np.clip((arr - lo) / (hi - lo), 0, 1) * 255.0
    return scaled.astype(np.uint8)


def lee_filter(image: np.ndarray, window: int = 5) -> np.ndarray:
    """Lee speckle filter.

    Adaptive filter that smooths homogeneous regions (like open water or a
    slick) while preserving edges, using local statistics under a
    multiplicative-noise assumption typical of SAR speckle.
    """
    img = image.astype(np.float64)
    img_mean = uniform_filter(img, size=window)
    img_sqr_mean = uniform_filter(img ** 2, size=window)
    img_variance = img_sqr_mean - img_mean ** 2

    overall_variance = img.var()
    if overall_variance <= 0:
        return image.copy()

    weights = img_variance / (img_variance + overall_variance)
    filtered = img_mean + weights * (img - img_mean)
    return np.clip(filtered, 0, 255).astype(np.uint8)


def median_speckle_filter(image: np.ndarray, size: int = 3) -> np.ndarray:
    """Simple median filter fallback for speckle suppression."""
    return _scipy_median_filter(image, size=size)


def speckle_filter(image: np.ndarray, method: str = "lee", window: int = 5) -> np.ndarray:
    if method == "lee":
        return lee_filter(image, window=window)
    if method == "median":
        return median_speckle_filter(image, size=window)
    raise ValueError(f"Unknown speckle filter method: {method}")


def mask_land(image: np.ndarray, land_mask: np.ndarray | None) -> np.ndarray:
    """Zero out land pixels so they can't be mistaken for a slick.

    Parameters
    ----------
    image : np.ndarray
        Preprocessed (calibrated + despeckled) grayscale image.
    land_mask : np.ndarray | None
        Boolean array, same HxW as `image`, True where the pixel is land.
        Build one with `build_land_mask_from_polygons` if you have a
        coastline polygon + the image's geographic bounds. If None, this
        is a no-op (useful for chip datasets that are already water-only,
        like most SOS/Kaggle oil-spill training crops).
    """
    if land_mask is None:
        return image
    if land_mask.shape != image.shape:
        raise ValueError("land_mask shape must match image shape")
    out = image.copy()
    out[land_mask] = 0
    return out


def build_land_mask_from_polygons(height: int, width: int, land_polygons_px: list) -> np.ndarray:
    """Rasterize coastline polygons (in pixel coordinates) into a boolean mask.

    `land_polygons_px` is a list of polygons, each a list of (x, y) pixel
    coordinate tuples. Use this if you have a coastline shapefile/GeoJSON:
    reproject its polygons into the image's pixel space first (via the same
    affine transform used in `geometry.py`), then pass them here.
    """
    from PIL import Image, ImageDraw

    mask_img = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask_img)
    for poly in land_polygons_px:
        if len(poly) >= 3:
            draw.polygon(poly, fill=1)
    return np.array(mask_img, dtype=bool)


def preprocess(
    image: np.ndarray,
    already_calibrated: bool = True,
    speckle_method: str = "lee",
    speckle_window: int = 5,
    land_mask: np.ndarray | None = None,
) -> np.ndarray:
    """Full preprocessing pipeline: calibrate -> despeckle -> mask land."""
    calibrated = calibrate(image, already_calibrated=already_calibrated)
    despeckled = speckle_filter(calibrated, method=speckle_method, window=speckle_window)
    masked = mask_land(despeckled, land_mask)
    return masked
