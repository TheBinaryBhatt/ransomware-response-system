from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import Base, engine
from .routes import router as service_router

app = FastAPI(title="Triage Service", version="1.0.0")

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
    """Create tables at startup"""
    from . import models  # ensure models are registered
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "triage_service"}


@app.get("/")
async def root():
    return {"status": "ok", "service": "triage_service"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
