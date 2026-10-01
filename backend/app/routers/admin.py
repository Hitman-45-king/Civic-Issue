"""Admin: verification, assignment, escalation, user management, dashboard stats."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..core.supabase import sb, one
from ..core.security import require_min_role, audit, notify

router = APIRouter(prefix="/admin", tags=["admin"])
staff = require_min_role("dept_admin")

@router.get("/stats")
def stats(user: dict = Depends(staff)):
    base = sb().table("complaints").select("id").eq("org_id", user["org_id"])
    def count(**f):
        q = sb().table("complaints").select("id", count="exact").eq("org_id", user["org_id"])
        for k, v in f.items():
            q = q.eq(k, v) if not isinstance(v, list) else q.in_(k, v)
        return q.execute().count or 0
    return {
        "total": count(),
        "pending": count(status=["submitted", "under_verification"]),
        "in_progress": count(status=["verified", "assigned", "in_progress"]),
        "resolved": count(status=["resolved", "citizen_confirmation", "closed"]),
        "critical": count(priority="critical"),
        "escalated": count(status="escalated"),
    }

@router.get("/complaints")
def list_complaints(status: str | None = None, priority: str | None = None,
                    department_id: str | None = None, q: str | None = None,
                    limit: int = 50, offset: int = 0, user: dict = Depends(staff)):
    query = (sb().table("complaints")
             .select("*,categories(name),departments(name,code),profiles!complaints_citizen_id_fkey(full_name),officer:profiles!complaints_assigned_officer_id_fkey(full_name)")
             .eq("org_id", user["org_id"]).order("created_at", desc=True)
             .range(offset, offset + limit - 1))
    if status: query = query.eq("status", status)
    if priority: query = query.eq("priority", priority)
    if department_id: query = query.eq("department_id", department_id)
    if user["role"] in ("dept_admin", "dept_head") and user.get("department_id"):
        query = query.eq("department_id", user["department_id"])
    rows = query.execute().data or []
    if q:
        rows = [r for r in rows if q.lower() in (r.get("title","")+r.get("complaint_code","")).lower()]
    return rows

class StatusIn(BaseModel):
    status: str
    note: str | None = None

@router.patch("/complaints/{cid}/status")
def change_status(cid: str, body: StatusIn, user: dict = Depends(staff)):
    c = one(sb().table("complaints").select("*").eq("id", cid))
    if not c or c["org_id"] != user["org_id"]:
        raise HTTPException(404, "Not found")
    sb().table("complaints").update({"status": body.status}).eq("id", cid).execute()
    sb().table("complaint_history").insert({"complaint_id": cid, "actor_id": user["id"],
        "from_status": c["status"], "to_status": body.status, "note": body.note or ""}).execute()
    notify(c["org_id"], c["citizen_id"], f"Update: {c['complaint_code']}",
           f"Status changed to {body.status}.", cid)
    if body.status == "verified":
        sb().table("reward_transactions").update({"status": "approved"}).eq("complaint_id", cid).execute()
    audit(user["org_id"], user["id"], "complaint.status", "complaint", cid,
          {"status": c["status"]}, {"status": body.status})
    return {"ok": True}

class AssignIn(BaseModel):
    officer_id: str | None = None
    department_id: str | None = None
    priority: str | None = None

@router.patch("/complaints/{cid}/assign")
def assign(cid: str, body: AssignIn, user: dict = Depends(staff)):
    upd = {}
    if body.officer_id: upd["assigned_officer_id"] = body.officer_id
    if body.department_id: upd["department_id"] = body.department_id
    if body.priority: upd["priority"] = body.priority
    upd["status"] = "assigned"
    sb().table("complaints").update(upd).eq("id", cid).execute()
    sb().table("complaint_history").insert({"complaint_id": cid, "actor_id": user["id"],
        "to_status": "assigned", "note": f"Assigned {upd}"}).execute()
    c = one(sb().table("complaints").select("citizen_id,complaint_code,org_id").eq("id", cid))
    if not c:
        raise HTTPException(404, "Not found")
    if body.officer_id:
        notify(c["org_id"], body.officer_id, f"New assignment {c['complaint_code']}", "You have a new field task.", cid)
    audit(user["org_id"], user["id"], "complaint.assign", "complaint", cid, None, upd)
    return {"ok": True, "assigned": upd}

@router.post("/complaints/{cid}/escalate")
def escalate(cid: str, user: dict = Depends(staff)):
    from ..services.sla import escalate_complaint
    c = one(sb().table("complaints").select("*").eq("id", cid))
    if not c: raise HTTPException(404, "Not found")
    return escalate_complaint(c, user["id"])

# ---- Staff user management (super_admin creates admins) ----
class CreateStaffIn(BaseModel):
    email: str
    full_name: str
    role: str
    employee_id: str
    department_id: str | None = None
    region_id: str | None = None

@router.post("/staff")
def create_staff(body: CreateStaffIn, user: dict = Depends(require_min_role("org_admin"))):
    if body.role == "super_admin" and user["role"] != "super_admin":
        raise HTTPException(403, "Only super admin can create super admins")
    if body.role == "citizen":
        raise HTTPException(422, "Use citizen signup for citizens")
    # create auth user via admin api then profile row (pending until approval)
    try:
        created = sb().auth.admin.create_user({"email": body.email, "email_confirm": True,
            "user_metadata": {"full_name": body.full_name}})
        uid = created.user.id
    except Exception as e:
        raise HTTPException(400, f"Auth create failed: {e}")
    sb().table("profiles").upsert({"id": uid, "org_id": user["org_id"], "role": body.role,
        "status": "active", "full_name": body.full_name, "email": body.email,
        "employee_id": body.employee_id, "department_id": body.department_id,
        "region_id": body.region_id}).execute()
    audit(user["org_id"], user["id"], "staff.create", "profile", uid, None, body.model_dump())
    return {"id": uid, "status": "active"}

@router.get("/staff")
def list_staff(user: dict = Depends(staff)):
    q = (sb().table("profiles")
         .select("id,full_name,email,employee_id,role,status,department_id,created_at,departments(name)")
         .eq("org_id", user["org_id"]).neq("role", "citizen").order("created_at", desc=True))
    if user["role"] in ("dept_admin", "dept_head") and user.get("department_id"):
        q = q.eq("department_id", user["department_id"])
    return q.execute().data or []

@router.patch("/staff/{uid}")
def set_staff_status(uid: str, status: str, user: dict = Depends(require_min_role("org_admin"))):
    if status not in ("pending", "active", "suspended", "disabled"):
        raise HTTPException(422, "Bad status")
    old = one(sb().table("profiles").select("status").eq("id", uid))
    sb().table("profiles").update({"status": status}).eq("id", uid).execute()
    audit(user["org_id"], user["id"], "staff.status", "profile", uid, old, {"status": status})
    return {"ok": True}
