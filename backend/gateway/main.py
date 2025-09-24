from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import socketio
from core.config import settings

# Create FastAPI app
app = FastAPI(title="API Gateway", version="1.0.0")

# Socket.IO server in ASGI mode
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio, app)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service URLs
INGESTION_SERVICE = "http://ingestion_service:8001"
TRIAGE_SERVICE = "http://triage_service:8002"
RESPONSE_SERVICE = "http://response_service:8003"
AUDIT_SERVICE = "http://audit_service:8004"

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "gateway"}

@app.get("/")
async def root():
    return {"status": "ok", "service": "gateway"}

# Updated SIEM webhook endpoint
@app.post("/api/v1/webhook/siem")
async def siem_webhook(request: dict):
    async with httpx.AsyncClient() as client:
        try:
            # Forward to ingestion service with correct API prefix
            response = await client.post(
                f"{INGESTION_SERVICE}/api/v1/webhook",
                json=request,
                timeout=30.0
            )
            return response.json()
        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="Ingestion service unavailable")

@app.get("/api/v1/incidents")
async def get_incidents():
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{TRIAGE_SERVICE}/api/v1/incidents",
                timeout=30.0
            )
            return response.json()
        except httpx.RequestError:
            raise HTTPException(status_code=502, detail="Triage service unavailable")

# WebSocket event handlers
@sio.event
async def connect(sid, environ):
    print(f"Client {sid} connected")

@sio.event
async def disconnect(sid):
    print(f"Client {sid} disconnected")

@sio.event
async def join_room(sid, room):
    await sio.enter_room(sid, room)
    print(f"Client {sid} joined room {room}")

# Function to emit events to clients
async def emit_incident_update(incident_data):
    await sio.emit('incident_update', incident_data, room='soc_analysts')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="0.0.0.0", port=8000)