"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, isLiveBackendConfigured as isLive } from "@/lib/supabase";
import { getLocalComplaints, updateLocalComplaint, type Complaint } from "@/lib/demoData";
import { Shell, OFFICER_NAV, Stat, Card, Btn, Tabs, Field, inputCls, Icon, PriorityBadge, SlaChip, EmptyState, Modal, StatusBadge, fmtDate } from "@/components/enterprise";

export default function OfficerPage() {
  const [tasks, setTasks] = useState<Complaint[]>([]);
  const [tab, setTab] = useState("active");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [proof, setProof] = useState("https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80");
  const [notice, setNotice] = useState("");

  useEffect(() => { load(); }, []);
  function load() {
    api("/officer/tasks")
      .then((d) => setTasks(Array.isArray(d)
        ? d.map((t: any) => ({ ...t, image_urls: t.image_urls?.length ? t.image_urls : (t.complaint_images || []).map((im: any) => im.storage_path) }))
        : getLocalComplaints()))
      .catch(() => setTasks(isLive ? [] : getLocalComplaints()));
  }
  function flash(m: string) { setNotice(m); setTimeout(() => setNotice(""), 4000); }

  async function startWork(id: string) {
    try { await api(`/officer/tasks/${id}/progress`, { method: "PATCH", body: JSON.stringify({ status: "in_progress", note: notes[id] || "Field team started work." }) }); } catch {}
    updateLocalComplaint(id, { status: "in_progress" as any });
    load(); flash("Work started. Citizen notified.");
  }

  async function markResolved(id: string) {
    try { await api(`/officer/tasks/${id}/progress`, { method: "PATCH", body: JSON.stringify({ status: "resolved", note: notes[id] || "Repairs completed. Site restored.", photo_paths: [proof] }) }); } catch {}
    updateLocalComplaint(id, { status: "citizen_confirmation" as any, resolved_at: new Date().toISOString(), proof_image_urls: [proof] });
    setResolvingId(null); load(); flash("Resolution submitted. Awaiting citizen confirmation.");
  }

  const counts = useMemo(() => ({
    active: tasks.filter((t) => !["resolved", "closed", "citizen_confirmation"].includes(t.status)).length,
    urgent: tasks.filter((t) => t.priority === "critical" && !["resolved", "closed"].includes(t.status)).length,
    done: tasks.filter((t) => ["resolved", "closed", "citizen_confirmation"].includes(t.status)).length,
  }), [tasks]);

  const list = tasks.filter((t) =>
    tab === "urgent" ? (t.priority === "critical" && !["resolved", "closed"].includes(t.status)) :
    tab === "done" ? ["resolved", "closed", "citizen_confirmation"].includes(t.status) :
    !["resolved", "closed", "citizen_confirmation"].includes(t.status));

  const resolvingTask = tasks.find((t) => t.id === resolvingId);
  const beforePhoto = resolvingTask?.image_urls?.[0] || (resolvingTask as any)?.photos?.[0];

  return (
    <Shell nav={OFFICER_NAV} roleLabel="Field Operations" title="Task workspace"
      subtitle="Execute dispatched tasks, then report back to administration with photographic proof.">
      {notice && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-900">{notice}</div>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Open tasks" value={counts.active} icon="pending_actions" tone="blue" />
        <Stat label="Critical / SLA risk" value={counts.urgent} icon="crisis_alert" tone="rose" />
        <Stat label="Completed" value={counts.done} sub="Resolved or awaiting confirmation" icon="task_alt" tone="emerald" />
      </div>

      <Card className="mt-4">
        <Tabs tabs={[
          { id: "active", label: "Active queue", count: counts.active },
          { id: "urgent", label: "Critical SLA", count: counts.urgent },
          { id: "done", label: "Completed", count: counts.done },
        ]} active={tab} onChange={setTab} />
        <div className="mt-3 space-y-3">
          {list.map((t) => (
            <article key={t.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge s={t.status} />
                <span className="font-mono text-xs font-semibold text-slate-700">{t.complaint_code}</span>
                <PriorityBadge p={t.priority} />
                <span className="ml-auto"><SlaChip due={t.sla_due_at} status={t.status} /></span>
              </div>
              <h3 className="mt-2 text-[15px] font-semibold text-slate-900">{t.title}</h3>
              <p className="mt-0.5 text-[13px] text-slate-600">{t.description}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Icon name="place" className="text-[15px]" />{t.address} · Filed {fmtDate(t.created_at)}
              </p>
              {(t.image_urls?.[0] || t.photos?.[0]) && (
                <img src={t.image_urls?.[0] || t.photos?.[0]} alt="" className="mt-2 h-24 w-full rounded-md border border-slate-200 object-cover sm:w-64" />
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <a target="_blank" rel="noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.address || `${t.latitude},${t.longitude}`)}`}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
                  <Icon name="directions" className="text-[17px]" /> Navigate
                </a>
                <Link href={`/track/${t.id}`} className="rounded-md px-3 py-1.5 text-[13px] font-medium text-blue-700 hover:bg-blue-50">Case history</Link>
                <span className="ml-auto flex gap-2">
                  {t.status === "assigned" && <Btn onClick={() => startWork(t.id)}><Icon name="play_arrow" className="text-[18px]" /> Start work</Btn>}
                  {t.status === "in_progress" && <Btn onClick={() => setResolvingId(t.id)}><Icon name="add_a_photo" className="text-[18px]" /> Submit resolution</Btn>}
                  {["resolved", "citizen_confirmation"].includes(t.status) &&
                    <span className="inline-flex items-center gap-1 text-[13px] font-medium text-emerald-700"><Icon name="done_all" className="text-[18px]" /> Awaiting citizen confirmation</span>}
                </span>
              </div>
            </article>
          ))}
          {list.length === 0 && <EmptyState icon="assignment_turned_in" title="Queue clear" body="No tasks in this view. New dispatches will appear here automatically." />}
        </div>
      </Card>

      {resolvingId && (
        <Modal title={`Field report — ${resolvingTask?.complaint_code || ""}`} onClose={() => setResolvingId(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Before — reported condition</span>
                {beforePhoto ? <img src={beforePhoto} alt="Before repair" className="h-36 w-full rounded-md border border-slate-200 object-cover" />
                  : <div className="flex h-36 items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400">No photo filed</div>}
              </div>
              <div>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">After — your proof</span>
                {proof ? <img src={proof} alt="After repair" className="h-36 w-full rounded-md border border-slate-200 object-cover" />
                  : <div className="flex h-36 items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400">Add proof URL below</div>}
              </div>
            </div>
            <Field label="After-repair photo URL">
              <input value={proof} onChange={(e) => setProof(e.target.value)} className={inputCls} placeholder="https://…" />
            </Field>
            <Field label="Work summary" hint="Describe repairs performed for the citizen and audit record.">
              <textarea rows={3} value={notes[resolvingId] || ""} onChange={(e) => setNotes({ ...notes, [resolvingId]: e.target.value })}
                className={inputCls} placeholder="Asphalt repaved, debris cleared, signage restored…" />
            </Field>
            <div className="flex justify-end gap-2">
              <Btn variant="secondary" onClick={() => setResolvingId(null)}>Cancel</Btn>
              <Btn onClick={() => markResolved(resolvingId)}>Submit field report</Btn>
            </div>
          </div>
        </Modal>
      )}
    </Shell>
  );
}
