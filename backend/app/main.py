from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from .core.config import settings
from .routers import complaints, admin, officer, misc

app = FastAPI(title="Civic Guard API", version="1.0.0")

_extra_origins = [o.strip() for o in (settings.FRONTEND_URL or "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(
        _extra_origins + ["http://localhost:3000", "http://127.0.0.1:3000"]
    )),
    # Accept any local dev port/host so 127.0.0.1-vs-localhost or :3001 never 400s a preflight.
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?",
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

app.include_router(complaints.router)
app.include_router(admin.router)
app.include_router(officer.router)
app.include_router(misc.router)

@app.get("/health")
def health():
    return {"ok": True, "env": settings.ENV}

# SLA watchdog: every 15 min escalate overdue
def sla_watchdog():
    try:
        from .core.supabase import sb
        from .services.sla import overdue_complaints, escalate_complaint
        orgs = sb().table("organizations").select("id").execute().data or []
        for o in orgs:
            for c in overdue_complaints(o["id"]):
                escalate_complaint(c)
    except Exception as e:
        print("SLA watchdog error:", e)

sched = BackgroundScheduler()
sched.add_job(sla_watchdog, "interval", minutes=15)
sched.start()
