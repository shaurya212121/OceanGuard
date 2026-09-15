"""
Module 1 - Computer Vision: Oil Spill Detection

Two-stage hybrid pipeline (see pipeline.py for the full flow):
  Stage 1: SpillClassifier (classification.py) - fast screening, CNN or
           heuristic fallback.
  Stage 2: SpillSegmenter (segmentation.py) - pixel-wise boundary
           extraction, U-Net or classical fallback, run only on Stage 1
           positives.
"""

from .pipeline import detect_oil_spill, get_segmenter, get_classifier, DetectionResult
from .segmentation import SpillSegmenter, SegmentationResult
from .classification import SpillClassifier, ClassificationResult

__all__ = [
    "detect_oil_spill",
    "get_segmenter",
    "get_classifier",
    "DetectionResult",
    "SpillSegmenter",
    "SegmentationResult",
    "SpillClassifier",
    "ClassificationResult",
]
