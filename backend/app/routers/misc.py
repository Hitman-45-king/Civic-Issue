"""Auth helpers, analytics, rewards, notifications, reports, chatbot."""
from fastapi import APIRouter, Depends, Header, HTTPException, Response
from pydantic import BaseModel
from datetime import datetime, timezone
import csv, io
from ..core.supabase import sb, one
from ..core.security import get_current_user, require_min_role, audit, verify_access_token
from ..services.ai_engine import hotspot_summary

router = APIRouter(tags=["platform"])

# ---------- AUTH: ensure profile after Supabase signup ----------
class EnsureIn(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    org_slug: str = "demo-municipality"
    role: str = "citizen"  # citizen | field_officer | dept_admin | dept_head | org_admin
    employee_id: str | None = None
    department_id: str | None = None

@router.get("/meta/departments")
def departments(org_slug: str = "demo-municipality"):
    rows = sb().table("organizations").select("id").eq("slug", org_slug).limit(1).execute().data or []
    if not rows:
        raise HTTPException(404, "Organization not found")
    return (sb().table("departments").select("id,name,code").eq("org_id", rows[0]["id"])
            .eq("is_active", True).order("name").execute().data or [])

@router.get("/meta/categories")
def categories(org_slug: str = "demo-municipality"):
    rows = sb().table("organizations").select("id").eq("slug", org_slug).limit(1).execute().data or []
    if not rows:
        raise HTTPException(404, "Organization not found")
    cats = (sb().table("categories").select("id,name,slug,default_department_id").eq("org_id", rows[0]["id"])
            .eq("is_active", True).order("name").execute().data or [])
    dept_ids = list({c["default_department_id"] for c in cats if c.get("default_department_id")})
    dept_names = {}
    if dept_ids:
        for d in sb().table("departments").select("id,name").in_("id", dept_ids).execute().data or []:
            dept_names[d["id"]] = d["name"]
    return [{**c, "dept_name": dept_names.get(c.get("default_department_id"), "")} for c in cats]

@router.post("/auth/ensure-profile")
def ensure_profile(body: EnsureIn, authorization: str = Header(default="")):
    # called right after supabase.auth.signUp; verified server-side (no JWT secret needed)
    uid, email = verify_access_token(authorization)
    org = one(sb().table("organizations").select("id").eq("slug", body.org_slug))
    if not org:
        raise HTTPException(404, "Organization not found")
    role = (body.role or "citizen").strip()
    if role not in ("citizen", "field_officer", "dept_admin", "dept_head", "org_admin"):
        raise HTTPException(422, "Invalid role")
    # All self-signups get immediate access; suspend via PATCH /admin/staff if needed.
    status = "active"
    # Tolerate stale/unknown department ids (e.g. demo fallback list) — never fail signup.
    dept_id = None
    if body.department_id:
        try:
            rows = sb().table("departments").select("id").eq("id", body.department_id)\
                .eq("org_id", org["id"]).limit(1).execute().data or []
            if rows:
                dept_id = rows[0]["id"]
        except Exception:
            dept_id = None
    sb().table("profiles").upsert({"id": uid, "org_id": org["id"], "role": role,
        "status": status, "full_name": body.full_name, "phone": body.phone,
        "email": email, "employee_id": body.employee_id,
        "department_id": dept_id}, on_conflict="id").execute()
    audit(org["id"], uid, "auth.signup", "profile", uid, None, {"role": role, "status": status})
    return {"ok": True, "role": role, "status": status}

# ---------- ANALYTICS ----------
@router.get("/analytics/overview")
def analytics(user: dict = Depends(require_min_role("dept_admin"))):
    rows = (sb().table("complaints").select("status,priority,category_id,department_id,created_at,resolved_at,sla_due_at,citizen_rating,latitude,longitude")
            .eq("org_id", user["org_id"]).limit(5000).execute().data or [])
    from collections import Counter
    by_status, by_priority = Counter(), Counter()
    ratings = []
    for r in rows:
        by_status[r["status"]] += 1; by_priority[r["priority"]] += 1
        if r.get("citizen_rating"): ratings.append(r["citizen_rating"])
    sla_breach = sum(1 for r in rows if r.get("sla_due_at") and r["status"] not in ("closed","resolved","rejected")
                     and r["sla_due_at"] < datetime.now(timezone.utc).isoformat())
    return {"total": len(rows), "by_status": dict(by_status), "by_priority": dict(by_priority),
            "sla_breach": sla_breach,
            "avg_rating": round(sum(ratings)/len(ratings), 2) if ratings else None,
            "hotspots": hotspot_summary(rows)}

# ---------- REWARDS ----------
@router.get("/rewards/me")
def my_rewards(user: dict = Depends(get_current_user)):
    tx = (sb().table("reward_transactions").select("*").eq("citizen_id", user["id"])
          .order("created_at", desc=True).execute().data or [])
    balance = sum(t["points"] for t in tx if t["status"] == "approved" and t["type"] == "earn") \
            - sum(t["points"] for t in tx if t["status"] == "approved" and t["type"] == "redeem")
    return {"balance": balance, "history": tx}

@router.post("/rewards/redeem")
def redeem(body: dict, user: dict = Depends(get_current_user)):
    sb().table("reward_transactions").insert({"org_id": user["org_id"], "citizen_id": user["id"],
        "points": int(body.get("points", 0)), "type": "redeem", "status": "pending",
        "reason": body.get("reason", "Redemption request")}).execute()
    return {"ok": True, "status": "pending"}

# ---------- NOTIFICATIONS ----------
@router.get("/notifications")
def notifs(user: dict = Depends(get_current_user)):
    return (sb().table("notifications").select("*").eq("user_id", user["id"])
            .order("created_at", desc=True).limit(50).execute().data or [])

@router.post("/notifications/{nid}/read")
def read_notif(nid: str, user: dict = Depends(get_current_user)):
    sb().table("notifications").update({"is_read": True}).eq("id", nid).eq("user_id", user["id"]).execute()
    return {"ok": True}

# ---------- REPORTS (CSV export; PDF/XLSX via same data) ----------
@router.get("/reports/complaints.csv")
def report_csv(user: dict = Depends(require_min_role("dept_admin"))):
    rows = (sb().table("complaints").select("complaint_code,title,status,priority,created_at,sla_due_at")
            .eq("org_id", user["org_id"]).limit(5000).execute().data or [])
    buf = io.StringIO(); w = csv.DictWriter(buf, fieldnames=["complaint_code","title","status","priority","created_at","sla_due_at"])
    w.writeheader(); w.writerows(rows)
    return Response(buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": "attachment; filename=complaints.csv"})

@router.get("/audit")
def audit_list(user: dict = Depends(require_min_role("org_admin")), limit: int = 100):
    return (sb().table("audit_logs").select("*").eq("org_id", user["org_id"])
            .order("created_at", desc=True).limit(limit).execute().data or [])

# ---------- CHATBOT ----------
class ChatIn(BaseModel):
    message: str

@router.post("/chat")
def chat(body: ChatIn, user: dict = Depends(get_current_user)):
    text = body.message.lower()
    sb().table("chat_messages").insert({"org_id": user["org_id"], "user_id": user["id"],
        "role": "user", "content": body.message}).execute()
    if any(k in text for k in ("status", "track", "complaint")):
        rows = (sb().table("complaints").select("complaint_code,status").eq("citizen_id", user["id"])
                .order("created_at", desc=True).limit(3).execute().data or [])
        reply = ("Your recent complaints: " + "; ".join(f"{r['complaint_code']} → {r['status']}" for r in rows)) if rows else "You have no complaints yet. Tap 'Report Issue' to file one."
    elif any(k in text for k in ("report", "file", "new")):
        reply = "To report: open Report Issue → add photo → confirm GPS → choose category → submit. I auto-route it to the right department."
    elif any(k in text for k in ("reward", "point")):
        reply = "You earn 10 points per verified report. Check Rewards tab for balance."
    elif any(k in text for k in ("garbage", "pothole", "water", "light", "drain")):
        reply = "Got it — file it under the matching category and I'll prioritize by severity and nearby duplicates."
    elif any(k in text for k in ("human", "officer", "call", "help")):
        reply = "Connecting you: your reports go to the department admin. For emergencies call your local civic helpline."
    else:
        reply = ("I'm the Civic Guard assistant. Ask me to track complaints, explain categories, "
                 "rewards, or how to report an issue.")
    sb().table("chat_messages").insert({"org_id": user["org_id"], "user_id": user["id"],
        "role": "assistant", "content": reply}).execute()
    return {"reply": reply}
