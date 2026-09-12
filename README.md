# 🛢️ OceanGuard AI — Marine Oil Spill Detection & Vessel Attribution

> **SIH 2026 — Problem Statement SIH26143**  
> AI-powered satellite imagery analysis for detecting marine oil spills, simulating drift trajectories, and attributing spills to responsible vessels using AIS data.

## 🌊 What It Does

1. **Detects Oil Spills** from SAR satellite radar imagery using AI image segmentation  
2. **Hindcasts Drift Paths** — simulates ocean currents backward in time to find the exact origin point  
3. **Attributes the Spill** to a specific vessel by cross-referencing AIS (ship GPS) data with the origin coordinates  
4. **Scores Suspect Vessels** based on proximity, speed anomalies, AIS gaps, and trajectory analysis  

## 🏗️ Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 19, Vite, Tailwind CSS, Leaflet, Recharts |
| Backend    | Python, FastAPI, NumPy, SciPy     |
| Database   | SQLite (zero-config)              |
| Maps       | Leaflet + CartoDB Dark Tiles      |

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+

### Backend
```bash
cd backend
pip install -r requirements.txt
python run.py
```
Backend starts at `http://localhost:8000`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend starts at `http://localhost:5173`

### One-Click Start (Windows)
```bash
start_all.bat
```

## 📁 Project Structure
```
SIH_FINAL/
├── backend/              # FastAPI Python backend
│   ├── app/
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic (drift sim, vessel scoring)
│   │   └── models.py     # Pydantic data models
│   ├── requirements.txt
│   └── run.py
├── frontend/             # React + Vite frontend
│   ├── src/
│   │   ├── pages/        # Multi-page app (Landing, Dashboard, Map, etc.)
│   │   ├── components/   # Reusable UI components
│   │   └── api/          # Backend API client
│   └── package.json
├── data/                 # Generated scenario data
├── start_all.bat         # One-click launcher
└── README.md
```

## 👥 Team
Built for Smart India Hackathon 2026
