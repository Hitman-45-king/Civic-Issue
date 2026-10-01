"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase, api, isLiveBackendConfigured } from "@/lib/supabase";
import { setActiveRole } from "@/lib/demoData";
import { homeFor, demoToAppRole, type AppRole } from "@/lib/session";
import { Logo, Field, Icon, inputCls, Btn } from "@/components/enterprise";

const FIX_SQL = `-- Run in Supabase SQL editor to link an existing auth account to a role.
-- Repeat per account, changing email / role / status as needed.
insert into public.profiles (id, org_id, role, status, full_name, email)
select u.id,
  (select id from public.organizations where slug = 'demo-municipality'),
  'org_admin',            -- citizen | field_officer | dept_admin | dept_head | org_admin
  'active',               -- all roles get immediate access; suspend later if needed
  'Admin Name',
  u.email
from auth.users u
where u.email = 'admin@example.gov'
on conflict (id) do update
  set role = excluded.role, status = excluded.status,
      full_name = excluded.full_name, email = excluded.email;`;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingRole, setPendingRole] = useState<AppRole | null>(null);

  /** Resolve console from the profiles table. Never fails silently. */
  async function routeByProfile(): Promise<{ role: AppRole; notice: string; blocked: boolean }> {
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) return { role: "citizen", notice: "Sign-in succeeded but no session was established.", blocked: true };
      const { data: prof, error } = await supabase.from("profiles").select("role,status").eq("id", uid).single();
      const missing = !!error || !prof?.role;
      if (error && !((error as any).code === "PGRST116" || /0 rows|no rows/i.test(error.message || ""))) {
        const msg = error.message || "query failed";
        return { role: "citizen", notice: `Role lookup failed: ${msg}. Check that the profiles table and its self-read RLS policy exist.`, blocked: false };
      }
      if (missing) {
        // Self-heal: email-confirmation signups create the session late, so the
        // profile may not exist yet — replay the stored signup intent once.
        try {
          const raw = localStorage.getItem("cg_signup_intent");
          if (raw) {
            const intent = JSON.parse(raw);
            const healed: any = await api("/auth/ensure-profile", { method: "POST",
              body: JSON.stringify({ ...intent, org_slug: "demo-municipality" }) });
            localStorage.removeItem("cg_signup_intent");
            if (healed?.role) {
              if (healed.status && healed.status !== "active") {
                try { await supabase.auth.signOut(); } catch {}
                return { role: "citizen", notice: `Account status is “${healed.status}”. You were signed out.`, blocked: true };
              }
              return { role: healed.role as AppRole, notice: "", blocked: false };
            }
          }
        } catch { /* fall through to the notice below */ }
        return { role: "citizen", notice: "This login has no role profile, so role could not be determined. Staff accounts created directly in Supabase Auth need a profiles row (SQL below).", blocked: false };
      }
      if (prof?.status && prof.status !== "active")
        return { role: "citizen", notice: `Account status is “${prof.status}”. You were signed out — contact an administrator.`, blocked: true };
      return { role: (prof as any).role as AppRole, notice: "", blocked: false };
    } catch (e: any) {
      return { role: "citizen", notice: `Role lookup failed (${e?.message || "network error"}).`, blocked: false };
    }
  }

  async function passwordLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(""); setNotice(""); setPendingRole(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const r = await routeByProfile();
      if (r.blocked) {
        try { await supabase.auth.signOut(); } catch {}
        setErr(r.notice);
      } else if (r.notice) {
        // Role unknown: explain, let the user choose to continue as Citizen.
        setNotice(r.notice);
        setPendingRole(r.role);
      } else {
        router.push(homeFor(r.role));
      }
    } catch (e: any) {
      setErr(e.message || "Sign in failed. Check credentials or use demo access.");
    }
    setBusy(false);
  }

  // Already signed in (e.g. just returned from an email link)? Route automatically.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          const r = await routeByProfile();
          if (!r.blocked && !r.notice) router.push(homeFor(r.role));
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendOtp() {
    if (!email) { setErr("Enter your email first."); return; }
    setBusy(true); setErr("");
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
    const { error } = await supabase.auth.signInWithOtp({ email, options: redirectTo ? { emailRedirectTo: redirectTo } : {} });
    setBusy(false);
    if (error) setErr(error.message);
    else setOtpSent(true);
  }

  function demoAs(d: "citizen" | "officer" | "admin") {
    setActiveRole(d);
    router.push(homeFor(demoToAppRole(d)));
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <div className="m-auto w-full max-w-md px-4 py-10">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">Sign in to Civic Guard</h1>
          <p className="mt-1 text-[13px] text-slate-500">Access is role-based. You will land in your assigned console.</p>
          <form onSubmit={passwordLogin} className="mt-5 space-y-4">
            <Field label="Email address" required>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.gov" className={inputCls} />
            </Field>
            <Field label="Password" required>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
            </Field>
            {err && <p className="rounded-md bg-rose-50 px-3 py-2 text-[13px] text-rose-800">{err}</p>}
            {notice && (
              <div className="rounded-md bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-900">
                {notice}
                {pendingRole && (
                  <button type="button" onClick={() => router.push(homeFor(pendingRole))}
                    className="mt-2 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
                    Continue to Citizen console anyway
                  </button>
                )}
              </div>
            )}
            {otpSent && <p className="rounded-md bg-blue-50 px-3 py-2 text-[13px] text-blue-800">Sign-in link sent. Check your inbox to continue.</p>}
            <Btn type="submit" disabled={busy} className="w-full">{busy ? "Signing in…" : "Sign in"}</Btn>
            <button type="button" onClick={sendOtp} disabled={busy} className="w-full text-center text-[13px] font-medium text-blue-700 hover:underline">
              Email me a sign-in link instead (passwordless)
            </button>
          </form>
          <div className="mt-5 border-t border-slate-100 pt-4 text-center text-[13px] text-slate-500">
            New here? <Link href="/signup" className="font-medium text-blue-700 hover:underline">Create an account</Link>
          </div>
        </div>

        <details className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <summary className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-slate-800">
            <Icon name="build" className="text-[17px]" /> Staff landing in the wrong console?
          </summary>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
            Every login needs a row in <code className="font-mono text-xs">public.profiles</code> linking the auth user to a role.
            Accounts created directly in Supabase Auth bypass the signup flow, so they have no role and default to Citizen.
            Run this in the Supabase SQL editor (once per account):
          </p>
          <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-slate-100">{FIX_SQL}</pre>
        </details>

        {!isLiveBackendConfigured && (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Evaluation access — no backend required</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <Btn variant="secondary" onClick={() => demoAs("citizen")}>Citizen</Btn>
              <Btn variant="secondary" onClick={() => demoAs("officer")}>Officer</Btn>
              <Btn variant="secondary" onClick={() => demoAs("admin")}>Admin</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
