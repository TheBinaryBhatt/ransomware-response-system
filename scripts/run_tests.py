#!/usr/bin/env python3
"""
Unified test runner for local dev and CI fallbacks.

Examples:
    python scripts/run_tests.py
    python scripts/run_tests.py --skip-frontend
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = REPO_ROOT / "frontend"


def run(cmd, cwd=None, env=None):
    print(f">>> {' '.join(cmd)} (cwd={cwd or os.getcwd()})")
    subprocess.run(cmd, cwd=cwd, env=env, check=True)


def run_backend_tests():
    run([sys.executable, "-m", "pytest", "backend/tests", "-q"], cwd=REPO_ROOT)


def run_frontend_tests(skip_install: bool):
    if not skip_install:
        run(["npm", "install", "--no-fund", "--no-audit"], cwd=FRONTEND_DIR)
    env = os.environ.copy()
    env["CI"] = "true"
    run(["npm", "test", "--", "--watch=false"], cwd=FRONTEND_DIR, env=env)


def parse_args():
    parser = argparse.ArgumentParser(description="Run backend + frontend tests.")
    parser.add_argument("--skip-backend", action="store_true")
    parser.add_argument("--skip-frontend", action="store_true")
    parser.add_argument(
        "--skip-frontend-install",
        action="store_true",
        help="Assume node_modules already installed.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if not args.skip_backend:
            run_backend_tests()
        if not args.skip_frontend:
            run_frontend_tests(skip_install=args.skip_frontend_install)
        print("\nAll requested tests passed ✅")
        return 0
    except subprocess.CalledProcessError as exc:
        print(f"\nTest command failed with exit code {exc.returncode}")
        return exc.returncode


if __name__ == "__main__":
    raise SystemExit(main())

