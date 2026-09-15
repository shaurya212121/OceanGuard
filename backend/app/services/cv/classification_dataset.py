"""
Dataset loader for training the Stage 1 classifier.

Reuses the exact same directory layout and label PNGs as the
segmentation dataset (see dataset.py) - no separate classification
dataset needs to be collected. A chip is labeled `oil_spill` (1) if its
segmentation mask has at least `min_oil_fraction` of pixels in the Oil
Spill class, `no_spill` (0) otherwise.

Training Stage 1 off the same underlying data/split as Stage 2 (train.py)
is what makes "only pass Stage-1 positives into Stage-2" a fair setup at
inference time - the classifier learns to recognize exactly the chips the
segmenter learns to draw boundaries on.
"""

from __future__ import annotations

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

from .dataset import PALETTE, rgb_mask_to_class_index

OIL_SPILL_CLASS_IDX = 1


class OilSpillClassificationDataset(Dataset):
    def __init__(
        self,
        data_root: str,
        split: str = "train",
        image_size: int = 128,
        min_oil_fraction: float = 0.01,
        masks_are_indexed: bool = False,
        palette: dict = PALETTE,
    ):
        self.image_dir = Path(data_root) / split / "images"
        self.label_dir = Path(data_root) / split / "labels"
        if not self.image_dir.exists():
            raise FileNotFoundError(
                f"Expected images at {self.image_dir}. Same layout as "
                f"OilSpillSegDataset - see dataset.py's docstring."
            )
        self.image_size = image_size
        self.min_oil_fraction = min_oil_fraction
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
                f"Check the dataset layout matches dataset.py's docstring."
            )

    def __len__(self):
        return len(self.samples)

    def _label_for(self, label_path: Path) -> int:
        label_img = Image.open(label_path)
        if self.masks_are_indexed:
            arr = np.array(label_img.convert("L"))
        else:
            arr = rgb_mask_to_class_index(np.array(label_img.convert("RGB")), self.palette)
        oil_fraction = float((arr == OIL_SPILL_CLASS_IDX).mean())
        return int(oil_fraction >= self.min_oil_fraction)

    def __getitem__(self, idx):
        img_path, label_path = self.samples[idx]

        img = Image.open(img_path).convert("L").resize(
            (self.image_size, self.image_size), Image.BILINEAR
        )
        img_arr = np.array(img, dtype=np.float32) / 255.0
        img_tensor = torch.from_numpy(img_arr).unsqueeze(0)  # (1, H, W)

        label = self._label_for(label_path)
        return img_tensor, torch.tensor(label, dtype=torch.long)
