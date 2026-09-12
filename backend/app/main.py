from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .routes import scenarios, dashboard, vessels, analysis
from .services.data_generator import init_global_state

app = FastAPI(
    title='OceanGuard AI',
    description='AI-powered Marine Oil Spill Detection & Vessel Attribution system.',
    version='1.0.0'
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
    # Generate all demo data on startup
    init_global_state()

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/")
async def root():
    return {
        "service": "OceanGuard AI",
        "version": "1.0.0",
        "status": "operational"
    }

app.include_router(scenarios.router, prefix="/api/v1/scenarios", tags=["scenarios"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])
app.include_router(vessels.router, prefix="/api/v1/vessels", tags=["vessels"])
app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["analysis"])
