export interface Complaint {
  id: string;
  complaint_code: string;
  title: string;
  description: string;
  category_id: string;
  category_name: string;
  department_id: string;
  department_name: string;
  assigned_officer_id?: string;
  assigned_officer_name?: string;
  status:
    | "submitted"
    | "under_verification"
    | "verified"
    | "assigned"
    | "in_progress"
    | "resolved"
    | "citizen_confirmation"
    | "closed"
    | "rejected"
    | "reopened"
    | "escalated";
  priority: "low" | "medium" | "high" | "critical";
  severity: number;
  latitude: number;
  longitude: number;
  address: string;
  ward?: string;
  tracking_id?: string;
  location_address?: string;
  department?: string;
  upvotes: number;
  upvotes_count?: number;
  image_urls: string[];
  photos?: string[];
  proof_image_urls?: string[];
  created_at: string;
  sla_due_at: string;
  resolved_at?: string;
  citizen_rating?: number;
  citizen_feedback?: string;
  ai_analysis?: {
    category_slug: string;
    severity: number;
    priority: string;
    dept_code: string;
    eta_hours: number;
    confidence: number;
  };
  timeline: {
    status: string;
    timestamp: string;
    actor: string;
    note: string;
  }[];
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  complaint_id?: string;
  created_at: string;
  is_read: boolean;
  type: "status" | "assignment" | "reward" | "sla";
}

export interface RewardTransaction {
  id: string;
  points: number;
  type: "earn" | "redeem";
  status: "approved" | "pending";
  reason: string;
  created_at: string;
}

export const INITIAL_COMPLAINTS: Complaint[] = [
  {
    id: "c-101",
    complaint_code: "CG-2026-00101",
    title: "Dangerous pothole near Central School Gate 2",
    description: "Deep pothole causing two-wheelers to skid during morning school traffic hours. Rainwater accumulation makes it impossible to see.",
    category_id: "potholes",
    category_name: "Potholes & Roads",
    department_id: "roads",
    department_name: "Roads & Infrastructure",
    assigned_officer_id: "off-1",
    assigned_officer_name: "Rajesh Kumar (Roads Squad A)",
    status: "in_progress",
    priority: "critical",
    severity: 5,
    latitude: 28.6139,
    longitude: 77.2090,
    address: "Opposite St. Xavier Gate 2, Ring Road Sector 4",
    upvotes: 24,
    image_urls: [
      "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80"
    ],
    proof_image_urls: [],
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    sla_due_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    ai_analysis: {
      category_slug: "potholes",
      severity: 5,
      priority: "critical",
      dept_code: "ROADS",
      eta_hours: 12,
      confidence: 0.94
    },
    timeline: [
      {
        status: "submitted",
        timestamp: new Date(Date.now() - 36 * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actor: "Citizen (You)",
        note: "Issue submitted with photo and GPS location."
      },
      {
        status: "verified",
        timestamp: new Date(Date.now() - 32 * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actor: "AI Verification & Triage",
        note: "Severity classified as 5 (Dangerous near school). Priority elevated to Critical."
      },
      {
        status: "assigned",
        timestamp: new Date(Date.now() - 28 * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actor: "Admin Dispatch",
        note: "Dispatched to Roads Squad A - Lead Officer Rajesh Kumar."
      },
      {
        status: "in_progress",
        timestamp: new Date(Date.now() - 6 * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actor: "Officer Rajesh Kumar",
        note: "Asphalt patch truck on site. Safety cones placed."
      }
    ]
  },
  {
    id: "c-102",
    complaint_code: "CG-2026-00098",
    title: "Overflowing garbage dumpster and open waste",
    description: "Sanitation truck missed collection for 4 consecutive days. Stray animals scattering garbage onto the pedestrian walkway.",
    category_id: "garbage",
    category_name: "Sanitation & Waste",
    department_id: "sani",
    department_name: "Sanitation & Garbage",
    assigned_officer_id: "off-2",
    assigned_officer_name: "Sunita Verma (Ward 14 Sanitation)",
    status: "citizen_confirmation",
    priority: "high",
    severity: 4,
    latitude: 28.6219,
    longitude: 77.2155,
    address: "Market Square Lane 3, Near Metro Pillar 112",
    upvotes: 18,
    image_urls: [
      "https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80"
    ],
    proof_image_urls: [
      "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80"
    ],
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    sla_due_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    ai_analysis: {
      category_slug: "garbage",
      severity: 4,
      priority: "high",
      dept_code: "SANI",
      eta_hours: 24,
      confidence: 0.91
    },
    timeline: [
      {
        status: "submitted",
        timestamp: "2 days ago",
        actor: "Citizen (You)",
        note: "Dumpster overflow reported."
      },
      {
        status: "assigned",
        timestamp: "Yesterday, 10:00 AM",
        actor: "Dept Admin",
        note: "Assigned to Compactor Unit 7."
      },
      {
        status: "resolved",
        timestamp: "Today, 11:30 AM",
        actor: "Officer Sunita Verma",
        note: "Dumpster cleared, area disinfected with bleaching powder. Photo proof attached."
      }
    ]
  },
  {
    id: "c-103",
    complaint_code: "CG-2026-00085",
    title: "Broken streetlight line causing pitch black walkway",
    description: "Three consecutive LED street poles not turning on after dark. Residents and women commuters feel unsafe.",
    category_id: "streetlights",
    category_name: "Electricity & Lights",
    department_id: "elec",
    department_name: "Electricity & Streetlights",
    assigned_officer_id: "off-3",
    assigned_officer_name: "Anil Sharma (Grid Division)",
    status: "verified",
    priority: "medium",
    severity: 3,
    latitude: 28.6080,
    longitude: 77.2020,
    address: "Park Avenue Crossroad, Block C",
    upvotes: 9,
    image_urls: [
      "https://images.unsplash.com/photo-1508873696983-2df5293cb395?auto=format&fit=crop&w=800&q=80"
    ],
    proof_image_urls: [],
    created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    sla_due_at: new Date(Date.now() + 30 * 3600 * 1000).toISOString(),
    ai_analysis: {
      category_slug: "streetlights",
      severity: 3,
      priority: "medium",
      dept_code: "ELEC",
      eta_hours: 48,
      confidence: 0.88
    },
    timeline: [
      {
        status: "submitted",
        timestamp: "Yesterday, 07:15 PM",
        actor: "Citizen (You)",
        note: "Reported night outage."
      },
      {
        status: "verified",
        timestamp: "Today, 08:30 AM",
        actor: "System AI",
        note: "Cross-checked with feeder 4B maintenance schedule."
      }
    ]
  },
  {
    id: "c-104",
    complaint_code: "CG-2026-00072",
    title: "High-pressure main water pipe burst",
    description: "Treated municipal water flooding the main road. Thousands of liters wasting every hour and water supply to Sector 7 disrupted.",
    category_id: "water-leakage",
    category_name: "Water Supply",
    department_id: "water",
    department_name: "Water Supply",
    assigned_officer_id: "off-4",
    assigned_officer_name: "Mohan Lal (Emergency Pipeline Unit)",
    status: "resolved",
    priority: "critical",
    severity: 5,
    latitude: 28.6185,
    longitude: 77.2180,
    address: "Sector 7 Main Road, Beside Water Boosting Station",
    upvotes: 42,
    image_urls: [
      "https://images.unsplash.com/photo-1541888946425-d0fbb1861593?auto=format&fit=crop&w=800&q=80"
    ],
    proof_image_urls: [
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80"
    ],
    created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    sla_due_at: new Date(Date.now() - 60 * 3600 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 62 * 3600 * 1000).toISOString(),
    citizen_rating: 5,
    citizen_feedback: "Super fast repair by the emergency crew! Water supply resumed in 4 hours.",
    timeline: [
      {
        status: "submitted",
        timestamp: "3 days ago",
        actor: "Citizen",
        note: "Major burst reported."
      },
      {
        status: "assigned",
        timestamp: "3 days ago",
        actor: "Emergency Dispatch",
        note: "Immediate high priority assignment."
      },
      {
        status: "resolved",
        timestamp: "3 days ago",
        actor: "Officer Mohan Lal",
        note: "Main valve isolated, replacement pipe welded, pressure tested."
      },
      {
        status: "closed",
        timestamp: "2 days ago",
        actor: "Citizen Confirmation",
        note: "Verified resolved. Rated 5 stars."
      }
    ]
  },
  {
    id: "c-105",
    complaint_code: "CG-2026-00060",
    title: "Sewage overflow from manhole cover",
    description: "Foul odor and black water spilling onto pavement near grocery store. Serious health hazard for children and elderly.",
    category_id: "drainage",
    category_name: "Drainage & Sewerage",
    department_id: "drain",
    department_name: "Drainage & Sewerage",
    assigned_officer_id: "off-5",
    assigned_officer_name: "Pooja Hegde (Sewer Jetting Team)",
    status: "escalated",
    priority: "high",
    severity: 4,
    latitude: 28.6270,
    longitude: 77.2050,
    address: "Community Hall Lane, Ward 9",
    upvotes: 31,
    image_urls: [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80"
    ],
    proof_image_urls: [],
    created_at: new Date(Date.now() - 55 * 3600 * 1000).toISOString(),
    sla_due_at: new Date(Date.now() - 15 * 3600 * 1000).toISOString(),
    ai_analysis: {
      category_slug: "drainage",
      severity: 4,
      priority: "high",
      dept_code: "DRAIN",
      eta_hours: 24,
      confidence: 0.93
    },
    timeline: [
      {
        status: "submitted",
        timestamp: "2 days ago",
        actor: "Citizen",
        note: "Sewage overflow reported."
      },
      {
        status: "escalated",
        timestamp: "6 hours ago",
        actor: "Automated SLA Watchdog",
        note: "SLA breached (>24h). Escalated to Department Head (Level 2)."
      }
    ]
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n-1",
    title: "Complaint Status: Resolved",
    body: "Sanitation crew cleared dumpster for CG-2026-00098. Please verify the fix!",
    complaint_id: "c-102",
    created_at: "15 mins ago",
    is_read: false,
    type: "status"
  },
  {
    id: "n-2",
    title: "🎉 Reward Points Earned (+10 pts)",
    body: "Your report 'Dangerous pothole near Central School' was verified by AI triage.",
    complaint_id: "c-101",
    created_at: "2 hours ago",
    is_read: false,
    type: "reward"
  },
  {
    id: "n-3",
    title: "Officer Assigned",
    body: "Field Officer Rajesh Kumar has been dispatched to CG-2026-00101.",
    complaint_id: "c-101",
    created_at: "Yesterday",
    is_read: true,
    type: "assignment"
  }
];

export const INITIAL_REWARDS: RewardTransaction[] = [
  {
    id: "rw-1",
    points: 10,
    type: "earn",
    status: "approved",
    reason: "Report verified: CG-2026-00101 (Pothole)",
    created_at: "Today, 10:15 AM"
  },
  {
    id: "rw-2",
    points: 10,
    type: "earn",
    status: "approved",
    reason: "Report verified: CG-2026-00098 (Garbage)",
    created_at: "Yesterday"
  },
  {
    id: "rw-3",
    points: 5,
    type: "earn",
    status: "approved",
    reason: "Confirmed fix: CG-2026-00072 (Water leak)",
    created_at: "3 days ago"
  },
  {
    id: "rw-4",
    points: 50,
    type: "redeem",
    status: "approved",
    reason: "Redeemed: 1-Day Metro Transit Pass",
    created_at: "Last week"
  }
];

const STORAGE_KEYS = {
  COMPLAINTS: "civic_guard_complaints",
  NOTIFICATIONS: "civic_guard_notifications",
  REWARDS: "civic_guard_rewards",
  ROLE: "civic_guard_active_role",
};

export function getLocalComplaints(): Complaint[] {
  if (typeof window === "undefined") return INITIAL_COMPLAINTS;
  const stored = localStorage.getItem(STORAGE_KEYS.COMPLAINTS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.COMPLAINTS, JSON.stringify(INITIAL_COMPLAINTS));
    return INITIAL_COMPLAINTS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_COMPLAINTS;
  }
}

export function saveLocalComplaints(complaints: Complaint[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.COMPLAINTS, JSON.stringify(complaints));
}

export function addLocalComplaint(newComplaint: Partial<Complaint>): Complaint {
  const current = getLocalComplaints();
  const year = new Date().getFullYear();
  const seq = String(current.length + 101).padStart(5, "0");
  const complaintCode = `CG-${year}-${seq}`;

  const complaint: Complaint = {
    id: `c-${Date.now()}`,
    complaint_code: complaintCode,
    title: newComplaint.title || "Civic Issue",
    description: newComplaint.description || "",
    category_id: newComplaint.category_id || "other",
    category_name: newComplaint.category_name || "General Civic",
    department_id: newComplaint.department_id || "roads",
    department_name: newComplaint.department_name || "Municipal Operations",
    status: "submitted",
    priority: (newComplaint.priority as any) || "medium",
    severity: newComplaint.severity || 3,
    latitude: newComplaint.latitude || 28.6139,
    longitude: newComplaint.longitude || 77.2090,
    address: newComplaint.address || "New Delhi Central Ward",
    upvotes: 1,
    image_urls: newComplaint.image_urls || [],
    created_at: new Date().toISOString(),
    sla_due_at: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    ai_analysis: newComplaint.ai_analysis,
    timeline: [
      {
        status: "submitted",
        timestamp: "Just now",
        actor: "Citizen (You)",
        note: "Complaint submitted via Web Portal with GPS location."
      }
    ]
  };

  const updated = [complaint, ...current];
  saveLocalComplaints(updated);

  addRewardTransaction({
    points: 10,
    type: "earn",
    status: "approved",
    reason: `Report filed: ${complaintCode}`
  });

  addNotification({
    title: "Complaint Received",
    body: `${complaintCode} logged successfully. AI routing in progress.`,
    complaint_id: complaint.id,
    type: "status"
  });

  return complaint;
}

export function updateLocalComplaint(id: string, updates: Partial<Complaint>): Complaint | null {
  const current = getLocalComplaints();
  const idx = current.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const prev = current[idx];
  const updatedComplaint: Complaint = {
    ...prev,
    ...updates,
    timeline: updates.timeline || (updates.status && updates.status !== prev.status
      ? [
          ...prev.timeline,
          {
            status: updates.status,
            timestamp: "Just now",
            actor: "System / Officer",
            note: updates.citizen_feedback || `Status progressed to ${updates.status.replace("_", " ")}`
          }
        ]
      : prev.timeline)
  };

  current[idx] = updatedComplaint;
  saveLocalComplaints(current);
  return updatedComplaint;
}

export function upvoteComplaint(id: string): number {
  const current = getLocalComplaints();
  const item = current.find((c) => c.id === id);
  if (item) {
    item.upvotes = (item.upvotes || 0) + 1;
    saveLocalComplaints(current);
    return item.upvotes;
  }
  return 0;
}

export function getLocalNotifications(): NotificationItem[] {
  if (typeof window === "undefined") return INITIAL_NOTIFICATIONS;
  const stored = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    return INITIAL_NOTIFICATIONS;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

export function addNotification(n: Omit<NotificationItem, "id" | "created_at" | "is_read">) {
  const current = getLocalNotifications();
  const item: NotificationItem = {
    ...n,
    id: `notif-${Date.now()}`,
    created_at: "Just now",
    is_read: false
  };
  const updated = [item, ...current];
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
  }
  return item;
}

export function markNotificationsRead() {
  const current = getLocalNotifications();
  const updated = current.map((n) => ({ ...n, is_read: true }));
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
  }
}

export function getLocalRewards(): { balance: number; history: RewardTransaction[] } {
  if (typeof window === "undefined") {
    return { balance: 65, history: INITIAL_REWARDS };
  }
  const stored = localStorage.getItem(STORAGE_KEYS.REWARDS);
  let list = INITIAL_REWARDS;
  if (stored) {
    try {
      list = JSON.parse(stored);
    } catch {
      list = INITIAL_REWARDS;
    }
  } else {
    localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(INITIAL_REWARDS));
  }

  const earned = list.filter((r) => r.type === "earn" && r.status === "approved").reduce((a, b) => a + b.points, 0);
  const redeemed = list.filter((r) => r.type === "redeem" && r.status === "approved").reduce((a, b) => a + b.points, 0);
  return { balance: earned - redeemed, history: list };
}

export function addRewardTransaction(tx: Omit<RewardTransaction, "id" | "created_at">): { balance: number; history: RewardTransaction[] } {
  const { history } = getLocalRewards();
  const newTx: RewardTransaction = {
    ...tx,
    id: `rw-${Date.now()}`,
    created_at: "Just now"
  };
  const updated = [newTx, ...history];
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(updated));
  }
  return getLocalRewards();
}

export function getActiveRole(): "citizen" | "officer" | "admin" {
  if (typeof window === "undefined") return "citizen";
  return (localStorage.getItem(STORAGE_KEYS.ROLE) as any) || "citizen";
}

export function setActiveRole(role: "citizen" | "officer" | "admin") {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.ROLE, role);
}
