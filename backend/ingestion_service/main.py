from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.path_helper import setup_paths
setup_paths()

from core.database import get_db, Base, engine
from shared_lib.events.rabbitmq import init_event_bus, close_event_bus

from .routes import router as service_router
from . import models

app = FastAPI(title="Ingestion Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(service_router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Initialize RabbitMQ for agents + event publishing
    await init_event_bus()


@app.on_event("shutdown")
async def shutdown_event():
    await close_event_bus()


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ingestion_service"}


@app.get("/")
async def root():
    return {"status": "ok", "service": "ingestion_service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
