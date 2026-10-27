"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, Copy, PartyPopper } from "lucide-react";
import { db } from "@/lib/data";
import { useAsync, useCopy } from "@/lib/hooks";
import { useSession } from "@/components/session";
import { PanelPage } from "@/components/panel/editor";
import { PageHeader } from "@/components/panel/shell";
import { DailyChart, KpiCard, RankList } from "@/components/panel/charts";
import { Button, PageLoader } from "@/components/ui";
import { profileUrl, relativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

function Checklist() {
  const { profile } = useSession();
  const { data } = useAsync(async () => {
    const [codes, menu] = await Promise.all([db.codes.listByProfile(profile!.id), db.menu.list(profile!.id)]);
    return { codes: codes.length, items: menu.items.length };
  }, [profile?.id]);
  if (!profile || !data) return null;
  const steps = [
    { done: !!profile.avatarUrl && !!profile.tagline, label: "Subí tu logo y una descripción corta", href: "/panel/perfil" },
    { done: profile.links.filter((l) => l.enabled).length >= 2, label: "Agregá al menos 2 enlaces (WhatsApp, Instagram…)", href: "/panel/enlaces" },
    { done: !profile.sections.wifi || profile.wifi.length > 0, label: "Configurá el WiFi para clientes (opcional)", href: "/panel/wifi" },
    { done: !profile.sections.menu || data.items > 0, label: "Cargá tu menú (si tenés gastronomía)", href: "/panel/menu" },
    { done: data.codes > 0, label: "Activá tu primera tarjeta o placa", href: "/panel/codigos" },
  ];
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Completá tu biosite</h2>
          <p className="text-sm text-ink-3">{done} de {steps.length} pasos</p>
        </div>
        <div className="h-2 w-28 overflow-hidden rounded-full bg-paper-2"><div className="h-full rounded-full bg-clay" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      </div>
      <ul className="divide-y divide-line">
        {steps.map((s) => (
          <li key={s.label}>
            <Link href={s.href} className="flex items-center gap-3 px-5 py-3 hover:bg-paper/60">
              <span className={cn("grid size-6 place-items-center rounded-full border", s.done ? "border-brand bg-brand text-white" : "border-line")}>{s.done && <Check className="size-3.5" />}</span>
              <span className={cn("flex-1 text-[15px]", s.done && "text-ink-3 line-through")}>{s.label}</span>
              {!s.done && <ArrowRight className="size-4 text-ink-3" />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Home() {
  const { profile, session } = useSession();
  const welcome = useSearchParams().get("bienvenida");
  const [days, setDays] = useState(30);
  const { copied, copy } = useCopy();
  const { data, loading } = useAsync(
    async () => ({
      stats: await db.analytics.summary(profile!.id, days),
      recent: await db.analytics.recent(profile!.id, 8),
    }),
    [profile?.id, days],
  );
  if (!profile) return null;
  const url = profileUrl(profile.slug);
  const labelFor = (linkId?: string) => profile.links.find((l) => l.id === linkId)?.label ?? "enlace";

  return (
    <PanelPage>
      <PageHeader
        title={`¡Hola, ${session?.user.name.split(" ")[0]}!`}
        description="Así le va a tu biosite."
        actions={
          <div className="flex rounded-xl border border-line bg-white p-1">
            {[7, 30].map((d) => (
              <button key={d} onClick={() => setDays(d)} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", days === d ? "bg-ink text-white" : "text-ink-3")}>{d} días</button>
            ))}
          </div>
        }
      />

      {welcome && (
        <div className="animate-rise mb-6 flex items-start gap-3 rounded-2xl bg-clay-soft p-4 text-ink">
          <PartyPopper className="mt-0.5 size-5 text-clay" />
          <div><p className="font-semibold">¡Bienvenido/a! Tu biosite ya está creado.</p><p className="text-sm text-ink-2">Completá los pasos de abajo y activá tu tarjeta escaneándola con el celular.</p></div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3 pl-4">
        <span className="text-sm text-ink-3">Tu enlace</span>
        <a href={`/${profile.slug}`} target="_blank" className="min-w-0 flex-1 truncate font-medium text-brand">{url.replace(/^https?:\/\//, "")}</a>
        <Button size="sm" variant="secondary" onClick={() => copy(url)} icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}>{copied ? "Copiado" : "Copiar"}</Button>
      </div>

      {loading || !data ? (
        <PageLoader />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Escaneos NFC/QR" value={data.stats.scans} accent />
            <KpiCard label="Visitas al biosite" value={data.stats.views} />
            <KpiCard label="Clics en enlaces" value={data.stats.clicks} />
            <KpiCard label="Tasa de clic" value={`${data.stats.views ? Math.round((data.stats.clicks / data.stats.views) * 100) : 0}%`} sub="clics / visitas" />
          </div>
          <Checklist />
          <DailyChart daily={data.stats.daily} />
          <div className="grid gap-5 lg:grid-cols-3">
            <RankList title="Enlaces más tocados" rows={data.stats.topLinks.map((l) => ({ label: l.label, value: l.clicks }))} empty="Todavía no hay clics." />
            <RankList title="Escaneos por tarjeta/placa" rows={data.stats.byCode.map((c) => ({ label: c.code, value: c.scans, mono: true }))} empty="Todavía no hay escaneos." />
            <div className="card p-5">
              <h3 className="font-display font-semibold">Actividad reciente</h3>
              <ul className="mt-4 space-y-3">
                {data.recent.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 text-sm">
                    <span className={cn("size-2 rounded-full", e.type === "scan" ? "bg-brand" : e.type === "click" ? "bg-clay" : "bg-[#9db8a8]")} />
                    <span className="flex-1 truncate">
                      {e.type === "scan" ? <>Escaneo de <span className="font-mono">{e.code}</span></> : e.type === "click" ? <>Clic en “{labelFor(e.linkId)}”</> : "Visita al biosite"}
                    </span>
                    <span className="shrink-0 text-xs text-ink-3">{relativeTime(e.at)}</span>
                  </li>
                ))}
                {data.recent.length === 0 && <p className="text-sm text-ink-3">Sin actividad todavía.</p>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </PanelPage>
  );
}

export default function PanelHome() {
  return <Suspense><Home /></Suspense>;
}
