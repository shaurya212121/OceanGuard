import torch
from torch.utils.data import Dataset
from pathlib import Path
from PIL import Image
import numpy as np

class CSIRODataset(Dataset):
    def __init__(self, data_root: str, image_size: int = 128, split: str = "train", val_split_ratio: float = 0.2, seed: int = 42):
        self.data_root = Path(data_root)
        self.image_size = image_size
        
        class_0_dir = self.data_root / "Class_0"
        class_1_dir = self.data_root / "Class_1"
        
        if not class_0_dir.exists() or not class_1_dir.exists():
            raise FileNotFoundError(f"Could not find Class_0 and Class_1 under {self.data_root}")
            
        exts = {".png", ".jpg", ".jpeg"}
        
        # Load paths
        samples_0 = [(p, 0) for p in class_0_dir.iterdir() if p.suffix.lower() in exts]
        samples_1 = [(p, 1) for p in class_1_dir.iterdir() if p.suffix.lower() in exts]
        
        # Sort for determinism before shuffle
        samples_0.sort(key=lambda x: x[0].name)
        samples_1.sort(key=lambda x: x[0].name)
        
        all_samples = samples_0 + samples_1
        
        # Shuffle
        rng = np.random.RandomState(seed)
        rng.shuffle(all_samples)
        
        val_size = int(len(all_samples) * val_split_ratio)
        
        if split == "train":
            self.samples = all_samples[val_size:]
        elif split == "val":
            self.samples = all_samples[:val_size]
        else:
            self.samples = all_samples
            
        # For weighted sampling/loss
        labels = [s[1] for s in self.samples]
        count_0 = sum(1 for l in labels if l == 0)
        count_1 = sum(1 for l in labels if l == 1)
        total = len(self.samples)
        
        # Avoid division by zero
        if count_0 == 0 or count_1 == 0:
            self.weights = torch.tensor([1.0, 1.0])
        else:
            self.weights = torch.tensor([total / (2 * count_0), total / (2 * count_1)], dtype=torch.float32)

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, label = self.samples[idx]

        img = Image.open(img_path).convert("L").resize(
            (self.image_size, self.image_size), Image.BILINEAR
        )
        img_arr = np.array(img, dtype=np.float32) / 255.0
        img_tensor = torch.from_numpy(img_arr).unsqueeze(0)  # (1, H, W)

        return img_tensor, torch.tensor(label, dtype=torch.long)

