import Link from "next/link";
import { Logo, Icon } from "@/components/enterprise";

const MODULES = [
  { icon: "assignment_add", title: "Intake & AI triage", body: "Photo, GPS and category capture with automatic severity scoring and duplicate detection." },
  { icon: "route", title: "Smart dispatch", body: "Department routing and officer assignment by location, skill and live workload." },
  { icon: "timer", title: "SLA enforcement", body: "Per-category deadlines with a five-tier escalation chain and breach alerts." },
  { icon: "map", title: "GIS operations map", body: "Ward-level complaint geography, hotspot clustering and coverage planning." },
  { icon: "fact_check", title: "Citizen confirmation", body: "Resolved work is verified by the reporting citizen before a case can close." },
  { icon: "monitoring", title: "Analytics & audit", body: "Resolution, SLA and satisfaction reporting with a full administrative audit trail." },
];

const ROLES = [
  { href: "/citizen", icon: "person", title: "Citizen Portal", body: "File reports, track status and confirm completed fixes.", cta: "Open citizen dashboard" },
  { href: "/admin", icon: "admin_panel_settings", title: "Administration", body: "Verify, dispatch, escalate and govern the full complaint lifecycle.", cta: "Open admin console" },
  { href: "/officer", icon: "engineering", title: "Field Operations", body: "Task queue, navigation, progress notes and resolution proof.", cta: "Open officer workspace" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Logo />
          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Sign in</Link>
            <Link href="/signup" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Create account</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="grid gap-10 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Municipal issue management platform</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">Civic issues reported, dispatched and resolved — on record.</h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-slate-600">
              Civic Guard connects citizens, administrators and field officers in one audited workflow:
              every complaint carries an ID, an SLA clock, a responsible department and a verifiable resolution.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/signup" className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700">Get started</Link>
              <Link href="/login" className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Sign in to console</Link>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-slate-200 pt-6">
              {[["11", "Lifecycle states"], ["5-tier", "SLA escalation"], ["100%", "Audit coverage"]].map(([v, l]) => (
                <div key={l}><dt className="text-2xl font-bold text-slate-900">{v}</dt><dd className="text-xs text-slate-500">{l}</dd></div>
              ))}
            </dl>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">How a complaint moves</p>
            <ol className="mt-3 space-y-0">
              {["Citizen files report with photo and GPS", "AI triage assigns category, severity and SLA", "Admin verifies and dispatches field officer", "Officer resolves with photographic proof", "Citizen confirms — case closed and archived"].map((s, i) => (
                <li key={s} className="flex gap-3 border-l-2 border-slate-200 py-2.5 pl-4 last:border-0" style={{ marginLeft: 7 }}>
                  <span className="-ml-[25px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">{i + 1}</span>
                  <span className="text-sm text-slate-700">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-slate-200 py-12">
          <h2 className="text-lg font-bold text-slate-900">Consoles by role</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {ROLES.map((r) => (
              <Link key={r.href} href={r.href} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-700"><Icon name={r.icon} /></span>
                <h3 className="mt-3 text-[15px] font-semibold text-slate-900">{r.title}</h3>
                <p className="mt-1 text-[13px] text-slate-500">{r.body}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-blue-700">{r.cta} <Icon name="arrow_forward" className="text-[16px]" /></span>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 py-12">
          <h2 className="text-lg font-bold text-slate-900">Platform modules</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <div key={m.title} className="rounded-lg border border-slate-200 p-5">
                <Icon name={m.icon} className="text-slate-700" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900">{m.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{m.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-slate-500 sm:px-6">
          <span>Civic Guard Municipal Platform · Multi-tenant SaaS for cities, campuses and communities</span>
          <span>Secure · Audited · SLA-driven</span>
        </div>
      </footer>
    </div>
  );
}
