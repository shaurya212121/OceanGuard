"""
Module 1 - Stage 1: Classification / Screening

Lightweight CNN that answers a single yes/no question per image patch:
"does this patch likely contain an oil slick?" It exists to let the
pipeline cheaply screen large volumes of satellite tiles before handing
only the promising ones to the much more expensive pixel-wise U-Net in
segmentation.py - mirroring how these pipelines chain a fast
classifier/detector (the spec's "classification networks or ... Faster
R-CNN") ahead of a slow segmentation model (UNet++ / a domain-adapted
SAM).

Kept intentionally small (4 conv blocks, global-average-pool, one FC
layer) so it runs fast enough on CPU to screen many patches per second -
speed is the entire point of Stage 1. Training happens in
train_classifier.py, inference/loading happens in classification.py. If
PyTorch isn't installed, importing this module raises a clear error
rather than crashing the whole app - classification.py catches that and
falls back to a heuristic screening pipeline.
"""

try:
    import torch
    import torch.nn as nn
except ImportError as e:  # pragma: no cover
    raise ImportError(
        "PyTorch is required for the CNN classifier. Install it with "
        "`pip install torch --index-url https://download.pytorch.org/whl/cpu` "
        "(CPU build) or a CUDA build if you have a GPU. The app will still "
        "run without it, using the heuristic screening fallback."
    ) from e


class ConvBlock(nn.Module):
    """(Conv -> BatchNorm -> ReLU -> MaxPool) - halves spatial resolution."""

    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
        )

    def forward(self, x):
        return self.block(x)


class SpillClassifierNet(nn.Module):
    """Small CNN binary classifier: class 0 = no_spill, class 1 = oil_spill.

    in_channels=1 for single-band SAR grayscale input (matches unet.py).
    Uses global average pooling before the final FC layer so it accepts
    any input resolution at inference time (patches don't all need to be
    exactly `image_size`), though for best accuracy it should be trained
    and used at a consistent scale.
    """

    def __init__(self, in_channels: int = 1, base_channels: int = 16, num_classes: int = 2):
        super().__init__()
        c = base_channels
        self.features = nn.Sequential(
            ConvBlock(in_channels, c),       # /2
            ConvBlock(c, c * 2),             # /4
            ConvBlock(c * 2, c * 4),         # /8
            ConvBlock(c * 4, c * 8),         # /16
        )
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Dropout(0.3),
            nn.Linear(c * 8, num_classes),
        )

    def forward(self, x):
        x = self.features(x)
        x = self.pool(x)
        return self.classifier(x)  # raw logits, shape (B, num_classes)


CLASS_NAMES = ["no_spill", "oil_spill"]
SPILL_CLASS_IDX = 1


class ResNet18SpillClassifier(nn.Module):
    def __init__(self, in_channels: int = 1, num_classes: int = 2):
        super().__init__()
        import torchvision.models as models
        # Load pretrained resnet18
        weights = models.ResNet18_Weights.DEFAULT
        self.backbone = models.resnet18(weights=weights)
        
        # Modify first conv layer to accept 1-channel grayscale input
        if in_channels != 3:
            old_conv1 = self.backbone.conv1
            self.backbone.conv1 = nn.Conv2d(
                in_channels,
                old_conv1.out_channels,
                kernel_size=old_conv1.kernel_size,
                stride=old_conv1.stride,
                padding=old_conv1.padding,
                bias=False
            )
            # Average or sum RGB weights across channels to initialize 1-channel weights
            with torch.no_grad():
                self.backbone.conv1.weight.data = old_conv1.weight.data.sum(dim=1, keepdim=True)
                
        # Modify the fc layer
        in_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Linear(in_features, num_classes)
        
    def forward(self, x):
        return self.backbone(x)
