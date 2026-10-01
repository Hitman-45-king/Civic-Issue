"""Field officer: task list, accept, progress notes, before/after photos, resolution proof."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..core.supabase import sb, one
from ..core.security import get_current_user, audit, notify

router = APIRouter(prefix="/officer", tags=["officer"])

def me(user: dict = Depends(get_current_user)):
    if user["role"] not in ("field_officer", "dept_admin", "dept_head", "org_admin", "super_admin"):
        raise HTTPException(403, "Officers only")
    return user

@router.get("/tasks")
def tasks(user: dict = Depends(me)):
    q = sb().table("complaints").select("*,categories(name),complaint_images(storage_path,image_type)").eq("org_id", user["org_id"])\
        .order("priority", desc=False).order("sla_due_at")
    if user["role"] == "field_officer":
        q = q.eq("assigned_officer_id", user["id"])
    return q.execute().data or []

class ProgressIn(BaseModel):
    status: str  # in_progress | resolved
    note: str | None = None
    photo_paths: list[str] = []

@router.patch("/tasks/{cid}/progress")
def progress(cid: str, body: ProgressIn, user: dict = Depends(me)):
    if body.status not in ("in_progress", "resolved"):
        raise HTTPException(422, "Bad status")
    c = one(sb().table("complaints").select("*").eq("id", cid))
    if not c: raise HTTPException(404, "Not found")
    now = datetime.now(timezone.utc).isoformat()
    sb().table("complaints").update({"status": body.status,
        **({"resolved_at": now} if body.status == "resolved" else {})}).eq("id", cid).execute()
    for p in body.photo_paths:
        sb().table("complaint_images").insert({"complaint_id": cid, "storage_path": p,
            "image_type": "proof" if body.status == "resolved" else "progress",
            "uploaded_by": user["id"]}).execute()
    sb().table("complaint_history").insert({"complaint_id": cid, "actor_id": user["id"],
        "from_status": c["status"], "to_status": body.status, "note": body.note or ""}).execute()
    if body.status == "resolved":
        sb().table("complaints").update({"status": "citizen_confirmation"}).eq("id", cid).execute()
        notify(c["org_id"], c["citizen_id"], f"Resolved: {c['complaint_code']}",
               "Please confirm the fix in the app.", cid)
    audit(user["org_id"], user["id"], "officer.progress", "complaint", cid,
          {"status": c["status"]}, {"status": body.status})
    return {"ok": True}
