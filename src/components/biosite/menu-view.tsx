"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, Search, X } from "lucide-react";
import type { MenuItem, Profile } from "@/lib/types";
import { cn, formatGs } from "@/lib/utils";
import { whatsappHref } from "@/lib/links";
import { visibleCategories } from "@/lib/menu";
import { themeVars } from "./biosite-view";
import { LinkIcon } from "./link-icon";


function buildOrderMessage(p: Profile, lines: { item: MenuItem; qty: number }[], extra: { name: string; mode: string; table: string; note: string }) {
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const out = [`¡Hola ${p.name}! Quiero hacer este pedido:`, ""];
  for (const l of lines) out.push(`• ${l.qty} x ${l.item.name} — ${formatGs(l.item.price * l.qty)}`);
  out.push("", `*Total: ${formatGs(total)}*`, "", `Modalidad: ${extra.mode}${extra.mode === "En la mesa" && extra.table ? ` (mesa ${extra.table})` : ""}`);
  if (extra.name) out.push(`Nombre: ${extra.name}`);
  if (extra.note) out.push(`Nota: ${extra.note}`);
  return out.join("\n");
}

export function MenuView({ profile: p, preview = false, onBack }: { profile: Profile; preview?: boolean; onBack?: () => void }) {
  const categories = visibleCategories(p);
  const allItems = useMemo(() => categories.flatMap((c) => c.items), [categories]);
  const canOrder = !!p.menu.orderWhatsapp.trim();

  const [cart, setCart] = useState<Record<string, number>>({});
  const [active, setActive] = useState<string | undefined>(categories[0]?.id);
  const [q, setQ] = useState("");
  const [sheet, setSheet] = useState(false);
  const [extra, setExtra] = useState({ name: "", mode: "Para retirar", table: "", note: "" });
  const refs = useRef<Record<string, HTMLElement | null>>({});

  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ item: allItems.find((i) => i.id === id)!, qty }))
    .filter((l) => l.item && l.qty > 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const add = (id: string, d: number) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + d) }));
  const search = q.trim().toLowerCase();
  const match = (i: MenuItem) => !search || i.name.toLowerCase().includes(search) || i.description.toLowerCase().includes(search);

  function jump(id: string) {
    setActive(id);
    refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function send() {
    if (preview) return;
    window.open(whatsappHref(p.menu.orderWhatsapp, buildOrderMessage(p, lines, extra)), "_blank");
  }

  const back = (
    <>
      <ArrowLeft className="size-4" />
    </>
  );

  return (
    <div style={themeVars(p.accent)} className="relative flex min-h-full flex-1 flex-col text-white">
      <div className="mx-auto w-full max-w-[560px] pb-32">
        {/* Encabezado */}
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0c0c0d]/90 backdrop-blur">
          <div className="flex items-center gap-3 px-4 pt-4">
            {onBack ? (
              <button onClick={onBack} className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/5" aria-label="Volver">{back}</button>
            ) : (
              <Link href={`/${p.slug}`} className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/5" aria-label="Volver">{back}</Link>
            )}
            <div className="size-10 shrink-0 overflow-hidden rounded-full border border-[var(--accent-l)] bg-[#141415]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.avatarUrl && <img src={p.avatarUrl} alt="" className="size-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-bold leading-tight">{p.name}</p>
              <p className="text-xs uppercase tracking-[.2em] text-[var(--accent-l)]">Menú</p>
            </div>
          </div>
          <div className="px-4 pt-3">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[.05] px-4">
              <Search className="size-4 text-white/40" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en el menú" className="h-10 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40" />
            </div>
          </div>
          {!search && categories.length > 1 && (
            <nav className="no-scrollbar mt-1 flex gap-2 overflow-x-auto px-4 py-3">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => jump(c.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition",
                    active === c.id ? "border-transparent text-black" : "border-white/15 text-white/70",
                  )}
                  style={active === c.id ? { background: "var(--accent-l)" } : undefined}
                >
                  {c.name}
                </button>
              ))}
            </nav>
          )}
          {(search || categories.length <= 1) && <div className="h-3" />}
        </header>

        {/* Productos */}
        <div className="space-y-9 px-4 pt-6">
          {categories.map((c) => {
            const list = c.items.filter(match);
            if (!list.length) return null;
            return (
              <section key={c.id} ref={(el) => { refs.current[c.id] = el; }} className="scroll-mt-44">
                <h2 className="mb-3 flex items-center gap-3 font-display text-xl font-bold">
                  {c.name}
                  <span className="h-px flex-1" style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--accent-l) 60%, transparent), transparent)" }} />
                </h2>
                <ul className="space-y-3">
                  {list.map((i) => (
                    <li key={i.id} className={cn("flex gap-3 rounded-3xl border border-white/10 bg-white/[.04] p-2.5", i.soldOut && "opacity-55")}>
                      {i.photoUrl && (
                        <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-white/5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={i.photoUrl} alt={i.name} className={cn("size-full object-cover", i.soldOut && "grayscale")} />
                          {i.soldOut && <span className="absolute inset-x-0 bottom-0 bg-black/75 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider">Agotado</span>}
                        </div>
                      )}
                      <div className={cn("flex min-w-0 flex-1 flex-col py-1 pr-1", !i.photoUrl && "pl-2")}>
                        <p className="font-semibold leading-snug">
                          {i.name}
                          {i.soldOut && !i.photoUrl && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider">Agotado</span>}
                        </p>
                        {i.description && <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-white/55">{i.description}</p>}
                        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                          <span className="whitespace-nowrap font-bold tabular-nums text-[var(--accent-l)]">{formatGs(i.price)}</span>
                          {canOrder && !i.soldOut &&
                            (cart[i.id] ? (
                              <div className="flex items-center gap-1 rounded-full border border-white/15 p-0.5">
                                <button onClick={() => add(i.id, -1)} className="grid size-7 place-items-center rounded-full hover:bg-white/10" aria-label="Quitar uno"><Minus className="size-3.5" /></button>
                                <span className="w-5 text-center text-sm font-semibold tabular-nums">{cart[i.id]}</span>
                                <button onClick={() => add(i.id, 1)} className="grid size-7 place-items-center rounded-full text-black" style={{ background: "var(--accent-l)" }} aria-label="Agregar uno"><Plus className="size-3.5" /></button>
                              </div>
                            ) : (
                              <button onClick={() => add(i.id, 1)} className="grid size-8 place-items-center rounded-full text-black" style={{ background: "var(--accent-l)" }} aria-label={`Agregar ${i.name}`}>
                                <Plus className="size-4" />
                              </button>
                            ))}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {search && !allItems.some(match) && <p className="py-12 text-center text-sm text-white/50">No encontramos “{q}”.</p>}
          {categories.length === 0 && <p className="py-12 text-center text-sm text-white/50">Todavía no hay productos en el menú.</p>}
        </div>
      </div>

      {/* Barra del pedido */}
      {count > 0 && (
        <div className={cn(preview ? "sticky" : "fixed", "inset-x-0 bottom-0 z-30 mt-auto p-3")}>
          <button onClick={() => setSheet(true)} className="animate-rise mx-auto flex h-14 w-full max-w-[536px] items-center gap-3 rounded-full px-5 font-semibold text-black shadow-[0_10px_40px_var(--glow)]" style={{ background: "var(--accent-l)" }}>
            <span className="grid size-8 place-items-center rounded-full bg-black/15 text-sm font-bold">{count}</span>
            <span className="flex-1 text-left">Ver pedido</span>
            <span className="tabular-nums">{formatGs(total)}</span>
          </button>
        </div>
      )}

      {sheet && (
        <div className={cn(preview ? "absolute" : "fixed", "inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm")} onClick={() => setSheet(false)}>
          <div onClick={(e) => e.stopPropagation()} className="animate-rise flex max-h-[88%] w-full max-w-[560px] flex-col rounded-t-[28px] border-t border-[color-mix(in_srgb,var(--accent-l)_40%,transparent)] bg-[#161617]">
            <div className="flex items-center justify-between px-5 pb-2 pt-5">
              <h3 className="font-display text-xl font-bold">Tu pedido</h3>
              <button onClick={() => setSheet(false)} className="grid size-8 place-items-center rounded-full text-white/60 hover:bg-white/10" aria-label="Cerrar"><X className="size-5" /></button>
            </div>
            <div className="overflow-y-auto px-5">
              <ul className="divide-y divide-white/10">
                {lines.map((l) => (
                  <li key={l.item.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{l.item.name}</p>
                      <p className="text-sm tabular-nums text-white/50">{formatGs(l.item.price)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-white/15 p-0.5">
                      <button onClick={() => add(l.item.id, -1)} className="grid size-7 place-items-center rounded-full hover:bg-white/10"><Minus className="size-3.5" /></button>
                      <span className="w-5 text-center text-sm font-semibold">{l.qty}</span>
                      <button onClick={() => add(l.item.id, 1)} className="grid size-7 place-items-center rounded-full hover:bg-white/10"><Plus className="size-3.5" /></button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-white/[.06] p-1">
                {["Para retirar", "Delivery", "En la mesa"].map((m) => (
                  <button key={m} onClick={() => setExtra((e) => ({ ...e, mode: m }))} className={cn("rounded-full py-2 text-xs font-semibold", extra.mode === m ? "text-black" : "text-white/60")} style={extra.mode === m ? { background: "var(--accent-l)" } : undefined}>
                    {m}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid gap-2 pb-2">
                {extra.mode === "En la mesa" && <input value={extra.table} onChange={(e) => setExtra({ ...extra, table: e.target.value })} placeholder="Número de mesa" className="h-11 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-sm outline-none placeholder:text-white/40" />}
                <input value={extra.name} onChange={(e) => setExtra({ ...extra, name: e.target.value })} placeholder="Tu nombre (opcional)" className="h-11 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-sm outline-none placeholder:text-white/40" />
                <textarea value={extra.note} onChange={(e) => setExtra({ ...extra, note: e.target.value })} rows={2} placeholder={extra.mode === "Delivery" ? "Dirección y referencias" : "Aclaraciones (sin cebolla, etc.)"} className="rounded-2xl border border-white/10 bg-white/[.04] px-4 py-2.5 text-sm outline-none placeholder:text-white/40" />
              </div>
            </div>
            <div className="border-t border-white/10 p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-white/60">Total</span>
                <span className="font-display text-2xl font-bold tabular-nums">{formatGs(total)}</span>
              </div>
              <button onClick={send} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-3.5 font-semibold text-white active:scale-[.98]">
                <LinkIcon type="whatsapp" className="size-5" /> Enviar pedido por WhatsApp
              </button>
              <p className="mt-2 text-center text-[11px] text-white/40">Se abre WhatsApp con tu pedido listo para enviar.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
