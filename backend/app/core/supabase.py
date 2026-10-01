from supabase import create_client, Client
from .config import settings

_sb: Client | None = None

def sb() -> Client:
    global _sb
    if _sb is None:
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_KEY:
            raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_KEY not configured")
        _sb = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    return _sb

def one(query):
    """Run a select expected to return 0..1 rows; return the row dict or None (never raises)."""
    try:
        rows = query.limit(1).execute().data or []
        return rows[0] if rows else None
    except Exception:
        return None
