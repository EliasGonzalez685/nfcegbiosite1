"use client";

import { useState } from "react";
import { RequireRole, useSession } from "@/components/session";
import { TopBar } from "@/components/panel/top-bar";
import { Button, Field, Input, LogoMark } from "@/components/ui";
import { db } from "@/lib/data";
import { slugify } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

/** Si la cuenta todavía no tiene biosite, se crea acá */
function CreateProfile() {
  const { session, setProfile } = useSession();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (!(await db.profiles.isSlugAvailable(slug))) throw new Error("Esa dirección ya está en uso");
      setProfile(await db.profiles.create(session!.user.id, { name, slug }));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <LogoMark />
        <h1 className="pt-6 font-display text-3xl font-bold">Creá tu página</h1>
        <Field label="Nombre del negocio">
          <Input required value={name} onChange={(e) => { setName(e.target.value); setSlug(slugify(e.target.value)); }} />
        </Field>
        <Field label="Dirección" hint={`${BRAND.domain}/${slug || "tu-negocio"}`}>
          <Input required value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>Crear</Button>
      </form>
    </div>
  );
}

function Inner({ children }: { children: React.ReactNode }) {
  const { profile } = useSession();
  if (!profile) return <CreateProfile />;
  return (
    <div className="min-h-dvh">
      <TopBar />
      {children}
    </div>
  );
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="client">
      <Inner>{children}</Inner>
    </RequireRole>
  );
}
