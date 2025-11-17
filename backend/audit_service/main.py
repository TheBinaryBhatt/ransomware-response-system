from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path
from core.path_helper import setup_paths
setup_paths()

from core.database import get_db, Base, engine
from .routes import router as service_router
from . import models  # Import models to ensure they're registered
from . import consumer

app = FastAPI(title="Audit Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the audit service routes
app.include_router(service_router)

@app.on_event("startup")
async def startup_event():
    # Create tables asynchronously
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Start audit consumer
    consumer.start()

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "audit_service"}

@app.get("/")
async def root():
    return {"status": "ok", "service": "audit_service"}
