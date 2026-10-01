"use client";
import { useState } from "react";
import { api } from "@/lib/supabase";
import { Icon } from "./enterprise";

const SUGGESTIONS = ["Check my complaint status", "How do rewards work?", "Pothole repair timelines?", "What happens on SLA breach?"];

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<{ me: boolean; text: string }[]>([
    { me: false, text: "Civic Guard assistant. Ask about case status, reporting, rewards or escalation policy." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    setMsgs((m) => [...m, { me: true, text: q }]);
    setBusy(true);
    try {
      const r = await api<{ reply: string }>("/chat", { method: "POST", body: JSON.stringify({ message: q }) });
      setMsgs((m) => [...m, { me: false, text: r.reply }]);
    } catch {
      setMsgs((m) => [...m, { me: false, text: "Assistant offline (backend unreachable). For case status, open My Complaints." }]);
    }
    setBusy(false);
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} aria-label="Open assistant"
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-700">
        <Icon name="support_agent" />
      </button>
    );

  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[480px] w-[340px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
        <Icon name="support_agent" className="text-[20px]" />
        <div className="leading-tight">
          <b className="block text-sm">Civic Assistant</b>
          <span className="block text-[11px] text-slate-300">Case help and policy guidance</span>
        </div>
        <button onClick={() => setOpen(false)} className="ml-auto rounded p-1 hover:bg-slate-700" aria-label="Close"><Icon name="close" className="text-[18px]" /></button>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">
        {msgs.map((m, i) => (
          <div key={i} className={`max-w-[88%] rounded-md px-3 py-2 text-[13px] leading-relaxed ${m.me ? "ml-auto bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-800"}`}>{m.text}</div>
        ))}
        {busy && <div className="text-xs text-slate-400">Responding…</div>}
      </div>
      <div className="border-t border-slate-200 p-2">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100">{s}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a question…" className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-[13px] focus:border-blue-600 focus:outline-none" />
          <button onClick={() => send()} className="rounded-md bg-slate-900 px-3 text-white hover:bg-slate-700" aria-label="Send"><Icon name="send" className="text-[18px]" /></button>
        </div>
      </div>
    </div>
  );
}
