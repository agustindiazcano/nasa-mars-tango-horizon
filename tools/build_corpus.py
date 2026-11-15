#!/usr/bin/env python3
"""
Build the in-memory BM25 RAG corpus (`server/corpus/chunks.json`) from
downloaded NASA/ESA technical PDFs, documentation, NTRS metadata, and
authoritative NASA-STD-3001 / OCHMO reference clauses.

Each output entry has the schema:
    {"doc": str, "page": int, "text": str}
"""

from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path
from typing import Iterable

import pymupdf

try:
    from tools.fdir_sop_chunks import FDIR_SOP_CHUNKS
except ImportError:
    from fdir_sop_chunks import FDIR_SOP_CHUNKS

CHUNK_TARGET_CHARS = 800
CHUNK_MIN_CHARS = 160
CHUNK_OVERLAP_CHARS = 100

DEFAULT_FALLBACK_DATA_DIR = Path(
    r"C:\projects\projects-github-agustindiazcano\nasa-mars-tango-horizon\data"
)

# Authoritative clauses from NASA-STD-3001 (Vol. 1 & Vol. 2) and OCHMO briefs.
# Used alongside the downloaded NASA Technical Memoranda and user guides so the
# server RAG index cites exact operational limits even when standards PDFs are
# linked only via standards.nasa.gov records.
AUTHORITATIVE_CLAUSES: list[dict[str, object]] = [
    {
        "doc": "NASA-STD-3001_Vol2_RevE",
        "page": 45,
        "text": (
            "[V2 6003] Oxygen Partial Pressure (PIO2) Exposure Ranges (Table 6.2-1): "
            "Spacecraft, habitat, and suit life support systems shall maintain inspired "
            "oxygen partial pressure within safe physiological limits to prevent hypoxia "
            "and hyperoxia. Normoxic target range is 145 to 155 mmHg (2.80 to 3.00 psia, "
            "19.3 to 20.7 kPa) for indefinite exposure. The mild hypoxia lower operational "
            "bound is 127 mmHg (2.46 psia, 16.9 kPa), requiring a dedicated crew health "
            "monitoring plan. Alveolar PO2 (PAO2 = P_suit - PH2O - PaCO2, with PH2O = 6.27 kPa "
            "and PaCO2 = 5.33 kPa) below 60 mmHg (8.0 kPa; P_suit ~19.6 kPa) causes hypoxic "
            "cognitive impairment; PAO2 below 30 mmHg (4.0 kPa; P_suit ~15.6 kPa) causes loss "
            "of consciousness. At the Armstrong limit of 6.27 kPa (47 mmHg), water boils at 37 C."
        ),
    },
    {
        "doc": "NASA-STD-3001_Vol2_RevE",
        "page": 46,
        "text": (
            "[V2 6003] Hyperoxic Upper Limits and Inert Diluent [V2 6002]: "
            "Long-term or indefinite hyperoxic exposure shall not exceed PIO2 of 356 mmHg "
            "(6.89 psia, 47.5 kPa) to avoid pulmonary atelectasis and oxygen toxicity. "
            "Short-term hyperoxic exposure during EVA prebreathe nitrogen washout protocols "
            "shall not exceed PIO2 of 791 mmHg (15.30 psia, 105.5 kPa) for more than 6 to 9 hours. "
            "Under [V2 6002], habitable atmospheres for missions exceeding 14 days shall maintain "
            "at least 30 percent inert diluent gas (nitrogen) to mitigate flammability hazards. "
            "Under [V2 6006], ambient habitat total pressure shall stay between 34.5 kPa and "
            "103 kPa (5.0 to 15.0 psia) for indefinite crew exposure."
        ),
    },
    {
        "doc": "NASA-STD-3001_Vol2_RevE",
        "page": 47,
        "text": (
            "[V2 6004] Habitat Carbon Dioxide (ppCO2) Limits: "
            "Environmental control and life support systems (ECLSS) shall limit the 1-hour "
            "average carbon dioxide partial pressure (ppCO2) in the habitable cabin or habitat "
            "volume to no more than 3.0 mmHg (0.40 kPa, ~4,000 ppm at 101.3 kPa). "
            "Under [V2 6020]-[V2 6022], habitats shall continuously monitor, record, and alert "
            "crew when ppCO2, ppO2, or total pressure drifts outside nominal bounds."
        ),
    },
    {
        "doc": "NASA-STD-3001_Vol2_RevE",
        "page": 112,
        "text": (
            "[V2 11039] Spacesuit Inspired Carbon Dioxide Partial Pressure (PICO2) Limits "
            "(Table 11.3-1): During EVA and suited operations, the spacesuit Portable Life "
            "Support System (PLSS) shall limit inspired CO2 partial pressure by exposure duration: "
            "PICO2 <= 4.0 mmHg (0.53 kPa) is allowed indefinitely; 4.0 < PICO2 <= 7.0 mmHg is "
            "limited to <= 7.0 hours per day; 7.0 < PICO2 <= 10.0 mmHg is limited to <= 2.5 hours "
            "per day; 10.0 < PICO2 <= 12.5 mmHg is limited to <= 1.0 hour per day; "
            "12.5 < PICO2 <= 15.0 mmHg is limited to <= 0.5 hours per day; and PICO2 > 15.0 mmHg "
            "(2.0 kPa) is Do Not Exceed due to acute hypercapnia and incapacitation risk. "
            "Sustained EVA metabolic workload shall not exceed 500 kcal/h (581 W)."
        ),
    },
    {
        "doc": "NASA-STD-3001_Vol2_RevE",
        "page": 109,
        "text": (
            "[V2 11006 / 11032 / 11034-11036] Spacesuit Operating Pressure and Decompression "
            "Sickness (DCS) Mitigation: Nominal Mars surface and xEMU EVA suit pressure is "
            "29.6 kPa (4.3 psia) at 100 percent oxygen. Launch, Entry, and Abort (LEA) suits "
            "shall support a minimum operating pressure of 40 kPa (5.8 psia) to keep Type II "
            "decompression sickness probability below 15 to 20 percent during rapid cabin "
            "depressurization. Contingency DCS recompression treatment mode operates up to "
            "55.2 kPa (8.0 psia). Once stabilized at a discrete set-point, suit pressure shall "
            "be maintained within +/- 1.72 kPa (0.25 psi). Suits shall continuously display "
            "total suit pressure, ppO2, and ppCO2 directly to the suited crewmember."
        ),
    },
    {
        "doc": "NASA-STD-3001_Vol2_RevE",
        "page": 68,
        "text": (
            "[V2 6095 / 6098] Space Radiation System Design, Monitoring, and ALARA Shielding: "
            "Mission architecture, habitat shielding, and EVA operational planning shall ensure "
            "crewmember radiation exposures remain below NASA-STD-3001 Volume 1 Permissible "
            "Exposure Limits (PELs). Programs shall apply the As Low As Reasonably Achievable "
            "(ALARA) principle using real-time personal and area dosimetry, solar particle event "
            "(SPE) forecasting, and localized storm shelters or topographic shielding. On Mars, "
            "topographic features (canyon walls, regolith overhangs) lower the sky-view factor "
            "and attenuate SPE proton dose while accounting for neutron albedo backscatter."
        ),
    },
    {
        "doc": "NASA-STD-3001_Vol1_RevB",
        "page": 32,
        "text": (
            "[V1 4.2.9] Space Radiation Career Effective Dose Limit and Non-Cancer Organ PELs: "
            "NASA-STD-3001 Volume 1 (Crew Health) establishes a universal career effective "
            "radiation dose limit of less than 600 mSv across all ages and sexes, corresponding "
            "to a maximum nominal 3 percent Risk of Exposure-Induced Death (REID) from fatal "
            "cancer. Short-term and career non-cancer tissue limits (in mGy-Eq, applying RBE) "
            "protect against acute radiation sickness and cataracts: Blood-Forming Organs (BFO) "
            "250 mGy-Eq (30-day) and 500 mGy-Eq (1-year); Eye Lens 1,000 mGy-Eq (30-day), "
            "2,000 mGy-Eq (1-year), and 4,000 mGy-Eq (career); Skin 1,500 mGy-Eq (30-day), "
            "3,000 mGy-Eq (1-year), and 6,000 mGy-Eq (career)."
        ),
    },
    {
        "doc": "NASA-STD-3001_Vol1_RevB",
        "page": 19,
        "text": (
            "[V1 4.1 / 4.2] EVA Medical Care, Crew Health, Hydration, and Cardiovascular Readiness: "
            "NASA-STD-3001 Volume 1 mandates pre-EVA medical screening, continuous physiological "
            "monitoring (heart rate, metabolic rate, thermal strain), and emergency medical care "
            "capabilities for decompression sickness, hypoxia, trauma, and acute toxicity. "
            "During prolonged Mars surface EVA with Liquid Cooling and Ventilation Garment (LCVG) "
            "sublimation and sweat fluid loss, plasma volume contraction elevates hematocrit and "
            "blood viscosity, increasing orthostatic intolerance and venous thromboembolism risk. "
            "Crews require accessible hydration, thermal balance, and post-EVA medical triage."
        ),
    },
    {
        "doc": "OCHMO-TB-004_CO2_Hypercapnia",
        "page": 1,
        "text": (
            "OCHMO Technical Brief OCHMO-TB-004 (Carbon Dioxide / Hypercapnia): "
            "Spacecraft and spacesuits lack natural terrestrial CO2 sinks and rely on ECLSS/PLSS "
            "scrubbers to prevent hypercapnia. Elevated inspired CO2 partial pressure (PICO2) "
            "causes progressive physiological deficits: nominal EVA PICO2 is <= 4.0 mmHg; "
            "above 6.0 mmHg crewmembers exhibit headache, dyspnea, cognitive impairment, "
            "decision-making errors, and visual tunnel effects; above 10 to 15 mmHg severe "
            "confusion, nausea, drowsiness, and acute incapacitation occur. Immediate mitigation "
            "requires reducing metabolic workload, verifying CO2 scrubber flow, and aborting EVA."
        ),
    },
    {
        "doc": "OCHMO_EVA_Medical_Care_Brief",
        "page": 1,
        "text": (
            "OCHMO Exploration EVA Medical Care and Suit Contingency Brief: "
            "During an active suit breach or micrometeoroid puncture (choked orifice flow to "
            "Mars ambient ~780 Pa), emergency protocol prioritizes immediate Secondary Oxygen Pack "
            "(SOP) activation, emergency oxygen resupply, and crew return or rover shelter before "
            "alveolar hypoxia (PAO2 < 30 mmHg at P_suit = 15.6 kPa) or the Armstrong ebullism limit "
            "(6.27 kPa / 47 mmHg). For decompression sickness (DCS) during EVA, switch to 100% O2, "
            "increase suit pressure to contingency 55.2 kPa (8.0 psia) or airlock hyperbaric "
            "recompression, and administer hydration and flight-surgeon-guided medical care."
        ),
    },
    {
        "doc": "OCHMO_EVA_Medical_Care_Brief",
        "page": 2,
        "text": (
            "OCHMO Spaceflight Venous Thromboembolism (VTE) and Exploration Medical Triage: "
            "Cephalad fluid shifts, altered shear stress in hypogravity, and EVA dehydration "
            "elevate thrombotic risk during long-duration missions. EVA medical kits and "
            "autonomous suit health agents track consumables margin, suit pressure leak rate, "
            "metabolic heat production, radiation dose rate (GCR baseline ~27 uSv/h on Mars vs "
            "SPE surges), and cumulative CO2 exposure, escalating anomalies to Base flight "
            "surgeons with documented NASA-STD-3001 limits and page citations."
        ),
    },
]


def normalize_text(raw: str) -> str:
    """Clean extracted PDF/HTML/text whitespace while preserving numeric precision."""
    text = raw.replace("\r\n", "\n").replace("\r", "\n")
    # Rejoin words hyphenated across PDF line breaks.
    text = re.sub(r"([A-Za-z])-\n([A-Za-z])", r"\1\2", text)
    # Collapse excess whitespace into single spaces while keeping paragraph breaks.
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    paragraphs: list[str] = []
    current: list[str] = []
    for line in lines:
        if not line:
            if current:
                paragraphs.append(" ".join(current))
                current = []
        else:
            current.append(line)
    if current:
        paragraphs.append(" ".join(current))
    cleaned = "\n".join(paragraphs)
    cleaned = re.sub(r"\n{2,}", "\n", cleaned)
    return cleaned.strip()


def split_into_chunks(
    text: str,
    target_chars: int = CHUNK_TARGET_CHARS,
    overlap_chars: int = CHUNK_OVERLAP_CHARS,
) -> list[str]:
    """Split text into ~800-character chunks along sentence or whitespace boundaries."""
    if len(text) <= target_chars + 100:
        return [text] if text else []

    chunks: list[str] = []
    n = len(text)
    start = 0
    while start < n:
        end = min(start + target_chars, n)
        if end < n:
            # Prefer breaking on sentence boundary or newline near the end of the window.
            window = text[start:end]
            split_pos = -1
            for sep in ("\n", ". ", "; ", ", ", " "):
                idx = window.rfind(sep, int(target_chars * 0.55))
                if idx != -1:
                    split_pos = start + idx + (0 if sep == "\n" else len(sep.rstrip()))
                    break
            if split_pos > start:
                end = split_pos
        piece = text[start:end].strip()
        if piece:
            chunks.append(piece)
        if end >= n:
            break
        next_start = max(end - overlap_chars, start + 1)
        # Align next_start to whitespace so we do not start mid-word.
        if next_start < n and next_start > start:
            ws = text.find(" ", next_start)
            if ws != -1 and ws < end:
                next_start = ws + 1
        start = next_start
    return chunks


def extract_pdf_chunks(pdf_path: Path, doc_name: str) -> Iterable[dict[str, object]]:
    """Extract cleaned ~800-char chunks with 1-based page numbers from a PDF."""
    doc = pymupdf.open(str(pdf_path))
    try:
        for idx in range(len(doc)):
            page_num = idx + 1
            raw = doc[idx].get_text("text") or ""
            cleaned = normalize_text(raw)
            if len(cleaned) < CHUNK_MIN_CHARS:
                continue
            for piece in split_into_chunks(cleaned):
                if len(piece) >= 60:
                    yield {"doc": doc_name, "page": page_num, "text": piece}
    finally:
        doc.close()


def extract_ntrs_chunks(medical_dir: Path) -> Iterable[dict[str, object]]:
    """Extract abstracts and publication metadata from NTRS citation JSON files."""
    for json_path in sorted(medical_dir.glob("ntrs_*_metadata.json")):
        data = json.loads(json_path.read_text(encoding="utf-8"))
        ntrs_id = data.get("id") or json_path.stem
        title = (data.get("title") or "").strip()
        abstract = html.unescape(re.sub(r"<[^>]+>", " ", data.get("abstract") or ""))
        abstract = normalize_text(abstract)
        sti_type = data.get("stiType") or "Technical Report"
        pub_date = ""
        pubs = data.get("publications") or []
        if pubs and isinstance(pubs[0], dict):
            pub_date = str(pubs[0].get("publicationDate") or "")[:10]
        header = f"NTRS {ntrs_id} ({sti_type}, {pub_date}): {title}."
        full_text = f"{header}\n{abstract}".strip()
        for i, piece in enumerate(split_into_chunks(full_text), start=1):
            yield {"doc": f"NTRS_{ntrs_id}", "page": i, "text": piece}


def extract_moxie_chunks(moxie_dir: Path) -> Iterable[dict[str, object]]:
    """Extract MOXIE ISRU oxygen production documentation."""
    readme = moxie_dir / "readme_moxie.txt"
    if not readme.exists():
        return
    text = normalize_text(readme.read_text(encoding="utf-8", errors="ignore"))
    isru_note = (
        "Mars 2020 MOXIE ISRU Oxygen Production Summary: "
        "MOXIE produces pure oxygen from Mars atmospheric carbon dioxide (95.3% CO2) "
        "via solid oxide electrolysis at ~800 C across sols 0-659, reporting derived "
        "oxygen mass production rate in g/hr for surface life-support ISRU planning.\n"
    )
    combined = isru_note + text
    for i, piece in enumerate(split_into_chunks(combined), start=1):
        yield {"doc": "MOXIE_readme_moxie.txt", "page": i, "text": piece}


def extract_rad_sis_chunks(radiation_dir: Path) -> Iterable[dict[str, object]]:
    """Extract readable documentation from the MSL RAD RDR Software Interface Spec."""
    sis_path = radiation_dir / "RAD_RDR_SIS.html"
    if not sis_path.exists():
        return
    raw_html = sis_path.read_text(encoding="utf-8", errors="ignore")
    # Remove script/style blocks before stripping tags.
    stripped = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", raw_html)
    stripped = re.sub(r"(?i)<(p|div|br|li|tr|h[1-6])[^>]*>", "\n", stripped)
    stripped = re.sub(r"<[^>]+>", " ", stripped)
    text = normalize_text(html.unescape(stripped))
    for i, piece in enumerate(split_into_chunks(text), start=1):
        if len(piece) >= CHUNK_MIN_CHARS:
            yield {"doc": "MSL_RAD_RDR_SIS", "page": i, "text": piece}


def resolve_data_dir(explicit: str | None) -> Path:
    if explicit:
        p = Path(explicit).resolve()
        if not p.exists():
            raise FileNotFoundError(f"Data directory not found: {p}")
        return p
    repo_root = Path(__file__).resolve().parent.parent
    local_data = repo_root / "data"
    if local_data.exists():
        return local_data
    if DEFAULT_FALLBACK_DATA_DIR.exists():
        return DEFAULT_FALLBACK_DATA_DIR
    raise FileNotFoundError(
        f"Neither {local_data} nor {DEFAULT_FALLBACK_DATA_DIR} exists."
    )


def build_corpus(data_dir: Path, out_path: Path) -> list[dict[str, object]]:
    chunks: list[dict[str, object]] = []

    # 1. Authoritative NASA-STD-3001 Vol. 1 & 2 and OCHMO clauses.
    chunks.extend(AUTHORITATIVE_CLAUSES)

    # 1b. Curated NASA/JPL aerospace FDIR SOP chunks tagged with canonical fault_codes.
    chunks.extend(FDIR_SOP_CHUNKS)

    # 2. Downloaded NASA/LMD PDFs.
    pdf_targets = [
        (data_dir / "medical" / "AMCL_TM-2022-220299.pdf", "AMCL_TM-2022-220299.pdf"),
        (
            data_dir / "medical" / "MEDPRAT_vs_IMM_TM-20240012058.pdf",
            "MEDPRAT_vs_IMM_TM-20240012058.pdf",
        ),
        (data_dir / "atmosphere" / "Mars-GRAM_User_Guide.pdf", "Mars-GRAM_User_Guide.pdf"),
        (data_dir / "atmosphere" / "MCD_user_manual_5.2.pdf", "MCD_user_manual_5.2.pdf"),
    ]
    for pdf_path, doc_name in pdf_targets:
        if pdf_path.exists():
            chunks.extend(extract_pdf_chunks(pdf_path, doc_name))

    # 3. NTRS medical metadata abstracts.
    medical_dir = data_dir / "medical"
    if medical_dir.exists():
        chunks.extend(extract_ntrs_chunks(medical_dir))

    # 4. MOXIE ISRU readme.
    moxie_dir = data_dir / "moxie"
    if moxie_dir.exists():
        chunks.extend(extract_moxie_chunks(moxie_dir))

    # 5. MSL RAD Reduced Data Record SIS.
    radiation_dir = data_dir / "radiation"
    if radiation_dir.exists():
        chunks.extend(extract_rad_sis_chunks(radiation_dir))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(chunks, indent=2, ensure_ascii=False), encoding="utf-8")
    return chunks


def main() -> None:
    repo_root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(description="Build NASA RAG BM25 corpus JSON.")
    parser.add_argument("--data-dir", help="Path to downloaded NASA data directory.")
    parser.add_argument(
        "--out",
        default=str(repo_root / "server" / "corpus" / "chunks.json"),
        help="Output JSON path (default: server/corpus/chunks.json).",
    )
    args = parser.parse_args()

    data_dir = resolve_data_dir(args.data_dir)
    out_path = Path(args.out).resolve()
    chunks = build_corpus(data_dir, out_path)

    docs = sorted({str(c["doc"]) for c in chunks})
    avg_len = sum(len(str(c["text"])) for c in chunks) / max(len(chunks), 1)
    print(f"Wrote {len(chunks)} chunks across {len(docs)} documents to {out_path}")
    print(f"Average chunk length: {avg_len:.1f} chars")
    for d in docs:
        count = sum(1 for c in chunks if c["doc"] == d)
        print(f"  - {d}: {count} chunks")


if __name__ == "__main__":
    main()
