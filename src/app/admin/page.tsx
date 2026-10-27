"use client";

import { useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { db } from "@/lib/data";
import { resetDB } from "@/lib/data/mock/store";
import { useAsync } from "@/lib/hooks";
import { cn, formatDate } from "@/lib/utils";
import { PanelPage } from "@/components/panel/editor";
import { PageHeader } from "@/components/panel/shell";
import { DailyChart, KpiCard, RankList } from "@/components/panel/charts";
import { Button, PageLoader } from "@/components/ui";

export default function AdminHome() {
  const [days, setDays] = useState(30);
  const { data, loading } = useAsync(async () => {
    const [stats, clients, codes] = await Promise.all([db.analytics.summary(null, days), db.users.listClients(), db.codes.listAll()]);
    return { stats, clients, codes };
  }, [days]);

  function reset() {
    if (!confirm("¿Restaurar todos los datos de prueba? Se pierden los cambios hechos en este navegador.")) return;
    resetDB();
    window.location.reload();
  }

  if (loading || !data) return <PageLoader />;
  const active = data.codes.filter((c) => c.status === "active").length;
  const blank = data.codes.filter((c) => c.status === "unassigned").length;
  const topClients = [...data.clients].sort((a, b) => b.scans30d - a.scans30d).slice(0, 6);

  return (
    <PanelPage>
      <PageHeader
        title="Resumen general"
        description="Toda la plataforma de un vistazo."
        actions={
          <>
            <div className="flex rounded-xl border border-line bg-white p-1">
              {[7, 30].map((d) => (
                <button key={d} onClick={() => setDays(d)} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", days === d ? "bg-ink text-white" : "text-ink-3")}>{d} días</button>
              ))}
            </div>
            <Button variant="ghost" icon={<RotateCcw className="size-4" />} onClick={reset}>Reiniciar demo</Button>
          </>
        }
      />
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Escaneos" value={data.stats.scans} accent sub={`últimos ${days} días`} />
          <KpiCard label="Clientes" value={data.clients.length} sub={`${data.clients.filter((c) => c.user.status === "active").length} activos`} />
          <KpiCard label="Códigos activos" value={active} sub={`de ${data.codes.length} generados`} />
          <KpiCard label="Códigos en blanco" value={blank} sub="listos para vender" />
        </div>
        <DailyChart daily={data.stats.daily} />
        <div className="grid gap-5 lg:grid-cols-3">
          <RankList title="Clientes con más escaneos (30 d)" rows={topClients.map((c) => ({ label: c.profile?.name ?? c.user.name, value: c.scans30d }))} empty="Sin datos." />
          <RankList title="Enlaces más tocados" rows={data.stats.topLinks.map((l) => ({ label: l.label, value: l.clicks }))} empty="Sin clics." />
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold">Últimos clientes</h3>
              <Link href="/admin/clientes" className="text-sm font-medium text-brand hover:underline">Ver todos</Link>
            </div>
            <ul className="mt-4 space-y-3">
              {data.clients.slice(0, 5).map((c) => (
                <li key={c.user.id} className="flex items-center gap-3 text-sm">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-paper-2 font-semibold">{(c.profile?.name ?? c.user.name).slice(0, 1)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.profile?.name ?? "Sin biosite"}</span>
                    <span className="block truncate text-xs text-ink-3">{c.user.email}</span>
                  </span>
                  <span className="text-xs text-ink-3">{formatDate(c.user.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </PanelPage>
  );
}
