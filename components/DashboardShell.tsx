"use client";

import { ReactNode, useEffect, useState } from "react";
import { Spin } from "antd";
import { useRouter } from "next/navigation";
import DashboardHeader from "@/components/DashboardHeader";

export default function DashboardShell({
  children,
  allowUser = true,
  adminOnly = false,
}: {
  children: ReactNode;
  allowUser?: boolean;
  adminOnly?: boolean;
}) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState("...");
  const [role, setRole] = useState<"admin" | "user" | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  async function loadCurrentUser() {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        router.replace("/login");
        return;
      }

      setDisplayName(data.displayName || "unknown");
      setRole(data.role);

      if (adminOnly && data.role !== "admin") {
        router.replace("/inventory");
        return;
      }

      if (!allowUser && data.role === "user") {
        router.replace("/inventory");
        return;
      }
    } catch {
      router.replace("/login");
    } finally {
      setAuthLoading(false);
    }
  }

  useEffect(() => {
    loadCurrentUser();
  }, []);

  if (authLoading) {
    return (
      <main style={{ padding: 48, display: "flex", justifyContent: "center" }}>
        <Spin size="large" />
      </main>
    );
  }

  if (!role) return null;
  if (adminOnly && role !== "admin") return null;

  return (
    <main style={{ padding: 24 }}>
      <DashboardHeader displayName={displayName} role={role} />
      {children}
    </main>
  );
}