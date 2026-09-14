# 🛢️ OceanGuard AI — Marine Oil Spill Detection & Vessel Attribution

> **Smart India Hackathon 2026 — Problem Statement SIH26143**
> An end-to-end decision-support system for detecting marine oil-spill candidates from SAR imagery, estimating probable source regions through drift modelling, correlating AIS vessel tracks, and ranking candidate vessels using transparent, explainable evidence.

---

## 🌊 Overview

**OceanGuard AI** is a geospatial intelligence platform designed to assist investigators in answering:

> **“Where did this suspected oil spill originate, and which vessels were plausibly associated with it?”**

The system combines:

**SAR imagery → slick detection → drift hindcasting → probable source region → AIS correlation → vessel attribution → counterfactual validation → investigation dossier**

OceanGuard is designed as a **decision-support and investigation system**, not as an autonomous legal or enforcement authority. Vessel attribution results represent evidence-based candidate rankings and should be independently verified.

---

## 🔬 Core Pipeline

### 1. 🛰️ SAR Spill Detection

The system processes SAR imagery to identify dark backscatter anomalies that may correspond to oil slicks.

The current implementation uses:

* Grayscale SAR analysis
* Otsu-based thresholding
* Contour extraction
* Geometric feature analysis
* Contrast and compactness measurements
* Look-alike classification heuristics
* Geospatial area estimation

The current detector is explicitly identified as:

```text
HEURISTIC_BASELINE_V1
```

It is **not represented as a trained deep-learning model**.

The architecture is designed to allow a trained segmentation model to be integrated later.

---

### 2. 🌊 Drift Hindcasting

Once a candidate slick is identified, OceanGuard estimates where the slick could have originated by propagating particles backward through environmental forcing.

The drift engine supports:

* Lagrangian multi-particle simulation
* Backward trajectory estimation
* Wind/current forcing
* Spatial environmental velocity fields
* Source-region estimation
* Particle-cloud analysis
* Convex-hull source-region construction
* Release-time window estimation

The environmental layer uses an abstraction:

```text
EnvironmentalProvider
├── SyntheticEnvironmentalProvider
└── NetCDFEnvironmentalProvider
```

This allows synthetic benchmark scenarios and real environmental datasets to remain strictly separated.

---

### 3. 🚢 AIS Vessel Correlation

OceanGuard correlates vessel positions with the estimated release region and time window.

The AIS pipeline supports MarineCadastre-compatible data and applies:

* Spatial filtering
* Temporal filtering
* Release-window filtering
* Vessel trajectory analysis
* Speed/behaviour analysis
* AIS gap analysis
* Candidate vessel generation

Synthetic AIS data is explicitly labelled as synthetic benchmark data and is not permitted to contaminate `REAL_DATA_MODE`.

---

### 4. 🧠 Explainable Vessel Attribution

Candidate vessels are ranked using a transparent multi-factor evidence model.

The attribution engine evaluates factors including:

* Proximity to probable source region
* Temporal compatibility
* Trajectory consistency
* Speed behaviour
* AIS continuity/gaps
* Drift compatibility
* Counterfactual overlap

Rather than producing an unexplained black-box probability, OceanGuard exposes the contributing evidence for each candidate.

### ⚠️ Important

The attribution score is a **derived heuristic evidence score**, not a probability of legal responsibility.

A high-ranked vessel should be interpreted as:

> **“A vessel whose observed behaviour and trajectory are more consistent with the estimated spill scenario.”**

It is not proof that the vessel caused the spill.

---

## 🔄 Counterfactual Validation

OceanGuard performs candidate-specific forward drift simulations to test whether a suspected vessel's position could plausibly produce the observed slick.

The system compares:

```text
Predicted Slick
      vs.
Observed Slick
```

using polygon intersection-over-union:

```text
IoU = Area(Predicted ∩ Observed)
      --------------------------
      Area(Predicted ∪ Observed)
```

This provides an additional physical/geometric consistency check beyond simple proximity.

---

## 🧪 Real Data vs Synthetic Benchmark Mode

Scientific provenance is a core design principle of OceanGuard.

The system operates with a strict separation between:

### `REAL_DATA_MODE`

Used for real-world investigation inputs.

Synthetic fallback data is disabled.

Missing real inputs result in explicit errors rather than silently generating replacement data.

The mode prevents access to:

* Synthetic SAR rasters
* Synthetic environmental fields
* Synthetic AIS candidates
* Synthetic scenario defaults
* Default incident coordinates

### `SYNTHETIC_BENCHMARK_MODE`

Used for:

* Development
* Regression testing
* Algorithm evaluation
* Demonstration
* Controlled scenario generation

Synthetic results are explicitly labelled as:

```text
[SYNTHETIC BENCHMARK]
```

This prevents benchmark performance from being presented as real-world validation.

---

## 📊 Evaluation & Benchmarking

OceanGuard includes a parameterized synthetic benchmark runner containing **50 independently generated scenarios**.

The evaluation framework calculates:

* Precision
* Recall
* F1 Score
* Intersection-over-Union (IoU)
* Mean Reciprocal Rank (MRR)

Benchmark metrics are calculated dynamically at runtime rather than being hard-coded marketing statistics.

### Important limitation

These metrics currently represent performance on **synthetic benchmark scenarios**.

They should not be interpreted as validated performance on operational Sentinel-1 imagery or real-world oil-spill incidents.

---

## 📋 Data Provenance

OceanGuard tracks the origin and classification of major outputs.

| Output                 | Method                                   | Classification          |
| ---------------------- | ---------------------------------------- | ----------------------- |
| Slick Geometry         | Backscatter anomaly + contour extraction | `[DERIVED/HEURISTIC]`   |
| Look-Alike Probability | Geometric/radiometric features           | `[DERIVED/HEURISTIC]`   |
| Backward Drift         | Lagrangian particle simulation           | `[DERIVED/HEURISTIC]`   |
| Source Region          | Particle-cloud geometry                  | `[DERIVED/HEURISTIC]`   |
| Release Window         | Backward drift estimation                | `[DERIVED/HEURISTIC]`   |
| Vessel Ranking         | Multi-factor evidence model              | `[DERIVED/HEURISTIC]`   |
| Counterfactual IoU     | Shapely polygon geometry                 | `[DERIVED/HEURISTIC]`   |
| Benchmark Metrics      | 50 synthetic scenarios                   | `[SYNTHETIC BENCHMARK]` |

This distinction is intentional: **derived estimates are not presented as raw observations.**

---

## 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │   SAR Satellite     │
                    │      Imagery        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   SAR Detection     │
                    │ HEURISTIC_BASELINE  │
                    └──────────┬──────────┘
                               │
                         Slick Polygon
                               │
                               ▼
              ┌────────────────────────────────┐
              │       Drift Engine             │
              │  Lagrangian Particle Ensemble  │
              └───────────────┬────────────────┘
                              │
                    Probable Source Region
                              │
                              ▼
              ┌────────────────────────────────┐
              │       AIS Correlation          │
              │  Spatial + Temporal Filtering  │
              └───────────────┬────────────────┘
                              │
                     Candidate Vessels
                              │
                              ▼
              ┌────────────────────────────────┐
              │    Attribution Engine          │
              │   Explainable Evidence Model   │
              └───────────────┬────────────────┘
                              │
                              ▼
              ┌────────────────────────────────┐
              │    Counterfactual Validation   │
              │        Polygon IoU             │
              └───────────────┬────────────────┘
                              │
                              ▼
                  ┌──────────────────────┐
                  │ Investigation Dossier│
                  │ JSON + HTML Report    │
                  └──────────────────────┘
```

---

## 🏗️ Technology Stack

| Layer                 | Technology                              |
| --------------------- | --------------------------------------- |
| Frontend              | React 19, Vite, TypeScript              |
| Styling               | Tailwind CSS                            |
| Mapping               | Leaflet                                 |
| Charts                | Recharts                                |
| Backend               | Python, FastAPI                         |
| Numerical Processing  | NumPy, SciPy                            |
| Geospatial Processing | Shapely                                 |
| Database              | SQLite                                  |
| Data Validation       | Pydantic                                |
| Environmental Data    | NetCDF provider architecture            |
| AIS                   | MarineCadastre-compatible CSV ingestion |
| SAR                   | GeoTIFF/SAR processing pipeline         |

---

## 🖥️ Application Modules

The frontend provides an investigation-oriented interface including:

* **Landing** — system overview and mission context
* **Dashboard** — investigation status and analysis overview
* **Live Map** — geospatial vessel and incident visualization
* **Vessels** — candidate vessel analysis and evidence
* **Investigation Console** — detailed investigation workflow
* **Simulation** — controlled scenario execution
* **Evaluation** — benchmark and model evaluation
* **Reports** — investigation dossier generation

---

## 💾 Persistence

OceanGuard uses SQLite as the application persistence layer.

Analysis results, investigations and relevant application state are designed to survive backend restarts rather than relying exclusively on in-memory state.

---

## 📄 Investigation Reports

The backend provides report-generation endpoints capable of producing investigation dossiers in:

* JSON
* HTML

Reports preserve the distinction between:

```text
Observed Input
      ↓
Derived Analysis
      ↓
Heuristic Evidence
      ↓
Candidate Ranking
```

This helps investigators understand how a result was produced.

---

# 🚀 Quick Start

## Prerequisites

* Python 3.10+
* Node.js 18+
* npm

---

## 1. Clone the repository

```bash
git clone https://github.com/shaurya212121/OceanGuard.git
cd OceanGuard
```

---

## 2. Start the Backend

```bash
cd backend
pip install -r requirements.txt
python run.py
```

Backend:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

---

## 3. Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## 4. Windows One-Click Start

From the project root:

```bash
start_all.bat
```

---

# 📁 Project Structure

```text
OceanGuard/
│
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   │   ├── analysis.py
│   │   │   ├── dashboard.py
│   │   │   ├── evaluation.py
│   │   │   ├── reports.py
│   │   │   └── scenarios.py
│   │   │
│   │   ├── services/
│   │   │   ├── ais_loader.py
│   │   │   ├── attribution_engine.py
│   │   │   ├── data_generator.py
│   │   │   ├── drift_engine.py
│   │   │   ├── environmental_provider.py
│   │   │   ├── evaluation.py
│   │   │   ├── job_runner.py
│   │   │   └── sar_pipeline.py
│   │   │
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── main.py
│   │   └── models.py
│   │
│   ├── data/
│   │   └── sample_ais.csv
│   │
│   ├── tests/
│   ├── requirements.txt
│   └── run.py
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Evaluation.tsx
│   │   │   ├── Investigation.tsx
│   │   │   ├── InvestigationConsole.tsx
│   │   │   ├── Landing.tsx
│   │   │   ├── LiveMap.tsx
│   │   │   ├── Simulation.tsx
│   │   │   └── Vessels.tsx
│   │   └── types/
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── start_all.bat
└── README.md
```

---

# 🧪 Validation Status

The current implementation has undergone automated engineering validation covering:

* Real-data mode isolation
* Synthetic-data isolation
* Database persistence
* AIS filtering
* Attribution scoring
* Counterfactual calculations
* Benchmark execution
* Report generation
* Frontend build

The current automated suite reports:

```text
6 / 6 test suites passed
```

### Real-world integration status

The complete real-data pipeline is **not yet independently validated** because genuine operational datasets are not currently included in the repository.

The following inputs are required for a complete real-data demonstration:

```text
✓ OceanGuard pipeline
✓ REAL_DATA_MODE
✓ GeoTIFF ingestion architecture
✓ NetCDF environmental provider
✓ MarineCadastre AIS parser
✓ Attribution engine
✓ Counterfactual validation

⚠ Genuine Sentinel-1 GeoTIFF
⚠ Genuine environmental NetCDF/GRIB dataset
⚠ Genuine MarineCadastre AIS dataset
⚠ Trained SAR segmentation weights
```

Therefore, synthetic benchmark results must not be presented as real-world accuracy.

---

# 🔮 Future Work

### 1. Trained SAR Segmentation Model

Replace or augment `HEURISTIC_BASELINE_V1` with a validated segmentation model trained on appropriately labelled Sentinel-1 oil-spill imagery.

Potential future architecture:

```text
Sentinel-1 SAR
      ↓
Preprocessing
      ↓
Deep Segmentation Model
      ↓
Oil Slick Mask
      ↓
Look-Alike Classification
```

### 2. Real Environmental Data Integration

Integrate operational oceanographic and meteorological datasets containing spatial and temporal variation in:

* Ocean currents
* Wind fields
* Wave/environmental conditions

### 3. Real AIS Case Studies

Validate vessel attribution against genuine MarineCadastre AIS datasets and documented spill incidents.

### 4. Larger Independent Evaluation

Build a reproducible real-world evaluation dataset with:

* Known spill locations
* Known observation times
* Independent ground truth
* AIS tracks
* Environmental forcing
* Annotated slick masks

This would allow genuine scientific performance metrics to be reported.

---

# ⚠️ Scientific & Legal Disclaimer

OceanGuard AI is a **decision-support and research prototype**.

Its outputs—including:

* Oil-spill detection
* Source-region estimation
* Release-time estimation
* Vessel rankings
* Attribution scores
* Counterfactual similarity

are computationally derived estimates.

A vessel ranking **does not establish that a vessel caused a spill**, and the system should not be used as the sole basis for legal, regulatory, enforcement, or financial action.

Independent investigation and corroborating evidence are required.

---

# 👥 Team

Built for:

**Smart India Hackathon 2026**

**Problem Statement:** `SIH26143 — Marine Oil Spill Detection & Vessel Attribution`

---

## 🎯 Project Vision

OceanGuard AI aims to transform marine oil-spill investigation from a fragmented manual process into a reproducible geospatial workflow:

```text
Observe
   ↓
Detect
   ↓
Model
   ↓
Trace
   ↓
Correlate
   ↓
Rank
   ↓
Validate
   ↓
Investigate
```

**From satellite observation to evidence-based vessel attribution.**
