"""Shared utilities for the NASA/USGS data pipeline."""
from __future__ import annotations

import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
MAIN_DATA = Path(r"C:\projects\projects-github-agustindiazcano\nasa-mars-tango-horizon\data")
OUT = ROOT / "web" / "public" / "data"
MODELS_OUT = ROOT / "web" / "public" / "models"
UA = "tango-horizon-pipeline/1.0"


def resolve_data_file(*parts: str) -> Path:
    """Locate a pre-downloaded data file in the local repo or main repo data/ directory."""
    candidates = [
        ROOT / "data" / Path(*parts),
        RAW / Path(*parts),
        MAIN_DATA / Path(*parts),
    ]
    for path in candidates:
        if path.exists():
            return path
    return candidates[0]


def add_provenance(key: str, **fields: object) -> None:
    """Register provenance metadata for a file under web/public/data/."""
    p = OUT / "provenance.json"
    db = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
    db[key] = {**fields, "retrieved": time.strftime("%Y-%m-%d")}
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(db, indent=2, ensure_ascii=False), encoding="utf-8")
