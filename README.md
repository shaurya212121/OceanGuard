# 🛢️ OceanGuard AI — Marine Oil Spill Detection & Vessel Attribution System

> **Smart India Hackathon (SIH) 2026 — Problem Statement SIH26143**  
> *Leveraging satellite imagery to determine oil spills at sea along with AIS data correlations to identify the vessel responsible for the spill.*

---

## 📌 Executive Summary

**OceanGuard AI** is an end-to-end geospatial intelligence and decision-support prototype designed for maritime environmental protection agencies (such as the Indian Coast Guard and DG Shipping). It ingests Synthetic Aperture Radar (SAR) satellite rasters, extracts dark slick geometries, reverse-simulates ocean/wind drift trajectories (hindcasting), cross-references historical Automatic Identification System (AIS) vessel movement logs, ranks candidate suspect vessels using a transparent multi-factor evidence score, and validates candidates via counterfactual drift simulation.

> [!IMPORTANT]
> **Decision Support Disclaimer**: OceanGuard AI provides analytical decision support by evaluating physical, spatial, and temporal consistency between slick observations and vessel tracks. It designates ships as **Investigation Candidates** or **Priority Candidates** rather than declaring legal guilt.

---

## 🌟 Key Capabilities & System Pipeline

```
┌─────────────────┐    ┌────────────────────┐    ┌─────────────────────┐
│ Satellite SAR   │───>│ Dark Slick         │───>│ Lagrangian Particle │
│ Raster Upload   │    │ Characterization   │    │ Drift Hindcasting   │
└─────────────────┘    └────────────────────┘    └─────────────────────┘
                                                            │
┌─────────────────┐    ┌────────────────────┐               │
│ PDF / JSON      │<───│ Counterfactual     │<──────────────┘
│ Incident Report │    │ Drift Validation   │               │
└─────────────────┘    └────────────────────┘               │
         ▲                        ▲                         ▼
         │                        │              ┌─────────────────────┐
         └────────────────────────┴──────────────│ AIS Candidate       │
                                                 │ Multi-Factor Score  │
                                                 └─────────────────────┘
```

1. **SAR Satellite Imagery Processing & Land Masking**: Ingests Sentinel-1 GeoTIFF/PNG rasters, applies 2D Median speckle reduction filter, land masking, and Otsu adaptive thresholding to extract 2D GeoJSON slick geometries. Computes area, perimeter, and heuristic look-alike classification probabilities (*Oil Spill*, *Low Wind Area*, *Ship Wake*, *Biogenic Film*, *Rain Formation*).
2. **Lagrangian Ensemble Drift Simulation (Hindcasting & Forecasting)**: Models oil movement using a multi-particle Lagrangian drift ensemble. Backward drift calculation estimates the initial release location (Source Region convex hull) and release window. Forward drift projects future spill dispersal.
3. **AIS Vessel Trajectory Analysis**: Queries historical vessel positions across the spatio-temporal release window.
4. **Transparent Multi-Factor Evidence Scoring**: Ranks candidate vessels using an unweighted/weighted multi-factor evidence breakdown:
   - **Spatial Distance to Source Region** ($S_{\text{spatial}}$)
   - **Temporal Alignment to Release Window** ($S_{\text{temporal}}$)
   - **Trajectory Interception / Proximity** ($S_{\text{trajectory}}$)
   - **Speed Anomaly Detection** ($S_{\text{speed}}$)
   - **AIS Transponder Gap Penalty** ($S_{\text{gap}}$)
5. **Counterfactual Physical Validation**: Simulates forward drift from candidate vessel locations during the estimated release window to compute **Polygon Intersection-over-Union (IoU)** between predicted and observed slick polygons.
6. **Data Provenance & Audit Trail**: Every analysis result carries explicit provenance tags (`REAL_DATA_MODE` vs `SYNTHETIC_BENCHMARK_MODE`, `DATA_SOURCE`, `PROCESSING_TIMESTAMP`, `ALGORITHM_VERSION`) to guarantee zero hallucinated metrics.
7. **Empirical Benchmark & Evaluation**: Calculates real precision, recall, F1-score, and IoU against ground-truth benchmark datasets without metric boosting.

---

## 🏛️ System Architecture & Tech Stack

| Layer | Technology | Function |
|---|---|---|
| **Frontend UI** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons | Responsive spatial dashboard & investigation console |
| **Mapping & Geospatial** | Leaflet, React-Leaflet, CartoDB Dark Tiles | Interactive map displaying slick polygons, drift vectors, and vessel tracks |
| **Analytics & Charts** | Recharts | Evidence breakdown radar/bar charts, look-alike breakdown |
| **Backend API** | Python 3.10+, FastAPI, Pydantic v2, Uvicorn | Asynchronous REST endpoints & background job manager |
| **Geospatial & Math** | Shapely, NumPy, SciPy, OpenCV (headless) | Spatial polygon operations, raster thresholding, hull extraction |
| **Database** | SQLite (`data/oceanguard.db`), Python `sqlite3` | Persistent relational store for incidents, observations, vessels, and jobs |
| **Testing** | Automated Python Test Suite (`backend/tests/`) | End-to-end integration and mathematical test validation |

---

## ⚙️ Operating Modes & Provenance Rules

OceanGuard AI strictly enforces data integrity:

- **`REAL_DATA_MODE`**: Strictly requires valid satellite GeoTIFF/PNG upload or real AIS data input. Rejects missing data without synthetic fallbacks.
- **`SYNTHETIC_BENCHMARK_MODE`**: Operates on verified benchmark test scenarios (`BOMBAY_HIGH_SPILL`, `GUJARAT_COAST_INCIDENT`, `CHENNAI_PORT_LEAK`). All outputs are explicitly tagged as `[ PROVENANCE: DEMO / SYNTHETIC DATA ]`.

---

## 🗄️ Database Schema (`data/oceanguard.db`)

- **`incidents`**: Incident metadata, status, spatial coordinates, created timestamp.
- **`satellite_observations`**: SAR imagery metadata, area, perimeter, look-alike probabilities, GeoJSON polygon.
- **`drift_runs`**: Drift simulation parameters, backward/forward path vectors, source region polygon.
- **`vessels`**: MMSI, name, vessel type, callsign, flag, length, width.
- **`ais_positions`**: Time-stamped lat/lon coordinates, speed over ground (SOG), course over ground (COG).
- **`attribution_candidates`**: Calculated candidate scores, evidence breakdowns, counterfactual IoU, candidate rank.
- **`analysis_jobs`**: Job ID, current status (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`), execution progress.

---

## 🧪 Scientific & Mathematical Baseline Methods

### 1. Dark Slick Segmentation
- **Pre-processing**: $3 \times 3$ 2D Median Filter for speckle noise reduction.
- **Thresholding**: Otsu Adaptive Binarization to extract dark ocean backscatter anomalies ($I < I_{\text{otsu}}$).
- **Geometry**: Extraction of outer boundary contour transformed into WGS84 GeoJSON polygons using `shapely`.

### 2. Lagrangian Particle Drift Model
Each particle $p_i$ is updated over time step $\Delta t$:
$$\vec{x}_{t+\Delta t} = \vec{x}_t + \left( \vec{U}_{\text{current}} + \alpha \vec{U}_{\text{wind}} + \vec{\epsilon}_{\text{turbulent}} \right) \Delta t$$
where $\alpha = 0.03$ (wind leeway factor), $\vec{U}_{\text{wind}}$ is wind velocity vector rotated by $15^\circ$ Ekman deflection, and $\vec{\epsilon}_{\text{turbulent}}$ represents Gaussian random turbulence.

### 3. Counterfactual Polygon IoU
$$\text{IoU} = \frac{\text{Area}(P_{\text{simulated}} \cap P_{\text{observed}})}{\text{Area}(P_{\text{simulated}} \cup P_{\text{observed}})}$$

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher & npm

### 2. Backend Setup
```bash
cd OceanGuard/backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python run.py
```
*Backend API service starts at `http://localhost:8000` (Swagger docs available at `http://localhost:8000/docs`).*

### 3. Frontend Setup
```bash
cd OceanGuard/frontend
npm install
npm run dev
```
*Frontend dev server starts at `http://localhost:5173`.*

### 4. Running Automated Unit Tests
```bash
cd OceanGuard
python backend/tests/run_all_tests.py
```

---

## 📊 Evaluation & Benchmark

Run empirical benchmark evaluations via the frontend **Evaluation** tab or via API endpoint `/api/evaluation/run-benchmark`. Metrics returned:
- **SAR Segmentation Precision / Recall / F1 / IoU**
- **Attribution Top-1 / Top-3 Accuracy**
- **Drift Origin Error (km)**
- **Mean Counterfactual IoU**

---

## ⚠️ Prototype Limitations & Future Roadmap

1. **Heuristic Look-Alike Classifier Baseline**: The current SAR classification uses feature-based rules (texture variance, area, edge sharpness). Integration with a fine-tuned UNet/ResNet trained on Sentinel-1 SNOD (Satellite Oil Spill Dataset) is planned for production.
2. **Current & Wind Forcing Grids**: Uses uniform ocean current and wind vectors across the spatial domain. Integration with Copernicus Marine Environment Monitoring Service (CMEMS) 3D hydrodynamic models and ERA5 atmospheric reanalysis grids is recommended for operational deployment.
3. **AIS Data Ingestion**: Supports real CSV/JSON AIS feeds; production deployment should connect directly to real-time NMEA/AIS receiver streams or commercial providers (e.g. Spire / MarineTraffic APIs).

---

## 📜 License & Acknowledgments

Built for **Smart India Hackathon 2026**.  
Designed with commitment to data transparency, legal accuracy, and open scientific baselines.
