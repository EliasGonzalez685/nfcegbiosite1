import { Activity, Home, Nfc, Store, Target, Users, LayoutTemplate } from "lucide-react";
import type { Role } from "@/lib/types";
import type { NavItem } from "@/components/panel/top-bar";

export function navFor(role: Role | undefined): NavItem[] {
  if (role === "client") return [{ href: "/panel", label: "Mi página", icon: LayoutTemplate }];
  return [
    { href: "/admin", label: "Inicio", icon: Home, exact: true },
    { href: "/admin/negocios", label: "Negocios", icon: Store },
    { href: "/admin/plaquitas", label: "Plaquitas", icon: Nfc },
    { href: "/admin/usuarios", label: role === "admin" ? "Usuarios" : "Clientes", icon: Users },
    { href: "/admin/prospectos", label: "Prospectos", icon: Target },
    { href: "/admin/actividad", label: "Actividad", icon: Activity },
  ];
}
