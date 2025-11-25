# backend/triage_service/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.database import Base, engine
from .routes import router as service_router

# Import the consumer (synchronous thread-based consumer)
from . import consumer
import asyncio

app = FastAPI(title="Triage Service", version="1.0.0")

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include service API routes
app.include_router(service_router, prefix="/api/v1")


@app.on_event("startup")
@app.on_event("startup")
async def startup_event():
    from . import models

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    loop = asyncio.get_running_loop()
    consumer.start_consumer_background(loop)

    print("[Triage] Consumer started and DB initialized.")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Clean shutdown hook. If you later add any explicit connection close helpers,
    call them here. For now the consumer threads are daemon threads and will stop
    when the process exits.
    """
    print("[Triage] Shutdown event called.")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "triage_service"}


@app.get("/")
async def root():
    return {"status": "ok", "service": "triage_service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)  # nosec B104
