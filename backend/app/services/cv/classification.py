"""
Module 1 - Stage 1: Classification wrapper

SpillClassifier tries, in order:
  1. Load a trained CNN checkpoint (backend/app/services/cv/weights/
     classifier_oilspill.pt by default, or wherever you point
     `checkpoint_path`) and run inference.
  2. If no checkpoint exists, or torch isn't installed, fall back to a
     cheap heuristic screen (downsized local adaptive threshold +
     dark-fraction check) - fast enough to screen large batches of
     patches, and enough to keep Stage 2 from running on literally every
     patch of a scene before a classifier checkpoint has been trained.

This mirrors the same "auto-upgrades once you drop a checkpoint in"
pattern SpillSegmenter already uses in segmentation.py, so the two
stages behave consistently and the API works end-to-end from day one
(heuristic + classical mode) without any trained weights.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

import numpy as np

DEFAULT_CHECKPOINT = os.path.join(os.path.dirname(__file__), "weights", "classifier_oilspill.pt")

# Heuristic screening bounds on the size of the *largest single connected*
# dark blob in a downsized patch (as a fraction of the patch area) - not
# the total dark-pixel fraction. This matters: plain speckle/noise scatters
# dark pixels all over a patch but rarely forms one sizeable connected
# region, whereas a real slick is a spatially coherent blob. Using the
# largest-component fraction instead of the raw dark fraction keeps the
# heuristic from flagging every noisy-but-otherwise-empty patch. Very high
# fractions are treated as more likely a broad illumination/incidence
# artifact than a real slick, since that's the next biggest false-positive
# source for a threshold-only screen.
HEURISTIC_MIN_DARK_FRACTION = 0.01
HEURISTIC_MAX_DARK_FRACTION = 0.60


@dataclass
class ClassificationResult:
    is_spill: bool
    spill_probability: float   # 0-1
    mode: str                  # "cnn" or "heuristic"


class SpillClassifier:
    def __init__(self, checkpoint_path: str = DEFAULT_CHECKPOINT, device: str = "cpu", threshold: float = 0.5):
        self.checkpoint_path = checkpoint_path
        self.device = device
        self.threshold = threshold
        self._model = None
        self._mode = "heuristic"
        self._try_load_cnn()

    def _try_load_cnn(self):
        if not os.path.exists(self.checkpoint_path):
            self._mode = "heuristic"
            return
        try:
            import torch
            from .classifier import SpillClassifierNet, ResNet18SpillClassifier

            ckpt = torch.load(self.checkpoint_path, map_location=self.device)
            arch = ckpt.get("arch", "cnn")
            
            if arch == "resnet18":
                model = ResNet18SpillClassifier(
                    in_channels=1,
                    num_classes=ckpt.get("num_classes", 2),
                )
            else:
                model = SpillClassifierNet(
                    in_channels=1,
                    base_channels=ckpt.get("base_channels", 16),
                    num_classes=ckpt.get("num_classes", 2),
                )
                
            model.load_state_dict(ckpt["model_state_dict"])
            model.eval()
            model.to(self.device)
            self._model = model
            self._image_size = ckpt.get("image_size", 128)
            self._mode = "cnn"
        except Exception as e:
            print(f"[SpillClassifier] Could not load CNN checkpoint ({e}); using heuristic fallback.")
            self._model = None
            self._mode = "heuristic"

    @property
    def mode(self) -> str:
        return self._mode

    def classify(self, image: np.ndarray) -> ClassificationResult:
        """Screen a single preprocessed (calibrated+despeckled) grayscale patch."""
        if self._mode == "cnn" and self._model is not None:
            return self._classify_cnn(image)
        return self._classify_heuristic(image)

    # ---------------- CNN inference ----------------

    def _classify_cnn(self, image: np.ndarray) -> ClassificationResult:
        import torch
        from PIL import Image
        from .classifier import SPILL_CLASS_IDX

        size = self._image_size
        img_resized = np.array(Image.fromarray(image).resize((size, size), Image.BILINEAR))
        img_norm = img_resized.astype(np.float32) / 255.0
        tensor = torch.from_numpy(img_norm).unsqueeze(0).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self._model(tensor)
            probs = torch.softmax(logits, dim=1)[0]
            spill_prob = float(probs[SPILL_CLASS_IDX].item())

        return ClassificationResult(
            is_spill=spill_prob >= self.threshold,
            spill_probability=spill_prob,
            mode="cnn",
        )

    # ---------------- Heuristic fallback ----------------

    def _classify_heuristic(self, image: np.ndarray) -> ClassificationResult:
        """Cheap downsized local-threshold + largest-connected-blob screen.

        Not a substitute for a trained model - it exists purely so Stage 1
        does something better than "always positive" before a classifier
        checkpoint has been trained. Oil slicks dampen SAR backscatter, so
        they show up as one spatially coherent patch of locally dark
        pixels; scattered speckle/noise does not survive morphological
        opening as a single sizeable connected component the way a real
        slick does, which is what this screen actually checks for.
        """
        from PIL import Image as PILImage
        from scipy import ndimage
        from skimage.filters import threshold_local
        from skimage.morphology import opening, disk

        small = np.array(
            PILImage.fromarray(image).resize((128, 128), PILImage.BILINEAR)
        ).astype(np.float64)

        if small.std() < 1e-6:
            return ClassificationResult(is_spill=False, spill_probability=0.0, mode="heuristic")

        local_thresh = threshold_local(small, block_size=25, offset=8, method="gaussian")
        dark_mask = opening(small < local_thresh, disk(1))

        labeled, num_components = ndimage.label(dark_mask)
        if num_components == 0:
            largest_fraction = 0.0
        else:
            sizes = ndimage.sum(dark_mask, labeled, index=range(1, num_components + 1))
            largest_fraction = float(np.max(sizes)) / dark_mask.size

        is_spill = HEURISTIC_MIN_DARK_FRACTION <= largest_fraction <= HEURISTIC_MAX_DARK_FRACTION

        if largest_fraction < HEURISTIC_MIN_DARK_FRACTION:
            spill_probability = 0.5 * float(np.clip(largest_fraction / HEURISTIC_MIN_DARK_FRACTION, 0, 1))
        elif largest_fraction > HEURISTIC_MAX_DARK_FRACTION:
            spill_probability = 0.5 * float(np.clip(1.0 - (largest_fraction - HEURISTIC_MAX_DARK_FRACTION), 0, 1))
        else:
            mid = (HEURISTIC_MIN_DARK_FRACTION + HEURISTIC_MAX_DARK_FRACTION) / 2
            half_span = (HEURISTIC_MAX_DARK_FRACTION - HEURISTIC_MIN_DARK_FRACTION) / 2
            spill_probability = float(np.clip(1.0 - abs(largest_fraction - mid) / half_span, 0.5, 0.95))

        return ClassificationResult(is_spill=is_spill, spill_probability=spill_probability, mode="heuristic")
