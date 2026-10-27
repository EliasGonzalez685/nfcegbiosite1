"use client";

import { BarChart3, Users, Boxes, QrCode } from "lucide-react";
import { RequireRole } from "@/components/session";
import { DashboardShell, type NavItem } from "@/components/panel/shell";

const nav: NavItem[] = [
  { href: "/admin", label: "Resumen", icon: BarChart3 },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/lotes", label: "Lotes", icon: Boxes },
  { href: "/admin/codigos", label: "Códigos", icon: QrCode },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="admin">
      <DashboardShell nav={nav} badge="Admin">{children}</DashboardShell>
    </RequireRole>
  );
}
