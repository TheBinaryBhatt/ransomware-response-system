# backend/response_service/workflows/disable_user.py

async def disable_user(username: str):
    return {"username": username, "disabled": True}
