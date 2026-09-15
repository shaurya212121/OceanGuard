import os
import json
import torch
from app.services.cv.classifier import SpillClassifierNet
from app.services.cv.csiro_dataset import CSIRODataset
from torch.utils.data import DataLoader

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
            
    accuracy = correct / total if total else float('nan')
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) else 0.0
    return accuracy, precision, recall, f1, tp, fp, fn, tn

def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    checkpoint_path = 'app/services/cv/weights/classifier_oilspill.pt'
    
    if not os.path.exists(checkpoint_path):
        print('Checkpoint not found!')
        return
        
    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=True)
    base_channels = checkpoint.get('base_channels', 16)
    image_size = checkpoint.get('image_size', 128)
    
    model = SpillClassifierNet(in_channels=1, base_channels=base_channels, num_classes=2).to(device)
    model.load_state_dict(checkpoint['model_state_dict'])
    
    val_ds = CSIRODataset('data/csiro_dataset/kaggle/data', split='val', image_size=image_size, seed=42)
    val_loader = DataLoader(val_ds, batch_size=32, shuffle=False)
    
    accuracy, precision, recall, f1, tp, fp, fn, tn = evaluate(model, val_loader, device)
    
    metrics = {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'confusion_matrix': {
            'tp': tp,
            'fp': fp,
            'fn': fn,
            'tn': tn
        }
    }
    
    os.makedirs('app/services/cv/weights', exist_ok=True)
    with open('app/services/cv/weights/metrics.json', 'w') as f:
        json.dump(metrics, f, indent=4)
        
    os.makedirs('../frontend/src/data', exist_ok=True)
    with open('../frontend/src/data/metrics.json', 'w') as f:
        json.dump(metrics, f, indent=4)
        
    print(f'Eval complete! Accuracy: {accuracy*100:.1f}%. Saved to metrics.json')

if __name__ == '__main__':
    main()
