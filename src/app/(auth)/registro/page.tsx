"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/data";
import { slugify } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { Button, Field, Input, Spinner } from "@/components/ui";

function RegisterForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [form, setForm] = useState({ name: "", email: "", password: "", businessName: "", slug: "" });
  const [slugTouched, setSlugTouched] = useState(false);
  const [check, setCheck] = useState<{ slug: string; ok: boolean } | null>(null);
  const checking = !!form.slug && check?.slug !== form.slug;
  const avail = form.slug && check?.slug === form.slug ? check.ok : null;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [k]: v, ...(k === "businessName" && !slugTouched ? { slug: slugify(v) } : {}) }));
  };

  useEffect(() => {
    if (!form.slug) return;
    const slug = form.slug;
    const t = setTimeout(async () => {
      setCheck({ slug, ok: await db.profiles.isSlugAvailable(slug) });
    }, 350);
    return () => clearTimeout(t);
  }, [form.slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres");
    if (!avail) return setError("Elegí una dirección disponible para tu biosite");
    setBusy(true);
    setError(null);
    try {
      await auth.signUp(form);
      router.replace(next || "/panel?bienvenida=1");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-bold">Creá tu cuenta</h1>
      <p className="mt-1.5 text-ink-3">{next?.startsWith("/t/") ? "Después vinculamos tu tarjeta automáticamente." : "Tu biosite listo en minutos."}</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Nombre del negocio">
          <Input required value={form.businessName} onChange={set("businessName")} placeholder="Ej.: Lomitería Don Pedro" />
        </Field>
        <Field
          label="Dirección de tu biosite"
          hint={!form.slug ? "Solo letras, números y guiones." : undefined}
          error={avail === false ? "Esa dirección ya está en uso" : null}
        >
          <div className="flex items-center rounded-xl border border-line bg-white focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
            <span className="pl-3.5 text-sm text-ink-3">{BRAND.domain}/</span>
            <input
              required
              value={form.slug}
              onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: slugify(e.target.value) })); }}
              className="h-11 min-w-0 flex-1 bg-transparent pr-2 text-[15px] outline-none"
              placeholder="don-pedro"
            />
            <span className="pr-3">{checking ? <Spinner className="size-4" /> : avail ? <Check className="size-4 text-ok" /> : avail === false ? <X className="size-4 text-danger" /> : null}</span>
          </div>
        </Field>
        <Field label="Tu nombre">
          <Input required autoComplete="name" value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Email">
          <Input type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Contraseña" hint="Mínimo 6 caracteres">
          <Input type="password" required autoComplete="new-password" value={form.password} onChange={set("password")} />
        </Field>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>Crear cuenta</Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-3">
        ¿Ya tenés cuenta? <Link href={`/ingresar${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-brand hover:underline">Iniciá sesión</Link>
      </p>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
