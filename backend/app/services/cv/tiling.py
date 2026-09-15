"""
Module 1 - Patch tiling helpers for Stage 1 screening.

Large satellite scenes are too big to feed a segmentation model in one
shot, so the pipeline splits them into fixed-size (optionally
overlapping) patches, lets the Stage 1 classifier screen through all of
them quickly, and only stitches Stage 2 segmentation results back
together for the patches that actually screened positive. Small chips
(already close to a single patch, e.g. the public SOS dataset crops) pass
through as a single "patch" so the two-stage pipeline behaves the same
way regardless of input size.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Tuple

import numpy as np


@dataclass
class Patch:
    array: np.ndarray
    x_offset: int
    y_offset: int


def split_into_patches(
    image: np.ndarray,
    patch_size: int = 512,
    overlap: int = 32,
) -> List[Patch]:
    """Split a 2D grayscale image into (possibly overlapping) square patches.

    The last patch in each row/column is shifted inward (not padded) so
    every patch stays full-size - simpler than padding, and fine since the
    overlap already covers slick fragments that would otherwise get cut in
    half at a patch boundary.
    """
    height, width = image.shape[:2]
    if height <= patch_size and width <= patch_size:
        return [Patch(array=image, x_offset=0, y_offset=0)]

    stride = max(patch_size - overlap, 1)

    def _starts(total: int) -> List[int]:
        if total <= patch_size:
            return [0]
        starts = list(range(0, total - patch_size + 1, stride))
        last_start = total - patch_size
        if starts[-1] != last_start:
            starts.append(last_start)
        return starts

    patches: List[Patch] = []
    for y in _starts(height):
        for x in _starts(width):
            patches.append(Patch(array=image[y:y + patch_size, x:x + patch_size], x_offset=x, y_offset=y))
    return patches


def stitch_masks(
    full_shape: Tuple[int, int],
    patch_masks: List[Tuple[np.ndarray, int, int]],
) -> np.ndarray:
    """OR-combine per-patch boolean masks back into a full-image mask.

    `patch_masks` is a list of (mask, x_offset, y_offset) for the patches
    that were positively classified *and* segmented - patches that
    screened negative in Stage 1 simply contribute nothing (implicitly
    all-False), which is the whole point of skipping Stage 2 on them.
    """
    full_mask = np.zeros(full_shape, dtype=bool)
    for mask, x_off, y_off in patch_masks:
        h, w = mask.shape[:2]
        full_mask[y_off:y_off + h, x_off:x_off + w] |= mask
    return full_mask
