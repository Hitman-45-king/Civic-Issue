"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, isLiveBackendConfigured as isLive } from "@/lib/supabase";
import { getLocalComplaints, getLocalNotifications, type Complaint } from "@/lib/demoData";
import { useSession } from "@/lib/session";
import { Shell, CITIZEN_NAV, Stat, Card, Btn, Icon, PriorityBadge, SlaChip, EmptyState, StatusBadge, fmtDate } from "@/components/enterprise";

export default function CitizenDashboard() {
  const { name, loading: sessLoading } = useSession();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api("/complaints/mine")
      .then((d) => setComplaints(Array.isArray(d) ? d : getLocalComplaints()))
      .catch(() => setComplaints(isLive ? [] : getLocalComplaints()));
    try {
      setUnread(getLocalNotifications().filter((n) => !n.is_read).length);
      api("/notifications").then((n) => { if (Array.isArray(n)) setUnread(n.filter((x) => !x.is_read).length); }).catch(() => {});
    } catch {}
  }, []);

  const open = complaints.filter((c) => !["closed", "resolved", "rejected"].includes(c.status)).length;
  const resolved = complaints.filter((c) => ["closed", "resolved"].includes(c.status)).length;
  const needMe = complaints.filter((c) => c.status === "citizen_confirmation").length;
  const recent = [...complaints].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 6);

  return (
    <Shell nav={CITIZEN_NAV} roleLabel="Citizen Console" title={sessLoading ? "Overview" : `Welcome, ${name}`}
      subtitle="File reports, monitor progress and confirm completed work."
      actions={<Link href="/report"><Btn><Icon name="add" className="text-[18px]" /> New report</Btn></Link>}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total reports" value={complaints.length} icon="receipt_long" />
        <Stat label="In progress" value={open} sub="Active lifecycle cases" icon="pending_actions" tone="blue" />
        <Stat label="Resolved" value={resolved} sub="Closed with confirmation" icon="task_alt" tone="emerald" />
        <Stat label="Needs my confirmation" value={needMe} sub={unread ? `${unread} unread notifications` : "Resolved cases awaiting review"} icon="rate_review" tone="amber" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Recent complaints" subtitle="Latest filings and their live status"
          className="lg:col-span-2"
          action={<Link href="/track" className="text-[13px] font-medium text-blue-700 hover:underline">View all</Link>}>
          {recent.length === 0 ? (
            <EmptyState icon="receipt_long" title="No complaints yet"
              body="File your first report with a photo and GPS location. Triage routes it automatically."
              action={<Link href="/report"><Btn>Report an issue</Btn></Link>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-medium">Case ID</th><th className="py-2 pr-3 font-medium">Title</th>
                  <th className="py-2 pr-3 font-medium">Priority</th><th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">SLA</th>
                </tr></thead>
                <tbody>
                  {recent.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-slate-700">
                        <Link href={`/track/${c.id}`} className="hover:text-blue-700">{c.complaint_code}</Link>
                      </td>
                      <td className="max-w-[260px] truncate py-2.5 pr-3 text-slate-800">{c.title}</td>
                      <td className="py-2.5 pr-3"><PriorityBadge p={c.priority} /></td>
                      <td className="py-2.5 pr-3"><StatusBadge s={c.status} /></td>
                      <td className="py-2.5"><SlaChip due={c.sla_due_at} status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="Quick actions">
            <div className="grid gap-2">
              {[
                { href: "/report", icon: "add_box", t: "Report a new issue", s: "Photo, GPS and triage" },
                { href: "/track", icon: "timeline", t: "Track my complaints", s: "Timelines and confirmations" },
                { href: "/map", icon: "map", t: "Explore city map", s: "Nearby reports and hotspots" },
              ].map((a) => (
                <Link key={a.href} href={a.href} className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2.5 transition hover:border-slate-400 hover:bg-slate-50">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700"><Icon name={a.icon} className="text-[19px]" /></span>
                  <span><span className="block text-[13px] font-semibold text-slate-900">{a.t}</span>
                  <span className="block text-xs text-slate-500">{a.s}</span></span>
                  <Icon name="chevron_right" className="ml-auto text-[18px] text-slate-400" />
                </Link>
              ))}
            </div>
          </Card>
          <Card title="Account standing" subtitle="Cases currently open">
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-slate-500">Awaiting your confirmation</span><b>{needMe}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Oldest open case</span>
                <b>{complaints.length ? fmtDate([...complaints].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))[0].created_at) : "—"}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Unread notifications</span><b>{unread}</b></div>
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
