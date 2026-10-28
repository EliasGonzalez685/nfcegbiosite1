"use client";

import { useState } from "react";
import { ExternalLink, RotateCcw, Search } from "lucide-react";
import { db } from "@/lib/data";
import { resetDB } from "@/lib/data/mock/store";
import { useAsync } from "@/lib/hooks";
import { formatDate } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { useToast } from "@/components/ui/toast";
import { Badge, Button, EmptyState, PageLoader } from "@/components/ui";
import type { ClientRow } from "@/lib/types";

export default function AdminClients() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const { data, loading, reload } = useAsync(() => db.users.listClients(q), [q]);

  async function toggle(c: ClientRow) {
    const next = c.user.status === "active" ? "suspended" : "active";
    if (next === "suspended" && !confirm(`¿Suspender a ${c.profile?.name ?? c.user.name}? No podrá entrar a su panel.`)) return;
    await db.users.setStatus(c.user.id, next);
    toast.success(next === "active" ? "Cuenta reactivada" : "Cuenta suspendida");
    reload();
  }

  function reset() {
    if (!confirm("¿Restaurar los datos de prueba? Se pierden los cambios hechos en este navegador.")) return;
    resetDB();
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Clientes</h1>
          <p className="mt-1 text-ink-3">{data ? `${data.length} negocios con página en ${BRAND.name}` : "…"}</p>
        </div>
        <Button variant="ghost" icon={<RotateCcw className="size-4" />} onClick={reset}>Reiniciar demo</Button>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-white px-3">
        <Search className="size-4 text-ink-3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por negocio, nombre o email" className="h-11 flex-1 bg-transparent outline-none" />
      </div>

      {loading && !data ? (
        <PageLoader />
      ) : !data?.length ? (
        <EmptyState title="Sin clientes" description={q ? "Probá con otra búsqueda." : "Cuando alguien cree su cuenta aparecerá acá."} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <li key={c.user.id} className="card flex flex-col p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#141415] p-[2px]" style={{ background: c.profile?.accent ?? "#999" }}>
                  <span className="grid size-full place-items-center overflow-hidden rounded-full bg-[#141415] font-semibold text-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {c.profile?.avatarUrl ? <img src={c.profile.avatarUrl} alt="" className="size-full object-cover" /> : (c.profile?.name ?? "?").slice(0, 1)}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.profile?.name ?? "Sin página"}</p>
                  <p className="truncate text-sm text-ink-3">{c.profile ? `/${c.profile.slug}` : "—"}</p>
                </div>
                {c.user.status === "active" ? <Badge tone="ok">Activo</Badge> : <Badge tone="danger">Suspendido</Badge>}
              </div>
              <div className="mt-3 space-y-0.5 text-sm">
                <p className="truncate"><span className="text-ink-3">Titular:</span> {c.user.name}</p>
                <p className="truncate"><span className="text-ink-3">Email:</span> {c.user.email}</p>
                <p className="text-ink-3">
                  {c.profile?.links.filter((l) => l.enabled).length ?? 0} botones{c.profile?.menu.enabled ? ` · menú con ${c.profile.menu.categories.reduce((n, x) => n + x.items.length, 0)} productos` : ""} · alta {formatDate(c.user.createdAt)}
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                {c.profile && (
                  <a href={`/${c.profile.slug}`} target="_blank" className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full" icon={<ExternalLink className="size-4" />}>Ver página</Button>
                  </a>
                )}
                <Button variant={c.user.status === "active" ? "danger" : "primary"} size="sm" onClick={() => toggle(c)}>
                  {c.user.status === "active" ? "Suspender" : "Reactivar"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
