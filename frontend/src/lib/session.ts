"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";
import { getActiveRole, setActiveRole } from "./demoData";

export type AppRole = "citizen" | "field_officer" | "dept_admin" | "dept_head" | "org_admin" | "super_admin";

export function homeFor(role: AppRole): string {
  if (role === "citizen") return "/citizen";
  if (role === "field_officer") return "/officer";
  return "/admin";
}

export function roleLabel(role: AppRole): string {
  return role.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

export function demoToAppRole(d: "citizen" | "officer" | "admin"): AppRole {
  return d === "officer" ? "field_officer" : d === "admin" ? "org_admin" : "citizen";
}

/** Session + role resolution. Falls back to demo role when no live session. */
export function useSession() {
  const [role, setRole] = useState<AppRole>("citizen");
  const [name, setName] = useState("Guest User");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.auth.getUser();
      const u = data?.user;
      if (u) {
        const { data: prof } = await supabase.from("profiles").select("role,full_name").eq("id", u.id).single();
        if (prof?.role) {
          setRole(prof.role as AppRole);
          setName(prof.full_name || u.email || "User");
          setEmail(u.email || "");
          setLoading(false);
          return;
        }
      }
    } catch { /* demo fallback below */ }
    const d = demoToAppRole(getActiveRole());
    setRole(d);
    try {
      const { data } = await supabase.auth.getUser();
      const em = data?.user?.email || "";
      setEmail(em);
      setName(em ? em.split("@")[0] : d === "citizen" ? "Citizen" : d === "field_officer" ? "Field Officer" : "Administrator");
    } catch {
      setName(d === "citizen" ? "Citizen" : d === "field_officer" ? "Field Officer" : "Administrator");
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function signOut() {
    try { await supabase.auth.signOut(); } catch {}
    if (typeof window !== "undefined") window.location.href = "/login";
  }

  function switchDemoRole(d: "citizen" | "officer" | "admin") {
    setActiveRole(d);
    refresh();
  }

  return { role, name, email, loading, refresh, signOut, switchDemoRole };
}
