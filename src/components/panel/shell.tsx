"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { LogOut, ExternalLink } from "lucide-react";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/ui";
import { useSession } from "@/components/session";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** false = se oculta en la barra inferior del celular */
  mobile?: boolean;
}

export function DashboardShell({ nav, children, badge }: { nav: NavItem[]; children: React.ReactNode; badge?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, profile } = useSession();
  const isActive = (href: string) => (href === "/panel" || href === "/admin" ? pathname === href : pathname.startsWith(href));

  async function logout() {
    await auth.signOut();
    router.replace("/ingresar");
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Sidebar escritorio */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-white/60 px-3 py-5 lg:flex">
        <div className="flex items-center gap-2 px-2">
          <LogoMark />
          {badge && <span className="rounded-md bg-clay px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{badge}</span>}
        </div>
        <nav className="mt-8 flex-1 space-y-0.5">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition",
                isActive(n.href) ? "bg-brand text-white" : "text-ink-2 hover:bg-paper-2 hover:text-ink",
              )}
            >
              <n.icon className="size-[18px]" />
              {n.label}
            </Link>
          ))}
        </nav>
        {profile && (
          <a href={`/${profile.slug}`} target="_blank" className="mb-3 flex items-center justify-between rounded-xl border border-line bg-white px-3 py-2.5 text-sm hover:border-ink-3">
            <span className="min-w-0">
              <span className="block text-xs text-ink-3">Tu biosite</span>
              <span className="block truncate font-medium">/{profile.slug}</span>
            </span>
            <ExternalLink className="size-4 shrink-0 text-ink-3" />
          </a>
        )}
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-clay-soft font-display font-bold text-clay">
            {session?.user.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{session?.user.name}</span>
            <span className="block truncate text-xs text-ink-3">{session?.user.email}</span>
          </span>
          <button onClick={logout} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-paper-2 hover:text-danger" title="Cerrar sesión">
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      {/* Header celular */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <LogoMark className="text-base" />
          {badge && <span className="rounded-md bg-clay px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">{badge}</span>}
        </div>
        <div className="flex items-center gap-1">
          {profile && (
            <a href={`/${profile.slug}`} target="_blank" className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-paper-2" title="Ver biosite">
              <ExternalLink className="size-4" />
            </a>
          )}
          <button onClick={logout} className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-paper-2" title="Cerrar sesión">
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="min-w-0 pb-24 lg:pb-0">{children}</main>

      {/* Navegación inferior celular */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="no-scrollbar flex overflow-x-auto">
          {nav.filter((n) => n.mobile !== false).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn("flex min-w-[56px] flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-medium", isActive(n.href) ? "text-brand" : "text-ink-3")}
            >
              <n.icon className={cn("size-5", isActive(n.href) && "stroke-[2.4]")} />
              <span className="truncate">{n.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
