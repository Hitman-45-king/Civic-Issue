"""JWT verification (Supabase Auth) + RBAC + audit helper."""
from fastapi import Header, HTTPException, Depends
from jose import jwt
from .config import settings
from .supabase import sb

# role hierarchy (higher = more power)
ROLE_RANK = {
    "citizen": 0, "field_officer": 1, "dept_admin": 2,
    "dept_head": 3, "org_admin": 4, "super_admin": 5,
}

def verify_access_token(authorization: str = "") -> tuple[str, str | None]:
    """Return (uid, email) for a Supabase access token.

    Fast path: local HS256 verification when SUPABASE_JWT_SECRET is configured.
    Fallback: server-side verification via Auth API (works with sb_secret keys,
    no JWT secret needed).
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization[7:]
    if settings.SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(token, settings.SUPABASE_JWT_SECRET,
                                 algorithms=["HS256"], audience="authenticated")
            if payload.get("sub"):
                return payload["sub"], payload.get("email")
        except Exception:
            pass  # fall through to server-side verification
    try:
        resp = sb().auth.get_user(token)
        user = resp.user if hasattr(resp, "user") else resp.get("user")
        uid = user.get("id") if isinstance(user, dict) else getattr(user, "id", None)
        email = user.get("email") if isinstance(user, dict) else getattr(user, "email", None)
        if not uid:
            raise ValueError("no uid")
        return uid, email
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(401, "Invalid or expired token")

def get_current_user(authorization: str = Header(default="")) -> dict:
    uid, _ = verify_access_token(authorization)
    try:
        rows = sb().table("profiles").select("*,organizations!inner(slug)").eq("id", uid).limit(1).execute().data or []
    except Exception:
        rows = []
    if not rows:
        raise HTTPException(401, "Profile not found")
    if rows[0].get("status") != "active":
        raise HTTPException(403, f"Account is {rows[0].get('status')}")
    return rows[0]

def require_roles(*roles: str):
    def dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(403, "Insufficient permissions")
        return user
    return dep

def require_min_role(role: str):
    def dep(user: dict = Depends(get_current_user)) -> dict:
        if ROLE_RANK.get(user["role"], -1) < ROLE_RANK.get(role, 99):
            raise HTTPException(403, "Insufficient permissions")
        return user
    return dep

def audit(org_id: str, actor_id: str | None, action: str, entity: str,
          entity_id: str | None = None, old=None, new=None, ip: str = ""):
    try:
        sb().table("audit_logs").insert({
            "org_id": org_id, "actor_id": actor_id, "action": action,
            "entity": entity, "entity_id": entity_id,
            "old_value": old, "new_value": new, "ip_address": ip,
        }).execute()
    except Exception:
        pass

def notify(org_id: str, user_id: str, title: str, body: str = "",
           complaint_id: str | None = None, channel: str = "in_app"):
    try:
        sb().table("notifications").insert({
            "org_id": org_id, "user_id": user_id, "title": title,
            "body": body, "complaint_id": complaint_id, "channel": channel,
        }).execute()
    except Exception:
        pass
