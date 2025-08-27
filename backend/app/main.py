from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .utils.database import engine, get_db
from .models.incident import Base, Incident

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ransomware Response System", version="0.1.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from app.api import incidents, webhooks
app.include_router(incidents.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Ransomware Response System API"}

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    return {"status": "healthy", "incident_count": db.query(Incident).count()}