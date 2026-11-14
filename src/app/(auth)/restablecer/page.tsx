"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, friendlyError } from "@/lib/supabase";
import { Button, Field, Input } from "@/components/ui";
import { PasswordStrength } from "@/components/password-strength";

/** Llega acá desde el enlace del correo de recuperación */
export default function ResetPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((ev, s) => {
      if (ev === "PASSWORD_RECOVERY" || s) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setError("Usá al menos 8 caracteres");
    if (pw !== pw2) return setError("Las contraseñas no coinciden");
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (err) return setError(friendlyError(err));
    router.replace("/ingresar");
  }

  if (!ready)
    return (
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold">Enlace vencido o inválido</h1>
        <p className="mt-2 text-ink-3">Pedí uno nuevo desde “¿Olvidaste tu contraseña?”.</p>
      </div>
    );

  return (
    <>
      <h1 className="font-display text-3xl font-bold">Nueva contraseña</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Contraseña nueva">
          <Input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <PasswordStrength value={pw} />
        </Field>
        <Field label="Repetila">
          <Input type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </Field>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>Guardar contraseña</Button>
      </form>
    </>
  );
}
