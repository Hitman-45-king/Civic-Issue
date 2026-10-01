"use client";
import { useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, isLiveBackendConfigured as isLive } from "@/lib/supabase";
import { getLocalComplaints, updateLocalComplaint, type Complaint } from "@/lib/demoData";
import { Shell, ADMIN_NAV, Stat, Card, Btn, Tabs, Field, inputCls, Icon, PriorityBadge, SlaChip, EmptyState, Modal, Bar, StatusBadge, fmtDate } from "@/components/enterprise";

const DEPARTMENTS = [
  { id: "all", name: "All departments" },
  { id: "roads", name: "Roads & Infrastructure" },
  { id: "sani", name: "Sanitation & Waste" },
  { id: "elec", name: "Electricity & Streetlights" },
  { id: "water", name: "Water Supply" },
  { id: "drain", name: "Drainage & Sewerage" },
];

const OFFICERS = [
  { id: "off-1", name: "Rajesh Kumar — Roads Squad A", dept: "roads", zone: "Ring Road · Ward 4" },
  { id: "off-2", name: "Sunita Verma — Ward 14 Sanitation", dept: "sani", zone: "Ward 14 · Metro corridor" },
  { id: "off-3", name: "Anil Sharma — Grid Division", dept: "elec", zone: "Central grid · Wards 4–8" },
  { id: "off-4", name: "Mohan Lal — Emergency Pipeline Unit", dept: "water", zone: "East pipeline · Ward 19" },
  { id: "off-5", name: "Pooja Hegde — Sewer Jetting Team", dept: "drain", zone: "South drainage · Ward 12" },
];

const STATUSES = ["submitted", "under_verification", "verified", "assigned", "in_progress", "resolved", "escalated", "rejected", "closed"];

function AdminConsole() {
  const params = useSearchParams();
  const [tab, setTab] = useState("overview");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [dept, setDept] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [preset, setPreset] = useState("all");
  const [assigning, setAssigning] = useState<Complaint | null>(null);
  const [officerId, setOfficerId] = useState("");
  const [notice, setNotice] = useState("");
  const [advisory, setAdvisory] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);

  useEffect(() => { setTab(params.get("tab") || "overview"); }, [params]);
  useEffect(() => { load(); }, []);

  /** Flatten backend embeds (categories/departments/officer) onto the Complaint shape. */
  function normalizeAdmin(rows: any[]): Complaint[] {
    return rows.map((c) => ({
      ...c,
      category_name: c.category_name || c.categories?.name || "",
      department_name: c.department_name || c.departments?.name || "",
      dept_code: c.departments?.code || "",
      assigned_officer_name: c.assigned_officer_name || c.officer?.full_name || "",
    }));
  }

  function load() {
    api("/admin/complaints").then((d) => setComplaints(Array.isArray(d) ? normalizeAdmin(d) : getLocalComplaints())).catch(() => setComplaints(isLive ? [] : getLocalComplaints()));
    api("/admin/staff").then((d) => { if (Array.isArray(d)) setStaff(d); }).catch(() => {});
    api("/analytics/overview").then(setAnalytics).catch(() => {});
    api("/audit").then((d) => { if (Array.isArray(d)) setAudit(d); }).catch(() => {});
  }

  function flash(msg: string) { setNotice(msg); setTimeout(() => setNotice(""), 4000); }

  async function changeStatus(id: string, s: string) {
    try { await api(`/admin/complaints/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: s }) }); } catch {}
    updateLocalComplaint(id, { status: s as any });
    load();
    flash(`Case status updated to ${s.replaceAll("_", " ")}.`);
  }

  async function assign(pickId: string) {
    if (!assigning || !pickId) return;
    const off = OFFICERS.find((o) => o.id === pickId);
    try { await api(`/admin/complaints/${assigning.id}/assign`, { method: "PATCH", body: JSON.stringify({ officer_id: pickId }) }); } catch {}
    updateLocalComplaint(assigning.id, { status: "assigned" as any,       assigned_officer_id: pickId, assigned_officer_name: off?.name });
    load();
    flash(`Assigned ${assigning.complaint_code} to ${off?.name}.`);
    setAssigning(null);
  }

  async function escalate(id: string) {
    try { await api(`/admin/complaints/${id}/escalate`, { method: "POST" }); } catch {}
    updateLocalComplaint(id, { status: "escalated" as any });
    load();
    flash("Case escalated to the next tier.");
  }

  async function setStaffStatus(uid: string, s: string) {
    try { await api(`/admin/staff/${uid}?status=${s}`, { method: "PATCH" }); } catch {}
    setStaff((prev) => prev.map((p) => (p.id === uid ? { ...p, status: s } : p)));
    flash(`Staff account ${s}.`);
  }

  const stats = useMemo(() => ({
    total: complaints.length,
    pending: complaints.filter((c) => ["submitted", "under_verification"].includes(c.status)).length,
    active: complaints.filter((c) => ["verified", "assigned", "in_progress"].includes(c.status)).length,
    resolved: complaints.filter((c) => ["resolved", "closed", "citizen_confirmation"].includes(c.status)).length,
    critical: complaints.filter((c) => c.priority === "critical" && !["closed", "resolved"].includes(c.status)).length,
    escalated: complaints.filter((c) => c.status === "escalated").length,
  }), [complaints]);

  const SLA_RISK_MS = 6 * 3600 * 1000;
  const presetOk = (c: Complaint) =>
    preset === "all" ? true :
    preset === "unassigned" ? (!c.assigned_officer_id && ["submitted", "under_verification", "verified"].includes(c.status)) :
    preset === "sla" ? (!!c.sla_due_at && !["closed", "resolved", "rejected"].includes(c.status) &&
      new Date(c.sla_due_at).getTime() - Date.now() < SLA_RISK_MS) :
    ["resolved", "citizen_confirmation"].includes(c.status);

  const filtered = complaints.filter((c) =>
    presetOk(c) &&
    (dept === "all" || (c as any).dept_code === dept || (c.department_id || "").includes(dept)) &&
    (status === "all" || c.status === status) &&
    (!q || c.title.toLowerCase().includes(q.toLowerCase()) || c.complaint_code.toLowerCase().includes(q.toLowerCase())));

  /** Rank officers for the case being assigned: same department (coverage zone) first, then lightest active caseload. */
  const rankedOfficers = useMemo(() => {
    if (!assigning) return [];
    const activeLoad = (id: string) => complaints.filter((c) =>
      c.assigned_officer_id === id && !["resolved", "closed", "citizen_confirmation", "rejected"].includes(c.status)).length;
    return OFFICERS.map((o) => ({ ...o, load: activeLoad(o.id), near: (assigning.department_id || "").includes(o.dept) }))
      .sort((a, b) => Number(b.near) - Number(a.near) || a.load - b.load);
  }, [assigning, complaints]);

  return (
    <Shell nav={ADMIN_NAV} roleLabel="Admin Console" title="Operations overview"
      subtitle="Verify intake, dispatch field units, enforce SLAs and govern staff."
      actions={<><Btn variant="secondary" onClick={() => { load(); flash("Data synchronized."); }}><Icon name="sync" className="text-[18px]" /> Sync</Btn>
        <Btn variant="danger" onClick={() => setAdvisory(!advisory)}><Icon name="campaign" className="text-[18px]" /> Advisory</Btn></>}>
      {advisory && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <Icon name="warning" className="text-rose-700" />
            <div><b className="text-sm text-rose-900">City advisory active</b>
            <p className="text-[13px] text-rose-700">Hazard alert broadcast for Ward 04 and Ward 11 drainage corridors.</p></div>
          </div>
          <Btn variant="secondary" onClick={() => setAdvisory(false)}>Dismiss</Btn>
        </div>
      )}
      {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-900">{notice}</div>}

      <Tabs tabs={[
        { id: "overview", label: "Overview" },
        { id: "complaints", label: "Complaints", count: filtered.length },
        { id: "staff", label: "Staff & officers", count: staff.length || OFFICERS.length },
        { id: "audit", label: "Audit log", count: audit.length || undefined },
      ]} active={tab} onChange={setTab} />

      {tab === "overview" && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Stat label="Total cases" value={stats.total} icon="inbox" />
            <Stat label="Pending triage" value={stats.pending} icon="pending" tone="amber" />
            <Stat label="Active fieldwork" value={stats.active} icon="engineering" tone="blue" />
            <Stat label="Resolved" value={stats.resolved} icon="task_alt" tone="emerald" />
            <Stat label="Critical open" value={stats.critical} icon="crisis_alert" tone="rose" />
            <Stat label="Escalated" value={stats.escalated} icon="trending_up" tone="rose" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Cases by status" subtitle="Live distribution across the lifecycle">
              <div className="space-y-2.5">
                {STATUSES.map((s) => {
                  const v = complaints.filter((c) => c.status === s).length;
                  return <Bar key={s} label={s.replaceAll("_", " ")} value={v} max={Math.max(1, stats.total)} />;
                })}
              </div>
            </Card>
            <Card title="Attention queue" subtitle="Critical and escalated cases needing action"
              action={<button onClick={() => setTab("complaints")} className="text-[13px] font-medium text-blue-700 hover:underline">Open queue</button>}>
              {complaints.filter((c) => c.priority === "critical" || c.status === "escalated").slice(0, 5).map((c) => (
                <Link key={c.id} href={`/track/${c.id}`} className="flex items-center justify-between border-b border-slate-100 py-2 text-[13px] last:border-0">
                  <span><b className="font-mono text-xs">{c.complaint_code}</b> <span className="text-slate-600">{c.title.slice(0, 48)}</span></span>
                  <PriorityBadge p={c.priority} />
                </Link>
              ))}
              {complaints.filter((c) => c.priority === "critical" || c.status === "escalated").length === 0 &&
                <p className="text-[13px] text-slate-500">No critical or escalated cases. Operations nominal.</p>}
            </Card>
          </div>
        </div>
      )}

      {tab === "complaints" && (
        <Card className="mt-4" title="Complaint register" subtitle={`${filtered.length} of ${complaints.length} cases`}>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {[["all", "All cases"], ["unassigned", "Needs assignment"], ["sla", "SLA risk < 6h"], ["closure", "Awaiting closure"]].map(([id, label]) => (
              <button key={id} onClick={() => setPreset(id)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${preset === id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-slate-600 hover:border-slate-500"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="mb-3 grid gap-2 md:grid-cols-4">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID, title, ward…" className={inputCls} />
            <select value={dept} onChange={(e) => setDept(e.target.value)} className={inputCls}>
              {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              <option value="all">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
            </select>
            <a href="/report"><Btn variant="secondary" className="w-full">Manual intake</Btn></a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3 font-medium">Case</th><th className="py-2 pr-3 font-medium">Priority</th>
                <th className="py-2 pr-3 font-medium">Status</th><th className="py-2 pr-3 font-medium">Officer</th>
                <th className="py-2 pr-3 font-medium">SLA</th><th className="py-2 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 align-top last:border-0 hover:bg-slate-50">
                    <td className="py-2.5 pr-3">
                      <Link href={`/track/${c.id}`} className="font-mono text-xs font-semibold text-blue-700 hover:underline">{c.complaint_code}</Link>
                      <span className="block max-w-[280px] truncate text-slate-800">{c.title}</span>
                      <span className="block text-xs text-slate-400">{c.category_name} · {fmtDate(c.created_at)}</span>
                    </td>
                    <td className="py-2.5 pr-3"><PriorityBadge p={c.priority} /></td>
                    <td className="py-2.5 pr-3"><StatusBadge s={c.status} /></td>
                    <td className="max-w-[160px] truncate py-2.5 pr-3 text-slate-600">{c.assigned_officer_name || "Unassigned"}</td>
                    <td className="py-2.5 pr-3"><SlaChip due={c.sla_due_at} status={c.status} /></td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {["resolved", "citizen_confirmation"].includes(c.status) && (
                          <button onClick={() => changeStatus(c.id, "closed")} className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">Verify & close</button>
                        )}
                        <select defaultValue="" onChange={(e) => { if (e.target.value) changeStatus(c.id, e.target.value); e.target.value = ""; }}
                          className="rounded border border-slate-300 px-1.5 py-1 text-xs" title="Change status">
                          <option value="">Set status…</option>
                          {STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
                        </select>
                        <button onClick={() => { setAssigning(c); setOfficerId(""); }} className="rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100">Assign</button>
                        <button onClick={() => escalate(c.id)} className="rounded border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50">Escalate</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <EmptyState icon="inbox" title="No cases match" body="Adjust filters to widen the register view." />}
          </div>
        </Card>
      )}

      {tab === "staff" && (
        <Card className="mt-4" title="Staff and field officers" subtitle="Suspend or reinstate accounts to control console access.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-[13px]">
              <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3 font-medium">Name</th><th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Employee ID</th><th className="py-2 pr-3 font-medium">Status</th><th className="py-2 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {(staff.length ? staff : OFFICERS.map((o) => ({ id: o.id, full_name: o.name, role: "field_officer", employee_id: o.id.toUpperCase(), status: "active" }))).map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="py-2.5 pr-3 font-medium text-slate-900">{p.full_name || p.name}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{(p.role || "").replaceAll("_", " ")}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-slate-600">{p.employee_id || "—"}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`rounded border px-2 py-0.5 text-[11px] font-semibold uppercase ${p.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : p.status === "pending" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-100 text-slate-600"}`}>{p.status}</span>
                    </td>
                    <td className="py-2.5">
                      <div className="flex gap-1">
                        {p.status !== "active" && <button onClick={() => setStaffStatus(p.id, "active")} className="rounded border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50">Approve</button>}
                        {p.status === "active" && <button onClick={() => setStaffStatus(p.id, "suspended")} className="rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100">Suspend</button>}
                        {p.status === "suspended" && <button onClick={() => setStaffStatus(p.id, "active")} className="rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100">Reinstate</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "audit" && (
        <Card className="mt-4" title="Audit log" subtitle="Administrative actions with actor, change and timestamp.">
          {audit.length === 0 ? (
            <EmptyState icon="history" title="No audit events via API"
              body="Connect the backend to stream live audit events. Local demo actions are applied directly to the register." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-medium">Time</th><th className="py-2 pr-3 font-medium">Action</th>
                  <th className="py-2 pr-3 font-medium">Entity</th><th className="py-2 font-medium">Actor</th>
                </tr></thead>
                <tbody>{audit.map((a: any) => (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 text-slate-500">{fmtDate(a.created_at)}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{a.action}</td>
                    <td className="py-2 pr-3">{a.entity}:{a.entity_id?.slice(0, 8)}</td>
                    <td className="py-2 font-mono text-xs">{a.actor_id?.slice(0, 8) || "system"}</td>
                  </tr>))}</tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {assigning && (
        <Modal title={`Dispatch ${assigning.complaint_code}`} onClose={() => setAssigning(null)}>
          <p className="mb-3 text-[13px] text-slate-500">Ranked by coverage match, then lightest active caseload. The top officer covers the nearest zone.</p>
          <div className="space-y-2">
            {rankedOfficers.map((o, i) => (
              <label key={o.id} className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-[13px] transition ${officerId === o.id ? "border-slate-900 bg-slate-50" : "border-slate-200 hover:border-slate-400"}`}>
                <input type="radio" name="officer" checked={officerId === o.id} onChange={() => setOfficerId(o.id)} />
                <span className="flex-1">
                  <b className="block font-semibold text-slate-900">{o.name}</b>
                  <span className="text-xs text-slate-500">{o.zone} · {o.load} active</span>
                </span>
                {i === 0 && <span className="rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">NEAREST AVAILABLE</span>}
                {o.near && i !== 0 && <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">SAME DEPT</span>}
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Btn variant="secondary" onClick={() => setAssigning(null)}>Cancel</Btn>
            {rankedOfficers[0] && <Btn variant="secondary" onClick={() => assign(rankedOfficers[0].id)}>Auto-assign nearest</Btn>}
            <Btn onClick={() => assign(officerId)} disabled={!officerId}>Confirm assignment</Btn>
          </div>
        </Modal>
      )}
    </Shell>
  );
}

export default function AdminPage() {
  return <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading console…</div>}><AdminConsole /></Suspense>;
}
