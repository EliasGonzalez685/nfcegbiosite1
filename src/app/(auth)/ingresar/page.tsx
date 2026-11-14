"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { supabase, friendlyError } from "@/lib/supabase";
import { getMyProfile } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { Button, Field, Input } from "@/components/ui";
import { homeFor, useSession } from "@/components/session";

/** Permite entrar escribiendo solo "admin1" (se completa con el dominio de la plataforma) */
const toEmail = (v: string) => {
  const t = v.trim().toLowerCase();
  return t.includes("@") ? t : `${t}@${BRAND.domain}`;
};

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const { me, loading } = useSession();
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // si ya hay sesión, directo al panel
  useEffect(() => {
    if (!loading && me) router.replace(next || homeFor(me.role));
  }, [loading, me, next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: toEmail(user), password });
    if (err || !data.user) {
      setError(friendlyError(err));
      setBusy(false);
      return;
    }
    const profile = await getMyProfile(data.user.id).catch(() => null);
    router.replace(next || homeFor(profile?.role));
  }

  return (
    <>
      <h1 className="font-display text-3xl font-bold">Iniciar sesión</h1>
      <p className="mt-1.5 text-ink-3">Entrá a tu panel de {BRAND.name}.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Email o usuario" hint="Los administradores pueden escribir solo su usuario, por ejemplo: admin1">
          <Input autoComplete="username" required value={user} onChange={(e) => setUser(e.target.value)} placeholder="vos@negocio.com" autoCapitalize="none" />
        </Field>
        <Field label="Contraseña">
          <div className="relative">
            <Input type={show ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pr-11" />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-ink-3" aria-label="Mostrar contraseña">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <div className="flex justify-end">
          <Link href="/recuperar" className="text-sm font-medium text-brand hover:underline">¿Olvidaste tu contraseña?</Link>
        </div>
        {error && <p className="animate-rise rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>Entrar</Button>
      </form>
      <p className="mt-8 text-center text-sm text-ink-3">¿Querés tu página? Hablá con un vendedor de {BRAND.name}.</p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
