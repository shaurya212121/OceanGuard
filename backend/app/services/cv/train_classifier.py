"""
Train the Stage 1 (screening) CNN classifier.

Usage:
    python -m app.services.cv.train_classifier \\
        --data-root /path/to/oil_spill_dataset \\
        --epochs 20 --batch-size 32 --lr 1e-3 \\
        --out backend/app/services/cv/weights/classifier_oilspill.pt

Trains on the *same* dataset/split as train.py - labels are derived from
the segmentation masks (see classification_dataset.py's docstring), so no
separate labeling pass is required. The model is tiny and the target is a
single yes/no per chip, so it trains much faster than the U-Net; a
handful of epochs on CPU is usually enough to comfortably beat the
heuristic fallback in classification.py.

Once trained, copy the resulting .pt file into
backend/app/services/cv/weights/ (default path classification.py looks
for) and the API automatically switches Stage 1 from the heuristic screen
to this trained CNN - no other code changes needed.

Uses a weighted cross-entropy loss for the same reason train.py does:
oil-spill-positive chips are a minority in most public datasets.
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

from .classifier import SpillClassifierNet, ResNet18SpillClassifier
from .csiro_dataset import CSIRODataset


def evaluate(model, loader, device):
    model.eval()
    correct = total = 0
    tp = fp = fn = tn = 0
    with torch.no_grad():
        for imgs, labels in loader:
            imgs, labels = imgs.to(device), labels.to(device)
            preds = model(imgs).argmax(dim=1)
            correct += (preds == labels).sum().item()
            total += labels.size(0)
            tp += int(((preds == 1) & (labels == 1)).sum().item())
            fp += int(((preds == 1) & (labels == 0)).sum().item())
            fn += int(((preds == 0) & (labels == 1)).sum().item())
            tn += int(((preds == 0) & (labels == 0)).sum().item())
            
    accuracy = correct / total if total else float("nan")
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    return accuracy, precision, recall, tp, fp, fn, tn


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-root", required=True, help="Path to the CSIRO dataset root (where Class_0 and Class_1 are)")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--image-size", type=int, default=128)
    parser.add_argument("--base-channels", type=int, default=16)
    parser.add_argument("--arch", type=str, default="resnet18", choices=["cnn", "resnet18"])
    parser.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "weights", "classifier_oilspill_v2.pt"))
    parser.add_argument("--device", default="cuda" if torch.cuda.is_available() else "cpu")
    args = parser.parse_args()

    device = torch.device(args.device)

    train_ds = CSIRODataset(args.data_root, split="train", image_size=args.image_size, seed=42)
    val_ds = CSIRODataset(args.data_root, split="val", image_size=args.image_size, seed=42)

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    if args.arch == "resnet18":
        model = ResNet18SpillClassifier(in_channels=1, num_classes=2).to(device)
    else:
        model = SpillClassifierNet(in_channels=1, base_channels=args.base_channels, num_classes=2).to(device)

    print("Using class weights for imbalance from train_ds...")
    class_weights = train_ds.weights.to(device)
    print(f"Class weights: {class_weights.tolist()}")

    criterion = nn.CrossEntropyLoss(weight=class_weights)
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    best_val_acc = -1.0

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

        checkpoint = {
            "model_state_dict": model.state_dict(),
            "base_channels": args.base_channels,
            "image_size": args.image_size,
            "num_classes": 2,
            "arch": args.arch
        }

        accuracy, precision, recall, tp, fp, fn, tn = evaluate(model, val_loader, device)
        msg += f"  val_acc={accuracy:.3f}  precision={precision:.3f}  recall={recall:.3f}"
        if accuracy > best_val_acc:
            best_val_acc = accuracy
            torch.save(checkpoint, args.out)
            msg += "  [saved best]"

        print(msg)
        
        if epoch == args.epochs:
            print("\nEvaluating best saved model for final metrics...")
            if args.arch == "resnet18":
                best_model = ResNet18SpillClassifier(in_channels=1, num_classes=2).to(device)
            else:
                best_model = SpillClassifierNet(in_channels=1, base_channels=args.base_channels, num_classes=2).to(device)
            best_model.load_state_dict(torch.load(args.out)["model_state_dict"])
            accuracy, precision, recall, tp, fp, fn, tn = evaluate(best_model, val_loader, device)
            f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
            
            print("\nFinal Confusion Matrix on Validation Set:")
            print(f"               Predicted Positive | Predicted Negative")
            print(f"Actual Positive |       TP: {tp:<5} |       FN: {fn:<5}")
            print(f"Actual Negative |       FP: {fp:<5} |       TN: {tn:<5}")
            print(f"Accuracy: {accuracy*100:.1f}%, Precision: {precision*100:.1f}%, Recall: {recall*100:.1f}%, F1: {f1*100:.1f}%")
            
            import json
            metrics = {
                "accuracy": accuracy,
                "precision": precision,
                "recall": recall,
                "f1": f1,
                "confusion_matrix": {
                    "tp": tp, "fp": fp, "fn": fn, "tn": tn
                }
            }
            metrics_path = os.path.join(os.path.dirname(args.out), "metrics_v2.json")
            with open(metrics_path, "w") as f:
                json.dump(metrics, f, indent=4)
            print(f"\nSaved best metrics to {metrics_path}")

    print(f"\nDone. Checkpoint saved to {args.out}")


if __name__ == "__main__":
    main()
