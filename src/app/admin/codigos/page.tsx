"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Ban, Download, ExternalLink, Link2, RotateCcw, Search, Unlink } from "lucide-react";
import type { ShortCode } from "@/lib/types";
import { db } from "@/lib/data";
import { useAsync } from "@/lib/hooks";
import { codeUrl, cn, formatDate } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { PanelPage } from "@/components/panel/editor";
import { PageHeader } from "@/components/panel/shell";
import { AssignCodeModal } from "@/components/panel/assign";
import { QrDownloads, QrImage } from "@/components/panel/qr-tools";
import { Badge, EmptyState, Modal, PageLoader, Select } from "@/components/ui";

const STATUS = {
  active: { label: "Activo", tone: "ok" as const },
  unassigned: { label: "En blanco", tone: "neutral" as const },
  disabled: { label: "Desactivado", tone: "danger" as const },
};

function Codes() {
  const params = useSearchParams();
  const toast = useToast();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState<"" | ShortCode["status"]>("");
  const [batchId, setBatchId] = useState(params.get("lote") ?? "");
  const [assigning, setAssigning] = useState<ShortCode | null>(null);
  const [qrFor, setQrFor] = useState<ShortCode | null>(null);

  const meta = useAsync(async () => {
    const [clients, batches] = await Promise.all([db.users.listClients(), db.codes.listBatches()]);
    return { profiles: new Map(clients.filter((c) => c.profile).map((c) => [c.profile!.id, c.profile!])), batches };
  }, []);
  const { data: codes, loading, reload } = useAsync(() => db.codes.listAll({ q: q || undefined, status: status || undefined, batchId: batchId || undefined }), [q, status, batchId]);

  const counts = useMemo(() => {
    const all = codes ?? [];
    return { total: all.length, active: all.filter((c) => c.status === "active").length };
  }, [codes]);

  async function act(c: ShortCode, action: "release" | "disable" | "enable") {
    if (action === "release" && !confirm(`¿Liberar ${c.code}? Quedará en blanco y podrá activarse de nuevo.`)) return;
    if (action === "release") await db.codes.assign(c.code, null);
    if (action === "disable") await db.codes.setStatus(c.code, "disabled");
    if (action === "enable") await db.codes.setStatus(c.code, c.profileId ? "active" : "unassigned");
    toast.success("Código actualizado");
    reload();
  }

  return (
    <PanelPage wide>
      <PageHeader title="Códigos" description="Asigná, reasigná o desactivá cualquier código corto." />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3">
          <Search className="size-4 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar código o etiqueta" className="h-10 flex-1 bg-transparent font-mono text-sm uppercase outline-none placeholder:font-sans placeholder:normal-case" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-auto">
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="unassigned">En blanco</option>
          <option value="disabled">Desactivados</option>
        </Select>
        <Select value={batchId} onChange={(e) => setBatchId(e.target.value)} className="w-auto">
          <option value="">Todos los lotes</option>
          {meta.data?.batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
      </div>
      <p className="mb-3 text-sm text-ink-3">{counts.total} códigos · {counts.active} activos</p>

      {loading && !codes ? (
        <PageLoader />
      ) : !codes?.length ? (
        <EmptyState title="Sin códigos" description="Probá con otros filtros o generá un lote nuevo." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-paper/60 text-left text-xs uppercase tracking-wide text-ink-3">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Perfil</th>
                  <th className="px-4 py-3 font-medium max-lg:hidden">Lote</th>
                  <th className="px-4 py-3 font-medium max-md:hidden">Activado</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {codes.map((c) => {
                  const p = c.profileId ? meta.data?.profiles.get(c.profileId) : null;
                  const b = meta.data?.batches.find((x) => x.id === c.batchId);
                  return (
                    <tr key={c.code} className={cn("hover:bg-paper/40", c.status === "disabled" && "text-ink-3")}>
                      <td className="px-4 py-3">
                        <p className="font-mono font-semibold tracking-wider">{c.code}</p>
                        <p className="text-xs text-ink-3">{c.label || c.kind}</p>
                      </td>
                      <td className="px-4 py-3"><Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge></td>
                      <td className="px-4 py-3">{p ? <a href={`/${p.slug}`} target="_blank" className="inline-flex items-center gap-1 font-medium hover:text-brand">{p.name} <ExternalLink className="size-3" /></a> : <span className="text-ink-3">—</span>}</td>
                      <td className="px-4 py-3 text-ink-3 max-lg:hidden">{b?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-ink-3 max-md:hidden">{formatDate(c.activatedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <IconBtn title="QR" onClick={() => setQrFor(c)}><Download className="size-4" /></IconBtn>
                          {c.status !== "disabled" && <IconBtn title={c.profileId ? "Reasignar" : "Asignar"} onClick={() => setAssigning(c)}><Link2 className="size-4" /></IconBtn>}
                          {c.profileId && c.status !== "disabled" && <IconBtn title="Liberar" onClick={() => act(c, "release")}><Unlink className="size-4" /></IconBtn>}
                          {c.status === "disabled" ? (
                            <IconBtn title="Reactivar" onClick={() => act(c, "enable")}><RotateCcw className="size-4" /></IconBtn>
                          ) : (
                            <IconBtn title="Desactivar" danger onClick={() => act(c, "disable")}><Ban className="size-4" /></IconBtn>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AssignCodeModal code={assigning} onClose={() => setAssigning(null)} onDone={() => { reload(); meta.reload(); }} />
      <Modal open={!!qrFor} onClose={() => setQrFor(null)} title={`QR · ${qrFor?.code}`}>
        {qrFor && (
          <div className="text-center">
            <QrImage text={codeUrl(qrFor.code)} className="mx-auto w-56 border border-line p-2" />
            <p className="mb-4 mt-2 font-mono text-sm text-ink-3">{codeUrl(qrFor.code)}</p>
            <QrDownloads text={codeUrl(qrFor.code)} filename={`qr-${qrFor.code}`} caption={qrFor.code} pdfSubtitle={codeUrl(qrFor.code)} />
          </div>
        )}
      </Modal>
    </PanelPage>
  );
}

function IconBtn({ children, title, onClick, danger }: { children: React.ReactNode; title: string; onClick: () => void; danger?: boolean }) {
  return (
    <button title={title} aria-label={title} onClick={onClick} className={cn("grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-paper-2", danger ? "hover:text-danger" : "hover:text-ink")}>
      {children}
    </button>
  );
}

export default function AdminCodes() {
  return <Suspense><Codes /></Suspense>;
}

