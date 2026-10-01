"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { addLocalComplaint, getLocalComplaints, upvoteComplaint, type Complaint } from "@/lib/demoData";
import { api, isLiveBackendConfigured as isLive } from "@/lib/supabase";
import { Shell, CITIZEN_NAV, Card, Field, Btn, Icon, inputCls, PriorityBadge } from "@/components/enterprise";

const CATEGORIES = [
  { slug: "potholes", name: "Potholes & Road Damage", dept: "Roads & Infrastructure", sla: 48 },
  { slug: "garbage", name: "Sanitation & Garbage", dept: "Sanitation & Waste", sla: 24 },
  { slug: "streetlights", name: "Streetlights & Electricity", dept: "Electricity & Streetlights", sla: 24 },
  { slug: "water-leakage", name: "Water Supply & Leakage", dept: "Water Supply", sla: 12 },
  { slug: "drainage", name: "Drainage & Sewage", dept: "Drainage & Sewerage", sla: 24 },
  { slug: "traffic", name: "Traffic Signals & Congestion", dept: "Roads & Traffic", sla: 48 },
  { slug: "property-damage", name: "Public Property Damage", dept: "Municipal Infrastructure", sla: 72 },
  { slug: "other", name: "Other Civic Concerns", dept: "General Administration", sla: 48 },
];

export default function ReportPage() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [cat, setCat] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Complaint | null>(null);
  const [dups, setDups] = useState<Complaint[]>([]);
  const [supported, setSupported] = useState<Record<string, boolean>>({});
  const [liveCats, setLiveCats] = useState<{ id: string; slug: string }[] | null>(null);

  useEffect(() => { locate(); }, []);
  useEffect(() => {
    api("/meta/categories").then((d) => { if (Array.isArray(d) && d.length) setLiveCats(d); }).catch(() => {});
  }, []);

  function locate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLat(28.6139); setLng(77.2090); return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLat(p.coords.latitude); setLng(p.coords.longitude); setLocating(false); },
      () => { setLat(28.6139); setLng(77.2090); setLocating(false); });
  }

  const text = `${title} ${desc}`.toLowerCase();
  const aiCat = cat || (
    /pothole|road|crack/.test(text) ? "potholes" :
    /garbage|trash|waste|dump/.test(text) ? "garbage" :
    /light|lamp|dark|pole/.test(text) ? "streetlights" :
    /water|pipe|burst/.test(text) ? "water-leakage" :
    /drain|sewage|sewer/.test(text) ? "drainage" : "potholes");
  const catObj = CATEGORIES.find((c) => c.slug === aiCat)!;
  const dangerous = /danger|burst|accident|live wire|flood/.test(text);
  const sev = dangerous ? 5 : /large|broken|heavy/.test(text) ? 4 : 3;
  const prio = sev >= 5 ? "critical" : sev >= 4 ? "high" : "medium";
  const eta = prio === "critical" ? 12 : prio === "high" ? 24 : catObj.sla;

  useEffect(() => {
    if (title.length <= 3) { setDups([]); return; }
    api("/complaints/check-duplicate", { method: "POST",
      body: JSON.stringify({ latitude: lat ?? 28.6139, longitude: lng ?? 77.2090 }) })
      .then((r) => setDups(((r as any).duplicates || []).slice(0, 2)))
      .catch(() => {
        if (isLive) { setDups([]); return; }
        const all = getLocalComplaints();
        setDups(all.filter((c) => c.category_id.includes(aiCat) || c.title.toLowerCase().includes(title.toLowerCase().slice(0, 5))).slice(0, 2));
      });
  }, [title, aiCat]);

  function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => { if (ev.target?.result) setPhotos((p) => [...p, ev.target!.result as string].slice(0, 3)); };
    r.readAsDataURL(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const liveId = liveCats?.find((c) => c.slug === catObj.slug)?.id;
    const payload = { title: title.trim(), description: desc.trim(),
      category_id: liveId ?? (isLive ? null : catObj.slug),
      latitude: lat || 28.6139, longitude: lng || 77.2090, address: address.trim() };
    try {
      setDone(await api("/complaints", { method: "POST", body: JSON.stringify(payload) }));
    } catch {
      setDone(addLocalComplaint({ ...payload, category_id: catObj.slug, category_name: catObj.name, department_id: catObj.slug,
        department_name: catObj.dept, image_urls: photos, priority: prio as any, severity: sev,
        ai_analysis: { category_slug: catObj.slug, severity: sev, priority: prio, dept_code: catObj.slug.toUpperCase(), eta_hours: eta, confidence: 0.95 } }));
    }
    setBusy(false);
  }

  if (done) {
    return (
      <Shell nav={CITIZEN_NAV} roleLabel="Citizen Console" title="Report filed">
        <Card className="mx-auto max-w-2xl" title="Complaint registered">
          <p className="font-mono text-lg font-bold text-slate-900">{done.complaint_code}</p>
          <p className="mt-1 text-sm text-slate-600">“{done.title}”</p>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-4">
            {[["Category", done.category_name || catObj.name], ["Department", done.department_name || catObj.dept],
              ["Est. resolution", `~${done.ai_analysis?.eta_hours || eta} hours`]].map(([k, v]) => (
              <div key={k} className="rounded-md border border-slate-200 px-3 py-2">
                <dt className="text-[11px] uppercase tracking-wide text-slate-500">{k}</dt><dd className="font-semibold text-slate-900">{v}</dd>
              </div>))}
            <div className="rounded-md border border-slate-200 px-3 py-2">
              <dt className="text-[11px] uppercase tracking-wide text-slate-500">Priority</dt>
              <dd><PriorityBadge p={done.priority || prio} /></dd>
            </div>
          </dl>
          <div className="mt-4 rounded-md bg-blue-50 px-3 py-2.5 text-[13px] text-blue-900">
            Dispatch will verify this report shortly. Track progress under My Complaints.
          </div>
          <div className="mt-4 flex gap-2">
            <Link href={`/track/${done.id}`}><Btn>Track this case</Btn></Link>
            <Btn variant="secondary" onClick={() => { setDone(null); setTitle(""); setDesc(""); setPhotos([]); }}>File another</Btn>
          </div>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell nav={CITIZEN_NAV} roleLabel="Citizen Console" title="Report a civic issue"
      subtitle="Photo, location and description. Triage, SLA and routing are assigned automatically.">
      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="1 · Issue details">
            <div className="space-y-4">
              <Field label="Issue title" required>
                <input required minLength={5} value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Deep pothole causing skidding near school gate" />
              </Field>
              <Field label="Description" required>
                <textarea required rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} className={inputCls} placeholder="Landmark, hazard level, how long it has persisted…" />
              </Field>
              <Field label="Category" hint="Leave on auto-detect for AI classification.">
                <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls}>
                  <option value="">Auto-detect (recommended)</option>
                  {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name} — {c.dept}</option>)}
                </select>
              </Field>
            </div>
          </Card>

          <Card title="2 · Photo evidence" subtitle="Up to 3 photos. Clear photos speed verification.">
            <div className="grid grid-cols-3 gap-2">
              {photos.map((src, i) => (
                <div key={i} className="relative h-28 overflow-hidden rounded-md border border-slate-200">
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                    className="absolute right-1.5 top-1.5 rounded bg-slate-900/70 px-1.5 py-0.5 text-xs text-white">Remove</button>
                </div>
              ))}
              {photos.length < 3 && (
                <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100">
                  <Icon name="add_a_photo" /><span className="mt-1 text-xs font-medium">Upload photo</span>
                  <input type="file" accept="image/*" onChange={upload} className="hidden" />
                </label>
              )}
            </div>
          </Card>

          <Card title="3 · Location">
            <div className="space-y-4">
              <Field label="Street address or landmark" required>
                <div className="flex gap-2">
                  <input required value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} placeholder="Ring Road junction, near Metro Pillar 114" />
                  <Btn type="button" variant="secondary" onClick={locate} disabled={locating}>{locating ? "Locating…" : "Use GPS"}</Btn>
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">LAT {lat?.toFixed(5) ?? "—"}</div>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">LNG {lng?.toFixed(5) ?? "—"}</div>
              </div>
            </div>
          </Card>

          {dups.length > 0 && (
            <Card title="Possible duplicates" subtitle="These open cases match your report. Supporting them speeds resolution.">
              <div className="space-y-2">
                {dups.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 px-3 py-2 text-[13px]">
                    <span><b className="font-mono text-xs">{d.complaint_code}</b> <span className="text-slate-600">{d.title}</span></span>
                    <button type="button" disabled={supported[d.id]} onClick={() => { if (isLive) { api(`/complaints/${d.id}/support`, { method: "POST" }).catch(() => {}); } else { upvoteComplaint(d.id); } setSupported({ ...supported, [d.id]: true }); }}
                      className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-50 disabled:text-emerald-700">
                      {supported[d.id] ? "Supported" : `Support (${d.upvotes})`}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Btn type="submit" disabled={busy} className="w-full py-2.5">{busy ? "Submitting…" : "Submit report"}</Btn>
        </div>

        <aside className="space-y-4">
          <Card title="Triage preview" subtitle="Updates as you type.">
            <dl className="space-y-2.5 text-[13px]">
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Category</dt><dd className="text-right font-medium">{catObj.name}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Department</dt><dd className="text-right font-medium">{catObj.dept}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Severity</dt><dd className="font-medium">{sev} / 5</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Priority</dt><dd><PriorityBadge p={prio} /></dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Target SLA</dt><dd className="font-medium">{eta} hours</dd></div>
            </dl>
          </Card>
          <Card title="What happens next">
            <ol className="list-decimal space-y-1.5 pl-4 text-[13px] text-slate-600">
              <li>Verification by municipal dispatch</li>
              <li>Assignment to a field officer</li>
              <li>Resolution with photo proof</li>
              <li>Your confirmation closes the case</li>
            </ol>
          </Card>
        </aside>
      </form>
    </Shell>
  );
}
