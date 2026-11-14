"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, ChevronUp, Copy, ExternalLink, Eye, EyeOff, Gift, LayoutTemplate, Nfc, Plus, Save, Smartphone, Trash2, UtensilsCrossed } from "lucide-react";
import type { LinkType, ProfileLink, Site } from "@/lib/types";
import { getSite, isSlugAvailable, saveSite, uploadImage } from "@/lib/api";
import { friendlyError } from "@/lib/supabase";
import { LINK_TYPES, linkMeta } from "@/lib/links";
import { BRAND } from "@/lib/brand";
import { hasMenu } from "@/lib/menu";
import { cn, profileUrl, slugify, uid } from "@/lib/utils";
import { useCopy } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { Button, EmptyState, Field, ImageUpload, Input, Modal, PageLoader, Spinner, Textarea, Toggle } from "@/components/ui";
import { BiositeView } from "@/components/biosite/biosite-view";
import { MenuScreen } from "@/components/biosite/menu-view";
import { LinkIcon } from "@/components/biosite/link-icon";
import { MenuEditor } from "@/components/panel/menu-editor";
import { PhoneFrame } from "@/components/panel/top-bar";
import { QrDownloads, QrImage } from "@/components/panel/qr-tools";
import { LoyaltyPanel } from "@/components/loyalty-panel";
import { PlaqueManager } from "@/components/plaques";

const COLORS = ["#D4AF37", "#C0C0C0", "#E0915A", "#E5484D", "#F472B6", "#A78BFA", "#5BB4E5", "#34D399", "#FFFFFF"];

type Tab = "page" | "menu" | "loyalty" | "plaques";
const TABS: { id: Tab; label: string; icon: typeof Gift }[] = [
  { id: "page", label: "Página", icon: LayoutTemplate },
  { id: "menu", label: "Menú", icon: UtensilsCrossed },
  { id: "loyalty", label: "Fidelización", icon: Gift },
  { id: "plaques", label: "Plaquitas", icon: Nfc },
];

/**
 * Editor completo de un negocio. Lo usan el cliente (su propio negocio),
 * los vendedores (sus clientes) y los administradores (cualquiera).
 */
export function BusinessEditor({
  businessId,
  title,
  aside,
  canConfigurePlaques,
  canDeletePlaques = false,
}: {
  businessId: string;
  title?: ReactNode;
  /** Bloque extra arriba (asignación de dueño/vendedor para admin) */
  aside?: ReactNode;
  canConfigurePlaques: boolean;
  canDeletePlaques?: boolean;
}) {
  const toast = useToast();
  const [site, setSite] = useState<Site | null>(null);
  const [draft, setDraft] = useState<Site | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("page");
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [check, setCheck] = useState<{ slug: string; ok: boolean } | null>(null);
  const [view, setView] = useState<"page" | "menu">("page");

  useEffect(() => {
    let alive = true;
    getSite(businessId)
      .then((s) => {
        if (!alive) return;
        if (!s) setLoadError("No encontramos este negocio o no tenés acceso.");
        setSite(s);
        setDraft(s);
      })
      .catch((e) => alive && setLoadError(friendlyError(e)));
    return () => {
      alive = false;
    };
  }, [businessId]);

  const dirty = useMemo(() => !!draft && JSON.stringify(draft) !== JSON.stringify(site), [draft, site]);
  const slugState = !draft ? "idle" : draft.slug === site?.slug ? "ok" : check?.slug !== draft.slug ? "checking" : check.ok ? "ok" : "taken";

  useEffect(() => {
    if (!draft || draft.slug === site?.slug) return;
    const { slug, id } = draft;
    const t = setTimeout(async () => setCheck({ slug, ok: await isSlugAvailable(slug, id).catch(() => false) }), 350);
    return () => clearTimeout(t);
  }, [draft?.slug, draft?.id, site?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const update = useCallback((patch: Partial<Site>) => setDraft((d) => (d ? { ...d, ...patch } : d)), []);

  if (loadError) return <EmptyState title="No se pudo abrir" description={loadError} />;
  if (!draft || !site) return <PageLoader />;

  const links = draft.links;
  const setLinks = (next: ProfileLink[]) => update({ links: next });
  const patchLink = (id: string, p: Partial<ProfileLink>) => setLinks(links.map((l) => (l.id === id ? { ...l, ...p } : l)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= links.length) return;
    const next = [...links];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setLinks(next);
  };
  const upload = (f: File, max: number) => uploadImage(businessId, f, max);

  function addLink(type: LinkType) {
    const meta = linkMeta(type);
    const l: ProfileLink = {
      id: uid(),
      type,
      label: type === "whatsapp" ? "Escribinos por WhatsApp" : meta.label,
      value: "",
      enabled: true,
      ...(type === "whatsapp" ? { message: "¡Hola! Vi tu página y quería consultar…" } : {}),
      ...(type === "wifi" ? { password: "" } : {}),
    };
    setLinks([...links, l]);
    setOpenId(type === "vcard" ? null : l.id);
    setAdding(false);
  }

  async function save() {
    if (!draft || !site) return;
    if (slugState !== "ok") return toast.error("Elegí una dirección disponible");
    if (!draft.name.trim()) return toast.error("El negocio necesita un nombre");
    setSaving(true);
    try {
      const saved = await saveSite(site, draft);
      if (saved) {
        setSite(saved);
        setDraft(saved);
      }
      toast.success("¡Cambios guardados! Ya se ven en la página");
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  const showMenu = view === "menu" && hasMenu(draft);
  const preview = (
    <div>
      {hasMenu(draft) && (
        <div className="mx-auto mb-3 flex w-fit rounded-xl bg-paper-2 p-1 text-xs font-semibold">
          {(["page", "menu"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cn("rounded-lg px-3 py-1.5", (v === "menu") === showMenu ? "bg-white shadow-sm" : "text-ink-3")}>
              {v === "page" ? "Página" : "Menú"}
            </button>
          ))}
        </div>
      )}
      <PhoneFrame key={showMenu ? "menu" : "page"}>
        {showMenu ? <MenuScreen profile={draft} preview onBack={() => setView("page")} /> : <BiositeView profile={draft} preview onOpenMenu={() => setView("menu")} />}
      </PhoneFrame>
    </div>
  );
  const editsDraft = tab === "page" || tab === "menu";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:pt-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {title ?? <h1 className="font-display text-2xl font-bold sm:text-3xl">{site.name}</h1>}
          <a href={`/${site.slug}`} target="_blank" className="mt-1 inline-flex items-center gap-1 text-sm text-brand hover:underline">
            {BRAND.domain}/{site.slug} <ExternalLink className="size-3.5" />
          </a>
        </div>
        {!site.published && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">Página oculta</span>}
      </div>

      {aside}

      {/* Pestañas */}
      <div className="no-scrollbar sticky top-[57px] lg:top-0 z-20 -mx-4 mb-5 overflow-x-auto bg-paper/90 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0">
        <div className="flex w-max gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-line">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                if (t.id === "menu" && hasMenu(draft)) setView("menu");
                if (t.id === "page") setView("page");
              }}
              className={cn("flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition", tab === t.id ? "bg-ink text-white" : "text-ink-2 hover:bg-paper")}
            >
              <t.icon className="size-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "loyalty" && <div className="animate-rise"><LoyaltyPanel businessId={businessId} accent={draft.accent} onCreatePlaque={canConfigurePlaques ? () => setTab("plaques") : undefined} /></div>}
      {tab === "plaques" && (
        <div className="animate-rise">
          <p className="mb-4 max-w-2xl text-sm text-ink-3">
            Cada plaquita tiene un código fijo (va grabado en el chip NFC y/o impreso como QR). Lo que abre se cambia cuando quieras: la página, el menú, el WiFi, la tarjeta de fidelidad o cualquier enlace.
          </p>
          <PlaqueManager businessId={businessId} canEdit={canConfigurePlaques} canDelete={canDeletePlaques} />
        </div>
      )}

      {editsDraft && (
      <div className="animate-rise lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
        <div className="min-w-0 space-y-5">
          {tab === "menu" ? (
            <MenuEditor
              businessId={businessId}
              menu={draft.menu}
              onChange={(menu) => update({ menu })}
              onShowPreview={() => {
                setView("menu");
                if (window.innerWidth < 1024) setPreviewOpen(true);
              }}
            />
          ) : (
          <>
          {/* Perfil */}
          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Perfil</h2>
            <div className="flex gap-5 max-sm:flex-col">
              <div className="w-28 shrink-0">
                <ImageUpload value={draft.avatarUrl} onChange={(avatarUrl) => update({ avatarUrl })} shape="circle" label="Subir logo" maxSize={600} upload={upload} />
              </div>
              <div className="grid min-w-0 flex-1 gap-4">
                <Field label="Nombre">
                  <Input value={draft.name} onChange={(e) => update({ name: e.target.value })} placeholder="Nombre del negocio" />
                </Field>
                <Field label="Frase corta (opcional)" hint="Ej.: Barbería · Encarnación">
                  <Input value={draft.tagline} maxLength={70} onChange={(e) => update({ tagline: e.target.value })} />
                </Field>
              </div>
            </div>

            <div className="mt-5">
              <p className="label">Color de tu marca</p>
              <div className="flex flex-wrap items-center gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => update({ accent: c })}
                    className={cn("size-9 rounded-full border border-black/10 ring-offset-2 transition hover:scale-110", draft.accent.toLowerCase() === c.toLowerCase() && "ring-2 ring-ink")}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
                <label className="relative grid size-9 cursor-pointer place-items-center overflow-hidden rounded-full border border-dashed border-ink-3 text-lg text-ink-3" title="Otro color">
                  +
                  <input type="color" value={draft.accent} onChange={(e) => update({ accent: e.target.value.toUpperCase() })} className="absolute inset-0 cursor-pointer opacity-0" />
                </label>
              </div>
            </div>
          </section>

          {/* Botones */}
          <section className="card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">Botones</h2>
                <p className="text-sm text-ink-3">Tocá un botón para editarlo. Usá las flechas para ordenarlos.</p>
              </div>
              <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>Agregar</Button>
            </div>

            {links.length === 0 ? (
              <button onClick={() => setAdding(true)} className="w-full rounded-2xl border border-dashed border-line py-10 text-sm text-ink-3 hover:bg-paper/60">
                + Agregá tu primer botón (WhatsApp, Instagram, ubicación, WiFi…)
              </button>
            ) : (
              <ul className="space-y-2">
                {links.map((l, i) => (
                  <LinkRow
                    key={l.id}
                    link={l}
                    open={openId === l.id}
                    first={i === 0}
                    last={i === links.length - 1}
                    onToggleOpen={() => setOpenId(openId === l.id ? null : l.id)}
                    onChange={(p) => patchLink(l.id, p)}
                    onMove={(d) => move(i, i + d)}
                    onDelete={() => setLinks(links.filter((x) => x.id !== l.id))}
                  />
                ))}
              </ul>
            )}
          </section>

          {/* Dirección */}
          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Dirección y enlace directo</h2>
            <Field
              label="Dirección de la página"
              error={slugState === "taken" ? "Esa dirección no está disponible" : null}
              hint="Las plaquitas NFC/QR siguen funcionando aunque cambies la dirección. Los enlaces que ya compartiste, no."
            >
              <div className="flex items-center rounded-xl border border-line bg-white focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
                <span className="pl-3.5 text-sm text-ink-3">{BRAND.domain}/</span>
                <input value={draft.slug} onChange={(e) => update({ slug: slugify(e.target.value) })} className="h-11 min-w-0 flex-1 bg-transparent pr-2 outline-none" />
                <span className="pr-3">{slugState === "checking" ? <Spinner className="size-4" /> : slugState === "ok" ? <Check className="size-4 text-ok" /> : null}</span>
              </div>
            </Field>
            <QrBlock profile={site} dirtySlug={draft.slug !== site.slug} />
            <div className="mt-5 border-t border-line pt-4">
              <Toggle checked={draft.published} onChange={(published) => update({ published })} label="Página publicada" description="Si la desactivás, quien escanee verá “página no disponible”." />
            </div>
          </section>
          </>
          )}
        </div>

        {/* Vista previa */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <p className="mb-3 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink-3">
              <Smartphone className="size-3.5" /> Vista previa en vivo
            </p>
            {preview}
          </div>
        </aside>
      </div>
      )}

      {/* Barra inferior: vista previa (celular) + guardar */}
      {(editsDraft || dirty) && (
        <div className="fixed inset-x-0 bottom-0 z-30 p-3">
          <div className={cn("mx-auto flex max-w-xl items-center gap-2 rounded-2xl border bg-white/95 p-2 shadow-2xl backdrop-blur transition", dirty ? "border-brand/40" : "border-line")}>
            <Button variant="secondary" className="lg:hidden" icon={<Eye className="size-4" />} onClick={() => setPreviewOpen(true)}>Vista previa</Button>
            <span className="flex flex-1 items-center gap-2 px-2 text-sm text-ink-3 max-lg:hidden">
              <span className={cn("size-2 rounded-full", dirty ? "animate-pulse bg-clay" : "bg-ok")} />
              {dirty ? "Tenés cambios sin guardar" : "Todo guardado"}
            </span>
            {dirty && <Button variant="ghost" onClick={() => setDraft(site)} className="max-sm:hidden">Descartar</Button>}
            <Button className="max-lg:flex-1" disabled={!dirty} loading={saving} icon={<Save className="size-4" />} onClick={save}>Guardar</Button>
          </div>
        </div>
      )}

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Vista previa">
        <div className="-mx-2 flex justify-center">{preview}</div>
      </Modal>

      <Modal open={adding} onClose={() => setAdding(false)} title="Agregar botón" wide>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LINK_TYPES.map((t) => (
            <button key={t.type} onClick={() => addLink(t.type)} className="flex items-center gap-3 rounded-xl border border-line p-3 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:border-ink-3 hover:bg-paper/60">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink text-white"><LinkIcon type={t.type} className="size-[18px]" /></span>
              {t.label}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

function LinkRow({
  link: l,
  open,
  first,
  last,
  onToggleOpen,
  onChange,
  onMove,
  onDelete,
}: {
  link: ProfileLink;
  open: boolean;
  first: boolean;
  last: boolean;
  onToggleOpen: () => void;
  onChange: (p: Partial<ProfileLink>) => void;
  onMove: (d: -1 | 1) => void;
  onDelete: () => void;
}) {
  const meta = linkMeta(l.type);
  const [showPass, setShowPass] = useState(false);
  const missing = l.type !== "vcard" && !l.value.trim();
  const subtitle = l.type === "vcard" ? "Descarga tu contacto con los datos de tus botones" : l.value || "Falta completar";

  return (
    <li className={cn("overflow-hidden rounded-2xl border border-line bg-white", !l.enabled && "opacity-60")}>
      <div className="flex items-center gap-2 p-2 pr-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink text-white">
          <LinkIcon type={l.type} />
        </span>
        <button className="min-w-0 flex-1 text-left" onClick={onToggleOpen}>
          <p className="truncate font-medium">{l.label || meta.label}</p>
          <p className={cn("truncate text-xs", missing ? "text-clay" : "text-ink-3")}>{subtitle}</p>
        </button>
        <div className="flex items-center">
          <button onClick={() => onMove(-1)} disabled={first} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-paper-2 disabled:opacity-30" aria-label="Subir"><ChevronUp className="size-4" /></button>
          <button onClick={() => onMove(1)} disabled={last} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-paper-2 disabled:opacity-30" aria-label="Bajar"><ChevronDown className="size-4" /></button>
        </div>
        <Toggle checked={l.enabled} onChange={(enabled) => onChange({ enabled })} />
      </div>
      {open && (
        <div className="grid gap-4 border-t border-line bg-paper/50 p-4 sm:grid-cols-2">
          <Field label="Texto del botón" className={l.type === "vcard" ? "sm:col-span-2" : ""}>
            <Input value={l.label} onChange={(e) => onChange({ label: e.target.value })} />
          </Field>
          {l.type !== "vcard" && (
            <Field label={meta.field} hint={meta.hint}>
              <Input value={l.value} onChange={(e) => onChange({ value: e.target.value })} placeholder={meta.placeholder} inputMode={l.type === "whatsapp" ? "numeric" : undefined} />
            </Field>
          )}
          {l.type === "whatsapp" && (
            <Field label="Mensaje predefinido" hint="El cliente lo ve ya escrito al abrir WhatsApp." className="sm:col-span-2">
              <Textarea rows={2} value={l.message ?? ""} onChange={(e) => onChange({ message: e.target.value })} />
            </Field>
          )}
          {l.type === "wifi" && (
            <Field label="Contraseña" hint="Vacía si la red es abierta. Una página web no puede conectar sola al WiFi: se muestra con un botón para copiarla y un QR de WiFi." className="sm:col-span-2">
              <div className="relative">
                <Input type={showPass ? "text" : "password"} value={l.password ?? ""} onChange={(e) => onChange({ password: e.target.value })} className="pr-10" />
                <button type="button" onClick={() => setShowPass((s) => !s)} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center text-ink-3">
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
          )}
          <div className="flex justify-end sm:col-span-2">
            <Button variant="danger" size="sm" icon={<Trash2 className="size-4" />} onClick={onDelete}>Eliminar botón</Button>
          </div>
        </div>
      )}
    </li>
  );
}

function QrBlock({ profile, dirtySlug }: { profile: Site; dirtySlug: boolean }) {
  const [useLogo, setUseLogo] = useState(true);
  const { copied, copy } = useCopy();
  const url = profileUrl(profile.slug);
  const logo = useLogo ? profile.avatarUrl : null;

  return (
    <div className="mt-5 grid items-start gap-5 sm:grid-cols-[170px_1fr]">
      <QrImage text={url} logo={logo} className="w-full max-w-[170px] border border-line p-2" />
      <div className="min-w-0 space-y-3">
        <button onClick={() => copy(url)} className="flex w-full items-center gap-2 rounded-xl bg-paper px-3 py-2 text-left text-sm hover:bg-paper-2">
          {copied ? <Check className="size-4 shrink-0 text-ok" /> : <Copy className="size-4 shrink-0 text-ink-3" />}
          <span className="truncate font-medium text-brand">{url.replace(/^https?:\/\//, "")}</span>
        </button>
        <Toggle checked={useLogo && !!profile.avatarUrl} disabled={!profile.avatarUrl} onChange={setUseLogo} label="Logo al centro del QR" />
        <QrDownloads text={url} filename={`qr-${profile.slug}`} logo={logo} pdfTitle={profile.name} />
        {dirtySlug && <p className="text-xs text-clay">Guardá los cambios para que el QR use la dirección nueva.</p>}
      </div>
    </div>
  );
}
