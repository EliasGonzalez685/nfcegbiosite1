"use client";

import { useState } from "react";
import { KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { updateUser } from "@/lib/api";
import { supabase, friendlyError } from "@/lib/supabase";
import { BRAND } from "@/lib/brand";
import { useSession } from "@/components/session";
import { useToast } from "@/components/ui/toast";
import { Badge, Button, Field, Input } from "@/components/ui";
import { Page, PageHead } from "@/components/panel/top-bar";
import { PasswordStrength } from "@/components/password-strength";

const ROLE = { admin: "Administrador", seller: "Vendedor", client: "Cliente" } as const;

export default function AccountPage() {
  const { me, refresh } = useSession();
  const toast = useToast();
  const [info, setInfo] = useState({ fullName: me?.fullName ?? "", phone: me?.phone ?? "" });
  const [email, setEmail] = useState({ value: me?.email ?? "", current: "" });
  const [pw, setPw] = useState({ current: "", next: "", repeat: "" });
  const [busy, setBusy] = useState<string | null>(null);

  if (!me) return null;
  const fictitious = me.email.endsWith(`@${BRAND.domain}`);

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      await refresh();
      return true;
    } catch (e) {
      toast.error(friendlyError(e));
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <Page>
      <PageHead title="Mi cuenta" description="Tus datos de acceso. Los cambios de email y contraseña te piden la contraseña actual." />

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <div className="card h-fit p-5 text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-clay-soft font-display text-3xl font-bold text-clay">
            {(me.fullName || me.email).slice(0, 1).toUpperCase()}
          </span>
          <p className="mt-3 font-display text-lg font-semibold">{me.fullName || "Sin nombre"}</p>
          <p className="truncate text-sm text-ink-3">{me.email}</p>
          <Badge tone="brand" className="mt-3"><ShieldCheck className="size-3" /> {ROLE[me.role]}</Badge>
          {fictitious && (
            <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-left text-xs text-amber-900">
              Tu email es interno ({me.email}). Podés cambiarlo por uno real abajo para poder recuperar la contraseña por correo.
            </p>
          )}
        </div>

        <div className="space-y-5">
          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold"><UserRound className="size-5 text-ink-3" /> Datos personales</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre"><Input value={info.fullName} onChange={(e) => setInfo({ ...info, fullName: e.target.value })} /></Field>
              <Field label="Teléfono"><Input type="tel" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} placeholder="0981 123 456" /></Field>
            </div>
            <Button
              className="mt-4"
              loading={busy === "info"}
              disabled={info.fullName === me.fullName && info.phone === (me.phone ?? "")}
              onClick={() => run("info", () => updateUser(me.id, { fullName: info.fullName, phone: info.phone || null }), "Datos guardados")}
            >
              Guardar datos
            </Button>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold"><Mail className="size-5 text-ink-3" /> Email de acceso</h2>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await run("email", () => updateUser(me.id, { email: email.value, currentPassword: email.current }), "Email actualizado. Usalo la próxima vez que entres.");
                if (ok) setEmail((s) => ({ ...s, current: "" }));
              }}
            >
              <Field label="Nuevo email"><Input type="email" required value={email.value} onChange={(e) => setEmail({ ...email, value: e.target.value })} /></Field>
              <Field label="Contraseña actual"><Input type="password" required autoComplete="current-password" value={email.current} onChange={(e) => setEmail({ ...email, current: e.target.value })} /></Field>
              <div className="sm:col-span-2">
                <Button type="submit" loading={busy === "email"} disabled={email.value.trim().toLowerCase() === me.email}>Cambiar email</Button>
              </div>
            </form>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold"><KeyRound className="size-5 text-ink-3" /> Contraseña</h2>
            <form
              className="grid gap-4 sm:grid-cols-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (pw.next.length < 8) return toast.error("La nueva contraseña debe tener al menos 8 caracteres");
                if (pw.next !== pw.repeat) return toast.error("Las contraseñas nuevas no coinciden");
                const ok = await run("pw", () => updateUser(me.id, { password: pw.next, currentPassword: pw.current }), "Contraseña cambiada");
                if (ok) {
                  setPw({ current: "", next: "", repeat: "" });
                  // la sesión sigue activa; se renueva con la nueva contraseña
                  await supabase.auth.refreshSession();
                }
              }}
            >
              <Field label="Contraseña actual"><Input type="password" required autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
              <Field label="Nueva contraseña">
                <Input type="password" required autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
                <PasswordStrength value={pw.next} />
              </Field>
              <Field label="Repetí la nueva" error={pw.repeat && pw.repeat !== pw.next ? "No coinciden" : null}>
                <Input type="password" required autoComplete="new-password" value={pw.repeat} onChange={(e) => setPw({ ...pw, repeat: e.target.value })} />
              </Field>
              <div className="sm:col-span-3">
                <Button type="submit" loading={busy === "pw"}>Cambiar contraseña</Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </Page>
  );
}
