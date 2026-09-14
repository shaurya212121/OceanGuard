"""
Train the U-Net oil-spill segmenter.

Usage:
    python -m app.services.cv.train \\
        --data-root /path/to/oil_spill_dataset \\
        --epochs 40 --batch-size 8 --lr 1e-3 \\
        --out backend/app/services/cv/weights/unet_oilspill.pt

Run this on Colab/Kaggle with a GPU for realistic epoch times - a 256x256,
base_channels=32 U-Net on ~1000 chips takes a few minutes/epoch on CPU,
seconds/epoch on a T4. Once trained, copy the resulting .pt file into
backend/app/services/cv/weights/ (default path segmentation.py looks for)
and the API will automatically pick it up instead of the classical
fallback - no code changes needed.

Uses a weighted cross-entropy loss because oil-spill pixels are a small
minority class in almost every image (imbalance is the #1 reason naive
training collapses to "predict all background"). Class weights are
computed from the training set unless overridden.
"""

from __future__ import annotations

import argparse
import os
import time

import numpy as np

try:
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader
except ImportError as e:
    raise ImportError("PyTorch is required for training. pip install torch") from e

from .unet import UNet
from .dataset import OilSpillSegDataset, PALETTE


def compute_class_weights(dataset: OilSpillSegDataset, num_classes: int) -> torch.Tensor:
    counts = np.zeros(num_classes, dtype=np.float64)
    # Sample a subset for speed if the dataset is large
    sample_n = min(len(dataset), 200)
    idxs = np.linspace(0, len(dataset) - 1, sample_n).astype(int)
    for i in idxs:
        _, label = dataset[i]
        vals, cnts = np.unique(label.numpy(), return_counts=True)
        for v, c in zip(vals, cnts):
            if v < num_classes:
                counts[v] += c
    counts = np.clip(counts, 1, None)
    freq = counts / counts.sum()
    weights = 1.0 / (freq + 1e-6)
    weights = weights / weights.sum() * num_classes
    return torch.tensor(weights, dtype=torch.float32)


def iou_per_class(pred: torch.Tensor, target: torch.Tensor, num_classes: int) -> np.ndarray:
    ious = np.zeros(num_classes)
    pred = pred.flatten()
    target = target.flatten()
    for c in range(num_classes):
        pred_c = pred == c
        target_c = target == c
        intersection = (pred_c & target_c).sum().item()
        union = (pred_c | target_c).sum().item()
        ious[c] = intersection / union if union > 0 else float("nan")
    return ious


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", required=True, help="Path to the dataset root (see dataset.py docstring)")
    parser.add_argument("--epochs", type=int, default=40)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--image-size", type=int, default=256)
    parser.add_argument("--base-channels", type=int, default=32)
    parser.add_argument("--num-classes", type=int, default=5)
    parser.add_argument("--masks-are-indexed", action="store_true")
    parser.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "weights", "unet_oilspill.pt"))
    parser.add_argument("--device", default="cuda" if torch.cuda.is_available() else "cpu")
    args = parser.parse_args()

    device = torch.device(args.device)

    train_ds = OilSpillSegDataset(
        args.data_root, split="train", image_size=args.image_size,
        masks_are_indexed=args.masks_are_indexed, palette=PALETTE,
    )
    try:
        val_ds = OilSpillSegDataset(
            args.data_root, split="test", image_size=args.image_size,
            masks_are_indexed=args.masks_are_indexed, palette=PALETTE,
        )
    except (FileNotFoundError, RuntimeError):
        val_ds = None

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=2)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False) if val_ds else None

    model = UNet(in_channels=1, num_classes=args.num_classes, base_channels=args.base_channels).to(device)

    print("Computing class weights from training set (handles oil-spill class imbalance)...")
    class_weights = compute_class_weights(train_ds, args.num_classes).to(device)
    print(f"Class weights: {class_weights.tolist()}")

    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", patience=3, factor=0.5)

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    best_val_loss = float("inf")

    for epoch in range(1, args.epochs + 1):
        model.train()
        t0 = time.time()
        running_loss = 0.0
        for imgs, labels in train_loader:
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            logits = model(imgs)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            running_loss += loss.item() * imgs.size(0)
        train_loss = running_loss / len(train_ds)

        msg = f"Epoch {epoch}/{args.epochs}  train_loss={train_loss:.4f}  ({time.time()-t0:.1f}s)"

        if val_loader is not None:
            model.eval()
            val_loss = 0.0
            all_ious = []
            with torch.no_grad():
                for imgs, labels in val_loader:
                    imgs, labels = imgs.to(device), labels.to(device)
                    logits = model(imgs)
                    val_loss += criterion(logits, labels).item() * imgs.size(0)
                    preds = logits.argmax(dim=1)
                    all_ious.append(iou_per_class(preds.cpu(), labels.cpu(), args.num_classes))
            val_loss /= len(val_ds)
            mean_ious = np.nanmean(np.stack(all_ious), axis=0)
            oil_iou = mean_ious[1] if len(mean_ious) > 1 else float("nan")
            msg += f"  val_loss={val_loss:.4f}  oil_spill_IoU={oil_iou:.3f}"
            scheduler.step(val_loss)

            if val_loss < best_val_loss:
                best_val_loss = val_loss
                torch.save(
                    {
                        "model_state_dict": model.state_dict(),
                        "num_classes": args.num_classes,
                        "base_channels": args.base_channels,
                        "image_size": args.image_size,
                    },
                    args.out,
                )
                msg += "  [saved best]"

        print(msg)

    if val_loader is None:
        # No val split - just save the final model
        torch.save(
            {
                "model_state_dict": model.state_dict(),
                "num_classes": args.num_classes,
                "base_channels": args.base_channels,
                "image_size": args.image_size,
            },
            args.out,
        )
    print(f"Done. Checkpoint saved to {args.out}")


if __name__ == "__main__":
    main()
