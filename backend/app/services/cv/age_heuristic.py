"""
Module 1 - Age heuristic (stretch goal, per spec)

There is no ground-truth "age" signal in a single SAR image - true age
estimation needs multi-pass time series or oil-type-specific weathering
models. What we *can* extract from one image is shape: fresh spills tend
to be more compact/circular (recently released, hasn't been sheared by
wind/currents yet); older spills stretch, thin, and fragment into
multiple streaks/patches under wind and wave action.

We quantify this with the isoperimetric ratio (a.k.a. compactness /
Polsby-Popper score):

    fragmentation_index = perimeter^2 / (4 * pi * area)

This equals 1.0 for a perfect circle and grows for elongated / irregular
/ fragmented shapes. It's a coarse proxy, not a calibrated age model -
treat the bucket labels as a rough triage signal, not a timestamp.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List

from .geometry import SpillRegion


@dataclass
class AgeEstimate:
    fragmentation_index: float
    num_fragments: int
    bucket: str   # "fresh" | "intermediate" | "weathered" | "unknown"
    note: str


def compute_fragmentation_index(perimeter: float, area: float) -> float:
    if area <= 0:
        return float("nan")
    return (perimeter ** 2) / (4 * math.pi * area)


def estimate_age(regions: List[SpillRegion]) -> AgeEstimate:
    """Estimate a rough age bucket from the segmented region(s)' shape.

    Uses the largest region's compactness plus the total fragment count
    (a slick broken into many separate blobs by wind/wave action reads as
    more weathered than one that's still a single coherent patch).
    """
    if not regions:
        return AgeEstimate(
            fragmentation_index=float("nan"),
            num_fragments=0,
            bucket="unknown",
            note="No regions detected.",
        )

    primary = regions[0]  # largest, already sorted in geometry.extract_regions
    frag_idx = compute_fragmentation_index(primary.perimeter_px, primary.area_sq_px)
    num_fragments = len(regions)

    # Thresholds are heuristic, tuned qualitatively (not on labeled age data -
    # there's no public dataset with verified slick age for calibration).
    # A circle scores 1.0; real slicks rarely go below ~1.2 even when fresh.
    if math.isnan(frag_idx):
        bucket = "unknown"
    elif frag_idx < 2.5 and num_fragments <= 2:
        bucket = "fresh"
    elif frag_idx < 6.0 and num_fragments <= 5:
        bucket = "intermediate"
    else:
        bucket = "weathered"

    note = (
        f"fragmentation_index={frag_idx:.2f} (1.0=circle, higher=more elongated/irregular), "
        f"{num_fragments} separate fragment(s) detected. Heuristic only - not a validated "
        f"age model; treat as a rough triage signal."
    )

    return AgeEstimate(
        fragmentation_index=frag_idx,
        num_fragments=num_fragments,
        bucket=bucket,
        note=note,
    )
