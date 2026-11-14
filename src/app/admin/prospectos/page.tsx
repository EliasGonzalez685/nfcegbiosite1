"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, MessageCircle, Phone, Plus, Store, Target, Trash2 } from "lucide-react";
import type { Lead, LeadStatus } from "@/lib/types";
import { deleteLead, listLeads, saveLead } from "@/lib/api";
import { friendlyError } from "@/lib/supabase";
import { whatsappHref } from "@/lib/links";
import { cn, formatDate } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import { useSession } from "@/components/session";
import { useToast } from "@/components/ui/toast";
import { Page, PageHead } from "@/components/panel/top-bar";
import { Button, EmptyState, Field, Input, Modal, PageLoader, Textarea } from "@/components/ui";

const STATUS: { id: LeadStatus; label: string; color: string }[] = [
  { id: "nuevo", label: "Nuevo", color: "bg-sky-100 text-sky-800" },
  { id: "contactado", label: "Contactado", color: "bg-violet-100 text-violet-800" },
  { id: "interesado", label: "Interesado", color: "bg-amber-100 text-amber-800" },
  { id: "cerrado", label: "Cerrado ✓", color: "bg-brand-soft text-brand" },
  { id: "perdido", label: "Perdido", color: "bg-paper-2 text-ink-3" },
];
const statusMeta = (s: LeadStatus) => STATUS.find((x) => x.id === s)!;

function Leads() {
  const { me } = useSession();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const { data, setData, loading, reload } = useAsync(() => listLeads(), []);
  const [filter, setFilter] = useState<LeadStatus | "activos">("activos");
  const [editing, setEditing] = useState<Partial<Lead> | null>(params.get("nuevo") === "1" ? { status: "nuevo" } : null);

  const list = useMemo(
    () => (data ?? []).filter((l) => (filter === "activos" ? !["cerrado", "perdido"].includes(l.status) : l.status === filter)),
    [data, filter],
  );
  const today = new Date().toISOString().slice(0, 10);

  async function quickStatus(l: Lead, status: LeadStatus) {
    try {
      await saveLead({ ...l, status });
      setData((d) => d?.map((x) => (x.id === l.id ? { ...x, status } : x)) ?? null);
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  return (
    <Page>
      <PageHead
        title="Prospectos"
        description={me?.role === "admin" ? "Posibles clientes que cargan los vendedores." : "Los negocios que estás visitando o contactando."}
        actions={<Button icon={<Plus className="size-4" />} onClick={() => setEditing({ status: "nuevo" })}>Nuevo prospecto</Button>}
      />

      <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {[{ id: "activos" as const, label: "En curso" }, ...STATUS].map((s) => {
          const n = s.id === "activos" ? (data ?? []).filter((l) => !["cerrado", "perdido"].includes(l.status)).length : (data ?? []).filter((l) => l.status === s.id).length;
          return (
            <button key={s.id} onClick={() => setFilter(s.id)} className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition", filter === s.id ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-2 hover:border-ink-3")}>
              {s.label} <span className="opacity-60">{n}</span>
            </button>
          );
        })}
      </div>

      {loading && !data ? (
        <PageLoader />
      ) : !list.length ? (
        <EmptyState icon={<Target className="size-6" />} title="Nada por acá" description="Cargá los negocios que visitás para hacerles seguimiento." action={<Button onClick={() => setEditing({ status: "nuevo" })}>Cargar prospecto</Button>} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((l) => (
            <li key={l.id} className="card flex flex-col p-4">
              <div className="flex items-start gap-3">
                <button onClick={() => setEditing(l)} className="min-w-0 flex-1 text-left">
                  <p className="truncate font-semibold">{l.businessName}</p>
                  <p className="truncate text-sm text-ink-3">{[l.contactName, l.category, l.city].filter(Boolean).join(" · ") || "Sin datos"}</p>
                </button>
                <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", statusMeta(l.status).color)}>{statusMeta(l.status).label}</span>
              </div>
              {l.notes && <p className="mt-2 line-clamp-2 text-sm text-ink-2">{l.notes}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-3">
                {l.nextContactOn && (
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", l.nextContactOn <= today ? "bg-clay-soft font-semibold text-clay" : "bg-paper")}>
                    <CalendarClock className="size-3" /> {l.nextContactOn <= today ? "Contactar hoy" : formatDate(l.nextContactOn)}
                  </span>
                )}
                {me?.role === "admin" && l.seller && <span>Vendedor: {l.seller.fullName || l.seller.email}</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                {l.phone && (
                  <>
                    <a href={whatsappHref(l.phone.replace(/^0/, "595"))} target="_blank" rel="noopener"><Button size="sm" variant="secondary" icon={<MessageCircle className="size-3.5" />}>WhatsApp</Button></a>
                    <a href={`tel:${l.phone}`}><Button size="sm" variant="ghost" icon={<Phone className="size-3.5" />}>Llamar</Button></a>
                  </>
                )}
                <select value={l.status} onChange={(e) => quickStatus(l, e.target.value as LeadStatus)} className="ml-auto rounded-lg border border-line bg-white px-2 text-xs font-medium">
                  {STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                {l.status === "cerrado" && (
                  <Button size="sm" icon={<Store className="size-3.5" />} onClick={() => router.push(`/admin/negocios?nuevo=1&nombre=${encodeURIComponent(l.businessName)}`)}>Crear negocio</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && <LeadModal lead={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </Page>
  );
}

function LeadModal({ lead, onClose, onSaved }: { lead: Partial<Lead>; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<Partial<Lead>>({ status: "nuevo", ...lead });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Lead) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveLead({ ...f, businessName: f.businessName ?? "", status: f.status ?? "nuevo" });
      toast.success("Prospecto guardado");
      onSaved();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!lead.id || !confirm("¿Eliminar este prospecto?")) return;
    try {
      await deleteLead(lead.id);
      onSaved();
    } catch (err) {
      toast.error(friendlyError(err));
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={lead.id ? "Editar prospecto" : "Nuevo prospecto"}
      footer={
        <>
          {lead.id && <Button variant="danger" className="mr-auto" icon={<Trash2 className="size-4" />} onClick={remove}>Eliminar</Button>}
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="lead" loading={busy}>Guardar</Button>
        </>
      }
    >
      <form id="lead" onSubmit={submit} className="space-y-4">
        <div>
          <p className="label">Estado</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUS.map((s) => (
              <button type="button" key={s.id} onClick={() => setF({ ...f, status: s.id })} className={cn("rounded-full px-3 py-1.5 text-sm font-semibold transition", f.status === s.id ? s.color + " ring-2 ring-ink/20" : "bg-paper text-ink-3")}>{s.label}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Negocio"><Input required autoFocus value={f.businessName ?? ""} onChange={set("businessName")} placeholder="Pizzería La Esquina" /></Field>
          <Field label="Persona de contacto"><Input value={f.contactName ?? ""} onChange={set("contactName")} /></Field>
          <Field label="Teléfono / WhatsApp"><Input type="tel" value={f.phone ?? ""} onChange={set("phone")} placeholder="0981 123 456" /></Field>
          <Field label="Email"><Input type="email" value={f.email ?? ""} onChange={set("email")} /></Field>
          <Field label="Rubro"><Input value={f.category ?? ""} onChange={set("category")} placeholder="Restaurante" /></Field>
          <Field label="Ciudad"><Input value={f.city ?? ""} onChange={set("city")} /></Field>
          <Field label="Próximo contacto"><Input type="date" value={f.nextContactOn ?? ""} onChange={set("nextContactOn")} /></Field>
        </div>
        <Field label="Notas"><Textarea rows={3} value={f.notes ?? ""} onChange={set("notes")} placeholder="Qué le interesa, cuántas mesas tiene, presupuesto…" /></Field>
      </form>
    </Modal>
  );
}

export default function LeadsPage() {
  return (
    <Suspense>
      <Leads />
    </Suspense>
  );
}
