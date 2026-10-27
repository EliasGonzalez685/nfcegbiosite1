"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const s = await auth.signIn(email, password);
      router.replace(next || (s.user.role === "admin" ? "/admin" : "/panel"));
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-bold">Iniciar sesión</h1>
      <p className="mt-1.5 text-ink-3">Entrá para editar tu biosite.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vos@negocio.com.py" />
        </Field>
        <Field label="Contraseña">
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <Link href="/recuperar" className="text-sm font-medium text-brand hover:underline">¿Olvidaste tu contraseña?</Link>
        </div>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>Entrar</Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-3">
        ¿No tenés cuenta? <Link href={`/registro${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-brand hover:underline">Creala gratis</Link>
      </p>

      <div className="mt-10 rounded-2xl border border-dashed border-line bg-white/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Cuentas de prueba</p>
        <div className="mt-2 grid gap-1.5">
          {[
            ["Cliente con menú", "cafe@demo.com", "demo123"],
            ["Cliente sin menú", "dra@demo.com", "demo123"],
            ["Administrador", "admin@nfcegbiosite.com", "admin123"],
          ].map(([label, e, p]) => (
            <button key={e} type="button" onClick={() => { setEmail(e); setPassword(p); }} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-paper-2">
              <span className="font-medium">{label}</span>
              <span className="font-mono text-xs text-ink-3">{e}</span>
            </button>
          ))}
        </div>
      </div>
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
