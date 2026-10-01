"use client";

interface StatusBadgeProps {
  s?: string;
  status?: string;
}

export default function StatusBadge({ s, status }: StatusBadgeProps) {
  const current = status || s || "submitted";

  const configs: Record<string, { bg: string; text: string; border: string; label: string; icon: string }> = {
    submitted: {
      bg: "bg-slate-100",
      text: "text-slate-700",
      border: "border-slate-200",
      label: "Submitted",
      icon: "edit_note",
    },
    under_verification: {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-200",
      label: "Under Verification",
      icon: "pending",
    },
    verified: {
      bg: "bg-blue-50",
      text: "text-blue-800",
      border: "border-blue-200",
      label: "Verified",
      icon: "check_circle",
    },
    assigned: {
      bg: "bg-indigo-50",
      text: "text-indigo-800",
      border: "border-indigo-200",
      label: "Dispatched",
      icon: "engineering",
    },
    in_progress: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-300",
      label: "In Progress",
      icon: "progress_activity",
    },
    resolved: {
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      border: "border-emerald-300",
      label: "Resolved",
      icon: "task_alt",
    },
    citizen_confirmation: {
      bg: "bg-teal-50",
      text: "text-teal-900 font-bold",
      border: "border-teal-300 ring-1 ring-teal-400",
      label: "Citizen Confirm",
      icon: "rate_review",
    },
    closed: {
      bg: "bg-emerald-100",
      text: "text-emerald-900",
      border: "border-emerald-300",
      label: "Closed",
      icon: "verified",
    },
    rejected: {
      bg: "bg-rose-50",
      text: "text-rose-800",
      border: "border-rose-200",
      label: "Rejected",
      icon: "cancel",
    },
    reopened: {
      bg: "bg-amber-100",
      text: "text-amber-900",
      border: "border-amber-300",
      label: "Reopened",
      icon: "replay",
    },
    escalated: {
      bg: "bg-rose-100",
      text: "text-rose-900 font-extrabold",
      border: "border-rose-300 animate-pulse",
      label: "Escalated",
      icon: "crisis_alert",
    },
  };

  const conf = configs[current] || {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    label: current.replace("_", " "),
    icon: "circle",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${conf.bg} ${conf.text} ${conf.border}`}
    >
      <span className="material-symbols-outlined text-[13px]">{conf.icon}</span>
      <span>{conf.label}</span>
    </span>
  );
}
