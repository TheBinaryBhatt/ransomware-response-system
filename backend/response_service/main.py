from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from core.path_helper import setup_paths
setup_paths()

from core.database import get_db, Base, engine
from .routes import router as service_router
from . import models  # Import models to ensure they're registered

app = FastAPI(title="Response Service", version="1.0.0")

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
    # Import models to ensure they're registered with Base
    from . import models
    # Create tables asynchronously
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "response_service"}

@app.get("/")
async def root():
    return {"status": "ok", "service": "response_service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)