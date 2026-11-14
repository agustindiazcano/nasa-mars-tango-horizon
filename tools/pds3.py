"""Generic PDS3 ASCII table reader using column definitions from .LBL or .FMT labels."""
from __future__ import annotations

import re
from pathlib import Path
import pandas as pd


def parse_columns(label_text: str) -> list[dict]:
    """Extract PDS3 COLUMN definitions (name, start byte, byte width, unit, missing constant)."""
    cols: list[dict] = []
    for block in re.findall(r"OBJECT\s*=\s*COLUMN(.*?)END_OBJECT\s*=\s*COLUMN", label_text, re.S):
        def g(key: str) -> str | None:
            m = re.search(rf'^\s*{key}\s*=\s*"?([^"\r\n]+)"?', block, re.M)
            return m.group(1).strip() if m else None

        start = g("START_BYTE")
        nbytes = g("BYTES")
        if start is None or nbytes is None:
            continue
        cols.append({
            "name": g("NAME"),
            "start": int(start),
            "bytes": int(nbytes),
            "unit": g("UNIT"),
            "missing": g("MISSING_CONSTANT"),
            "data_type": g("DATA_TYPE"),
        })
    return cols


def find_structure_name(lbl_text: str) -> str | None:
    """Return the referenced ^STRUCTURE filename if present in a PDS3 .LBL file."""
    m = re.search(r'^\s*\^STRUCTURE\s*=\s*"?([^"\r\n]+)"?', lbl_text, re.M)
    return m.group(1).strip() if m else None


def read_table(tab: Path, lbl: Path, fmt: Path | None = None) -> pd.DataFrame:
    """Read a PDS3 ASCII table (.TAB), supporting both comma-separated and fixed-width layouts."""
    lbl_text = lbl.read_text(encoding="utf-8", errors="replace")
    cols = parse_columns(lbl_text)
    if not cols and fmt is not None and fmt.exists():
        cols = parse_columns(fmt.read_text(encoding="utf-8", errors="replace"))
    if not cols:
        raise ValueError(f"No COLUMN definitions found in {lbl} or {fmt}")

    names = [c["name"] for c in cols]
    sample = ""
    with tab.open("r", encoding="utf-8", errors="replace") as fh:
        sample = fh.readline()

    # MODRDR .TAB files are comma-separated despite fixed RECORD_BYTES in the label.
    if sample.count(",") >= max(1, len(cols) - 2):
        df = pd.read_csv(
            tab,
            header=None,
            names=names,
            sep=",",
            quotechar='"',
            skipinitialspace=True,
            na_values=["NULL", "null", "NaN", "nan", ""],
            low_memory=False,
        )
    else:
        specs = [(c["start"] - 1, c["start"] - 1 + c["bytes"]) for c in cols]
        df = pd.read_fwf(tab, colspecs=specs, names=names, header=None)

    for c in cols:
        name = c["name"]
        s = df[name]
        if s.dtype == object:
            s = s.astype(str).str.strip().str.strip(',"')
            conv = pd.to_numeric(s, errors="coerce")
            if conv.notna().mean() > 0.5:
                df[name] = conv
            else:
                df[name] = s
        if c["missing"] is not None:
            try:
                miss_val = float(c["missing"])
                if pd.api.types.is_numeric_dtype(df[name]):
                    df.loc[df[name] == miss_val, name] = float("nan")
            except ValueError:
                pass
    return df
