# backend/response_service/auth.py
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from datetime import datetime, timedelta
from core.config import settings
import logging
from core.models import User

logger = logging.getLogger(__name__)

# Configuration
SECRET_KEY = getattr(settings, "secret_key", None) or getattr(settings, "SECRET_KEY", None)
if not SECRET_KEY:
    logger.warning("SECRET_KEY not found in settings; JWT will not be secure in this environment.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# tokenUrl should be the actual path to your token endpoint (absolute is safer)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

# Dummy user -- replace with DB-backed user store in production
def _make_fake_user_db():
    # hashing here is fine for local dev, but not used in production
        return {
        "admin": {
            "username": "admin",
            # keep a stable hashed password for process lifetime
            "hashed_password": pwd_context.hash("password"),
            "role": "admin",
        },
        "analyst": {
            "username": "analyst",
            "hashed_password": pwd_context.hash("password"),
            "role": "analyst",
        },
        "viewer": {
            "username": "viewer",
            "hashed_password": pwd_context.hash("password"),
            "role": "viewer",
        },
    }


fake_user_db = _make_fake_user_db()


# --- Password helpers ---
def get_password_hash(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# --- Authentication helpers ---
def authenticate_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    user = fake_user_db.get(username)
    if not user:
        return None
    if not verify_password(password, user["hashed_password"]):
        return None
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create JWT access token. Ensures 'sub' claim is preserved if provided.
    Exp claim is an int unix timestamp (safer compatibility).
    """
    to_encode = data.copy()
    expire_dt = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": int(expire_dt.timestamp())})
    # `sub` should be present in data (e.g. {"sub": username})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return token


async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: Optional[str] = payload.get("sub")
        if username is None:
            raise credentials_exception
        
        # FIX: Get user from fake database
        user = fake_user_db.get(username)
        if user is None:
            raise credentials_exception
            
        # FIX: Return the full user dict including username
        return {
            "username": user.get("username"),
            "role": user.get("role"),
            "id": username  # Use username as ID if no UUID
        }
        
    except JWTError as e:
        logger.debug("JWT decode error: %s", e)
        raise credentials_exception