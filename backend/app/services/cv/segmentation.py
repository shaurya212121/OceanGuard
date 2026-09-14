"""
Module 1 - Segmentation

SpillSegmenter tries, in order:
  1. Load a trained U-Net checkpoint (backend/app/services/cv/weights/unet_oilspill.pt
     by default, or wherever you point `checkpoint_path`) and run inference.
  2. If no checkpoint exists, or torch isn't installed, fall back to classical
     adaptive thresholding + morphological cleanup - this is what the spec
     table calls "classical adaptive thresholding + morphology as fallback".

This means the endpoint works end-to-end today (classical mode) and will
transparently start using the trained model the moment you drop a
checkpoint into weights/ - no route/service code changes needed.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

import numpy as np
from scipy import ndimage
from skimage.filters import threshold_local
from skimage.morphology import remove_small_objects, opening, closing, disk

DEFAULT_CHECKPOINT = os.path.join(os.path.dirname(__file__), "weights", "unet_oilspill.pt")


@dataclass
class SegmentationResult:
    oil_mask: np.ndarray          # boolean HxW, True = oil spill pixel
    multiclass_mask: Optional[np.ndarray]  # HxW int, present only in unet mode
    mode: str                     # "unet" or "classical"
    confidence: float             # rough scalar confidence, 0-1


class SpillSegmenter:
    def __init__(self, checkpoint_path: str = DEFAULT_CHECKPOINT, device: str = "cpu"):
        self.checkpoint_path = checkpoint_path
        self.device = device
        self._model = None
        self._mode = "classical"
        self._try_load_unet()

    def _try_load_unet(self):
        if not os.path.exists(self.checkpoint_path):
            self._mode = "classical"
            return
        try:
            import torch
            from .unet import UNet, OIL_SPILL_CLASS_IDX

            ckpt = torch.load(self.checkpoint_path, map_location=self.device)
            model = UNet(
                in_channels=1,
                num_classes=ckpt.get("num_classes", 5),
                base_channels=ckpt.get("base_channels", 32),
            )
            model.load_state_dict(ckpt["model_state_dict"])
            model.eval()
            model.to(self.device)
            self._model = model
            self._image_size = ckpt.get("image_size", 256)
            self._oil_class_idx = OIL_SPILL_CLASS_IDX
            self._mode = "unet"
        except Exception as e:
            print(f"[SpillSegmenter] Could not load U-Net checkpoint ({e}); using classical fallback.")
            self._model = None
            self._mode = "classical"

    @property
    def mode(self) -> str:
        return self._mode

    def segment(self, image: np.ndarray) -> SegmentationResult:
        """Run segmentation on a preprocessed (calibrated+despeckled) grayscale image."""
        if self._mode == "unet" and self._model is not None:
            return self._segment_unet(image)
        return self._segment_classical(image)

    # ---------------- U-Net inference ----------------

    def _segment_unet(self, image: np.ndarray) -> SegmentationResult:
        import torch

        orig_h, orig_w = image.shape[:2]
        size = self._image_size

        from PIL import Image
        img_resized = np.array(Image.fromarray(image).resize((size, size), Image.BILINEAR))
        img_norm = img_resized.astype(np.float32) / 255.0
        tensor = torch.from_numpy(img_norm).unsqueeze(0).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self._model(tensor)
            probs = torch.softmax(logits, dim=1)[0]  # (num_classes, H, W)
            class_map = probs.argmax(dim=0).cpu().numpy()
            oil_prob_map = probs[self._oil_class_idx].cpu().numpy()

        # Resize back to original resolution
        class_map_full = np.array(
            Image.fromarray(class_map.astype(np.uint8)).resize((orig_w, orig_h), Image.NEAREST)
        )
        oil_prob_full = np.array(
            Image.fromarray((oil_prob_map * 255).astype(np.uint8)).resize((orig_w, orig_h), Image.BILINEAR)
        ).astype(np.float32) / 255.0

        oil_mask = class_map_full == self._oil_class_idx
        confidence = float(oil_prob_full[oil_mask].mean()) if oil_mask.any() else 0.0

        return SegmentationResult(
            oil_mask=oil_mask,
            multiclass_mask=class_map_full,
            mode="unet",
            confidence=confidence,
        )

    # ---------------- Classical fallback ----------------

    def _segment_classical(
        self,
        image: np.ndarray,
        block_size: int = 51,
        offset: float = 8,
        min_object_px: int = 80,
    ) -> SegmentationResult:
        """Adaptive local thresholding + morphological cleanup.

        Oil slicks dampen capillary waves, so they appear as locally *dark*
        patches relative to their surrounding water in SAR intensity. Global
        thresholding fails because background brightness varies across the
        swath (incidence angle, wind), so we use adaptive (local) Otsu-style
        thresholding via `threshold_local`, then clean up speckle-sized
        false-positive blobs with morphological opening/closing and a
        minimum-size filter.
        """
        img = image.astype(np.float64)

        local_thresh = threshold_local(img, block_size=block_size, offset=offset, method="gaussian")
        dark_mask = img < local_thresh

        # Morphological cleanup: opening removes small speckle noise,
        # closing fills small holes inside a slick region.
        cleaned = opening(dark_mask, disk(2))
        cleaned = closing(cleaned, disk(3))
        try:
            # scikit-image >= 0.26 renamed min_size -> max_size (same semantics:
            # remove objects with area <= this threshold)
            cleaned = remove_small_objects(cleaned, max_size=min_object_px)
        except TypeError:
            cleaned = remove_small_objects(cleaned, min_size=min_object_px)

        # Fill small interior holes (common in noisy SAR dark patches)
        cleaned = ndimage.binary_fill_holes(cleaned)

        # Confidence heuristic: how strongly, on average, the flagged pixels
        # sit below the local threshold (normalized contrast).
        if cleaned.any():
            contrast = (local_thresh[cleaned] - img[cleaned]) / (local_thresh[cleaned] + 1e-6)
            confidence = float(np.clip(contrast.mean() * 4, 0, 1))
        else:
            confidence = 0.0

        return SegmentationResult(
            oil_mask=cleaned,
            multiclass_mask=None,
            mode="classical",
            confidence=confidence,
        )
