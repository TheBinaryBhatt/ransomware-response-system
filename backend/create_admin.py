#!/usr/bin/env python3
"""
Utility script to seed users in the Ransomware Response System.

Examples:
    python backend/create_admin.py
    python backend/create_admin.py --username admin --password admin123 --role admin --db-url postgresql+asyncpg://admin:supersecretpassword@localhost:5432/ransomware_db
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from typing import Optional, Any

from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Ensure backend package is importable when executed from repo root
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from core.models import User
from core.database import Base
from core.security import get_password_hash

import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEFAULT_DB_URL = "postgresql+asyncpg://admin:supersecretpassword@postgres:5432/ransomware_db"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create or update users in the RRS database.")
    parser.add_argument("--db-url", default=os.getenv("DATABASE_URL", DEFAULT_DB_URL), help="Async SQLAlchemy URL")
    parser.add_argument("--username", help="Username to create/update")
    parser.add_argument("--password", help="Password for the user (required if --username is set)")
    parser.add_argument("--email", help="Email for the user (defaults to <username>@ransomware-response.local)")
    parser.add_argument("--role", default="analyst", help="Role for the user (admin/analyst/auditor/viewer)")
    parser.add_argument("--active", action="store_true", default=True, help="Mark user as active")
    parser.add_argument("--superuser", action="store_true", help="Grant superuser privileges")
    parser.add_argument(
        "--skip-defaults",
        action="store_true",
        help="Skip creating the default admin and soc_analyst accounts.",
    )
    return parser.parse_args()


def build_session_factory(db_url: str) -> tuple[async_sessionmaker[AsyncSession], Any]:
    engine = create_async_engine(db_url, future=True)
    return async_sessionmaker(engine, expire_on_commit=False), engine


async def ensure_user(
    session_factory: async_sessionmaker[AsyncSession],
    username: str,
    password: str,
    role: str,
    email: Optional[str] = None,
    is_active: bool = True,
    is_superuser: bool = False,
) -> None:
    email = email or f"{username}@ransomware-response.local"
    async with session_factory() as session:
        result = await session.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()

        if user:
            logger.info("Updating existing user '%s'", username)
            await session.execute(
                update(User)
                .where(User.username == username)
                .values(
                    password_hash=get_password_hash(password),
                    role=role,
                    email=email,
                    is_active=is_active,
                    is_superuser=is_superuser,
                )
            )
        else:
            logger.info("Creating user '%s'", username)
            user = User(
                username=username,
                email=email,
                password_hash=get_password_hash(password),
                is_active=is_active,
                is_superuser=is_superuser,
                role=role,
            )
            session.add(user)

        await session.commit()
        logger.info("User '%s' provisioned (role=%s, superuser=%s)", username, role, is_superuser)


async def create_defaults(session_factory: async_sessionmaker[AsyncSession]) -> None:
    await ensure_user(
        session_factory,
        username="admin",
        password="admin123",  # nosec B106 - demo default
        role="admin",
        is_superuser=True,
    )
    await ensure_user(
        session_factory,
        username="soc_analyst",
        password="analyst123",  # nosec B106 - demo default
        role="analyst",
        is_superuser=False,
    )


async def main() -> None:
    args = parse_args()
    session_factory, engine = build_session_factory(args.db_url)
    await ensure_schema(engine)

    if args.username:
        if not args.password:
            raise SystemExit("ERROR: --password is required when --username is provided.")
        await ensure_user(
            session_factory,
            username=args.username,
            password=args.password,
            role=args.role,
            email=args.email,
            is_active=args.active,
            is_superuser=args.superuser,
        )
    else:
        if args.skip_defaults:
            logger.info("⚠️  No username provided and --skip-defaults set; nothing to do.")
        else:
            await create_defaults(session_factory)


async def ensure_schema(engine) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        ddl_statements = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'analyst'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_superuser BOOLEAN DEFAULT FALSE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        ]
        for ddl in ddl_statements:
            await conn.execute(text(ddl))


if __name__ == "__main__":
    asyncio.run(main())