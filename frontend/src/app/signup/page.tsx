"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, api } from "@/lib/supabase";
import { setActiveRole } from "@/lib/demoData";
import { homeFor, type AppRole } from "@/lib/session";
import { Logo, Field, Icon, inputCls, Btn, Modal } from "@/components/enterprise";

type RoleKey = "citizen" | "field_officer" | "admin";

const ROLE_CARDS: { id: RoleKey; icon: string; title: string; body: string; access: string }[] = [
  { id: "citizen", icon: "person", title: "Citizen", body: "Report issues, track resolution, confirm fixes.", access: "Instant access after email verification" },
  { id: "field_officer", icon: "engineering", title: "Field Officer", body: "Execute assigned field tasks with proof uploads.", access: "Instant access — employee ID recorded for audit" },
  { id: "admin", icon: "admin_panel_settings", title: "Administrator", body: "Verify, dispatch, escalate and govern operations.", access: "Instant access — official email required" },
];

const ADMIN_ROLES = [
  { v: "dept_admin", l: "Department Admin — manage complaints and officers in one department" },
  { v: "dept_head", l: "Department Head — approve escalations and department performance" },
  { v: "org_admin", l: "Organization Admin — manage departments, staff and configuration" },
];

const FALLBACK_DEPTS = [
  { id: "dept-roads", name: "Roads & Infrastructure" },
  { id: "dept-water", name: "Water Supply" },
  { id: "dept-elec", name: "Electricity & Streetlights" },
  { id: "dept-sani", name: "Sanitation & Garbage" },
  { id: "dept-drain", name: "Drainage & Sewerage" },
];

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<RoleKey>("citizen");
  const [depts, setDepts] = useState(FALLBACK_DEPTS);
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", employeeId: "", deptId: "", adminRole: "dept_admin", orgCode: "demo-municipality", idRef: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [created, setCreated] = useState<null | {
    name: string; email: string; roleKey: AppRole; roleLabel: string; needsEmail: boolean;
  }>(null);

  useEffect(() => {
    api("/meta/departments").then((d) => { if (Array.isArray(d) && d.length) setDepts(d); }).catch(() => {});
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(""); setCreated(null);
    const staffRole = role === "citizen" ? "citizen" : role === "field_officer" ? "field_officer" : f.adminRole;
    const intent = { full_name: f.name, phone: f.phone, role: staffRole,
      employee_id: f.employeeId || undefined, department_id: f.deptId || undefined };
    try {
      // Saved so first login can replay profile creation if email confirmation delays the session.
      try { localStorage.setItem("cg_signup_intent", JSON.stringify(intent)); } catch {}
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
      const { data, error } = await supabase.auth.signUp({
        email: f.email, password: f.password,
        options: { data: { full_name: f.name }, ...(redirectTo ? { emailRedirectTo: redirectTo } : {}) },
      });
      if (error) throw error;
      const session = data.session;
      if (session?.access_token) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/auth/ensure-profile`, {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify(intent),
          });
          if (res.ok) { try { localStorage.removeItem("cg_signup_intent"); } catch {} }
        } catch { /* backend down: healed on first login */ }
      }
      const appRole = staffRole as AppRole;
      setCreated({ name: f.name, email: f.email, roleKey: appRole,
        roleLabel: role === "citizen" ? "Citizen" : role === "field_officer" ? "Field Officer" : "Administrator",
        needsEmail: !session });
    } catch (e: any) {
      setErr(e.message || "Signup failed.");
    }
    setBusy(false);
  }

  function proceed() {
    if (!created || created.needsEmail) return;
    setActiveRole(created.roleKey === "citizen" ? "citizen" : created.roleKey === "field_officer" ? "officer" : "admin");
    router.push(homeFor(created.roleKey));
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <div className="mx-auto w-full max-w-2xl px-4">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Create your account</h1>
          <p className="mt-1 text-[13px] text-slate-500">Select a role. All roles get immediate access on signup.</p>

          <div className="mt-5 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Account role">
            {ROLE_CARDS.map((r) => (
              <button key={r.id} type="button" onClick={() => setRole(r.id)}
                className={`rounded-lg border p-4 text-left transition ${role === r.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:border-slate-400"}`}>
                <Icon name={r.icon} />
                <span className="mt-2 block text-sm font-semibold">{r.title}</span>
                <span className={`mt-1 block text-xs leading-relaxed ${role === r.id ? "text-slate-300" : "text-slate-500"}`}>{r.body}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <Icon name="verified_user" className="text-[15px]" />
            {ROLE_CARDS.find((r) => r.id === role)?.access}
          </p>

          <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required><input required value={f.name} onChange={set("name")} className={inputCls} placeholder="Aarav Sharma" /></Field>
            <Field label="Email address" required hint={role === "citizen" ? "Any valid email." : "Use your official organization email."}>
              <input required type="email" value={f.email} onChange={set("email")} className={inputCls} placeholder="you@example.gov" />
            </Field>
            <Field label={role === "citizen" ? "Mobile number" : "Mobile number (optional)"} required={role === "citizen"}>
              <input required={role === "citizen"} value={f.phone} onChange={set("phone")} className={inputCls} placeholder="+91 98XXX XXXXX" />
            </Field>
            <Field label="Password" required hint="Minimum 8 characters.">
              <input required minLength={8} type="password" value={f.password} onChange={set("password")} className={inputCls} placeholder="••••••••" />
            </Field>

            {role !== "citizen" && (
              <>
                <Field label="Employee ID" required hint="As issued by your organization.">
                  <input required value={f.employeeId} onChange={set("employeeId")} className={inputCls} placeholder="EMP-2026-0142" />
                </Field>
                <Field label="Department" required>
                  <select required value={f.deptId} onChange={set("deptId")} className={inputCls}>
                    <option value="">Select department…</option>
                    {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </Field>
                <Field label="Identity reference" hint="Official ID card / authorization letter number.">
                  <input value={f.idRef} onChange={set("idRef")} className={inputCls} placeholder="ID-XXXX-XXXX (optional)" />
                </Field>
                {role === "admin" ? (
                  <Field label="Administrator role" required>
                    <select value={f.adminRole} onChange={set("adminRole")} className={inputCls}>
                      {ADMIN_ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                    </select>
                  </Field>
                ) : (
                  <Field label="Organization code" required>
                    <input required value={f.orgCode} onChange={set("orgCode")} className={inputCls} placeholder="demo-municipality" />
                  </Field>
                )}
              </>
            )}

            {err && <p className="rounded-md bg-rose-50 px-3 py-2 text-[13px] text-rose-800 sm:col-span-2">{err}</p>}
            <div className="sm:col-span-2">
              <Btn type="submit" disabled={busy} className="w-full">
                {busy ? "Creating account…" : role === "citizen" ? "Create citizen account" : "Create staff account"}
              </Btn>
            </div>
          </form>

          <p className="mt-5 border-t border-slate-100 pt-4 text-center text-[13px] text-slate-500">
            Already registered? <Link href="/login" className="font-medium text-blue-700 hover:underline">Sign in</Link>
          </p>

          {created && (
            <Modal title={created.needsEmail ? "Verify your email" : "Account created"}
              onClose={() => { if (created.needsEmail) setCreated(null); else proceed(); }}>
              <div className="text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <Icon name={created.needsEmail ? "mark_email_read" : "check_circle"} />
                </span>
                {created.needsEmail ? (
                  <>
                    <p className="mt-3 text-sm leading-relaxed text-slate-700">
                      Account <b>{created.email}</b> created. A verification link was sent to your inbox —
                      open it, then sign in. Your <b>{created.roleLabel}</b> access activates on first sign-in.
                    </p>
                    <div className="mt-4 flex justify-center gap-2">
                      <Btn variant="secondary" onClick={() => setCreated(null)}>Stay here</Btn>
                      <Btn onClick={() => router.push("/login")}>Go to sign in</Btn>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-sm text-slate-700">Welcome, <b>{created.name}</b>.</p>
                    <dl className="mx-auto mt-3 max-w-xs space-y-1.5 rounded-md border border-slate-200 bg-slate-50 p-3 text-left text-[13px]">
                      <div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd className="font-medium">{created.email}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Role</dt><dd className="font-medium">{created.roleLabel}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="font-medium text-emerald-700">Active</dd></div>
                    </dl>
                    <Btn className="mt-4 w-full" onClick={proceed}>Continue to {created.roleLabel} console</Btn>
                  </>
                )}
              </div>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
}
