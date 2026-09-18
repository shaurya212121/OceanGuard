import sys
import os
import torch
from torch.utils.data import DataLoader

# Add backend to Python path
sys.path.insert(0, os.path.abspath('backend'))

from app.services.cv.classifier import ResNet18SpillClassifier
from app.services.cv.csiro_dataset import CSIRODataset
from app.services.cv.train_classifier import evaluate

def main():
    print('Loading the dataset and model weights...')
    
    # Paths adjusted for SIH_FINAL root directory
    val_ds = CSIRODataset('backend/data/csiro_dataset/kaggle/data', split='val', image_size=128, seed=42)
    val_loader = DataLoader(val_ds, batch_size=32, shuffle=False)

    device = torch.device('cpu')
    ckpt = torch.load('backend/app/services/cv/weights/classifier_oilspill.pt', map_location=device)
    
    model = ResNet18SpillClassifier(in_channels=1, num_classes=2)
    model.load_state_dict(ckpt['model_state_dict'])
    model.eval()

    print(f'Evaluating {len(val_ds)} unseen images. Please wait...')
    accuracy, precision, recall, tp, fp, fn, tn = evaluate(model, val_loader, device)
    
    print('\n--- LIVE VERIFICATION RESULTS ---')
    print(f'True Positives:  {tp}')
    print(f'False Positives: {fp}')
    print(f'Accuracy:  {accuracy * 100:.2f}%')
    print(f'Precision: {precision * 100:.2f}%')
    print('---------------------------------')

if __name__ == '__main__':
    main()
