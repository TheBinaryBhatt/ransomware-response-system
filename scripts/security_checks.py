#!/usr/bin/env python3
"""
Unified security lint runner for the Ransomware Response System.

Runs:
  - Ruff (Python lint & style)
  - Bandit (Python security static analysis)
  - ESLint (frontend TypeScript/React lint)

Usage:
    python scripts/security_checks.py
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List


REPO_ROOT = Path(__file__).resolve().parent.parent
NPM_COMMAND = "npm.cmd" if os.name == "nt" else "npm"


@dataclass
class Check:
    name: str
    command: List[str]
    cwd: Path = REPO_ROOT
    optional: bool = False


def command_exists(binary: str) -> bool:
    return shutil.which(binary) is not None


def run_check(check: Check, verbose: bool = False) -> bool:
    if not command_exists(check.command[0]):
        status = "SKIPPED (missing executable)"
        print(f"[{check.name}] {status}")
        return check.optional

    print(f"[{check.name}] Running: {' '.join(check.command)}")
    try:
        result = subprocess.run(
            check.command,
            cwd=check.cwd,
            check=True,
        )
        if verbose:
            print(f"[{check.name}] exit code {result.returncode}")
        print(f"[{check.name}] PASS")
        return True
    except subprocess.CalledProcessError as exc:
        print(f"[{check.name}] ❌ FAIL (exit code {exc.returncode})")
        return False


def build_checks(skip_python: bool, skip_frontend: bool) -> Iterable[Check]:
    if not skip_python:
        yield Check(
            name="Ruff",
            command=["ruff", "check", "backend", "--select", "E9,F63,F7,F82"],
        )
        yield Check(
            name="Bandit",
            command=["bandit", "-c", "bandit.yaml", "-r", "backend"],
        )

    if not skip_frontend:
        yield Check(
            name="ESLint",
            command=[NPM_COMMAND, "run", "lint"],
            cwd=REPO_ROOT / "frontend",
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run security static analysis.")
    parser.add_argument(
        "--skip-python",
        action="store_true",
        help="Skip Python (Ruff + Bandit) checks.",
    )
    parser.add_argument(
        "--skip-frontend",
        action="store_true",
        help="Skip frontend ESLint checks.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print additional diagnostics.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    all_checks = list(build_checks(args.skip_python, args.skip_frontend))
    if not all_checks:
        print("No checks selected. Use --help for options.")
        return 0

    results = [run_check(check, verbose=args.verbose) for check in all_checks]
    if all(results):
        print("\nAll selected security checks passed")
        return 0

    print("\nOne or more security checks failed")
    return 1


if __name__ == "__main__":
    sys.exit(main())

