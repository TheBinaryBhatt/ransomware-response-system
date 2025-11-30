# backend/response_service/main.py
import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.requests import Request
from fastapi.responses import JSONResponse

from slowapi.errors import RateLimitExceeded

from core.path_helper import setup_paths
setup_paths()

from core.database import get_db, Base, engine
from core.models_init import *
from shared_lib.events.rabbitmq import init_event_bus

from .routes import router as service_router
from . import consumer
from . import models  # ensure model registration

# -------------------------------------------------------------

app = FastAPI(title="Response Service", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://172.29.160.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(service_router, prefix="/api/v1")

# Rate-limiting handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})

# -------------------------------------------------------------
# STARTUP
# -------------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    print("[Response] Initializing service...")

    # Initialize RabbitMQ event bus connection (await)
    try:
        await init_event_bus()
        print("[Response] Event bus initialized.")
    except Exception as e:
        print(f"[Response] ERROR initializing event bus: {e}")

    # Create database tables
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("[Response] Database tables ready.")
    except Exception as e:
        print(f"[Response] DB initialization failed: {e}")

    # Start RabbitMQ consumer — ensure consumer schedules processing on main loop
    try:
        main_loop = __import__("asyncio").get_running_loop()
        consumer.start(main_loop=main_loop)
        print("[Response] Consumer started.")
    except Exception as e:
        print(f"[Response] ERROR starting consumer: {e}")

# -------------------------------------------------------------
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "response_service"}

@app.get("/")
async def root():
    return {"status": "ok", "service": "response_service"}

# -------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
