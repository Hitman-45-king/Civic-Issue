"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import StatusBadge from "./StatusBadge";

export function SignOutBtn() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button disabled={busy}
      onClick={async () => {
        setBusy(true);
        try { await supabase.auth.signOut(); } catch {}
        try { localStorage.removeItem("cg_signup_intent"); } catch {}
        router.push("/login");
        router.refresh();
      }}
      className="rounded-md border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}

/* ---------- icons (material symbols, no emoji) ---------- */
export function Icon({ name, className = "text-[18px]" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white">
        <Icon name="shield" className="text-[20px]" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[14px] font-bold tracking-tight text-slate-900">Civic Guard</span>
          <span className="block text-[10px] font-medium uppercase tracking-widest text-slate-500">Municipal Operations</span>
        </span>
      )}
    </Link>
  );
}

/* ---------- dashboard shell ---------- */
export interface NavItem { href: string; label: string; icon: string; }

export const CITIZEN_NAV: NavItem[] = [
  { href: "/citizen", label: "Overview", icon: "dashboard" },
  { href: "/report", label: "Report Issue", icon: "add_box" },
  { href: "/track", label: "My Complaints", icon: "receipt_long" },
  { href: "/map", label: "City Map", icon: "map" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "dashboard" },
  { href: "/admin?tab=complaints", label: "Complaints", icon: "inbox" },
  { href: "/admin?tab=staff", label: "Staff & Officers", icon: "group" },
  { href: "/analytics", label: "Analytics", icon: "bar_chart" },
  { href: "/admin?tab=audit", label: "Audit Log", icon: "history" },
];

export const OFFICER_NAV: NavItem[] = [
  { href: "/officer", label: "My Tasks", icon: "assignment" },
  { href: "/map", label: "Field Map", icon: "map" },
  { href: "/track", label: "All Incidents", icon: "receipt_long" },
];

export function Shell({ nav, title, subtitle, actions, children, roleLabel }:
  { nav: NavItem[]; title: string; subtitle?: string; actions?: React.ReactNode;
    children: React.ReactNode; roleLabel: string; }) {
  const path = usePathname();
  return (
    <div className="min-h-screen bg-slate-100">
      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
          <Logo />
          <span className="hidden rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-600 sm:inline">
            {roleLabel}
          </span>
          <nav className="ml-2 hidden items-center gap-1 lg:flex">
            {nav.map((n) => {
              const active = path === n.href.split("?")[0] && (n.href === path || !n.href.includes("?") || path === "/admin" || path === "/officer" || path === "/citizen");
              return (
                <Link key={n.href} href={n.href}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                    active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
                  <Icon name={n.icon} className="text-[17px]" />{n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <SignOutBtn />
          </div>
        </div>
        {/* mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 lg:hidden">
          {nav.map((n) => (
            <Link key={n.href} href={n.href}
              className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100">
              <Icon name={n.icon} className="text-[17px]" />{n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="mt-0.5 text-[13px] text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}

/* ---------- cards & stats ---------- */
export function Card({ title, subtitle, action, children, className = "" }:
  { title?: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            {title && <h2 className="text-[14px] font-semibold text-slate-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, icon, tone = "slate" }:
  { label: string; value: React.ReactNode; sub?: string; icon: string; tone?: "slate" | "blue" | "amber" | "rose" | "emerald"; }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700", blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700",
  };
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-md ${tones[tone]}`}><Icon name={icon} /></span>
      </div>
      <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

/* ---------- forms ---------- */
export const inputCls = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600";

export function Field({ label, hint, children, required }: { label: string; hint?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-slate-700">{label}{required && <span className="text-rose-600"> *</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Btn({ variant = "primary", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const v = {
    primary: "bg-slate-900 text-white hover:bg-slate-700",
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-rose-700 text-white hover:bg-rose-800",
    ghost: "text-blue-700 hover:bg-blue-50",
  }[variant];
  return <button {...p} className={`inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${v} ${className}`} />;
}

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; count?: number }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-[13px] font-medium transition ${
            active === t.id ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- data display ---------- */
export function PriorityBadge({ p }: { p?: string }) {
  const m: Record<string, string> = {
    critical: "bg-rose-100 text-rose-800 border-rose-200", high: "bg-amber-100 text-amber-800 border-amber-200",
    medium: "bg-blue-50 text-blue-700 border-blue-200", low: "bg-slate-100 text-slate-600 border-slate-200",
  };
  return <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${m[p || "medium"] || m.medium}`}>{p || "medium"}</span>;
}

export function SlaChip({ due, status }: { due?: string; status?: string }) {
  if (!due) return <span className="text-xs text-slate-400">—</span>;
  const done = ["closed", "resolved", "rejected"].includes(status || "");
  const ms = new Date(due).getTime() - Date.now();
  if (done) return <span className="text-xs text-slate-500">Closed</span>;
  if (ms < 0) return <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800"><Icon name="warning" className="text-[13px]" /> Overdue</span>;
  const h = Math.floor(ms / 3600000);
  const tone = h < 6 ? "text-rose-700 font-semibold" : h < 24 ? "text-amber-700" : "text-slate-600";
  return <span className={`text-xs ${tone}`}>{h < 48 ? `${h}h left` : `${Math.floor(h / 24)}d left`}</span>;
}

export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Icon name={icon} /></span>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-[13px] text-slate-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100"><Icon name="close" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function Bar({ label, value, max, tone = "bg-blue-600" }: { label: string; value: number; max: number; tone?: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs"><span className="font-medium text-slate-700">{label}</span><span className="text-slate-500">{value}</span></div>
      <div className="mt-1 h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${tone}`} style={{ width: `${max ? Math.round((value / max) * 100) : 0}%` }} /></div>
    </div>
  );
}

export function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function initials(name?: string) {
  return (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export { StatusBadge };
