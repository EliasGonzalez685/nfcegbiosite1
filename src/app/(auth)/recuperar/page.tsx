"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { Button, Field, Input } from "@/components/ui";

export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await auth.requestPasswordReset(email);
    setBusy(false);
    setSent(true);
  }

  if (sent)
    return (
      <div className="animate-rise text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-soft text-brand"><MailCheck className="size-8" /></div>
        <h1 className="mt-5 font-display text-2xl font-bold">Revisá tu correo</h1>
        <p className="mt-2 text-ink-3">Si existe una cuenta con <b className="text-ink">{email}</b>, te enviamos un enlace para crear una contraseña nueva.</p>
        <Link href="/ingresar" className="mt-8 inline-block text-sm font-medium text-brand hover:underline">Volver a iniciar sesión</Link>
      </div>
    );

  return (
    <>
      <h1 className="font-display text-3xl font-bold">Recuperar contraseña</h1>
      <p className="mt-1.5 text-ink-3">Te enviamos un enlace para restablecerla.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Email de tu cuenta">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={busy}>Enviar enlace</Button>
      </form>
      <p className="mt-6 text-center text-sm"><Link href="/ingresar" className="font-medium text-brand hover:underline">Volver</Link></p>
    </>
  );
}
