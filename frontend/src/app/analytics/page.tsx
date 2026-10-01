"use client";
import { useEffect, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend } from "recharts";
import { api } from "@/lib/supabase";
import { Shell, ADMIN_NAV, Stat, Card, Bar as BarRow, inputCls } from "@/components/enterprise";

const CATEGORY_DATA = [
  { name: "Potholes & Roads", value: 34, color: "#334155" },
  { name: "Sanitation & Waste", value: 28, color: "#1d4ed8" },
  { name: "Streetlights & Grid", value: 16, color: "#0ea5e9" },
  { name: "Water Supply Leaks", value: 14, color: "#f59e0b" },
  { name: "Drainage & Sewer", value: 8, color: "#94a3b8" },
];

const WEEKLY_TREND = [
  { day: "Mon", reported: 45, resolved: 38 }, { day: "Tue", reported: 52, resolved: 49 },
  { day: "Wed", reported: 61, resolved: 58 }, { day: "Thu", reported: 48, resolved: 52 },
  { day: "Fri", reported: 70, resolved: 65 }, { day: "Sat", reported: 39, resolved: 44 },
  { day: "Sun", reported: 28, resolved: 31 },
];

const DEPT_SLA = [
  { dept: "Sanitation", compliance: 96, avgHours: 18 }, { dept: "Streetlights", compliance: 93, avgHours: 21 },
  { dept: "Roads & Infra", compliance: 89, avgHours: 32 }, { dept: "Water Supply", compliance: 87, avgHours: 24 },
  { dept: "Drainage", compliance: 81, avgHours: 39 },
];

const WARDS = [
  { ward: "Ward 4 (Central Business)", open: 12, resolved: 142, rate: "92.2%", avgSla: "19h", status: "Optimal" },
  { ward: "Ward 8 (Civil Lines)", open: 8, resolved: 119, rate: "93.7%", avgSla: "17h", status: "Optimal" },
  { ward: "Ward 12 (Ring Road South)", open: 24, resolved: 185, rate: "88.5%", avgSla: "28h", status: "Attention" },
  { ward: "Ward 14 (Metro Corridor)", open: 19, resolved: 164, rate: "89.6%", avgSla: "26h", status: "Optimal" },
  { ward: "Ward 19 (Industrial Zone)", open: 31, resolved: 130, rate: "80.7%", avgSla: "41h", status: "Escalated" },
];

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const [range, setRange] = useState("30d");
  const [live, setLive] = useState<any>(null);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { api("/analytics/overview").then(setLive).catch(() => {}); }, []);

  return (
    <Shell nav={ADMIN_NAV} roleLabel="Admin Console" title="Performance analytics"
      subtitle="Resolution, SLA compliance and geographic performance."
      actions={<select value={range} onChange={(e) => setRange(e.target.value)} className={`${inputCls} w-auto`}>
        <option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option>
      </select>}>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Cases in period" value={live?.total ?? 343} icon="inbox" />
        <Stat label="SLA breaches" value={live?.sla_breach ?? 11} icon="timer_off" tone="rose" />
        <Stat label="Avg. citizen rating" value={live?.avg_rating ? `${live.avg_rating}/5` : "4.4/5"} icon="star" tone="amber" />
        <Stat label="Resolution rate" value="89.6%" icon="task_alt" tone="emerald" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Reported vs resolved" subtitle={`Weekly trend · ${range}`}>
          {mounted && (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={WEEKLY_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Legend />
                <Area type="monotone" dataKey="reported" stroke="#0f172a" fill="#0f172a" fillOpacity={0.08} name="Reported" />
                <Area type="monotone" dataKey="resolved" stroke="#1d4ed8" fill="#1d4ed8" fillOpacity={0.08} name="Resolved" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card title="Cases by category" subtitle="Share of intake volume">
          {mounted && (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={CATEGORY_DATA} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {CATEGORY_DATA.map((c) => <Cell key={c.name} fill={c.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card title="Department SLA compliance" subtitle="Compliance % and mean resolution time">
          {mounted && (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={DEPT_SLA} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" fontSize={12} /><YAxis dataKey="dept" type="category" width={110} fontSize={12} /><Tooltip />
                <Bar dataKey="compliance" fill="#0f172a" name="Compliance %" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="mt-3 space-y-2">
            {DEPT_SLA.map((d) => <BarRow key={d.dept} label={`${d.dept} · avg ${d.avgHours}h`} value={d.compliance} max={100} />)}
          </div>
        </Card>
        <Card title="Ward performance" subtitle="Open load, resolution rate and SLA posture">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-[13px]">
              <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3 font-medium">Ward</th><th className="py-2 pr-3 font-medium">Open</th>
                <th className="py-2 pr-3 font-medium">Resolved</th><th className="py-2 pr-3 font-medium">Rate</th><th className="py-2 font-medium">Posture</th>
              </tr></thead>
              <tbody>{WARDS.map((w) => (
                <tr key={w.ward} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-3 font-medium text-slate-900">{w.ward}</td>
                  <td className="py-2 pr-3">{w.open}</td><td className="py-2 pr-3">{w.resolved}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{w.rate} · {w.avgSla}</td>
                  <td className="py-2"><span className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${w.status === "Optimal" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : w.status === "Attention" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{w.status}</span></td>
                </tr>))}</tbody>
            </table>
          </div>
        </Card>
      </div>
    </Shell>
  );
}
