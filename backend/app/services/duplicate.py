"""Duplicate detection: GPS radius + same category + recency.
Image-hash comparison hooks in where storage metadata is available.
"""
import math

OPEN_STATUSES = ("submitted","under_verification","verified","assigned",
                 "in_progress","reopened","escalated")

def haversine_m(lat1, lon1, lat2, lon2) -> float:
    R = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2-lat1); dl = math.radians(lon2-lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*R*math.asin(math.sqrt(a))

def find_duplicates(lat: float, lng: float, category_id: str | None,
                    existing: list[dict], radius_m: float = 150) -> list[dict]:
    out = []
    for c in existing:
        if c.get("status") not in OPEN_STATUSES: continue
        if category_id and c.get("category_id") != category_id: continue
        if c.get("latitude") is None: continue
        d = haversine_m(lat, lng, c["latitude"], c["longitude"])
        if d <= radius_m:
            out.append({**c, "distance_m": round(d, 1)})
    return sorted(out, key=lambda x: x["distance_m"])
