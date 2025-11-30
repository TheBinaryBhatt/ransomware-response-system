# backend/audit_service/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import logging
import asyncio

from core.path_helper import setup_paths
setup_paths()

from core.database import Base, engine
from .routes import router as service_router
from . import models  # ensure models are registered
from . import consumer

logger = logging.getLogger(__name__)

app = FastAPI(title="Audit Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(service_router)


@app.on_event("startup")
async def startup_event():
    # Create tables asynchronously
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("[Audit] Database tables ensured")
    except Exception:
        logger.exception("[Audit] Failed creating DB tables")

    # Start audit consumer but ensure persist runs on the main loop
    try:
        main_loop = asyncio.get_running_loop()
        consumer.start(main_loop=main_loop)
        logger.info("[Audit] Consumer start requested")
    except Exception:
        logger.exception("[Audit] Failed to start consumer (will continue trying)")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "audit_service"}

@app.get("/")
async def root():
    return {"status": "ok", "service": "audit_service"}
