"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import type { LinkType, ProfileLink } from "@/lib/types";
import { LINK_TYPES, linkTypeLabel } from "@/lib/links";
import { cn, uid } from "@/lib/utils";
import { EditorLayout, LivePreview, PanelPage, useProfileDraft } from "@/components/panel/editor";
import { PageHeader } from "@/components/panel/shell";
import { Button, EmptyState, Field, Input, Modal, PageLoader, Select, Textarea, Toggle } from "@/components/ui";
import { LinkIcon, BRAND_COLORS } from "@/components/biosite/link-icon";

export default function LinksEditor() {
  const { draft, update, save, saving, dirty, discard } = useProfileDraft();
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  if (!draft) return <PageLoader />;
  const links = draft.links;
  const setLinks = (next: ProfileLink[]) => update({ links: next });
  const patch = (id: string, p: Partial<ProfileLink>) => setLinks(links.map((l) => (l.id === id ? { ...l, ...p } : l)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= links.length) return;
    const next = [...links];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setLinks(next);
  };

  function add(type: LinkType) {
    const meta = LINK_TYPES.find((t) => t.type === type)!;
    const l: ProfileLink = { id: uid("l_"), type, label: meta.label, value: type === "whatsapp" ? draft!.contact.whatsapp : "", enabled: true, ...(type === "whatsapp" ? { message: "¡Hola! Vi tu biosite y quería consultar…" } : {}) };
    setLinks([...links, l]);
    setOpenId(l.id);
    setAdding(false);
  }

  return (
    <PanelPage>
      <PageHeader title="Enlaces y redes" description="Ordená los botones como querés que aparezcan." actions={<Button icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>Agregar enlace</Button>} />
      <EditorLayout preview={<LivePreview profile={draft} />} dirty={dirty} saving={saving} onSave={save} onDiscard={discard}>
        {links.length === 0 ? (
          <EmptyState icon={<Plus className="size-6" />} title="Sin enlaces todavía" description="Agregá tu WhatsApp, Instagram, ubicación en Maps o tus reseñas de Google." action={<Button onClick={() => setAdding(true)}>Agregar el primero</Button>} />
        ) : (
          <ul className="space-y-2.5">
            {links.map((l, i) => {
              const open = openId === l.id;
              const meta = LINK_TYPES.find((t) => t.type === l.type);
              return (
                <li
                  key={l.id}
                  draggable
                  onDragStart={() => setDragId(l.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragId && dragId !== l.id) move(links.findIndex((x) => x.id === dragId), i);
                    setDragId(null);
                  }}
                  className={cn("card overflow-hidden transition", dragId === l.id && "opacity-50", !l.enabled && "bg-white/60")}
                >
                  <div className="flex items-center gap-2 p-2.5 pr-3">
                    <GripVertical className="size-4 shrink-0 cursor-grab text-ink-3 max-sm:hidden" />
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl text-white", !l.enabled && "opacity-40")} style={{ background: BRAND_COLORS[l.type] ?? draft.theme.accent }}>
                      <LinkIcon type={l.type} />
                    </span>
                    <button className="min-w-0 flex-1 text-left" onClick={() => setOpenId(open ? null : l.id)}>
                      <p className={cn("truncate font-medium", !l.enabled && "text-ink-3")}>{l.label || linkTypeLabel(l.type)}</p>
                      <p className={cn("truncate text-xs", l.value ? "text-ink-3" : "text-clay")}>{l.value || "Falta completar"}</p>
                    </button>
                    <div className="flex items-center">
                      <button onClick={() => move(i, i - 1)} disabled={i === 0} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-paper-2 disabled:opacity-30" aria-label="Subir"><ChevronUp className="size-4" /></button>
                      <button onClick={() => move(i, i + 1)} disabled={i === links.length - 1} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-paper-2 disabled:opacity-30" aria-label="Bajar"><ChevronDown className="size-4" /></button>
                    </div>
                    <Toggle checked={l.enabled} onChange={(enabled) => patch(l.id, { enabled })} />
                  </div>
                  {open && (
                    <div className="grid gap-4 border-t border-line bg-paper/50 p-4 sm:grid-cols-2">
                      <Field label="Tipo">
                        <Select value={l.type} onChange={(e) => patch(l.id, { type: e.target.value as LinkType })}>
                          {LINK_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                        </Select>
                      </Field>
                      <Field label="Texto del botón"><Input value={l.label} onChange={(e) => patch(l.id, { label: e.target.value })} /></Field>
                      <Field label={l.type === "whatsapp" ? "Número" : l.type === "email" ? "Email" : l.type === "phone" ? "Teléfono" : "Enlace"} hint={meta?.hint} className="sm:col-span-2">
                        <Input value={l.value} onChange={(e) => patch(l.id, { value: e.target.value })} placeholder={meta?.placeholder} inputMode={l.type === "whatsapp" ? "numeric" : undefined} />
                      </Field>
                      {l.type === "whatsapp" && (
                        <Field label="Mensaje predefinido" hint="El cliente lo verá ya escrito al abrir WhatsApp." className="sm:col-span-2">
                          <Textarea rows={2} value={l.message ?? ""} onChange={(e) => patch(l.id, { message: e.target.value })} />
                        </Field>
                      )}
                      <div className="flex justify-end sm:col-span-2">
                        <Button variant="danger" size="sm" icon={<Trash2 className="size-4" />} onClick={() => setLinks(links.filter((x) => x.id !== l.id))}>Eliminar</Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </EditorLayout>

      <Modal open={adding} onClose={() => setAdding(false)} title="Agregar enlace" wide>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {LINK_TYPES.map((t) => (
            <button key={t.type} onClick={() => add(t.type)} className="flex items-center gap-3 rounded-xl border border-line p-3 text-left text-sm font-medium hover:border-ink-3 hover:bg-paper/60">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg text-white" style={{ background: BRAND_COLORS[t.type] ?? draft.theme.accent }}><LinkIcon type={t.type} className="size-[18px]" /></span>
              {t.label}
            </button>
          ))}
        </div>
      </Modal>
    </PanelPage>
  );
}
