"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { LogOut, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/ui";
import { useSession } from "@/components/session";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** coincide solo con la ruta exacta */
  exact?: boolean;
}

const ROLE_LABEL = { admin: "Administrador", seller: "Vendedor", client: "Cliente" } as const;

/** Estructura de los paneles: menú lateral en compu, barra inferior en el celular */
export function AppShell({ nav, children }: { nav: NavItem[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me, signOut } = useSession();
  const active = (n: NavItem) => (n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + "/"));

  async function logout() {
    await signOut();
    router.replace("/ingresar");
  }

  const initials = (me?.fullName || me?.email || "?").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-white/70 px-3 py-5 backdrop-blur lg:flex">
        <Link href={nav[0]?.href ?? "/"} className="px-2"><LogoMark /></Link>
        <nav className="mt-8 flex-1 space-y-0.5">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition",
                active(n) ? "bg-ink text-white shadow-sm" : "text-ink-2 hover:bg-paper-2 hover:text-ink",
              )}
            >
              <n.icon className={cn("size-[18px] transition", !active(n) && "group-hover:scale-110")} />
              {n.label}
            </Link>
          ))}
        </nav>
        <Link href="/cuenta" className={cn("flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-paper-2", pathname === "/cuenta" && "bg-paper-2")}>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-clay-soft font-display font-bold text-clay">{initials}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{me?.fullName || me?.email}</span>
            <span className="block truncate text-xs text-ink-3">{me ? ROLE_LABEL[me.role] : ""} · Mi cuenta</span>
          </span>
        </Link>
        <button onClick={logout} className="mt-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink-3 hover:bg-red-50 hover:text-danger">
          <LogOut className="size-4" /> Cerrar sesión
        </button>
      </aside>

      {/* Encabezado celular */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
        <LogoMark className="text-base" />
        <div className="flex items-center gap-1">
          <Link href="/cuenta" className="grid size-9 place-items-center rounded-full bg-clay-soft font-display font-bold text-clay" aria-label="Mi cuenta">{initials}</Link>
          <button onClick={logout} className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-paper-2" aria-label="Cerrar sesión">
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="min-w-0 pb-24 lg:pb-0">{children}</main>

      {/* Navegación inferior celular */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="no-scrollbar flex overflow-x-auto">
          {[...nav, { href: "/cuenta", label: "Cuenta", icon: UserRound }].map((n) => (
            <Link key={n.href} href={n.href} className={cn("flex min-w-[64px] flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium transition", active(n) ? "text-brand" : "text-ink-3")}>
              <n.icon className={cn("size-5", active(n) && "stroke-[2.4]")} />
              <span className="truncate">{n.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function PageHead({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Page({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={cn("mx-auto px-4 py-6 sm:px-6 lg:py-10", wide ? "max-w-7xl" : "max-w-6xl")}>{children}</div>;
}

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto h-[640px] w-[316px] rounded-[46px] border-[9px] border-[#1b1b1c] bg-[#1b1b1c] shadow-[0_30px_60px_-20px_rgba(27,31,26,.5)]">
      <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#1b1b1c]" />
      <div className="no-scrollbar relative flex size-full flex-col overflow-y-auto overflow-x-hidden rounded-[37px] bg-[#0c0c0d]">{children}</div>
    </div>
  );
}
