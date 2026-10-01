"""SLA escalation chain: officer -> dept_admin -> dept_head -> org_admin -> super_admin."""
from datetime import datetime, timezone
from ..core.supabase import sb
from ..core.security import notify

CHAIN = ["field_officer", "dept_admin", "dept_head", "org_admin", "super_admin"]

def overdue_complaints(org_id: str) -> list[dict]:
    now = datetime.now(timezone.utc).isoformat()
    return (sb().table("complaints").select("*").eq("org_id", org_id)
            .lt("sla_due_at", now)
            .not_.in_("status", ["closed", "resolved", "rejected", "citizen_confirmation"])
            .execute().data or [])

def escalate_complaint(complaint: dict, actor_id: str | None = None) -> dict:
    level = (complaint.get("escalation_level") or 0) + 1
    capped = min(level, len(CHAIN) - 1)
    sb().table("complaints").update({
        "escalation_level": capped, "status": "escalated",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", complaint["id"]).execute()
    sb().table("complaint_history").insert({
        "complaint_id": complaint["id"], "actor_id": actor_id,
        "from_status": complaint["status"], "to_status": "escalated",
        "note": f"SLA breached — escalated to {CHAIN[capped]}",
    }).execute()
    # notify next tier admins in same org+dept
    role = CHAIN[capped]
    q = sb().table("profiles").select("id").eq("org_id", complaint["org_id"])\
        .eq("role", role).eq("status", "active")
    if complaint.get("department_id") and role in ("dept_admin", "dept_head"):
        q = q.eq("department_id", complaint["department_id"])
    for u in (q.execute().data or []):
        notify(complaint["org_id"], u["id"],
               f"Escalation: {complaint['complaint_code']}",
               f"SLA breached, escalated to {role}.", complaint["id"])
    return {"escalation_level": capped, "escalated_to": role}
