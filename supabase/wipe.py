"""Civic Guard — full database reset (dev utility).

Wipes ALL transactional data + auth users so accounts can be recreated
from scratch. KEEPS config: organizations, departments, categories, regions.
Requires backend/.env with SUPABASE_URL + SUPABASE_SERVICE_KEY.
Prints row counts only — never secrets.
Usage:  python supabase/wipe.py   (run from repo root)
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def load_env(path):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env

env = load_env(os.path.join(ROOT, "backend", ".env"))
URL, KEY = env.get("SUPABASE_URL"), env.get("SUPABASE_SERVICE_KEY")
if not URL or not KEY:
    print("ERROR: SUPABASE_URL / SUPABASE_SERVICE_KEY missing in backend/.env")
    sys.exit(1)

from supabase import create_client
sb = create_client(URL, KEY)

CHILD_TABLES = [
    "complaint_supports",   # composite key -> filter on complaint_id
    "complaint_images",
    "complaint_history",
    "reward_transactions",
    "notifications",
    "audit_logs",
    "login_activity",
    "chat_messages",
    "complaints",
    "profiles",
]
DUMMY = "00000000-0000-0000-0000-000000000000"

def count(table, col="id"):
    try:
        return sb.table(table).select(col, count="exact").limit(0).execute().count or 0
    except Exception as e:
        return f"ERR {e}"

print("--- before ---")
before = {}
for t in CHILD_TABLES + ["organizations", "departments", "categories"]:
    col = "complaint_id" if t == "complaint_supports" else "id"
    before[t] = count(t, col)
    print(f"{t}: {before[t]}")

print("--- wiping ---")
for t in CHILD_TABLES:
    col = "complaint_id" if t == "complaint_supports" else "id"
    try:
        sb.table(t).delete().neq(col, DUMMY).execute()
        print(f"wiped {t}")
    except Exception as e:
        print(f"FAILED {t}: {e}")

# storage objects
for bucket in ("complaint-photos", "avatars", "resolution-proofs"):
    try:
        objs = sb.storage.from_(bucket).list()
        paths = [o["name"] for o in objs] if objs else []
        if paths:
            sb.storage.from_(bucket).remove(paths)
        print(f"bucket {bucket}: removed {len(paths)} objects")
    except Exception as e:
        print(f"bucket {bucket}: {e}")

# auth users (so the same emails can sign up again from scratch)
try:
    users = sb.auth.admin.list_users().users or []
    for u in users:
        sb.auth.admin.delete_user(u.id)
    print(f"deleted {len(users)} auth users")
except Exception as e:
    print(f"auth wipe failed: {e}")

print("--- after ---")
for t in CHILD_TABLES:
    col = "complaint_id" if t == "complaint_supports" else "id"
    print(f"{t}: {count(t, col)}")
print("KEPT organizations/departments/categories (config needed by signup).")
print("RESET COMPLETE")
