"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, isLiveBackendConfigured as isLive } from "@/lib/supabase";
import { getLocalComplaints, updateLocalComplaint, type Complaint } from "@/lib/demoData";
import { Shell, CITIZEN_NAV, Card, Btn, Field, Icon, inputCls, PriorityBadge, SlaChip, StatusBadge, fmtDate } from "@/components/enterprise";

const STEPS = ["submitted", "under_verification", "verified", "assigned", "in_progress", "resolved", "citizen_confirmation", "closed"];

export default function CaseDetail() {
  const { id } = useParams() as { id: string };
  const [c, setC] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [fb, setFb] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api(`/complaints/${id}`).then((d) => { setC(d?.id ? normalize(d) : (isLive ? null : findLocal())); })
      .catch(() => setC(isLive ? null : findLocal())).finally(() => setLoading(false));
    function findLocal() { return getLocalComplaints().find((x) => x.id === id || x.complaint_code === id) || null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /** Map backend shape (categories/images/history) onto the local Complaint shape. */
  function normalize(d: any): Complaint {
    return {
      ...d,
      category_name: d.category_name || d.categories?.name || "",
      department_name: d.department_name || d.departments?.name || "",
      image_urls: d.image_urls?.length ? d.image_urls : (d.complaint_images || []).map((im: any) => im.storage_path),
      timeline: Array.isArray(d.timeline) && d.timeline.length ? d.timeline : (d.complaint_history || []).map((h: any) => ({
        status: h.to_status || h.status, timestamp: h.created_at, actor: h.profiles?.full_name || "Operations", note: h.note || "",
      })),
    };
  }

  async function confirm(ok: boolean) {
    if (!c) return;
    if (isLive) {
      try {
        await api(`/complaints/${c.id}/confirm`, { method: "POST", body: JSON.stringify({ resolved_ok: ok, rating, feedback: fb }) });
      } catch (e: any) {
        setMsg(`Confirmation failed: ${e?.message || "server error"}`);
        return;
      }
      const d = await api(`/complaints/${c.id}`).catch(() => null);
      if (d?.id) setC(normalize(d));
      setMsg(ok ? "Fix confirmed. Case closed. Thank you for verifying."
        : "Case reopened. The department has been alerted for re-inspection.");
      return;
    }
    const u = updateLocalComplaint(c.id, { status: (ok ? "closed" : "reopened") as any, citizen_rating: ok ? rating : undefined, citizen_feedback: fb });
    if (u) {
      setC(u);
      if (ok) { setMsg("Fix confirmed. Case closed. Thank you for verifying."); }
      else setMsg("Case reopened. The department has been alerted for re-inspection.");
    }
  }

  if (loading) return <Shell nav={CITIZEN_NAV} roleLabel="Citizen Console" title="Case file"><p className="text-sm text-slate-500">Loading…</p></Shell>;
  if (!c) return (
    <Shell nav={CITIZEN_NAV} roleLabel="Citizen Console" title="Case not found">
      <Card><p className="text-sm text-slate-500">This case ID does not exist or was archived.</p>
      <Link href="/track" className="mt-3 inline-block"><Btn variant="secondary">Back to complaints</Btn></Link></Card>
    </Shell>
  );

  const idx = STEPS.indexOf(c.status === "reopened" ? "in_progress" : c.status === "escalated" ? "assigned" : c.status);
  const evidence = [...(c.image_urls || []), ...((c as any).proof_image_urls || [])];

  return (
    <Shell nav={CITIZEN_NAV} roleLabel="Citizen Console" title={c.complaint_code} subtitle={c.title}
      actions={<Link href="/track"><Btn variant="secondary">All complaints</Btn></Link>}>
      {msg && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-900">{msg}</div>}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Case summary">
            <p className="text-sm leading-relaxed text-slate-700">{c.description}</p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-4">
              <div className="rounded-md border border-slate-200 px-3 py-2"><dt className="text-[11px] uppercase tracking-wide text-slate-500">Category</dt><dd className="font-medium">{c.category_name || "—"}</dd></div>
              <div className="rounded-md border border-slate-200 px-3 py-2"><dt className="text-[11px] uppercase tracking-wide text-slate-500">Department</dt><dd className="font-medium">{c.department_name || "—"}</dd></div>
              <div className="rounded-md border border-slate-200 px-3 py-2"><dt className="text-[11px] uppercase tracking-wide text-slate-500">Priority</dt><dd><PriorityBadge p={c.priority} /></dd></div>
              <div className="rounded-md border border-slate-200 px-3 py-2"><dt className="text-[11px] uppercase tracking-wide text-slate-500">SLA</dt><dd><SlaChip due={c.sla_due_at} status={c.status} /></dd></div>
            </dl>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
              <StatusBadge s={c.status} />
              <span className="flex items-center gap-1 text-slate-500"><Icon name="place" className="text-[15px]" />{c.address}</span>
              <span className="text-slate-400">Filed {fmtDate(c.created_at)}</span>
            </div>
            {evidence.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {evidence.slice(0, 3).map((src, i) => <img key={i} src={src} alt="" className="h-28 rounded-md border border-slate-200 object-cover" />)}
              </div>
            )}
          </Card>

          {c.status === "citizen_confirmation" && (
            <Card title="Confirmation required" subtitle="A field officer marked this resolved. Verify the fix to close the case.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Satisfaction rating (1–5)">
                  <select value={rating} onChange={(e) => setRating(+e.target.value)} className={inputCls}>
                    {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} — {r >= 4 ? "Satisfied" : r === 3 ? "Acceptable" : "Poor"}</option>)}
                  </select>
                </Field>
                <Field label="Feedback note">
                  <input value={fb} onChange={(e) => setFb(e.target.value)} className={inputCls} placeholder="Optional note for the department" />
                </Field>
              </div>
              <div className="mt-3 flex gap-2">
                <Btn onClick={() => confirm(true)}><Icon name="check" className="text-[18px]" /> Confirm and close</Btn>
                <Btn variant="secondary" onClick={() => confirm(false)}>Not fixed — reopen</Btn>
              </div>
            </Card>
          )}

          <Card title="Activity timeline" subtitle="Every status change with actor and note.">
            <ol className="space-y-0">
              {(c.timeline?.length ? c.timeline : [{ status: c.status, timestamp: c.created_at, actor: "System", note: "Case opened." }]).map((t, i, arr) => (
                <li key={i} className="flex gap-3 border-l-2 border-slate-200 pb-4 pl-4 last:border-0 last:pb-0" style={{ marginLeft: 6 }}>
                  <span className={`-ml-[23px] mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${i === arr.length - 1 ? "border-slate-900 bg-slate-900" : "border-slate-300 bg-white"}`} />
                  <div className="text-[13px]">
                    <b className="font-semibold text-slate-900">{t.status.replaceAll("_", " ")}</b>
                    <span className="text-slate-500"> · {t.actor} · {fmtDate(t.timestamp)}</span>
                    {t.note && <p className="mt-0.5 text-slate-600">{t.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card title="Lifecycle progress">
            <ol className="space-y-1.5">
              {STEPS.map((s, i) => (
                <li key={s} className={`flex items-center gap-2 text-[13px] ${i <= idx ? "font-semibold text-slate-900" : "text-slate-400"}`}>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${i <= idx ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-400"}`}>{i <= idx ? "✓" : i + 1}</span>
                  {s.replaceAll("_", " ")}
                </li>
              ))}
            </ol>
          </Card>
          {c.citizen_rating && (
            <Card title="Your feedback">
              <p className="text-[13px] text-slate-600">Rating: <b>{c.citizen_rating}/5</b></p>
              {c.citizen_feedback && <p className="mt-1 text-[13px] text-slate-600">“{c.citizen_feedback}”</p>}
            </Card>
          )}
        </aside>
      </div>
    </Shell>
  );
}
