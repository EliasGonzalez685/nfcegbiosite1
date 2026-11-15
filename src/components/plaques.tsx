"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check, CircleDashed, Copy, Download, ExternalLink, Gift, Globe, Layers, Lock, MapPin, Nfc, Palette, Pencil, Plus, QrCode,
  ScanLine, Search, SkipForward, Square, SquareCheck, Star, Store, Trash2, UtensilsCrossed, Wifi, X,
} from "lucide-react";
import type { BusinessRow, DeviceKind, Plaque, PlaqueTarget } from "@/lib/types";
import { createBlankPlaques, createPlaque, deletePlaque, listPlaques, updatePlaque, type PlaqueInput } from "@/lib/api";
import { friendlyError } from "@/lib/supabase";
import { whatsappHref } from "@/lib/links";
import { cn, getBaseUrl, relativeTime } from "@/lib/utils";
import { useAsync, useCopy } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { Badge, Button, EmptyState, Field, Input, Modal, PageLoader, Select, Textarea, Toggle } from "@/components/ui";
import { QrDownloads, QrImage } from "@/components/panel/qr-tools";
import { LinkIcon } from "@/components/biosite/link-icon";
import { PlaqueDesigner } from "@/components/plaque-designer";

export const plaqueUrl = (code: string) => `${getBaseUrl()}/q/${code}`;

const KIND: Record<DeviceKind, { label: string; short: string }> = {
  nfc_qr: { label: "NFC + QR", short: "NFC + QR" },
  qr: { label: "Solo QR", short: "QR" },
  nfc: { label: "Solo NFC", short: "NFC" },
};

const IgIcon = ({ className }: { className?: string }) => <LinkIcon type="instagram" className={className} />;
const WaIcon = ({ className }: { className?: string }) => <LinkIcon type="whatsapp" className={className} />;

/** Destinos que se eligen al configurar una plaquita */
type Preset = "none" | "business" | "menu" | "wifi" | "loyalty" | "whatsapp" | "instagram" | "review" | "maps" | "url";
const PRESETS: { id: Preset; label: string; icon: React.ComponentType<{ className?: string }>; needsBusiness: boolean }[] = [
  { id: "business", label: "Página del negocio", icon: Store, needsBusiness: true },
  { id: "menu", label: "Menú", icon: UtensilsCrossed, needsBusiness: true },
  { id: "wifi", label: "WiFi", icon: Wifi, needsBusiness: true },
  { id: "loyalty", label: "Tarjeta de fidelidad", icon: Gift, needsBusiness: true },
  { id: "whatsapp", label: "WhatsApp", icon: WaIcon, needsBusiness: false },
  { id: "instagram", label: "Instagram", icon: IgIcon, needsBusiness: false },
  { id: "review", label: "Reseña en Google", icon: Star, needsBusiness: false },
  { id: "maps", label: "Ubicación", icon: MapPin, needsBusiness: false },
  { id: "url", label: "Otro enlace", icon: Globe, needsBusiness: false },
  { id: "none", label: "Sin destino (después)", icon: CircleDashed, needsBusiness: false },
];

function presetOf(p: Pick<Plaque, "targetType" | "targetUrl">): Preset {
  if (p.targetType !== "url") return p.targetType as Preset;
  const u = p.targetUrl ?? "";
  if (/wa\.me|whatsapp\.com/i.test(u)) return "whatsapp";
  if (/instagram\.com/i.test(u)) return "instagram";
  if (/g\.page\/r|writereview|search\.google\.com\/local/i.test(u)) return "review";
  if (/maps\.(app\.)?goo|google\.[a-z.]+\/maps/i.test(u)) return "maps";
  return "url";
}

export function describeTarget(p: Plaque) {
  const biz = p.business?.name ?? "negocio";
  switch (p.targetType) {
    case "business": return `Página de ${biz}`;
    case "menu": return `Menú de ${biz}`;
    case "wifi": return `WiFi de ${biz}`;
    case "loyalty": return `Fidelización de ${biz}`;
    case "none": return "Sin destino todavía";
    default: return (p.targetUrl ?? "").replace(/^https?:\/\/(www\.)?/, "");
  }
}

function TargetIcon({ p, className = "size-4" }: { p: Plaque; className?: string }) {
  const Icon = PRESETS.find((x) => x.id === presetOf(p))?.icon ?? Globe;
  return <Icon className={className} />;
}

// ───────────────────────────── Lista ─────────────────────────────

export function PlaqueManager({
  businessId,
  businesses,
  canEdit,
  canDelete = false,
  startCreating = false,
  configCode,
}: {
  /** Si se pasa, muestra solo las plaquitas de ese negocio y las nuevas quedan asociadas a él */
  businessId?: string;
  businesses?: BusinessRow[];
  canEdit: boolean;
  canDelete?: boolean;
  /** Abre directamente el formulario de nueva plaquita */
  startCreating?: boolean;
  /** Abre la configuración de la plaquita con este código (al escanear una sin destino) */
  configCode?: string | null;
}) {
  const toast = useToast();
  const { data, setData, loading, reload } = useAsync(() => listPlaques(businessId), [businessId]);
  const [editing, setEditing] = useState<Plaque | "new" | null>(startCreating && canEdit ? "new" : null);
  const [nfcQueue, setNfcQueue] = useState<Plaque[] | null>(null);
  const [qrFor, setQrFor] = useState<Plaque | null>(null);
  const [designFor, setDesignFor] = useState<Plaque[] | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "none">("all");
  const [readerOpen, setReaderOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const openedConfig = useRef(false);

  // llegó escaneando una plaquita sin destino → abrir su configuración
  useEffect(() => {
    if (!configCode || !data || openedConfig.current || !canEdit) return;
    openedConfig.current = true;
    const p = data.find((x) => x.code === configCode.toUpperCase());
    if (p) setTimeout(() => setEditing(p), 0);
    else setTimeout(() => toast.error(`No encontramos la plaquita ${configCode} entre las tuyas`), 0);
  }, [configCode, data, canEdit, toast]);

  const blanks = (data ?? []).filter((p) => p.targetType === "none").length;
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? []).filter(
      (p) =>
        (filter === "all" || p.targetType === "none") &&
        (!s || p.code.toLowerCase().includes(s) || p.label.toLowerCase().includes(s) || describeTarget(p).toLowerCase().includes(s)),
    );
  }, [data, q, filter]);
  const chosen = (data ?? []).filter((p) => selected.has(p.id));

  const toggleSel = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function toggleActive(p: Plaque) {
    try {
      const saved = await updatePlaque(p.id, { ...p, active: !p.active });
      setData((l) => l?.map((x) => (x.id === p.id ? saved : x)) ?? null);
      toast.success(saved.active ? "Plaquita activada" : "Plaquita pausada");
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  async function remove(p: Plaque) {
    if (!confirm(`¿Eliminar la plaquita ${p.code}? Si ya está impresa o grabada, dejará de funcionar.`)) return;
    try {
      await deletePlaque(p.id);
      setData((l) => l?.filter((x) => x.id !== p.id) ?? null);
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  if (loading && !data) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(data?.length ?? 0) > 3 && (
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3">
            <Search className="size-4 text-ink-3" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, nombre o destino" className="h-10 flex-1 bg-transparent text-sm outline-none" />
          </div>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          {canEdit && <Button variant="secondary" icon={<ScanLine className="size-4" />} onClick={() => setReaderOpen(true)}>Leer plaquita</Button>}
          {canEdit && <Button variant="secondary" icon={<Layers className="size-4" />} onClick={() => setBatchOpen(true)}>Crear lote</Button>}
          {canEdit && <Button icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>Nueva plaquita</Button>}
        </div>
      </div>

      {(data?.length ?? 0) > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-line">
            <button onClick={() => setFilter("all")} className={cn("rounded-lg px-3 py-1.5 font-medium", filter === "all" ? "bg-ink text-white" : "text-ink-2")}>Todas ({data?.length})</button>
            <button onClick={() => setFilter("none")} className={cn("rounded-lg px-3 py-1.5 font-medium", filter === "none" ? "bg-ink text-white" : "text-ink-2")}>Sin destino ({blanks})</button>
          </div>
          <button onClick={() => setSelected(selected.size === list.length ? new Set() : new Set(list.map((p) => p.id)))} className="rounded-lg px-2 py-1.5 font-medium text-brand hover:bg-brand-soft">
            {selected.size === list.length && list.length ? "Quitar selección" : "Seleccionar todas"}
          </button>
        </div>
      )}

      {/* Acciones en grupo */}
      {chosen.length > 0 && (
        <div className="animate-rise sticky top-[60px] z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-ink p-2 pl-4 text-white shadow-xl lg:top-3">
          <span className="text-sm font-semibold">{chosen.length} seleccionada{chosen.length > 1 ? "s" : ""}</span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Button size="sm" variant="clay" icon={<Palette className="size-4" />} onClick={() => setDesignFor(chosen)}>Diseñar e imprimir</Button>
            {canEdit && <Button size="sm" variant="secondary" icon={<Nfc className="size-4" />} onClick={() => setNfcQueue(chosen.filter((p) => p.kind !== "qr"))} disabled={!chosen.some((p) => p.kind !== "qr")}>Grabar NFC en serie</Button>}
            <button onClick={() => setSelected(new Set())} className="grid size-8 place-items-center rounded-lg text-white/70 hover:bg-white/10" aria-label="Limpiar selección"><X className="size-4" /></button>
          </div>
        </div>
      )}

      {!list.length ? (
        <EmptyState
          icon={<Nfc className="size-6" />}
          title={q || filter === "none" ? "Sin resultados" : "Todavía no hay plaquitas"}
          description={canEdit ? "Creá un lote en blanco para imprimir y grabar, y asignale el destino cuando la vendas. O creá una ya configurada." : "Cuando tu vendedor configure tus plaquitas NFC o QR, las vas a ver acá."}
          action={canEdit && !q ? <Button onClick={() => setBatchOpen(true)}>Crear lote en blanco</Button> : undefined}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((p) => {
            const sel = selected.has(p.id);
            return (
              <li key={p.id} className={cn("card group relative flex flex-col p-4 transition hover:shadow-md", !p.active && "bg-white/60", sel && "ring-2 ring-brand")}>
                <button onClick={() => toggleSel(p.id)} className={cn("absolute right-3 top-3 grid size-8 place-items-center rounded-lg transition", sel ? "text-brand" : "text-ink-3 opacity-60 hover:opacity-100")} aria-label="Seleccionar">
                  {sel ? <SquareCheck className="size-5" /> : <Square className="size-5" />}
                </button>
                <div className="flex items-start gap-3 pr-8">
                  <button onClick={() => setQrFor(p)} className="shrink-0 rounded-xl border border-line p-1 transition hover:border-ink-3" title="Ver QR">
                    <QrImage text={plaqueUrl(p.code)} size={160} className="size-16" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-lg font-bold tracking-[.15em]">{p.code}</p>
                      {p.targetType === "none" ? <Badge tone="warn">Sin destino</Badge> : <Badge tone={p.active ? "ok" : "neutral"}>{p.active ? "Activa" : "Pausada"}</Badge>}
                    </div>
                    <p className="truncate text-sm font-medium">{p.label || "Sin nombre"}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-ink-3">
                      <TargetIcon p={p} className="size-3.5 shrink-0" /> <span className="truncate">{describeTarget(p)}</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-ink-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 font-medium text-ink-2">
                    {p.kind !== "qr" && <Nfc className="size-3" />}{p.kind !== "nfc" && <QrCode className="size-3" />} {KIND[p.kind].short}
                  </span>
                  <span>{p.scans} {p.scans === 1 ? "escaneo" : "escaneos"}</span>
                  {p.lastScanAt && <span>· último {relativeTime(p.lastScanAt)}</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                  {canEdit && (
                    <Button size="sm" variant={p.targetType === "none" ? "primary" : "secondary"} icon={<Pencil className="size-3.5" />} onClick={() => setEditing(p)}>
                      {p.targetType === "none" ? "Asignar destino" : "Configurar"}
                    </Button>
                  )}
                  {canEdit && p.kind !== "qr" && <Button size="sm" variant="secondary" icon={<Nfc className="size-3.5" />} onClick={() => setNfcQueue([p])}>Grabar NFC</Button>}
                  <Button size="sm" variant="ghost" icon={<Palette className="size-3.5" />} onClick={() => setDesignFor([p])}>Diseño</Button>
                  <Button size="sm" variant="ghost" icon={<Download className="size-3.5" />} onClick={() => setQrFor(p)}>QR</Button>
                  <div className="ml-auto flex items-center gap-1">
                    {canEdit && <Toggle checked={p.active} onChange={() => toggleActive(p)} />}
                    {canDelete && (
                      <button onClick={() => remove(p)} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-red-50 hover:text-danger" aria-label="Eliminar">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <PlaqueForm
          plaque={editing === "new" ? null : editing}
          fixedBusinessId={businessId}
          businesses={businesses}
          onClose={() => setEditing(null)}
          onSaved={(p, isNew) => {
            setData((l) => (isNew ? [p, ...(l ?? [])] : l?.map((x) => (x.id === p.id ? p : x)) ?? [p]));
            setEditing(null);
            if (isNew && p.kind !== "qr") setNfcQueue([p]);
          }}
        />
      )}
      {batchOpen && (
        <BatchModal
          fixedBusinessId={businessId}
          businesses={businesses}
          onClose={() => setBatchOpen(false)}
          onCreated={(created) => {
            setData((l) => [...created, ...(l ?? [])]);
            setSelected(new Set(created.map((p) => p.id)));
            setBatchOpen(false);
            setDesignFor(created);
          }}
        />
      )}
      {nfcQueue && nfcQueue.length > 0 && <NfcWriter plaques={nfcQueue} onClose={() => setNfcQueue(null)} />}
      {qrFor && <QrModal plaque={qrFor} onClose={() => setQrFor(null)} />}
      {designFor && <PlaqueDesigner plaques={designFor} onClose={() => setDesignFor(null)} />}
      {readerOpen && <NfcReader plaques={data ?? []} onClose={() => setReaderOpen(false)} onOpen={(p) => { setReaderOpen(false); setEditing(p); }} onReload={reload} />}
    </div>
  );
}

// ───────────────────────────── Lote en blanco ─────────────────────────────

function BatchModal({
  fixedBusinessId,
  businesses,
  onClose,
  onCreated,
}: {
  fixedBusinessId?: string;
  businesses?: BusinessRow[];
  onClose: () => void;
  onCreated: (p: Plaque[]) => void;
}) {
  const toast = useToast();
  const [n, setN] = useState(10);
  const [kind, setKind] = useState<DeviceKind>("nfc_qr");
  const [prefix, setPrefix] = useState("Plaquita");
  const [businessId, setBusinessId] = useState(fixedBusinessId ?? "");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (n < 1 || n > 200) return toast.error("Elegí entre 1 y 200 plaquitas");
    setBusy(true);
    try {
      const created = await createBlankPlaques(n, kind, prefix.trim(), businessId || null);
      toast.success(`${created.length} plaquitas creadas. Ahora elegí el diseño para imprimirlas`);
      onCreated(created);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Crear lote de plaquitas en blanco"
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={busy} onClick={create}>Crear {n} plaquitas</Button></>}
    >
      <div className="space-y-4">
        <p className="rounded-xl bg-brand-soft/60 px-3 py-2.5 text-sm text-ink-2">
          Cada una recibe su código y su QR. Las imprimís y grabás ahora, y cuando la vendés le asignás el destino: <b>escaneala con tu sesión iniciada</b> y se abre directo su configuración.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cantidad"><Input type="number" min={1} max={200} value={n} onChange={(e) => setN(Number(e.target.value) || 0)} /></Field>
          <Field label="Nombre base" hint={`Quedan como “${prefix || "Plaquita"} 1”, “${prefix || "Plaquita"} 2”…`}><Input value={prefix} onChange={(e) => setPrefix(e.target.value)} /></Field>
        </div>
        <div>
          <p className="label">Tipo</p>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-paper-2 p-1">
            {(Object.keys(KIND) as DeviceKind[]).map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)} className={cn("rounded-lg py-2 text-xs font-semibold", kind === k ? "bg-white shadow-sm" : "text-ink-3")}>{KIND[k].label}</button>
            ))}
          </div>
        </div>
        {!fixedBusinessId && businesses && businesses.length > 0 && (
          <Field label="Negocio (opcional)" hint="Si ya sabés para quién son.">
            <Select value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
              <option value="">Sin negocio todavía</option>
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  );
}

// ───────────────────────────── Formulario ─────────────────────────────

function PlaqueForm({
  plaque,
  fixedBusinessId,
  businesses,
  onClose,
  onSaved,
}: {
  plaque: Plaque | null;
  fixedBusinessId?: string;
  businesses?: BusinessRow[];
  onClose: () => void;
  onSaved: (p: Plaque, isNew: boolean) => void;
}) {
  const toast = useToast();
  const initialPreset: Preset = plaque && presetOf(plaque) !== "none" ? presetOf(plaque) : "business";
  const [preset, setPreset] = useState<Preset>(initialPreset);
  const [label, setLabel] = useState(plaque?.label ?? "");
  const [kind, setKind] = useState<DeviceKind>(plaque?.kind ?? "nfc_qr");
  const [businessId, setBusinessId] = useState(plaque?.businessId ?? fixedBusinessId ?? "");
  const [active, setActive] = useState(plaque?.active ?? true);
  const [notes, setNotes] = useState(plaque?.notes ?? "");
  const [url, setUrl] = useState(plaque?.targetUrl ?? "");
  // ayudas para armar el enlace
  const waMatch = /wa\.me\/(\d+)(?:\?text=(.*))?/.exec(plaque?.targetUrl ?? "");
  const [waNumber, setWaNumber] = useState(waMatch?.[1] ?? "");
  const [waText, setWaText] = useState(waMatch?.[2] ? decodeURIComponent(waMatch[2]) : "");
  const igMatch = /instagram\.com\/([^/?#]+)/.exec(plaque?.targetUrl ?? "");
  const [igUser, setIgUser] = useState(igMatch?.[1] ?? "");
  const [busy, setBusy] = useState(false);

  const meta = PRESETS.find((p) => p.id === preset)!;
  const needsBusiness = meta.needsBusiness;

  function buildInput(): PlaqueInput | string {
    let targetType: PlaqueTarget = "url";
    let targetUrl: string | null = null;
    if (preset === "none") {
      targetType = "none";
    } else if (needsBusiness) {
      if (!businessId) return "Elegí el negocio";
      targetType = preset as PlaqueTarget;
    } else if (preset === "whatsapp") {
      const n = waNumber.replace(/\D/g, "");
      if (n.length < 8) return "Escribí el número con código de país, ej. 595981123456";
      targetUrl = whatsappHref(n, waText.trim() || undefined);
    } else if (preset === "instagram") {
      const u = igUser.replace(/^@/, "").trim();
      if (!u) return "Escribí el usuario de Instagram";
      targetUrl = `https://instagram.com/${u}`;
    } else {
      const t = url.trim();
      if (!t) return "Pegá el enlace";
      targetUrl = /^(https?:\/\/|mailto:|tel:)/i.test(t) ? t : `https://${t}`;
    }
    return { label: label.trim(), kind, targetType, businessId: needsBusiness ? businessId : businessId || null, targetUrl, active, notes };
  }

  async function save() {
    const input = buildInput();
    if (typeof input === "string") return toast.error(input);
    setBusy(true);
    try {
      const saved = plaque ? await updatePlaque(plaque.id, input) : await createPlaque(input);
      toast.success(plaque ? "Destino actualizado: la plaquita ya abre lo nuevo" : `Plaquita ${saved.code} creada`);
      onSaved(saved, !plaque);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      wide
      title={plaque ? `Configurar plaquita ${plaque.code}` : "Nueva plaquita"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={busy} onClick={save}>{plaque ? "Guardar cambios" : "Crear plaquita"}</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre para identificarla" hint="Ej.: Mesa 4, Mostrador, Tarjeta de Juan">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Mesa 4" autoFocus />
          </Field>
          <div>
            <p className="label">Tipo de plaquita</p>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-paper-2 p-1">
              {(Object.keys(KIND) as DeviceKind[]).map((k) => (
                <button key={k} type="button" onClick={() => setKind(k)} className={cn("rounded-lg py-2 text-xs font-semibold transition", kind === k ? "bg-white shadow-sm" : "text-ink-3")}>
                  {KIND[k].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="label">¿Qué abre al escanearla o acercar el celular?</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-center text-xs font-medium transition",
                  preset === p.id ? "border-brand bg-brand-soft/60 text-brand ring-2 ring-brand/20" : "border-line text-ink-2 hover:border-ink-3",
                )}
              >
                <p.icon className="size-5" />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="animate-rise rounded-2xl bg-paper/70 p-4" key={preset}>
          {needsBusiness && !fixedBusinessId && (
            <Field label="Negocio">
              <Select value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
                <option value="">Elegí un negocio…</option>
                {businesses?.map((b) => <option key={b.id} value={b.id}>{b.name} — /{b.slug}</option>)}
              </Select>
            </Field>
          )}
          {needsBusiness && fixedBusinessId && <p className="text-sm text-ink-2">Abre {meta.label.toLowerCase()} de este negocio.</p>}
          {preset === "wifi" && <p className="mt-2 text-xs text-ink-3">Muestra la red y el botón “Copiar contraseña” (del botón WiFi del negocio). Ningún sitio web puede conectar al WiFi solo.</p>}
          {preset === "loyalty" && <p className="mt-2 text-xs text-ink-3">Cada vez que el cliente la escanea suma un sello. Configurá el premio en la pestaña Fidelización del negocio.</p>}
          {preset === "whatsapp" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Número" hint="Con código de país, sin +"><Input inputMode="numeric" value={waNumber} onChange={(e) => setWaNumber(e.target.value)} placeholder="595981123456" /></Field>
              <Field label="Mensaje (opcional)"><Input value={waText} onChange={(e) => setWaText(e.target.value)} placeholder="Hola, quiero…" /></Field>
            </div>
          )}
          {preset === "instagram" && (
            <Field label="Usuario de Instagram">
              <div className="flex items-center rounded-xl border border-line bg-white focus-within:border-brand">
                <span className="pl-3.5 text-ink-3">@</span>
                <input value={igUser} onChange={(e) => setIgUser(e.target.value)} className="h-11 flex-1 bg-transparent px-1 outline-none" placeholder="tunegocio" />
              </div>
            </Field>
          )}
          {(preset === "review" || preset === "maps" || preset === "url") && (
            <Field
              label={preset === "review" ? "Enlace para dejar reseña" : preset === "maps" ? "Enlace de Google Maps" : "Enlace"}
              hint={preset === "review" ? "En Google Business: Pedir reseñas → copiar enlace" : undefined}
            >
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </Field>
          )}
          {!needsBusiness && !fixedBusinessId && businesses && (
            <Field label="Negocio (opcional, para agruparla)" className="mt-3">
              <Select value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
                <option value="">Sin negocio</option>
                {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Notas internas (opcional)"><Textarea rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Color, material, a quién se entregó…" /></Field>
          <Toggle checked={active} onChange={setActive} label="Activa" />
        </div>
      </div>
    </Modal>
  );
}

// ───────────────────────────── QR ─────────────────────────────

function QrModal({ plaque, onClose }: { plaque: Plaque; onClose: () => void }) {
  const url = plaqueUrl(plaque.code);
  const { copied, copy } = useCopy();
  const local = /localhost|127\.0\.0\.1|192\.168\./.test(url);
  return (
    <Modal open onClose={onClose} title={`QR · ${plaque.code}`}>
      <div className="text-center">
        <QrImage text={url} className="mx-auto w-56 border border-line p-2" />
        <button onClick={() => copy(url)} className="mx-auto mt-3 flex max-w-full items-center gap-2 rounded-xl bg-paper px-3 py-2 text-sm hover:bg-paper-2">
          {copied ? <Check className="size-4 text-ok" /> : <Copy className="size-4 text-ink-3" />}
          <span className="truncate font-mono">{url}</span>
        </button>
        {local && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">Estás en modo local: este QR solo funciona en tu red. Para imprimir, descargalo desde la web publicada.</p>}
        <div className="mt-4">
          <QrDownloads text={url} filename={`plaquita-${plaque.code}`} caption={plaque.code} pdfTitle={plaque.label || plaque.code} pdfSubtitle={url} />
        </div>
        <a href={url} target="_blank" rel="noopener" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
          Probar ahora <ExternalLink className="size-3.5" />
        </a>
      </div>
    </Modal>
  );
}

// ───────────────────────────── NFC (Chrome en Android) ─────────────────────────────

interface NdefRecord { recordType: string; data?: DataView; encoding?: string }
interface NdefReaderLike {
  write(msg: { records: { recordType: string; data: string }[] }, opts?: { overwrite?: boolean; signal?: AbortSignal }): Promise<void>;
  scan(opts?: { signal?: AbortSignal }): Promise<void>;
  onreading: ((e: { serialNumber: string; message: { records: NdefRecord[] } }) => void) | null;
  onreadingerror: (() => void) | null;
  makeReadOnly?(opts?: { signal?: AbortSignal }): Promise<void>;
}
const getNdef = (): NdefReaderLike | null => {
  const W = window as unknown as { NDEFReader?: new () => NdefReaderLike };
  return W.NDEFReader ? new W.NDEFReader() : null;
};

function NfcHelp({ url }: { url: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="space-y-3 text-left text-sm text-ink-2">
      <p>Tu navegador no puede grabar NFC. Tenés dos opciones:</p>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>Abrí este panel en <b>Chrome desde un celular Android</b> con NFC activado.</li>
        <li>O usá la app gratuita <b>NFC Tools</b> (Android / iPhone): Escribir → Agregar registro → URL → pegá este enlace.</li>
      </ol>
      <button onClick={() => copy(url)} className="flex w-full items-center gap-2 rounded-xl bg-paper px-3 py-2.5 hover:bg-paper-2">
        {copied ? <Check className="size-4 text-ok" /> : <Copy className="size-4 text-ink-3" />}
        <span className="truncate font-mono text-xs">{url}</span>
      </button>
    </div>
  );
}

/** Graba una o varias plaquitas seguidas: acercás una, se graba y pasa a la siguiente */
function NfcWriter({ plaques, onClose }: { plaques: Plaque[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [lock, setLock] = useState(false);
  const [state, setState] = useState<"idle" | "waiting" | "ok" | "error" | "unsupported" | "finished">(() => (getNdef() ? "idle" : "unsupported"));
  const [msg, setMsg] = useState("");
  const plaque = plaques[Math.min(idx, plaques.length - 1)];
  const url = plaqueUrl(plaque.code);
  const serial = plaques.length > 1;

  useEffect(() => {
    if (state !== "waiting") return;
    const ctrl = new AbortController();
    const ndef = getNdef()!;
    (async () => {
      try {
        await ndef.write({ records: [{ recordType: "url", data: url }] }, { overwrite: true, signal: ctrl.signal });
        if (lock) {
          if (!ndef.makeReadOnly) throw new Error("Este celular no permite bloquear la plaquita, pero quedó grabada.");
          await ndef.makeReadOnly({ signal: ctrl.signal });
        }
        navigator.vibrate?.([80, 40, 80]);
        setDone((d) => new Set(d).add(plaque.id));
        if (idx + 1 < plaques.length) {
          setState("ok");
          setTimeout(() => {
            if (ctrl.signal.aborted) return;
            setIdx((i) => i + 1);
            setState("waiting");
          }, 1400);
        } else setState(serial ? "finished" : "ok");
      } catch (e) {
        const err = e as Error;
        if (err.name === "AbortError") return;
        setMsg(err.name === "NotAllowedError" ? "Permiso de NFC denegado. Activalo en los ajustes del navegador." : err.message);
        setState("error");
      }
    })();
    return () => ctrl.abort();
  }, [state, url, lock, idx, plaques.length, plaque.id, serial]);

  const skip = () => {
    if (idx + 1 < plaques.length) {
      setIdx(idx + 1);
      if (state !== "waiting") setState("idle");
    } else setState("finished");
  };

  return (
    <Modal open onClose={onClose} title={serial ? `Grabar NFC en serie · ${done.size}/${plaques.length}` : `Grabar NFC · ${plaque.code}`}>
      <div className="text-center">
        {serial && state !== "unsupported" && (
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-paper-2">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(done.size / plaques.length) * 100}%` }} />
          </div>
        )}
        {state === "unsupported" ? (
          <NfcHelp url={url} />
        ) : state === "finished" ? (
          <div className="animate-rise py-4">
            <div className="mx-auto grid size-20 place-items-center rounded-full bg-brand-soft text-brand"><Check className="size-10" /></div>
            <p className="mt-4 font-display text-xl font-bold">{done.size} de {plaques.length} plaquitas grabadas</p>
            <p className="mt-1 text-sm text-ink-3">Ya podés asignarles el destino cuando quieras, sin volver a grabarlas.</p>
            <Button className="mt-5" onClick={onClose}>Listo</Button>
          </div>
        ) : state === "ok" ? (
          <div className="animate-rise py-4">
            <div className="mx-auto grid size-20 place-items-center rounded-full bg-brand-soft text-brand"><Check className="size-10" /></div>
            <p className="mt-4 font-display text-xl font-bold">¡{plaque.code} grabada!</p>
            {serial ? (
              <p className="mt-1 text-sm text-ink-3">Sacá esa plaquita. Sigue la próxima…</p>
            ) : (
              <>
                <p className="mt-1 text-sm text-ink-3">Acercá otro celular para probarla. El destino lo podés cambiar cuando quieras sin volver a grabarla.</p>
                <Button className="mt-5" variant="secondary" onClick={() => setState("waiting")}>Grabar otra igual</Button>
              </>
            )}
          </div>
        ) : (
          <div className="py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">{serial ? `Plaquita ${idx + 1} de ${plaques.length}` : "Plaquita"}</p>
            <p className="font-mono text-3xl font-bold tracking-[.2em]">{plaque.code}</p>
            <div className={cn("relative mx-auto mt-4 grid size-28 place-items-center rounded-full bg-paper-2", state === "waiting" && "text-brand")}>
              {state === "waiting" && <span className="absolute inset-0 animate-ping rounded-full bg-brand/20" />}
              <Nfc className="relative size-12" />
            </div>
            <p className="mt-4 font-display text-lg font-bold">{state === "waiting" ? "Acercá la plaquita a la parte de atrás del celular" : "Listo para grabar"}</p>
            <p className="mt-1 break-all text-sm text-ink-3">Se graba: <span className="font-mono">{url}</span></p>
            {state === "error" && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{msg || "No se pudo grabar. Probá de nuevo."}</p>}

            {state !== "waiting" && (
              <label className="mx-auto mt-4 flex max-w-sm cursor-pointer items-start gap-2.5 rounded-xl border border-line p-3 text-left text-sm">
                <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-danger)]" />
                <span>
                  <span className="flex items-center gap-1.5 font-semibold"><Lock className="size-3.5" /> Bloquear contra escritura</span>
                  <span className="text-ink-3">Nadie más podrá regrabarla, <b>ni vos</b>. Es permanente. El destino igual se cambia desde el panel.</span>
                </span>
              </label>
            )}

            <div className="mt-5 flex justify-center gap-2">
              {state !== "waiting" ? (
                <Button size="lg" icon={<Nfc className="size-5" />} onClick={() => setState("waiting")}>{serial && done.size ? "Seguir grabando" : "Empezar a grabar"}</Button>
              ) : (
                <Button variant="secondary" onClick={() => setState("idle")}>Pausar</Button>
              )}
              {serial && <Button variant="ghost" icon={<SkipForward className="size-4" />} onClick={skip}>Saltar</Button>}
            </div>
            {/localhost|127\.0\.0\.1|192\.168\./.test(url) && <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">Estás en modo local: grabá las plaquitas definitivas desde la web publicada para que tengan la dirección correcta.</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}

/** Lee una plaquita NFC y muestra cuál es (para reconfigurarla) */
function NfcReader({ plaques, onClose, onOpen, onReload }: { plaques: Plaque[]; onClose: () => void; onOpen: (p: Plaque) => void; onReload: () => void }) {
  const [supported] = useState(() => typeof window !== "undefined" && !!getNdef());
  const [found, setFound] = useState<{ url: string; plaque: Plaque | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    const ctrl = new AbortController();
    const ndef = getNdef()!;
    ndef.onreading = (e) => {
      const rec = e.message.records.find((r) => r.recordType === "url" || r.recordType === "text");
      const url = rec?.data ? new TextDecoder(rec.encoding || "utf-8").decode(rec.data) : "";
      const code = /\/q\/([A-Z0-9]{4,12})/i.exec(url)?.[1]?.toUpperCase();
      setFound({ url: url || "(vacía)", plaque: plaques.find((p) => p.code === code) ?? null });
      navigator.vibrate?.(80);
    };
    ndef.onreadingerror = () => setError("No se pudo leer. Probá de nuevo.");
    ndef.scan({ signal: ctrl.signal }).catch((e: Error) => setError(e.message));
    return () => ctrl.abort();
  }, [supported, plaques]);

  return (
    <Modal open onClose={onClose} title="Leer plaquita NFC">
      {!supported ? (
        <p className="text-sm text-ink-2">Para leer plaquitas abrí el panel en <b>Chrome desde un celular Android</b> con NFC activado.</p>
      ) : !found ? (
        <div className="py-4 text-center">
          <div className="relative mx-auto grid size-24 place-items-center rounded-full bg-paper-2 text-brand">
            <span className="absolute inset-0 animate-ping rounded-full bg-brand/20" />
            <ScanLine className="relative size-10" />
          </div>
          <p className="mt-4 font-medium">Acercá la plaquita al celular…</p>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        </div>
      ) : (
        <div className="animate-rise space-y-3">
          {found.plaque ? (
            <>
              <p className="text-sm text-ink-3">Es la plaquita</p>
              <p className="font-mono text-2xl font-bold tracking-[.15em]">{found.plaque.code}</p>
              <p className="text-sm">{found.plaque.label || "Sin nombre"} · {describeTarget(found.plaque)}</p>
              <Button className="w-full" icon={<Pencil className="size-4" />} onClick={() => onOpen(found.plaque!)}>Configurar esta plaquita</Button>
            </>
          ) : (
            <>
              <p className="font-medium">Esta plaquita no es de tu lista</p>
              <p className="break-all rounded-xl bg-paper px-3 py-2 font-mono text-xs">{found.url}</p>
              <p className="text-sm text-ink-3">Si está en blanco, creá una plaquita nueva y grabala.</p>
            </>
          )}
          <Button variant="secondary" className="w-full" onClick={() => { setFound(null); onReload(); }}>Leer otra</Button>
        </div>
      )}
    </Modal>
  );
}

