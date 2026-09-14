"""
Dataset loader for the public "Oil Spill Detection Dataset" (a.k.a. SOS -
Sentinel-1 SAR Oil Spill dataset, Krestenitis et al.), available on Kaggle:
  https://www.kaggle.com/datasets/rignak/oil-spill-detection-dataset (mirror)
  or the original: https://m4d.iti.gr/oil-spill-detection-dataset/

Expected directory layout after download:

    <data_root>/
        train/
            images/   *.jpg or *.png   (grayscale SAR chips)
            labels/   *.png            (color-coded semantic masks, same filename)
        test/
            images/
            labels/

The label PNGs are RGB, color-coded per class. Default palette below
matches the dataset's published legend - double check against the
dataset's own README when you download it, since palettes have drifted
across re-uploads/mirrors, and adjust PALETTE if needed.

If your downloaded copy instead ships masks as single-channel class-index
PNGs (0..4) rather than RGB, set `masks_are_indexed=True` and this will
skip the color->class remapping step.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import List, Tuple

import numpy as np

try:
    import torch
    from torch.utils.data import Dataset
    from PIL import Image
except ImportError as e:  # pragma: no cover
    raise ImportError(
        "PyTorch, and Pillow are required for training. "
        "pip install torch pillow"
    ) from e

# RGB color -> class index. Class 0 is background/sea.
PALETTE = {
    (0, 0, 0): 0,        # Background / Sea
    (0, 255, 255): 1,    # Oil Spill (cyan)
    (255, 0, 0): 2,      # Look-alike (red)
    (153, 76, 0): 3,     # Ship (brown)
    (0, 153, 0): 4,      # Land (green)
}


def rgb_mask_to_class_index(mask_rgb: np.ndarray, palette: dict = PALETTE) -> np.ndarray:
    """Convert an HxWx3 color-coded mask to an HxW class-index array."""
    h, w = mask_rgb.shape[:2]
    out = np.zeros((h, w), dtype=np.int64)
    for color, cls in palette.items():
        matches = np.all(mask_rgb == np.array(color), axis=-1)
        out[matches] = cls
    return out


class OilSpillSegDataset(Dataset):
    def __init__(
        self,
        data_root: str,
        split: str = "train",
        image_size: int = 256,
        masks_are_indexed: bool = False,
        palette: dict = PALETTE,
    ):
        self.image_dir = Path(data_root) / split / "images"
        self.label_dir = Path(data_root) / split / "labels"
        if not self.image_dir.exists():
            raise FileNotFoundError(
                f"Expected images at {self.image_dir}. Download the SOS/Kaggle "
                f"Oil Spill Detection Dataset and arrange it as documented in "
                f"this file's docstring."
            )
        self.image_size = image_size
        self.masks_are_indexed = masks_are_indexed
        self.palette = palette

        exts = {".png", ".jpg", ".jpeg"}
        self.samples: List[Tuple[Path, Path]] = []
        for img_path in sorted(self.image_dir.iterdir()):
            if img_path.suffix.lower() not in exts:
                continue
            label_path = self.label_dir / (img_path.stem + ".png")
            if label_path.exists():
                self.samples.append((img_path, label_path))

        if not self.samples:
            raise RuntimeError(
                f"No matching image/label pairs found under {data_root}/{split}. "
                f"Check the dataset layout matches this file's docstring."
            )

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, label_path = self.samples[idx]

        img = Image.open(img_path).convert("L").resize(
            (self.image_size, self.image_size), Image.BILINEAR
        )
        img_arr = np.array(img, dtype=np.float32) / 255.0
        img_tensor = torch.from_numpy(img_arr).unsqueeze(0)  # (1, H, W)

        label_img = Image.open(label_path).resize(
            (self.image_size, self.image_size), Image.NEAREST
        )
        if self.masks_are_indexed:
            label_arr = np.array(label_img.convert("L"), dtype=np.int64)
        else:
            label_arr = rgb_mask_to_class_index(np.array(label_img.convert("RGB")), self.palette)
        label_tensor = torch.from_numpy(label_arr)  # (H, W), long

        return img_tensor, label_tensor
