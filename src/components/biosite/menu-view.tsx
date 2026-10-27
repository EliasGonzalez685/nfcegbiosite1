"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, X, Search } from "lucide-react";
import type { MenuCategory, MenuItem, Profile } from "@/lib/types";
import { cn, formatGs } from "@/lib/utils";
import { tagMeta, whatsappHref } from "@/lib/links";
import { themeVars } from "./biosite-view";
import { LinkIcon } from "./link-icon";

type Cart = Record<string, number>;

export function buildOrderMessage(
  p: Profile,
  lines: { item: MenuItem; qty: number }[],
  extra: { name: string; mode: string; table: string; note: string },
) {
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const parts = [`¡Hola ${p.name}! Quiero hacer este pedido:`, ""];
  for (const l of lines) parts.push(`• ${l.qty} x ${l.item.name} — ${formatGs(l.item.price * l.qty)}`);
  parts.push("", `*Total: ${formatGs(total)}*`, "");
  parts.push(`Modalidad: ${extra.mode}${extra.mode === "En la mesa" && extra.table ? ` (mesa ${extra.table})` : ""}`);
  if (extra.name) parts.push(`Nombre: ${extra.name}`);
  if (extra.note) parts.push(`Nota: ${extra.note}`);
  return parts.join("\n");
}

export function MenuView({
  profile: p,
  categories,
  items,
  preview = false,
  onOrder,
}: {
  profile: Profile;
  categories: MenuCategory[];
  items: MenuItem[];
  preview?: boolean;
  onOrder?: () => void;
}) {
  const [cart, setCart] = useState<Cart>({});
  const [active, setActive] = useState(categories[0]?.id);
  const [sheet, setSheet] = useState(false);
  const [q, setQ] = useState("");
  const [extra, setExtra] = useState({ name: "", mode: "Para retirar", table: "", note: "" });
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const scrollRoot = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((i) => i.name.toLowerCase().includes(s) || i.description.toLowerCase().includes(s)) : items;
  }, [items, q]);

  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ item: items.find((i) => i.id === id)!, qty }))
    .filter((l) => l.item && l.qty > 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.item.price * l.qty, 0);
  const canOrder = !!p.orderWhatsapp;

  const add = (id: string, d: number) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + d) }));

  function jump(id: string) {
    setActive(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function sendOrder() {
    const msg = buildOrderMessage(p, lines, extra);
    onOrder?.();
    if (!preview) window.open(whatsappHref(p.orderWhatsapp, msg), "_blank");
  }

  return (
    <div ref={scrollRoot} style={themeVars(p)} className="@container relative min-h-full bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-[560px] pb-32">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 pt-3">
            <Link href={preview ? "#" : `/${p.slug}`} className="grid size-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)]" aria-label="Volver">
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-bold leading-tight">{p.name}</p>
              <p className="text-xs text-[var(--muted)]">Menú · precios en guaraníes</p>
            </div>
          </div>
          <div className="px-4 pt-3">
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3">
              <Search className="size-4 text-[var(--muted)]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en el menú" className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-[var(--muted)]" />
            </div>
          </div>
          {!q && (
            <nav className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto px-4 pb-2.5">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => jump(c.id)}
                  className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition", active === c.id ? "text-white" : "bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]")}
                  style={active === c.id ? { background: "var(--accent)" } : undefined}
                >
                  {c.name}
                </button>
              ))}
            </nav>
          )}
        </header>

        <div className="space-y-8 px-4 pt-5">
          {categories.map((c) => {
            const list = filtered.filter((i) => i.categoryId === c.id);
            if (!list.length) return null;
            return (
              <section key={c.id} ref={(el) => { sectionRefs.current[c.id] = el; }} className="scroll-mt-40">
                <h2 className="mb-3 font-display text-xl font-bold">{c.name}</h2>
                <ul className="space-y-3">
                  {list.map((i) => (
                    <li key={i.id} className={cn("flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2.5", i.soldOut && "opacity-60")}>
                      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-black/5 @max-sm:size-20">
                        {i.photoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={i.photoUrl} alt={i.name} className={cn("size-full object-cover", i.soldOut && "grayscale")} />
                        )}
                        {i.soldOut && <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center text-[10px] font-bold uppercase tracking-wider text-white">Agotado</span>}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col py-0.5">
                        <p className="font-semibold leading-snug">{i.name}</p>
                        {i.description && <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[var(--muted)]">{i.description}</p>}
                        {i.tags.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {i.tags.map((t) => {
                              const m = tagMeta(t);
                              return (
                                <span key={t} className="rounded-full px-2 py-px text-[10px] font-semibold" style={{ color: m.color, background: `color-mix(in srgb, ${m.color} 12%, transparent)` }}>
                                  {m.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <div className="mt-auto flex items-center justify-between pt-2">
                          <span className="whitespace-nowrap font-bold tabular-nums">{formatGs(i.price)}</span>
                          {canOrder && !i.soldOut && (
                            cart[i.id] ? (
                              <div className="flex items-center gap-1 rounded-full border border-[var(--border)] p-0.5">
                                <button onClick={() => add(i.id, -1)} className="grid size-7 place-items-center rounded-full hover:bg-black/5" aria-label="Quitar uno"><Minus className="size-3.5" /></button>
                                <span className="w-5 text-center text-sm font-semibold tabular-nums">{cart[i.id]}</span>
                                <button onClick={() => add(i.id, 1)} className="grid size-7 place-items-center rounded-full text-white" style={{ background: "var(--accent)" }} aria-label="Agregar uno"><Plus className="size-3.5" /></button>
                              </div>
                            ) : (
                              <button onClick={() => add(i.id, 1)} className="flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold text-white" style={{ background: "var(--accent)" }}>
                                <Plus className="size-3.5" /> <span className="@max-sm:hidden">Agregar</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {filtered.length === 0 && <p className="py-12 text-center text-sm text-[var(--muted)]">No encontramos productos con “{q}”.</p>}
        </div>
      </div>

      {/* Barra del pedido */}
      {count > 0 && (
        <div className={cn(preview ? "absolute" : "fixed", "inset-x-0 bottom-0 z-30 p-3")}>
          <button
            onClick={() => setSheet(true)}
            className="animate-rise mx-auto flex h-14 w-full max-w-[536px] items-center gap-3 rounded-2xl px-4 text-white shadow-xl"
            style={{ background: "var(--accent)" }}
          >
            <span className="grid size-8 place-items-center rounded-full bg-white/20 text-sm font-bold">{count}</span>
            <span className="flex-1 text-left font-semibold">Ver pedido</span>
            <span className="font-bold tabular-nums">{formatGs(total)}</span>
          </button>
        </div>
      )}

      {sheet && (
        <div className={cn(preview ? "absolute" : "fixed", "inset-0 z-40 flex items-end bg-black/40")} onClick={() => setSheet(false)}>
          <div onClick={(e) => e.stopPropagation()} className="animate-rise mx-auto flex max-h-[88%] w-full max-w-[560px] flex-col rounded-t-3xl bg-[var(--surface)] text-[var(--text)]">
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <h3 className="font-display text-xl font-bold">Tu pedido</h3>
              <button onClick={() => setSheet(false)} className="grid size-8 place-items-center rounded-full hover:bg-black/5" aria-label="Cerrar"><X className="size-5" /></button>
            </div>
            <div className="overflow-y-auto px-5">
              <ul className="divide-y divide-[var(--border)]">
                {lines.map((l) => (
                  <li key={l.item.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{l.item.name}</p>
                      <p className="text-sm text-[var(--muted)] tabular-nums">{formatGs(l.item.price)} c/u</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-[var(--border)] p-0.5">
                      <button onClick={() => add(l.item.id, -1)} className="grid size-7 place-items-center rounded-full hover:bg-black/5"><Minus className="size-3.5" /></button>
                      <span className="w-5 text-center text-sm font-semibold">{l.qty}</span>
                      <button onClick={() => add(l.item.id, 1)} className="grid size-7 place-items-center rounded-full hover:bg-black/5"><Plus className="size-3.5" /></button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl bg-black/5 p-1">
                {["Para retirar", "Delivery", "En la mesa"].map((m) => (
                  <button key={m} onClick={() => setExtra((e) => ({ ...e, mode: m }))} className={cn("rounded-lg py-2 text-xs font-semibold", extra.mode === m ? "bg-[var(--surface)] shadow-sm" : "text-[var(--muted)]")}>
                    {m}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid gap-2">
                {extra.mode === "En la mesa" && (
                  <input value={extra.table} onChange={(e) => setExtra({ ...extra, table: e.target.value })} placeholder="Número de mesa" className="h-11 rounded-xl border border-[var(--border)] bg-transparent px-3 text-sm outline-none" />
                )}
                <input value={extra.name} onChange={(e) => setExtra({ ...extra, name: e.target.value })} placeholder="Tu nombre (opcional)" className="h-11 rounded-xl border border-[var(--border)] bg-transparent px-3 text-sm outline-none" />
                <textarea value={extra.note} onChange={(e) => setExtra({ ...extra, note: e.target.value })} placeholder={extra.mode === "Delivery" ? "Dirección y referencias" : "Aclaraciones (sin cebolla, etc.)"} rows={2} className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none" />
              </div>
            </div>
            <div className="border-t border-[var(--border)] p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[var(--muted)]">Total</span>
                <span className="font-display text-xl font-bold tabular-nums">{formatGs(total)}</span>
              </div>
              <button onClick={sendOrder} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] font-semibold text-white active:scale-[.98]">
                <LinkIcon type="whatsapp" className="size-5" /> Pedir por WhatsApp
              </button>
              <p className="mt-2 text-center text-[11px] text-[var(--muted)]">Se abrirá WhatsApp con tu pedido listo para enviar.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
