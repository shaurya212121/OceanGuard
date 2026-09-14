"""
Module 1 - Segmentation model: U-Net

Standard encoder-decoder U-Net with skip connections, sized for SAR chip
segmentation. Trained multi-class (see dataset.py for the class palette
used by the public "SOS" / Krestenitis Oil Spill Detection Dataset):

    0 Background / Sea   1 Oil Spill   2 Look-alike   3 Ship   4 Land

At inference we mainly care about class 1 (Oil Spill), but keeping the
other classes lets the model learn to *distinguish* real slicks from
look-alikes (low-wind zones, algae, rain cells) rather than just doing
binary "dark vs bright" thresholding - the biggest source of false
positives in this problem.

This file only defines the architecture. Training happens in train.py,
inference/loading happens in segmentation.py. If PyTorch isn't installed
in the current environment, importing this module raises a clear error
rather than crashing the whole app - segmentation.py catches that and
falls back to the classical thresholding pipeline.
"""

try:
    import torch
    import torch.nn as nn
except ImportError as e:  # pragma: no cover
    raise ImportError(
        "PyTorch is required for the U-Net model. Install it with "
        "`pip install torch --index-url https://download.pytorch.org/whl/cpu` "
        "(CPU build) or a CUDA build if you have a GPU. The app will still "
        "run without it, using the classical thresholding fallback."
    ) from e


class DoubleConv(nn.Module):
    """(Conv -> BatchNorm -> ReLU) x2"""

    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )

    def forward(self, x):
        return self.block(x)


class Down(nn.Module):
    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.block = nn.Sequential(nn.MaxPool2d(2), DoubleConv(in_channels, out_channels))

    def forward(self, x):
        return self.block(x)


class Up(nn.Module):
    def __init__(self, in_channels: int, out_channels: int):
        super().__init__()
        self.up = nn.ConvTranspose2d(in_channels, in_channels // 2, kernel_size=2, stride=2)
        self.conv = DoubleConv(in_channels, out_channels)

    def forward(self, x, skip):
        x = self.up(x)
        # pad if input dims are odd / don't perfectly match the skip connection
        diff_y = skip.size(2) - x.size(2)
        diff_x = skip.size(3) - x.size(3)
        x = nn.functional.pad(x, [diff_x // 2, diff_x - diff_x // 2, diff_y // 2, diff_y - diff_y // 2])
        x = torch.cat([skip, x], dim=1)
        return self.conv(x)


class UNet(nn.Module):
    """Configurable-depth U-Net.

    in_channels=1 for single-band SAR grayscale input.
    num_classes=5 by default, matching the SOS dataset palette.
    base_channels controls model capacity (32 is a good default for CPU
    training on small chips; bump to 64 if you have a GPU and want more
    accuracy headroom).
    """

    def __init__(self, in_channels: int = 1, num_classes: int = 5, base_channels: int = 32):
        super().__init__()
        c = base_channels
        self.inc = DoubleConv(in_channels, c)
        self.down1 = Down(c, c * 2)
        self.down2 = Down(c * 2, c * 4)
        self.down3 = Down(c * 4, c * 8)
        self.down4 = Down(c * 8, c * 8)  # bottleneck keeps channel count capped

        self.up1 = Up(c * 16, c * 4)
        self.up2 = Up(c * 8, c * 2)
        self.up3 = Up(c * 4, c)
        self.up4 = Up(c * 2, c)
        self.outc = nn.Conv2d(c, num_classes, kernel_size=1)

    def forward(self, x):
        x1 = self.inc(x)
        x2 = self.down1(x1)
        x3 = self.down2(x2)
        x4 = self.down3(x3)
        x5 = self.down4(x4)

        x = self.up1(x5, x4)
        x = self.up2(x, x3)
        x = self.up3(x, x2)
        x = self.up4(x, x1)
        return self.outc(x)  # raw logits, shape (B, num_classes, H, W)


CLASS_NAMES = ["background_sea", "oil_spill", "lookalike", "ship", "land"]
OIL_SPILL_CLASS_IDX = 1
