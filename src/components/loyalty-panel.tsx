"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, Gift, Minus, Plus, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import type { LoyaltyCard, LoyaltyProgram } from "@/lib/types";
import { deleteLoyaltyCard, getLoyaltyProgram, listLoyaltyCards, listPlaques, markCardRedeemed, saveLoyaltyProgram, setCardStamps } from "@/lib/api";
import { friendlyError } from "@/lib/supabase";
import { cn, relativeTime } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import { useToast } from "@/components/ui/toast";
import { Badge, Button, EmptyState, Field, Input, PageLoader, Toggle } from "@/components/ui";

const COOLDOWNS = [
  { h: 0, label: "Sin espera" },
  { h: 4, label: "4 horas" },
  { h: 12, label: "12 horas" },
  { h: 24, label: "1 día" },
  { h: 72, label: "3 días" },
];

export function LoyaltyPanel({ businessId, accent, onCreatePlaque }: { businessId: string; accent: string; onCreatePlaque?: () => void }) {
  const toast = useToast();
  const prog = useAsync(() => getLoyaltyProgram(businessId), [businessId]);
  const cards = useAsync(() => listLoyaltyCards(businessId), [businessId]);
  const plaques = useAsync(() => listPlaques(businessId), [businessId]);
  const [draft, setDraft] = useState<LoyaltyProgram | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  const p = draft ?? prog.data;
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(prog.data);
  const loyaltyPlaques = (plaques.data ?? []).filter((x) => x.targetType === "loyalty");

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (cards.data ?? []).filter((c) => !s || c.customerName.toLowerCase().includes(s) || c.phone.includes(s.replace(/\D/g, "") || "~"));
  }, [cards.data, q]);

  if (prog.loading && !prog.data) return <PageLoader />;
  if (!p) return <EmptyState title="Fidelización no disponible" description="No tenés permiso para ver este programa." />;

  const set = (patch: Partial<LoyaltyProgram>) => setDraft({ ...p, ...patch });

  async function save() {
    if (!p) return;
    if (!/^\d{4}$/.test(p.redeemPin)) return toast.error("El PIN debe tener 4 números");
    if (p.enabled && !p.reward.trim()) return toast.error("Escribí cuál es el premio");
    setSaving(true);
    try {
      await saveLoyaltyProgram(p);
      prog.setData(p);
      setDraft(null);
      toast.success("Programa de fidelidad guardado");
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  async function adjust(c: LoyaltyCard, delta: number) {
    try {
      await setCardStamps(c.id, c.stamps + delta);
      cards.setData((l) => l?.map((x) => (x.id === c.id ? { ...x, stamps: Math.max(0, x.stamps + delta) } : x)) ?? null);
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  async function redeem(c: LoyaltyCard) {
    if (!p || !confirm(`¿Entregar el premio a ${c.customerName || c.phone}?`)) return;
    try {
      await markCardRedeemed(c, p.stampsRequired);
      toast.success("Premio entregado 🎉");
      cards.reload();
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  async function remove(c: LoyaltyCard) {
    if (!confirm(`¿Borrar la tarjeta de ${c.customerName || c.phone}? Pierde sus sellos.`)) return;
    try {
      await deleteLoyaltyCard(c.id);
      cards.setData((l) => l?.filter((x) => x.id !== c.id) ?? null);
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  return (
    <div className="space-y-5">
      <section className="card overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_300px]">
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">Tarjeta de fidelidad</h2>
                <p className="mt-0.5 text-sm text-ink-3">Tus clientes escanean o acercan el celular a la plaquita en cada visita y suman sellos. Al completarla ganan el premio.</p>
              </div>
              <Toggle checked={p.enabled} onChange={(enabled) => set({ enabled })} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Premio" hint="Ej.: Un café gratis, 20% de descuento, un corte sin cargo">
                <Input value={p.reward} onChange={(e) => set({ reward: e.target.value })} placeholder="Un café gratis" maxLength={80} />
              </Field>
              <Field label="Nombre de la tarjeta">
                <Input value={p.title} onChange={(e) => set({ title: e.target.value })} maxLength={40} />
              </Field>
            </div>

            <div>
              <p className="label">Sellos para ganar: <b className="text-ink">{p.stampsRequired}</b></p>
              <input type="range" min={3} max={15} value={p.stampsRequired} onChange={(e) => set({ stampsRequired: Number(e.target.value) })} className="w-full accent-[var(--color-brand)]" />
            </div>

            <div>
              <p className="label">Tiempo mínimo entre sellos</p>
              <div className="flex flex-wrap gap-1.5">
                {COOLDOWNS.map((c) => (
                  <button key={c.h} type="button" onClick={() => set({ cooldownHours: c.h })} className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition", p.cooldownHours === c.h ? "border-brand bg-brand text-white" : "border-line bg-white text-ink-2 hover:border-ink-3")}>
                    {c.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-ink-3">Evita que alguien sume varios sellos en la misma visita.</p>
            </div>

            <Field label="PIN para entregar premios" hint="Lo ingresa el personal en el celular del cliente al canjear. No se lo des a los clientes.">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input type={showPin ? "text" : "password"} inputMode="numeric" maxLength={4} value={p.redeemPin} onChange={(e) => set({ redeemPin: e.target.value.replace(/\D/g, "") })} className="pr-10 font-mono tracking-[.4em]" />
                  <button type="button" onClick={() => setShowPin((v) => !v)} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center text-ink-3" aria-label="Mostrar PIN">
                    {showPin ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <Button variant="secondary" type="button" icon={<RefreshCw className="size-4" />} onClick={() => { set({ redeemPin: String(Math.floor(1000 + Math.random() * 9000)) }); setShowPin(true); }}>Nuevo</Button>
              </div>
            </Field>

            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
              <Button disabled={!dirty} loading={saving} icon={<Save className="size-4" />} onClick={save}>Guardar programa</Button>
              {dirty && <button className="text-sm text-ink-3 hover:text-ink" onClick={() => setDraft(null)}>Descartar</button>}
              <span className="ml-auto text-sm text-ink-3">
                {loyaltyPlaques.length ? `${loyaltyPlaques.length} plaquita${loyaltyPlaques.length > 1 ? "s" : ""} de fidelidad` : "Sin plaquita de fidelidad todavía"}
              </span>
              {onCreatePlaque && !loyaltyPlaques.length && <Button size="sm" variant="secondary" onClick={onCreatePlaque}>Crear plaquita</Button>}
            </div>
          </div>

          {/* Vista previa de la tarjeta */}
          <div className="flex items-center justify-center bg-[#0c0c0d] p-6" style={{ ["--a" as string]: accent }}>
            <div className="w-full max-w-[260px] rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 to-white/[.02] p-4 text-white shadow-2xl">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-white/50">{p.title || "Tarjeta"}</p>
                  <p className="truncate font-display font-semibold">{p.reward || "Tu premio"}</p>
                </div>
                <Gift className="size-5 shrink-0" style={{ color: accent }} />
              </div>
              <div className="mt-3 grid grid-cols-5 gap-1.5">
                {Array.from({ length: p.stampsRequired }, (_, i) => (
                  <span key={i} className={cn("aspect-square rounded-full", i < 3 ? "" : "border border-dashed border-white/25")} style={i < 3 ? { background: accent } : undefined} />
                ))}
              </div>
              <p className="mt-3 text-center text-[11px] text-white/50">Así la ve tu cliente en su celular</p>
            </div>
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Clientes con tarjeta</h2>
            <p className="text-sm text-ink-3">{cards.data?.length ?? 0} tarjetas · {(cards.data ?? []).reduce((n, c) => n + c.rewardsRedeemed, 0)} premios entregados</p>
          </div>
          {(cards.data?.length ?? 0) > 5 && (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3">
              <Search className="size-4 text-ink-3" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o teléfono" className="h-9 w-44 bg-transparent text-sm outline-none" />
            </div>
          )}
        </div>
        {cards.loading && !cards.data ? (
          <PageLoader />
        ) : !list.length ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
            {q ? "Sin resultados." : "Cuando tus clientes escaneen la plaquita de fidelidad, aparecen acá."}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((c) => {
              const complete = c.stamps >= p.stampsRequired;
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-paper-2 font-semibold">{(c.customerName || "?").slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.customerName || "Sin nombre"} {complete && <Badge tone="clay">¡Premio listo!</Badge>}</p>
                    <p className="text-xs text-ink-3">+{c.phone} · {c.lastStampAt ? `última visita ${relativeTime(c.lastStampAt)}` : "sin visitas"} · {c.rewardsRedeemed} premios</p>
                    <div className="mt-1.5 flex gap-1">
                      {Array.from({ length: p.stampsRequired }, (_, i) => (
                        <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < c.stamps ? "bg-brand" : "bg-line")} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => adjust(c, -1)} disabled={!c.stamps} className="grid size-8 place-items-center rounded-lg border border-line hover:bg-paper disabled:opacity-30" aria-label="Quitar sello"><Minus className="size-4" /></button>
                    <span className="w-10 text-center text-sm font-semibold tabular-nums">{c.stamps}/{p.stampsRequired}</span>
                    <button onClick={() => adjust(c, 1)} className="grid size-8 place-items-center rounded-lg border border-line hover:bg-paper" aria-label="Sumar sello"><Plus className="size-4" /></button>
                    {complete && <Button size="sm" variant="clay" icon={<Gift className="size-4" />} onClick={() => redeem(c)}>Entregar</Button>}
                    <button onClick={() => remove(c)} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-red-50 hover:text-danger" aria-label="Borrar tarjeta"><Trash2 className="size-4" /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
