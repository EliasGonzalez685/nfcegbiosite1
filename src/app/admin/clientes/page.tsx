"use client";

import { useState } from "react";
import { ExternalLink, Plus, Search, Unlink } from "lucide-react";
import type { ClientRow, ShortCode } from "@/lib/types";
import { db } from "@/lib/data";
import { useAsync } from "@/lib/hooks";
import { formatDate, formatNumber } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { PanelPage } from "@/components/panel/editor";
import { PageHeader } from "@/components/panel/shell";
import { Badge, Button, EmptyState, Modal, PageLoader, Select, Spinner } from "@/components/ui";

export default function AdminClients() {
  const [q, setQ] = useState("");
  const { data, loading, reload } = useAsync(() => db.users.listClients(q), [q]);
  const [open, setOpen] = useState<ClientRow | null>(null);

  return (
    <PanelPage>
      <PageHeader title="Clientes" description="Negocios con cuenta en la plataforma." />
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-white px-3">
        <Search className="size-4 text-ink-3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por negocio, nombre o email" className="h-11 flex-1 bg-transparent outline-none" />
      </div>
      {loading && !data ? (
        <PageLoader />
      ) : !data?.length ? (
        <EmptyState title="Sin clientes" description={q ? "Probá con otra búsqueda." : "Cuando alguien cree su cuenta aparecerá acá."} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-paper/60 text-left text-xs uppercase tracking-wide text-ink-3">
                <tr>
                  <th className="px-4 py-3 font-medium">Negocio</th>
                  <th className="px-4 py-3 font-medium max-md:hidden">Titular</th>
                  <th className="px-4 py-3 text-right font-medium">Códigos</th>
                  <th className="px-4 py-3 text-right font-medium max-sm:hidden">Escaneos 30 d</th>
                  <th className="px-4 py-3 font-medium max-sm:hidden">Estado</th>
                  <th className="px-4 py-3 font-medium max-lg:hidden">Alta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.map((c) => (
                  <tr key={c.user.id} onClick={() => setOpen(c)} className="cursor-pointer hover:bg-paper/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-paper-2 font-semibold">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {c.profile?.avatarUrl ? <img src={c.profile.avatarUrl} alt="" className="size-full object-cover" /> : (c.profile?.name ?? "?").slice(0, 1)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.profile?.name ?? "Sin biosite"}</p>
                          <p className="truncate text-xs text-ink-3">{c.profile ? `/${c.profile.slug}` : c.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-md:hidden"><p>{c.user.name}</p><p className="text-xs text-ink-3">{c.user.email}</p></td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.codes}</td>
                    <td className="px-4 py-3 text-right tabular-nums max-sm:hidden">{formatNumber(c.scans30d)}</td>
                    <td className="px-4 py-3 max-sm:hidden">{c.user.status === "active" ? <Badge tone="ok">Activo</Badge> : <Badge tone="danger">Suspendido</Badge>}</td>
                    <td className="px-4 py-3 text-ink-3 max-lg:hidden">{formatDate(c.user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ClientDetail row={open} onClose={() => setOpen(null)} onChanged={reload} />
    </PanelPage>
  );
}

function ClientDetail({ row, onClose, onChanged }: { row: ClientRow | null; onClose: () => void; onChanged: () => void }) {
  const toast = useToast();
  const pid = row?.profile?.id;
  const { data, loading, reload } = useAsync(async () => {
    if (!pid) return null;
    const [codes, blank] = await Promise.all([db.codes.listByProfile(pid), db.codes.listAll({ status: "unassigned" })]);
    return { codes, blank };
  }, [pid]);
  const [pick, setPick] = useState("");
  const [status, setStatus] = useState(row?.user.status);
  const currentStatus = status ?? row?.user.status;

  async function assign() {
    if (!pick || !pid) return;
    await db.codes.assign(pick, pid);
    toast.success(`${pick} asignado`);
    setPick("");
    reload();
    onChanged();
  }
  async function release(c: ShortCode) {
    if (!confirm(`¿Liberar ${c.code}? La tarjeta volverá a quedar en blanco.`)) return;
    await db.codes.assign(c.code, null);
    reload();
    onChanged();
  }
  async function toggleStatus() {
    if (!row) return;
    const next = currentStatus === "active" ? "suspended" : "active";
    await db.users.setStatus(row.user.id, next);
    setStatus(next);
    toast.success(next === "active" ? "Cuenta reactivada" : "Cuenta suspendida");
    onChanged();
  }

  return (
    <Modal open={!!row} onClose={() => { setStatus(undefined); onClose(); }} title={row?.profile?.name ?? row?.user.name ?? ""} wide>
      {row && (
        <div className="space-y-6">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div><p className="text-ink-3">Titular</p><p className="font-medium">{row.user.name}</p></div>
            <div><p className="text-ink-3">Email</p><p className="font-medium">{row.user.email}</p></div>
            <div><p className="text-ink-3">Alta</p><p className="font-medium">{formatDate(row.user.createdAt)}</p></div>
            <div><p className="text-ink-3">Escaneos (30 d)</p><p className="font-medium">{formatNumber(row.scans30d)}</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {row.profile && <a href={`/${row.profile.slug}`} target="_blank"><Button variant="secondary" size="sm" icon={<ExternalLink className="size-4" />}>Ver biosite</Button></a>}
            <Button variant={currentStatus === "active" ? "danger" : "primary"} size="sm" onClick={toggleStatus}>{currentStatus === "active" ? "Suspender cuenta" : "Reactivar cuenta"}</Button>
          </div>

          <div>
            <h3 className="mb-2 font-display font-semibold">Códigos asignados</h3>
            {!pid ? (
              <p className="text-sm text-ink-3">Este cliente aún no creó su biosite.</p>
            ) : loading || !data ? (
              <Spinner />
            ) : (
              <>
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {data.codes.map((c) => (
                    <li key={c.code} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="font-mono font-semibold tracking-wider">{c.code}</span>
                      <span className="flex-1 truncate text-ink-3">{c.label || c.kind}</span>
                      <Button size="sm" variant="ghost" icon={<Unlink className="size-4" />} onClick={() => release(c)}>Liberar</Button>
                    </li>
                  ))}
                  {data.codes.length === 0 && <li className="px-3 py-4 text-center text-sm text-ink-3">Sin códigos</li>}
                </ul>
                <div className="mt-3 flex gap-2">
                  <Select value={pick} onChange={(e) => setPick(e.target.value)} className="flex-1">
                    <option value="">Elegir código en blanco…</option>
                    {data.blank.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.kind}</option>)}
                  </Select>
                  <Button disabled={!pick} icon={<Plus className="size-4" />} onClick={assign}>Asignar</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
