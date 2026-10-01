# Civic Guard 🛡️ — Smart Civic Issue Reporting & Management

Production-ready municipal platform: **Next.js 14 (citizen + admin + officer) + FastAPI + Supabase (Postgres + PostGIS + Auth + Storage).**

## Architecture

```
Next.js (frontend/) ──Supabase Auth (OTP/JWT)──┐
        │ REST (JWT)                           ▼
        └──────────► FastAPI (backend/) ──► Supabase Postgres + Storage
                        │ AI engine · duplicate detection · smart assignment · SLA watchdog · chatbot
```

### Complete Route Map
- `/` — Citizen Home with live municipal stats & quick triage actions
- `/report` — Multi-step reporting wizard with GPS auto-locate, photo upload, live AI classifier & duplicate alert
- `/track` & `/track/[id]` — Real-time incident tracker with before/after resolution proof, live audit timeline & 5-star citizen review
- `/map` — Interactive Leaflet GIS map with custom category markers, urgency auras, status filters & incident drawer
- `/analytics` — Public transparency portal with Recharts (inflow vs. velocity, category donut, department SLA compliance, ward health scorecard)
- `/rewards` — Citizen impact hub with points wallet, voucher marketplace (transit passes, parking, tax rebates), badges & community leaderboard
- `/officer` — Mobile field squad console with Google Maps navigation, work notes, and resolution proof attachment
- `/admin` — Central triage desk with KPI cards, department workload filters, dispatch modal, and CSV exports
- Floating **Civic Guard AI Assistant** (`Chatbot.tsx`) on every page with quick suggestion chips and intelligent municipal routing answers

---

## 1. Supabase setup (10 min)

1. Create project at supabase.com → copy **URL**, **anon key**, **service_role key**, **JWT secret** (Project Settings → API).
2. Enable extensions: `postgis` (Database → Extensions).
3. SQL Editor → run `supabase/migrations/001_initial_schema.sql`, then `supabase/seed.sql`.
4. Auth → enable **Email OTP / magic link**. Add `http://localhost:3000` to redirect URLs.
5. Storage buckets are created by the migration (`complaint-photos` public, `avatars` public, `resolution-proofs` private).

## 2. Backend (FastAPI)

```powershell
cd backend
python -m venv .venv; .\.venv\Scripts\Activate
pip install -r requirements.txt
copy .env.example .env   # fill Supabase keys
uvicorn app.main:app --reload --port 8000
```

Health: http://localhost:8000/health · Docs: http://localhost:8000/docs

## 3. Frontend (Next.js)

```powershell
cd frontend
npm install
copy .env.example .env.local   # fill Supabase URL/anon + API URL
npm run dev   # http://localhost:3000
```

> **Note on Zero-Config Demo Mode**: Civic Guard includes an offline-resilient demo state provider. You can run `npm run dev` and explore the entire platform (reporting issues, tracking timelines, inspecting Leaflet maps, redeeming vouchers, dispatching officers) immediately even before connecting cloud credentials.

---

## Role Flows

- **Citizen**: OTP login / 1-click demo → Report (GPS + photo + AI auto-categorization + duplicate check) → Track live timeline → Confirm resolution → Redeem vouchers in Rewards hub.
- **Admin/staff**: Central triage desk (`/admin`) → Filter by department/SLA risk → Dispatch squad → Escalate overdue issues → Export municipal CSV reports.
- **Field Officer**: `/officer` mobile task list → One-tap Google Maps route → Start work → Attach resolution proof photo → Trigger citizen review.

## SLA Watchdog

APScheduler runs every 15 min, escalating overdue complaints:
`field_officer → dept_admin → dept_head → org_admin → super_admin` with notifications.
