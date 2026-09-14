from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .routes import scenarios, dashboard, vessels, analysis, reports, evaluation
from .services.data_generator import init_global_state
from .database import init_db

app = FastAPI(
    title='OceanGuard AI — SIH26143 Environmental Intelligence',
    description='AI-powered Marine Oil Spill Detection, Particle Drift Hindcasting, and Counterfactual AIS Vessel Attribution System.',
    version='2.0.0'
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    await init_db()
    init_global_state()

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "OceanGuard AI", "database": "SQLite Persistent"}

@app.get("/")
async def root():
    return {
        "service": "OceanGuard AI — SIH26143",
        "version": "2.0.0",
        "status": "operational",
        "provenance_disclaimer": "Ranking represents physical and temporal consistency with available evidence and is not legal proof of responsibility."
    }

app.include_router(scenarios.router, prefix="/api/v1/scenarios", tags=["scenarios"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(vessels.router, prefix="/api/v1/vessels", tags=["vessels"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["analysis"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(evaluation.router, prefix="/api/v1/evaluation", tags=["evaluation"])
