import torch
import json
from pathlib import Path
from sklearn.metrics import precision_recall_fscore_support
from app.services.cv.classifier import SpillClassifierNet
from app.services.cv.csiro_dataset import CSIRODataset
from torch.utils.data import DataLoader
import numpy as np
import os

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

weights_path = Path("app/services/cv/weights/classifier_oilspill.pt")
metrics_path = Path("app/services/cv/weights/metrics.json")

print("Loading dataset...")
val_dataset = CSIRODataset("data/csiro_dataset/kaggle/data", split="val", seed=42)
val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)

print("Loading model...")
model = SpillClassifierNet().to(device)
checkpoint = torch.load(weights_path, map_location=device, weights_only=True)
if 'model_state_dict' in checkpoint:
    model.load_state_dict(checkpoint['model_state_dict'])
else:
    model.load_state_dict(checkpoint)
model.eval()

y_true = []
y_probs = []

print("Running inference...")
with torch.no_grad():
    for images, labels in val_loader:
        images = images.to(device)
        outputs = model(images)
        probs = torch.softmax(outputs, dim=1)[:, 1].cpu().numpy()
        y_probs.extend(probs.tolist())
        y_true.extend(labels.numpy().flatten().tolist())

y_true = np.array(y_true)
y_probs = np.array(y_probs)

best_f1 = -1
best_thresh = 0.5
best_metrics = {}

print(f"{'Threshold':<10} | {'Precision':<10} | {'Recall':<10} | {'F1 Score'}")
print("-" * 50)
for t in np.arange(0.1, 0.91, 0.05):
    y_pred = (y_probs >= t).astype(int)
    precision, recall, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='binary', zero_division=0)
    print(f"{t:.2f}       | {precision:.4f}    | {recall:.4f}   | {f1:.4f}")
    if f1 > best_f1:
        best_f1 = f1
        best_thresh = t
        
        # calculate confusion matrix values
        tp = np.sum((y_pred == 1) & (y_true == 1))
        fp = np.sum((y_pred == 1) & (y_true == 0))
        tn = np.sum((y_pred == 0) & (y_true == 0))
        fn = np.sum((y_pred == 0) & (y_true == 1))
        
        best_metrics = {
            "accuracy": float((tp + tn) / len(y_true)),
            "precision": float(precision),
            "recall": float(recall),
            "f1_score": float(f1),
            "confusion_matrix": {
                "tp": int(tp),
                "fp": int(fp),
                "tn": int(tn),
                "fn": int(fn)
            },
            "threshold": float(best_thresh)
        }

print(f"\nBest threshold: {best_thresh:.2f} (F1 = {best_f1:.4f})")

with open(metrics_path, 'w') as f:
    json.dump(best_metrics, f, indent=4)
print(f"Saved new metrics to {metrics_path}")
