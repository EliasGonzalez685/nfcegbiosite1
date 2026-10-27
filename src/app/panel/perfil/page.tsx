"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { db } from "@/lib/data";
import { cn, slugify } from "@/lib/utils";
import type { ContactInfo } from "@/lib/types";
import { BRAND } from "@/lib/brand";
import { EditorLayout, LivePreview, PanelPage, useProfileDraft } from "@/components/panel/editor";
import { PageHeader } from "@/components/panel/shell";
import { Field, ImageUpload, Input, PageLoader, SectionCard, Spinner, Textarea, Toggle } from "@/components/ui";

const ACCENTS = ["#1F4D3A", "#8A4B2A", "#D9643A", "#C2416B", "#7A3FA0", "#2D6A8E", "#0F766E", "#C9A227", "#1B1F1A"];

export default function ProfileEditor() {
  const { draft, update, save, saving, dirty, discard } = useProfileDraft();
  const [check, setCheck] = useState<{ slug: string; ok: boolean } | null>(null);
  const slugState = !draft ? "idle" : check?.slug !== draft.slug ? "checking" : check.ok ? "ok" : "taken";

  useEffect(() => {
    if (!draft) return;
    const { slug, id } = draft;
    const t = setTimeout(async () => {
      setCheck({ slug, ok: await db.profiles.isSlugAvailable(slug, id) });
    }, 350);
    return () => clearTimeout(t);
  }, [draft?.slug, draft?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!draft) return <PageLoader />;
  const setContact = (k: keyof ContactInfo) => (e: React.ChangeEvent<HTMLInputElement>) => update((p) => ({ contact: { ...p.contact, [k]: e.target.value } }));

  return (
    <PanelPage>
      <PageHeader title="Perfil" description="Logo, datos del negocio y apariencia de tu biosite." />
      <EditorLayout preview={<LivePreview profile={draft} />} dirty={dirty} saving={saving} onSave={() => slugState === "ok" && save()} onDiscard={discard}>
        <SectionCard title="Imagen">
          <div className="flex gap-4">
            <div className="w-24 shrink-0">
              <p className="label">Logo</p>
              <ImageUpload value={draft.avatarUrl} onChange={(avatarUrl) => update({ avatarUrl })} shape="circle" label="Logo" maxSize={500} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="label">Portada</p>
              <ImageUpload value={draft.coverUrl} onChange={(coverUrl) => update({ coverUrl })} shape="wide" label="Imagen de portada (opcional)" maxSize={1200} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Datos del negocio">
          <div className="grid gap-4">
            <Field label="Nombre"><Input value={draft.name} onChange={(e) => update({ name: e.target.value })} /></Field>
            <Field
              label="Dirección del biosite"
              error={slugState === "taken" ? "Esa dirección no está disponible" : null}
              hint="Cambiarla rompe los enlaces compartidos, pero tus tarjetas NFC/QR siguen funcionando."
            >
              <div className="flex items-center rounded-xl border border-line bg-white focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
                <span className="pl-3.5 text-sm text-ink-3">{BRAND.domain}/</span>
                <input value={draft.slug} onChange={(e) => update({ slug: slugify(e.target.value) })} className="h-11 min-w-0 flex-1 bg-transparent pr-2 outline-none" />
                <span className="pr-3">{slugState === "checking" ? <Spinner className="size-4" /> : slugState === "ok" ? <Check className="size-4 text-ok" /> : slugState === "taken" ? <X className="size-4 text-danger" /> : null}</span>
              </div>
            </Field>
            <Field label="Frase corta" hint="Aparece debajo del nombre. Ej.: Pizzería al horno de barro · Luque">
              <Input value={draft.tagline} maxLength={80} onChange={(e) => update({ tagline: e.target.value })} />
            </Field>
            <Field label="Descripción" hint={`${draft.bio.length}/280`}>
              <Textarea value={draft.bio} maxLength={280} onChange={(e) => update({ bio: e.target.value })} placeholder="Horarios, especialidades, lo que te hace único…" />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Contacto" description="Se usa para el botón “Guardar contacto” (.vcf).">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre en el contacto"><Input value={draft.contact.fullName} onChange={setContact("fullName")} /></Field>
            <Field label="Empresa"><Input value={draft.contact.company} onChange={setContact("company")} /></Field>
            <Field label="Cargo"><Input value={draft.contact.jobTitle} onChange={setContact("jobTitle")} placeholder="Opcional" /></Field>
            <Field label="Teléfono"><Input type="tel" value={draft.contact.phone} onChange={setContact("phone")} placeholder="+595 21 000 000" /></Field>
            <Field label="WhatsApp" hint="Con código de país: 595981…"><Input inputMode="numeric" value={draft.contact.whatsapp} onChange={setContact("whatsapp")} /></Field>
            <Field label="Email"><Input type="email" value={draft.contact.email} onChange={setContact("email")} /></Field>
            <Field label="Sitio web"><Input value={draft.contact.website} onChange={setContact("website")} placeholder="https://" /></Field>
            <Field label="Dirección"><Input value={draft.contact.address} onChange={setContact("address")} placeholder="Calle, ciudad" /></Field>
          </div>
        </SectionCard>

        <SectionCard title="Apariencia">
          <p className="label">Color principal</p>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENTS.map((c) => (
              <button
                key={c}
                onClick={() => update((p) => ({ theme: { ...p.theme, accent: c } }))}
                className={cn("size-9 rounded-full ring-offset-2 transition", draft.theme.accent.toLowerCase() === c.toLowerCase() && "ring-2 ring-ink")}
                style={{ background: c }}
                aria-label={c}
              />
            ))}
            <label className="relative size-9 cursor-pointer overflow-hidden rounded-full border border-dashed border-ink-3" title="Color personalizado">
              <input type="color" value={draft.theme.accent} onChange={(e) => update((p) => ({ theme: { ...p.theme, accent: e.target.value } }))} className="absolute -inset-2 size-14 cursor-pointer opacity-0" />
              <span className="grid size-full place-items-center text-lg text-ink-3">+</span>
            </label>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="label">Modo</p>
              <div className="flex rounded-xl bg-paper-2 p-1">
                {(["light", "dark"] as const).map((m) => (
                  <button key={m} onClick={() => update((p) => ({ theme: { ...p.theme, mode: m } }))} className={cn("flex-1 rounded-lg py-2 text-sm font-medium", draft.theme.mode === m ? "bg-white shadow-sm" : "text-ink-3")}>
                    {m === "light" ? "Claro" : "Oscuro"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="label">Botones</p>
              <div className="flex rounded-xl bg-paper-2 p-1">
                {([["rounded", "Redondeados"], ["pill", "Píldora"], ["square", "Rectos"]] as const).map(([v, l]) => (
                  <button key={v} onClick={() => update((p) => ({ theme: { ...p.theme, buttonStyle: v } }))} className={cn("flex-1 rounded-lg py-2 text-sm font-medium", draft.theme.buttonStyle === v ? "bg-white shadow-sm" : "text-ink-3")}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Secciones visibles">
          <div className="space-y-4">
            <Toggle checked={draft.sections.contact} onChange={(v) => update((p) => ({ sections: { ...p.sections, contact: v } }))} label="Guardar contacto" description="Botón para agendar tu número en el celular." />
            <Toggle checked={draft.sections.wifi} onChange={(v) => update((p) => ({ sections: { ...p.sections, wifi: v } }))} label="WiFi" description="Muestra tu red y el botón para copiar la contraseña." />
            <Toggle checked={draft.sections.menu} onChange={(v) => update((p) => ({ sections: { ...p.sections, menu: v } }))} label="Menú gastronómico" description="Botón “Ver menú” con tus productos y pedidos por WhatsApp." />
            <hr className="border-line" />
            <Toggle checked={draft.published} onChange={(published) => update({ published })} label="Biosite publicado" description="Si lo desactivás, quien escanee verá una página de “no disponible”." />
          </div>
        </SectionCard>
      </EditorLayout>
    </PanelPage>
  );
}
