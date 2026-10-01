"""Citizen complaint endpoints: duplicate-check, create (AI-assisted), list, detail, support, confirm."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..core.supabase import sb, one
from ..core.security import get_current_user, audit, notify
from ..services.ai_engine import analyze_complaint
from ..services.duplicate import find_duplicates
from ..services.assignment import pick_officer

router = APIRouter(prefix="/complaints", tags=["complaints"])

class CreateIn(BaseModel):
    title: str
    description: str
    category_id: str | None = None
    latitude: float
    longitude: float
    address: str | None = None
    region_id: str | None = None
    image_paths: list[str] = []

@router.post("/check-duplicate")
def check_duplicate(body: dict, user: dict = Depends(get_current_user)):
    existing = (sb().table("complaints").select("id,complaint_code,title,status,category_id,latitude,longitude,upvotes,created_at")
                .eq("org_id", user["org_id"]).execute().data or [])
    dups = find_duplicates(body["latitude"], body["longitude"],
                           body.get("category_id"), existing)
    return {"duplicates": dups[:5]}

@router.post("")
def create_complaint(body: CreateIn, user: dict = Depends(get_current_user)):
    if user["role"] != "citizen":
        raise HTTPException(403, "Only citizens file complaints")
    if len(body.title.strip()) < 5:
        raise HTTPException(422, "Title too short")

    # AI analysis
    ai = analyze_complaint(body.title, body.description)
    category_id = body.category_id
    dept_id = None
    def lookup_category(by_id: str | None = None, by_slug: str | None = None):
        """Return (category_id, dept_id); never raises. Unknown ids resolve to None (AI routing)."""
        try:
            q = sb().table("categories").select("id,default_department_id").eq("org_id", user["org_id"])
            if by_id:
                q = q.eq("id", by_id)
            elif by_slug:
                q = q.eq("slug", by_slug)
            rows = q.limit(1).execute().data or []
            if rows:
                return rows[0]["id"], rows[0].get("default_department_id")
        except Exception:
            pass
        return None, None

    if category_id:
        # Accept UUIDs; anything else (e.g. a slug) falls through to AI routing.
        category_id, dept_id = lookup_category(by_id=category_id)
    if not category_id:
        category_id, dept_id = lookup_category(by_slug=ai["category_slug"])
    if not dept_id and ai.get("dept_code"):
        try:
            rows = sb().table("departments").select("id").eq("org_id", user["org_id"]).eq("code", ai["dept_code"]).limit(1).execute().data or []
            if rows:
                dept_id = rows[0].get("id")
        except Exception:
            pass

    # duplicate guard
    existing = (sb().table("complaints").select("id,complaint_code,title,status,category_id,latitude,longitude,upvotes")
                .eq("org_id", user["org_id"]).execute().data or [])
    dups = find_duplicates(body.latitude, body.longitude, category_id, existing)
    if dups and body.title.strip().lower() in dups[0]["title"].strip().lower():
        pass  # frontend shows "support instead" prompt; API still allows explicit create

    officer_id = pick_officer(user["org_id"], dept_id, body.region_id)
    rows = sb().table("complaints").insert({
        "org_id": user["org_id"], "citizen_id": user["id"],
        "category_id": category_id, "department_id": dept_id,
        "assigned_officer_id": officer_id,
        "title": body.title.strip(), "description": body.description.strip(),
        "latitude": body.latitude, "longitude": body.longitude,
        "location": f"SRID=4326;POINT({body.longitude} {body.latitude})",
        "address": body.address, "region_id": body.region_id,
        "priority": ai["priority"], "severity": ai["severity"],
        "ai_analysis": ai,
        "status": "assigned" if officer_id else "verified",
    }).execute().data or []
    if not rows:
        raise HTTPException(500, "Failed to create complaint")
    ins = rows[0]

    for p in body.image_paths:
        sb().table("complaint_images").insert(
            {"complaint_id": ins["id"], "storage_path": p, "uploaded_by": user["id"]}).execute()
    sb().table("complaint_history").insert(
        {"complaint_id": ins["id"], "actor_id": user["id"], "to_status": ins["status"],
         "note": f"Filed by citizen (AI: {ai['category_slug']}/{ai['priority']})"}).execute()
    # reward pending -> approved on verification
    sb().table("reward_transactions").insert(
        {"org_id": user["org_id"], "citizen_id": user["id"], "complaint_id": ins["id"],
         "points": 10, "type": "earn", "status": "pending", "reason": "Valid report"}).execute()
    notify(user["org_id"], user["id"], "Complaint submitted",
           f"{ins['complaint_code']} received and routed.", ins["id"])
    audit(user["org_id"], user["id"], "complaint.create", "complaint", ins["id"], None, {"code": ins["complaint_code"]})
    return {**ins, "duplicates": dups[:3], "ai": ai}

@router.get("/mine")
def my_complaints(user: dict = Depends(get_current_user)):
    return (sb().table("complaints").select("*,categories(name),complaint_images(storage_path)")
            .eq("citizen_id", user["id"]).order("created_at", desc=True).execute().data or [])

@router.get("/nearby")
def nearby(lat: float, lng: float, radius_km: float = 5, user: dict = Depends(get_current_user)):
    rows = (sb().table("complaints").select("id,complaint_code,title,status,priority,latitude,longitude,upvotes,created_at")
            .eq("org_id", user["org_id"]).execute().data or [])
    from ..services.duplicate import haversine_m
    out = [r for r in rows if r.get("latitude") and haversine_m(lat, lng, r["latitude"], r["longitude"]) <= radius_km*1000]
    return out[:100]

@router.get("/{cid}")
def detail(cid: str, user: dict = Depends(get_current_user)):
    c = one(sb().table("complaints").select("*,categories(name),complaint_images(*),complaint_history(*,profiles!complaint_history_actor_id_fkey(full_name))").eq("id", cid))
    if not c or c["org_id"] != user["org_id"]:
        raise HTTPException(404, "Not found")
    # privacy: mask citizen for non-staff viewing public items
    return c

@router.post("/{cid}/support")
def support(cid: str, user: dict = Depends(get_current_user)):
    if one(sb().table("complaint_supports").select("complaint_id").eq("complaint_id", cid).eq("citizen_id", user["id"])):
        cur = one(sb().table("complaints").select("upvotes").eq("id", cid)) or {}
        return {"ok": True, "upvotes": cur.get("upvotes") or 0, "already": True}
    sb().table("complaint_supports").insert({"complaint_id": cid, "citizen_id": user["id"]}).execute()
    cur = one(sb().table("complaints").select("upvotes").eq("id", cid)) or {}
    votes = (cur.get("upvotes") or 0) + 1
    sb().table("complaints").update({"upvotes": votes}).eq("id", cid).execute()
    return {"ok": True, "upvotes": votes}

class ConfirmIn(BaseModel):
    resolved_ok: bool
    rating: int | None = None
    feedback: str | None = None

@router.post("/{cid}/confirm")
def confirm(cid: str, body: ConfirmIn, user: dict = Depends(get_current_user)):
    c = one(sb().table("complaints").select("*").eq("id", cid))
    if not c or c["citizen_id"] != user["id"]:
        raise HTTPException(404, "Not found")
    if c["status"] not in ("resolved", "citizen_confirmation"):
        raise HTTPException(409, "Not awaiting confirmation")
    if body.resolved_ok:
        now = datetime.now(timezone.utc).isoformat()
        sb().table("complaints").update({"status": "closed", "closed_at": now,
            "citizen_rating": body.rating, "citizen_feedback": body.feedback}).eq("id", cid).execute()
        sb().table("reward_transactions").update({"status": "approved"}).eq("complaint_id", cid).execute()
    else:
        sb().table("complaints").update({"status": "reopened"}).eq("id", cid).execute()
    sb().table("complaint_history").insert({"complaint_id": cid, "actor_id": user["id"],
        "from_status": c["status"], "to_status": "closed" if body.resolved_ok else "reopened",
        "note": body.feedback or ""}).execute()
    return {"ok": True}
