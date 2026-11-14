"use client";

import Link from "next/link";
import { ArrowRight, Gift, Nfc, ScanLine, Store, Target, UserPlus } from "lucide-react";
import { dashboardCounts, listActivity } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { formatNumber } from "@/lib/utils";
import { useSession } from "@/components/session";
import { Page } from "@/components/panel/top-bar";
import { ActivityFeed } from "@/components/activity-feed";
import { PageLoader } from "@/components/ui";

export default function StaffHome() {
  const { me } = useSession();
  const counts = useAsync(() => dashboardCounts(), []);
  const feed = useAsync(() => listActivity({ limit: 12 }), []);
  const isAdmin = me?.role === "admin";
  const hour = new Date().getHours();
  const hello = hour < 12 ? "Buen día" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  const stats = [
    { label: "Negocios", value: counts.data?.businesses, icon: Store, href: "/admin/negocios" },
    { label: "Plaquitas", value: counts.data?.plaques, icon: Nfc, href: "/admin/plaquitas" },
    { label: "Escaneos (30 días)", value: counts.data?.scans, icon: ScanLine, href: "/admin/plaquitas" },
    { label: "Tarjetas de fidelidad", value: counts.data?.cards, icon: Gift, href: "/admin/negocios" },
  ];
  const actions = [
    { label: "Nuevo negocio", text: "Con su cuenta de cliente", icon: Store, href: "/admin/negocios?nuevo=1" },
    { label: "Configurar plaquita", text: "NFC o QR, cualquier destino", icon: Nfc, href: "/admin/plaquitas?nueva=1" },
    { label: isAdmin ? "Nuevo usuario" : "Nuevo cliente", text: isAdmin ? "Vendedor, cliente o admin" : "Cuenta para un negocio", icon: UserPlus, href: "/admin/usuarios?nuevo=1" },
    { label: "Cargar prospecto", text: "Un posible cliente", icon: Target, href: "/admin/prospectos?nuevo=1" },
  ];

  return (
    <Page>
      <div className="mb-8">
        <p className="text-ink-3">{hello},</p>
        <h1 className="font-display text-3xl font-bold">{me?.fullName || me?.email}</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Link key={s.label} href={s.href} className={i === 0 ? "group rounded-2xl bg-ink p-5 text-white transition hover:-translate-y-0.5" : "card group p-5 transition hover:-translate-y-0.5 hover:shadow-md"}>
            <s.icon className={i === 0 ? "size-5 text-white/60" : "size-5 text-ink-3"} />
            <p className="mt-3 font-display text-3xl font-bold tabular-nums">{counts.loading ? "…" : formatNumber(s.value ?? 0)}</p>
            <p className={i === 0 ? "text-sm text-white/70" : "text-sm text-ink-3"}>{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">Acciones rápidas</h2>
          <div className="grid gap-2">
            {actions.map((a) => (
              <Link key={a.label} href={a.href} className="card group flex items-center gap-4 p-4 transition hover:border-ink-3">
                <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand transition group-hover:scale-110"><a.icon className="size-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{a.label}</span>
                  <span className="block text-sm text-ink-3">{a.text}</span>
                </span>
                <ArrowRight className="size-4 text-ink-3 transition group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">{isAdmin ? "Últimos movimientos" : "Tu actividad reciente"}</h2>
            <Link href="/admin/actividad" className="text-sm font-medium text-brand hover:underline">Ver todo</Link>
          </div>
          <div className="card p-2">{feed.loading && !feed.data ? <PageLoader /> : <ActivityFeed entries={feed.data ?? []} compact />}</div>
        </section>
      </div>
    </Page>
  );
}
