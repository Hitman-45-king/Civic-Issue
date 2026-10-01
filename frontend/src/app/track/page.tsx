"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, isLiveBackendConfigured as isLive } from "@/lib/supabase";
import { getLocalComplaints, upvoteComplaint, type Complaint } from "@/lib/demoData";
import { Shell, CITIZEN_NAV, Card, Btn, Icon, inputCls, PriorityBadge, SlaChip, EmptyState, StatusBadge } from "@/components/enterprise";

export default function TrackPage() {
  const [rows, setRows] = useState<Complaint[]>([]);
  const [q, setQ] = useState("");
  const [f, setF] = useState("all");

  useEffect(() => {
    api("/complaints/mine").then((d) => setRows(Array.isArray(d) ? d : getLocalComplaints())).catch(() => setRows(isLive ? [] : getLocalComplaints()));
  }, []);

  const list = rows.filter((c) =>
    (!q || (c.title + c.complaint_code + (c.address || "")).toLowerCase().includes(q.toLowerCase())) &&
    (f === "all" || (f === "active" && !["resolved", "closed"].includes(c.status)) ||
     (f === "resolved" && ["resolved", "closed"].includes(c.status)) || (f === "attention" && ["escalated", "reopened", "citizen_confirmation"].includes(c.status))));

  return (
    <Shell nav={CITIZEN_NAV} roleLabel="Citizen Console" title="My complaints"
      subtitle="Live status, SLA clocks and confirmation requests."
      actions={<Link href="/report"><Btn><Icon name="add" className="text-[18px]" /> New report</Btn></Link>}>
      <Card>
        <div className="mb-3 grid gap-2 md:grid-cols-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ID, title, area…" className={inputCls} />
          <select value={f} onChange={(e) => setF(e.target.value)} className={inputCls}>
            <option value="all">All cases</option>
            <option value="active">Active</option>
            <option value="attention">Needs my attention</option>
            <option value="resolved">Resolved</option>
          </select>
          <span className="self-center text-[13px] text-slate-500">{list.length} of {rows.length} cases</span>
        </div>
        {list.length === 0 ? (
          <EmptyState icon="receipt_long" title="No cases found"
            body="File a report to start tracking, or clear the filters."
            action={<Link href="/report"><Btn>Report an issue</Btn></Link>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3 font-medium">Case</th><th className="py-2 pr-3 font-medium">Priority</th>
                <th className="py-2 pr-3 font-medium">Status</th><th className="py-2 pr-3 font-medium">SLA</th>
                <th className="py-2 font-medium">Community</th>
              </tr></thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="py-2.5 pr-3">
                      <Link href={`/track/${c.id}`} className="font-mono text-xs font-semibold text-blue-700 hover:underline">{c.complaint_code}</Link>
                      <span className="block max-w-[320px] truncate font-medium text-slate-900">{c.title}</span>
                      <span className="block max-w-[320px] truncate text-xs text-slate-500">{c.address}</span>
                    </td>
                    <td className="py-2.5 pr-3"><PriorityBadge p={c.priority} /></td>
                    <td className="py-2.5 pr-3"><StatusBadge s={c.status} /></td>
                    <td className="py-2.5 pr-3"><SlaChip due={c.sla_due_at} status={c.status} /></td>
                    <td className="py-2.5">
                      <button onClick={() => { if (isLive) { api(`/complaints/${c.id}/support`, { method: "POST" }).catch(() => {}); setRows(rows.map((r) => r.id === c.id ? { ...r, upvotes: (r.upvotes || 0) + 1 } : r)); } else { const v = upvoteComplaint(c.id); setRows(rows.map((r) => r.id === c.id ? { ...r, upvotes: v } : r)); } }}
                        className="rounded border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-100">Support · {c.upvotes}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Shell>
  );
}
