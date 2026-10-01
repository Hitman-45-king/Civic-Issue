"""AI Civic Intelligence Engine.
Image -> category + severity + priority + department + ETA.
Uses lightweight heuristics + keyword model; swap with CLIP/LLM later
without changing the API contract.
"""
import re
from typing import Optional

KEYWORD_CATEGORY = {
    "pothole": ("potholes", "ROADS"), "potholes": ("potholes", "ROADS"),
    "garbage": ("garbage", "SANI"), "trash": ("garbage", "SANI"),
    "waste": ("garbage", "SANI"), "dump": ("garbage", "SANI"),
    "streetlight": ("streetlights", "ELEC"), "street light": ("streetlights", "ELEC"),
    "lamp": ("streetlights", "ELEC"), "light": ("streetlights", "ELEC"),
    "water": ("water-leakage", "WATER"), "leak": ("water-leakage", "WATER"),
    "pipe": ("water-leakage", "WATER"), "drain": ("drainage", "DRAIN"),
    "sewage": ("drainage", "DRAIN"), "sewer": ("drainage", "DRAIN"),
    "road": ("road-damage", "ROADS"), "crack": ("road-damage", "ROADS"),
    "traffic": ("traffic", "ROADS"), "signal": ("traffic", "ROADS"),
    "vandal": ("property-damage", "ROADS"), "bench": ("property-damage", "ROADS"),
    "park": ("property-damage", "ROADS"), "wall": ("property-damage", "ROADS"),
}

SEVERITY_WORDS = {
    5: ["burst", "flood", "collapsed", "dangerous", "live wire", "sewage overflow", "major"],
    4: ["large", "heavy", "blocked", "broken", "overflowing", "deep"],
    2: ["small", "minor", "slight"],
}

ETA_BY_PRIORITY = {"critical": 6, "high": 24, "medium": 48, "low": 72}

def analyze_text(title: str, description: str) -> dict:
    text = f"{title} {description}".lower()
    votes: dict[str, int] = {}
    dept_votes: dict[str, int] = {}
    for kw, (cat, dept) in KEYWORD_CATEGORY.items():
        if re.search(r"\b" + re.escape(kw) + r"\b", text):
            votes[cat] = votes.get(cat, 0) + 1
            dept_votes[dept] = dept_votes.get(dept, 0) + 1
    category = max(votes, key=votes.get) if votes else "other"
    dept = max(dept_votes, key=dept_votes.get) if dept_votes else "ROADS"
    severity = 3
    for sev, words in SEVERITY_WORDS.items():
        if any(w in text for w in words):
            severity = sev
            break
    return {"category_slug": category, "dept_code": dept, "severity": severity,
            "confidence": 0.85 if votes else 0.35}

def recommend_priority(severity: int, category_slug: str, near_school_hospital: bool = False) -> str:
    safety = {"water-leakage", "streetlights", "traffic", "drainage"}
    if severity >= 5 or (severity >= 4 and category_slug in safety):
        return "critical"
    if severity >= 4 or near_school_hospital:
        return "high"
    if severity <= 2:
        return "low"
    return "medium"

def analyze_complaint(title: str, description: str,
                      image_label: Optional[str] = None) -> dict:
    """Main entry: returns category, severity, priority, dept, ETA hours."""
    r = analyze_text(f"{title} {image_label or ''}", description)
    priority = recommend_priority(r["severity"], r["category_slug"])
    return {
        "category_slug": r["category_slug"],
        "severity": r["severity"],
        "priority": priority,
        "dept_code": r["dept_code"],
        "eta_hours": ETA_BY_PRIORITY[priority],
        "confidence": r["confidence"],
    }

def hotspot_summary(complaints: list[dict]) -> list[dict]:
    """Cluster by rounded lat/lng grid -> hotspot cells."""
    from collections import Counter
    cells = Counter()
    for c in complaints:
        if c.get("latitude") is None: continue
        cells[(round(c["latitude"], 2), round(c["longitude"], 2))] += 1
    return [{"lat": k[0], "lng": k[1], "count": v}
            for k, v in cells.most_common(20)]
