# backend/response_service/workflows/containment.py

async def snapshot_disk(asset_id: str):
    return {
        "asset_id": asset_id,
        "snapshot": "created",
        "path": f"/forensics/snapshots/{asset_id}.img"
    }
