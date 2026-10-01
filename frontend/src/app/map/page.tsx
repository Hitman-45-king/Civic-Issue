"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { getLocalComplaints, type Complaint } from "@/lib/demoData";
import { api, isLiveBackendConfigured as isLive } from "@/lib/supabase";
import { Shell, CITIZEN_NAV, Card, inputCls, Icon, PriorityBadge, StatusBadge } from "@/components/enterprise";

const CivicMap = dynamic(() => import("@/components/CivicMap"), {
  ssr: false,
  loading: () => <div className="flex h-[480px] items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-500">Loading map…</div>,
});

const CATS = [
  { id: "all", label: "All categories" },
  { id: "potholes", label: "Roads & potholes" },
  { id: "garbage", label: "Sanitation" },
  { id: "streetlights", label: "Streetlights" },
  { id: "water-leakage", label: "Water" },
  { id: "drainage", label: "Drainage" },
];

export default function MapPage() {
  const [rows, setRows] = useState<Complaint[]>([]);
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | undefined>();

  useEffect(() => {
    api("/complaints/mine").then((d) => setRows(Array.isArray(d) ? d : getLocalComplaints())).catch(() => setRows(isLive ? [] : getLocalComplaints()));
  }, []);

  const list = useMemo(() => rows.filter((c) =>
    (cat === "all" || (c.category_id || "").includes(cat)) &&
    (status === "all" || c.status === status) &&
    (!q || (c.title + c.complaint_code).toLowerCase().includes(q.toLowerCase()))), [rows, cat, status, q]);

  const selected = list.find((c) => c.id === sel);

  return (
    <Shell nav={CITIZEN_NAV} roleLabel="Citizen Console" title="City operations map"
      subtitle="Reported incidents by location, category and status.">
      <Card>
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search cases…" className={inputCls} />
          <select value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls}>
            {CATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            <option value="all">All statuses</option>
            {["submitted", "verified", "assigned", "in_progress", "resolved", "escalated", "closed"].map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
          </select>
          <span className="self-center text-[13px] text-slate-500">{list.length} plotted</span>
        </div>
        <div className="overflow-hidden rounded-md border border-slate-200">
          <CivicMap complaints={list} selectedId={sel} onSelectComplaint={(c) => setSel(c.id)} />
        </div>
        {selected && (
          <Link href={`/track/${selected.id}`} className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 px-3 py-2.5 text-[13px] hover:bg-slate-50">
            <b className="font-mono text-xs text-blue-700">{selected.complaint_code}</b>
            <span className="font-medium text-slate-900">{selected.title}</span>
            <PriorityBadge p={selected.priority} />
            <StatusBadge s={selected.status} />
            <span className="ml-auto inline-flex items-center gap-1 font-medium text-blue-700">Open case <Icon name="arrow_forward" className="text-[16px]" /></span>
          </Link>
        )}
      </Card>
    </Shell>
  );
}
