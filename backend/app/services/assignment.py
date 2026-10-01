"""Smart assignment: dept match -> region match -> lowest active workload."""
from ..core.supabase import sb

def pick_officer(org_id: str, department_id: str | None,
                 region_id: str | None = None) -> str | None:
    q = sb().table("profiles").select("id").eq("org_id", org_id)\
        .eq("role", "field_officer").eq("status", "active")
    if department_id:
        q = q.eq("department_id", department_id)
    officers = q.execute().data or []
    if not officers and department_id:
        officers = sb().table("profiles").select("id").eq("org_id", org_id)\
            .eq("role", "field_officer").eq("status", "active").execute().data or []
    if not officers:
        return None
    best, best_load = None, None
    for o in officers:
        load = sb().table("complaints").select("id", count="exact")\
            .eq("assigned_officer_id", o["id"])\
            .not_.in_("status", ["closed", "resolved", "rejected"]).execute().count or 0
        if best_load is None or load < best_load:
            best, best_load = o["id"], load
    return best
