"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Nfc, ShieldAlert, Sparkles } from "lucide-react";
import { db } from "@/lib/data";
import { useAsync } from "@/lib/hooks";
import { useSession } from "@/components/session";
import { Button, Field, Input, LogoMark, PageLoader } from "@/components/ui";
import { NotFoundCard } from "@/components/biosite/not-found";
import { useToast } from "@/components/ui/toast";

const KIND_LABEL = { nfc: "tarjeta", qr: "código QR", placa: "placa" } as const;

export default function CodePage() {
  const { code: raw } = useParams<{ code: string }>();
  const code = raw.toUpperCase();
  const router = useRouter();
  const { session, profile, loading: sLoading } = useSession();
  const { data, loading, reload } = useAsync(() => db.codes.resolve(code), [code]);
  const redirected = useRef(false);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (data?.kind === "assigned" && !redirected.current) {
      redirected.current = true;
      db.analytics.track({ type: "scan", profileId: data.profile.id, code }).finally(() => router.replace(`/${data.profile.slug}`));
    }
  }, [data, code, router]);

  async function activate() {
    if (!profile) return;
    setBusy(true);
    try {
      await db.codes.activate(code, profile.id);
      if (label.trim()) await db.codes.setLabel(code, label.trim());
      setDone(true);
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading || sLoading || data?.kind === "assigned" && !done) return <PageLoader />;
  if (!data || data.kind === "not_found") return <NotFoundCard title="Código no válido" text={`El código ${code} no existe. Revisá que esté bien escrito.`} />;

  const kind = KIND_LABEL[data.code.kind];

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-clay/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-brand/15 blur-3xl" />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col px-6 py-8">
        <LogoMark />

        <div className="my-auto py-10">
          {done ? (
            <div className="animate-rise text-center">
              <div className="mx-auto grid size-20 place-items-center rounded-full bg-brand-soft text-brand">
                <CheckCircle2 className="size-10" />
              </div>
              <h1 className="mt-6 font-display text-3xl font-bold">¡Listo, activada!</h1>
              <p className="mt-2 text-ink-2">
                Tu {kind} <b className="font-mono">{code}</b> ahora abre el biosite de <b>{profile?.name}</b>. Probá acercarla a un celular.
              </p>
              <div className="mt-8 grid gap-2.5">
                <Button size="lg" onClick={() => router.push(`/${profile?.slug}`)}>Ver mi biosite</Button>
                <Button size="lg" variant="secondary" onClick={() => router.push("/panel")}>Ir a mi panel</Button>
              </div>
            </div>
          ) : data.kind === "disabled" ? (
            <div className="text-center">
              <div className="mx-auto grid size-20 place-items-center rounded-full bg-red-50 text-danger">
                <ShieldAlert className="size-9" />
              </div>
              <h1 className="mt-6 font-display text-2xl font-bold">Este código está desactivado</h1>
              <p className="mt-2 text-ink-3">Si es tu {kind}, comunicate con quien te la vendió para reactivarla.</p>
            </div>
          ) : (
            <div className="animate-rise">
              <div className="relative mx-auto mb-8 aspect-[1.6/1] w-full max-w-[300px] rotate-[-4deg] rounded-2xl bg-gradient-to-br from-brand to-[#0f2a1f] p-5 text-white shadow-2xl">
                <Nfc className="size-7 opacity-80" />
                <p className="absolute bottom-5 left-5 font-mono text-xl tracking-[0.3em]">{code}</p>
                <span className="absolute right-5 top-5 rounded-full bg-clay px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Nueva</span>
              </div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-clay"><Sparkles className="size-4" /> Activación</p>
              <h1 className="mt-1 font-display text-3xl font-bold leading-tight">Tu {kind} está lista para activarse</h1>

              {!session ? (
                <>
                  <p className="mt-3 text-ink-2">Creá tu cuenta gratis (o iniciá sesión) y vinculá esta {kind} a tu biosite en menos de un minuto.</p>
                  <div className="mt-8 grid gap-2.5">
                    <Link href={`/registro?next=/t/${code}`}><Button size="lg" className="w-full">Crear mi cuenta</Button></Link>
                    <Link href={`/ingresar?next=/t/${code}`}><Button size="lg" variant="secondary" className="w-full">Ya tengo cuenta</Button></Link>
                  </div>
                </>
              ) : session.user.role === "admin" ? (
                <>
                  <p className="mt-3 text-ink-2">Estás con la cuenta de administrador. Podés asignar este código a un cliente desde el panel.</p>
                  <Link href={`/admin/codigos?q=${code}`} className="mt-6 block"><Button size="lg" className="w-full">Asignar desde el panel</Button></Link>
                </>
              ) : profile ? (
                <>
                  <p className="mt-3 text-ink-2">
                    Se va a vincular con <b>{profile.name}</b> <span className="text-ink-3">(/{profile.slug})</span>.
                  </p>
                  <Field label="Nombre para identificarla (opcional)" hint="Ej.: Mesa 4, Tarjeta de Juan, Mostrador" className="mt-6">
                    <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Mesa 4" />
                  </Field>
                  <Button size="lg" className="mt-5 w-full" loading={busy} onClick={activate}>Activar y vincular</Button>
                  <p className="mt-3 text-center text-xs text-ink-3">¿No es tu cuenta? <Link href={`/ingresar?next=/t/${code}`} className="underline">Cambiar de cuenta</Link></p>
                </>
              ) : (
                <p className="mt-3 text-ink-2">Tu cuenta todavía no tiene un biosite. <Link href="/panel" className="font-medium text-brand underline">Crealo desde tu panel</Link> y volvé a escanear.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
