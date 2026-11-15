"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Nfc, Settings2 } from "lucide-react";
import { useSession } from "@/components/session";
import { NotFoundCard } from "@/components/biosite/not-found";
import { LogoMark, PageLoader } from "@/components/ui";

function Inactive() {
  const { me, loading } = useSession();
  const code = (useSearchParams().get("c") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  if (loading) return <PageLoader />;

  // El personal que escanea una plaquita sin destino va directo a configurarla
  if (me && (me.role === "admin" || me.role === "seller") && code) {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <div className="animate-rise w-full max-w-sm text-center">
          <LogoMark />
          <div className="mx-auto mt-8 grid size-20 place-items-center rounded-full bg-brand-soft text-brand"><Nfc className="size-9" /></div>
          <p className="mt-5 text-sm text-ink-3">Plaquita sin destino</p>
          <p className="font-mono text-4xl font-bold tracking-[.2em]">{code}</p>
          <p className="mt-3 text-ink-2">Todavía no abre nada (o está pausada). Asignale ahora a qué negocio o enlace lleva.</p>
          <Link href={`/admin/plaquitas?config=${code}`} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ink font-semibold text-white">
            <Settings2 className="size-5" /> Configurar esta plaquita
          </Link>
        </div>
      </main>
    );
  }
  return <NotFoundCard title="Esta plaquita no está activa" text="Puede que todavía no esté configurada o que el negocio la haya pausado. Avisale al personal del local." />;
}

export default function InactivePlaque() {
  return (
    <Suspense>
      <Inactive />
    </Suspense>
  );
}
