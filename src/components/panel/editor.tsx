"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Save, Smartphone } from "lucide-react";
import type { MenuCategory, MenuItem, Profile } from "@/lib/types";
import { db } from "@/lib/data";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/session";
import { useToast } from "@/components/ui/toast";
import { Button, Modal } from "@/components/ui";
import { BiositeView } from "@/components/biosite/biosite-view";
import { MenuView } from "@/components/biosite/menu-view";

/** Borrador editable del perfil del cliente con guardado y detección de cambios */
export function useProfileDraft() {
  const { profile, setProfile } = useSession();
  const [draft, setDraft] = useState<Profile | null>(profile);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Si cambia el perfil de la sesión (otro usuario), reiniciamos el borrador durante el render
  if (profile && (!draft || draft.id !== profile.id)) setDraft(profile);

  const dirty = useMemo(() => !!draft && !!profile && JSON.stringify(draft) !== JSON.stringify(profile), [draft, profile]);

  const update = useCallback((patch: Partial<Profile> | ((p: Profile) => Partial<Profile>)) => {
    setDraft((d) => (d ? { ...d, ...(typeof patch === "function" ? patch(d) : patch) } : d));
  }, []);

  const save = useCallback(async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const { id, ownerId: _o, createdAt: _c, ...rest } = draft;
      void _o; void _c;
      const saved = await db.profiles.update(id, rest);
      setProfile(saved);
      setDraft(saved);
      toast.success("Cambios guardados");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [draft, setProfile, toast]);

  const discard = useCallback(() => setDraft(profile), [profile]);

  // Aviso al salir con cambios sin guardar
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  return { draft, update, save, saving, dirty, discard };
}

export function PhoneFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative mx-auto h-[640px] w-[320px] rounded-[46px] border-[10px] border-ink bg-ink shadow-[0_30px_60px_-20px_rgba(27,31,26,.45)]", className)}>
      <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink" />
      <div className="relative size-full overflow-y-auto overflow-x-hidden rounded-[36px] bg-white no-scrollbar">{children}</div>
    </div>
  );
}

export function LivePreview({
  profile,
  menu,
  view = "biosite",
}: {
  profile: Profile;
  menu?: { categories: MenuCategory[]; items: MenuItem[] };
  view?: "biosite" | "menu";
}) {
  const content =
    view === "menu" && menu ? (
      <MenuView profile={profile} categories={menu.categories.filter((c) => menu.items.some((i) => i.categoryId === c.id))} items={menu.items} preview />
    ) : (
      <BiositeView profile={profile} preview hasMenu={menu ? menu.items.length > 0 : true} />
    );
  return <PhoneFrame>{content}</PhoneFrame>;
}

/** Layout de editor: formulario a la izquierda, vista previa en vivo a la derecha (o en modal en celular) */
export function EditorLayout({
  children,
  preview,
  dirty,
  saving,
  onSave,
  onDiscard,
}: {
  children: React.ReactNode;
  preview: React.ReactNode;
  dirty?: boolean;
  saving?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-8">
      <div className="min-w-0 space-y-5">{children}</div>
      <div className="hidden xl:block">
        <div className="sticky top-6">
          <p className="mb-3 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wider text-ink-3">
            <Smartphone className="size-3.5" /> Vista previa en vivo
          </p>
          {preview}
        </div>
      </div>

      {/* Barra de guardado */}
      {onSave && (
        <div className={cn("fixed inset-x-0 bottom-[68px] z-20 px-4 transition-all lg:bottom-6 lg:left-[248px]", dirty ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0")}>
          <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-ink px-4 py-2.5 text-white shadow-2xl">
            <span className="flex-1 text-sm">Tenés cambios sin guardar</span>
            <button onClick={onDiscard} className="rounded-lg px-3 py-1.5 text-sm text-white/70 hover:text-white">Descartar</button>
            <Button size="sm" variant="clay" loading={saving} onClick={onSave} icon={<Save className="size-4" />}>Guardar</Button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(true)}
        className={cn("fixed right-4 z-20 flex h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-medium shadow-lg xl:hidden", dirty ? "bottom-[136px] lg:bottom-24" : "bottom-[84px] lg:bottom-6")}
      >
        <Eye className="size-4" /> Vista previa
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Vista previa">
        <div className="-mx-2 flex justify-center">{preview}</div>
      </Modal>
    </div>
  );
}

export function PanelPage({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={cn("mx-auto px-4 py-6 sm:px-6 lg:py-10", wide ? "max-w-7xl" : "max-w-6xl")}>{children}</div>;
}
