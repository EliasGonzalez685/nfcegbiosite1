"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Delete, Gift, Lock, Sparkles, X } from "lucide-react";
import { loyaltyInfo, loyaltyJoin, loyaltyRedeem, loyaltyStamp } from "@/lib/api";
import { friendlyError } from "@/lib/supabase";
import type { LoyaltyInfo, LoyaltyState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { themeVars } from "@/components/biosite/biosite-view";
import { NotFoundCard } from "@/components/biosite/not-found";
import { PageLoader } from "@/components/ui";

const storageKey = (slug: string) => `${BRAND.storagePrefix}-fidelidad-${slug}`;
const readToken = (slug: string) => {
  try {
    return localStorage.getItem(storageKey(slug));
  } catch {
    return null;
  }
};
const saveToken = (slug: string, token: string | null) => {
  try {
    if (token) localStorage.setItem(storageKey(slug), token);
    else localStorage.removeItem(storageKey(slug));
  } catch {
    /* modo privado */
  }
};

function when(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" });
  return sameDay ? `hoy a las ${time}` : `${d.toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "short" })} a las ${time}`;
}

export default function LoyaltyPage() {
  const { code } = useParams<{ code: string }>();
  const [info, setInfo] = useState<LoyaltyInfo | null | undefined>(undefined);
  const [state, setState] = useState<LoyaltyState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [redeemOpen, setRedeemOpen] = useState(false);

  // 1) datos del programa  2) si ya tiene tarjeta en este celular, sumar sello
  useEffect(() => {
    (async () => {
      try {
        const i = await loyaltyInfo(code);
        setInfo(i);
        if (!i) return;
        document.title = `${i.title} · ${i.business.name}`;
        const token = readToken(i.business.slug);
        if (token) {
          const s = await loyaltyStamp(code, token);
          if (s.status === "unknown_card") saveToken(i.business.slug, null);
          else setState(s);
        }
      } catch (e) {
        setError(friendlyError(e));
        setInfo(null);
      }
    })();
  }, [code]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!info) return;
    setBusy(true);
    setError(null);
    try {
      const s = await loyaltyJoin(code, form.name, form.phone);
      if (s.status === "bad_phone") setError("Revisá el número: solo dígitos, por ejemplo 0981 123 456");
      else if (s.token) {
        saveToken(info.business.slug, s.token);
        setState(s);
      } else setError("Esta tarjeta no está disponible ahora.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  const onRedeemed = useCallback((s: LoyaltyState) => {
    setState(s);
    if (s.status === "redeemed") setRedeemOpen(false);
  }, []);

  if (info === undefined) return <div className="min-h-dvh bg-[#0c0c0d]"><PageLoader /></div>;
  if (!info) return <NotFoundCard title="Tarjeta no disponible" text={error ?? "Este programa de fidelidad no está activo en este momento."} />;

  const required = state?.required ?? info.required;
  const stamps = state?.stamps ?? 0;
  const left = Math.max(0, required - stamps);

  return (
    <main style={themeVars(info.business.accent)} className="relative min-h-dvh overflow-hidden bg-[#0c0c0d] text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 size-80 -translate-x-1/2 rounded-full opacity-40 blur-3xl" style={{ background: "var(--glow)" }} />
      {state?.status === "redeemed" && <Confetti />}

      <div className="relative mx-auto flex min-h-dvh max-w-[440px] flex-col px-5 pb-8 pt-10">
        {/* Encabezado */}
        <div className="flex items-center gap-3">
          <div className="size-14 shrink-0 overflow-hidden rounded-full border-2 border-[var(--accent-l)] bg-[#141415]">
            {info.business.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={info.business.avatar_url} alt="" className="size-full object-cover" />
            ) : (
              <span className="grid size-full place-items-center font-display text-xl font-bold text-[var(--accent-l)]">{info.business.name.slice(0, 1)}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-bold">{info.business.name}</p>
            <p className="text-xs uppercase tracking-[.2em] text-[var(--accent-l)]">{info.title}</p>
          </div>
        </div>

        {/* Tarjeta */}
        <section className="mt-6 rounded-[28px] border border-[color-mix(in_srgb,var(--accent-l)_35%,transparent)] bg-gradient-to-br from-white/[.09] to-white/[.02] p-5 shadow-[0_20px_60px_-20px_var(--glow)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/50">Premio</p>
              <p className="mt-0.5 font-display text-lg font-semibold leading-snug">{info.reward || "Una sorpresa de la casa"}</p>
            </div>
            <Gift className="size-7 shrink-0 text-[var(--accent-l)]" />
          </div>
          <div className={cn("mt-5 grid gap-2.5", required <= 8 ? "grid-cols-4" : required <= 10 ? "grid-cols-5" : "grid-cols-6")}>
            {Array.from({ length: required }, (_, i) => {
              const filled = i < stamps;
              const fresh = state?.status === "stamped" && i === stamps - 1;
              return (
                <div
                  key={i}
                  className={cn(
                    "grid aspect-square place-items-center rounded-full border-2 transition",
                    filled ? "border-transparent text-black" : "border-dashed border-white/20 text-white/25",
                    fresh && "animate-[stamp_.6s_cubic-bezier(.2,1.6,.4,1)_both]",
                  )}
                  style={filled ? { background: "var(--accent-l)" } : undefined}
                >
                  {filled ? <Check className="size-5" strokeWidth={3} /> : i === required - 1 ? <Gift className="size-4" /> : <span className="text-xs font-semibold">{i + 1}</span>}
                </div>
              );
            })}
          </div>
          {state && (
            <p className="mt-4 text-center text-sm text-white/60">
              {stamps} de {required} sellos{state.rewards_redeemed ? ` · ${state.rewards_redeemed} premio${state.rewards_redeemed > 1 ? "s" : ""} canjeado${state.rewards_redeemed > 1 ? "s" : ""}` : ""}
            </p>
          )}
        </section>

        {/* Mensaje según el resultado */}
        <div className="mt-6 flex-1">
          {!state ? (
            <form onSubmit={join} className="animate-rise space-y-3">
              <p className="font-display text-2xl font-bold">Sumá tu primer sello</p>
              <p className="text-sm text-white/60">Cada visita, acercá tu celular a la plaquita o escaneá el QR. Con {info.required} sellos ganás el premio.</p>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Tu nombre"
                autoComplete="given-name"
                className="w-full rounded-2xl border border-white/10 bg-white/[.05] px-4 py-3.5 outline-none placeholder:text-white/35 focus:border-[var(--accent-l)]"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Tu WhatsApp (ej. 0981 123 456)"
                inputMode="tel"
                autoComplete="tel"
                required
                className="w-full rounded-2xl border border-white/10 bg-white/[.05] px-4 py-3.5 outline-none placeholder:text-white/35 focus:border-[var(--accent-l)]"
              />
              {error && <p className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p>}
              <button disabled={busy} className="flex h-14 w-full items-center justify-center gap-2 rounded-full font-semibold text-black transition active:scale-[.98] disabled:opacity-60" style={{ background: "var(--accent-l)" }}>
                <Sparkles className="size-5" /> {busy ? "Sumando…" : "Sumar mi sello"}
              </button>
              <p className="text-center text-[11px] text-white/35">Tu número solo se usa para identificar tu tarjeta en este negocio.</p>
            </form>
          ) : (
            <StatusMessage state={state} left={left} onRedeem={() => setRedeemOpen(true)} reward={info.reward} />
          )}
        </div>

        <Link href={`/${info.business.slug}`} className="mt-8 text-center text-sm text-white/50 underline-offset-4 hover:underline">
          Ver la página de {info.business.name}
        </Link>
      </div>

      {redeemOpen && state?.token && <RedeemSheet code={code} token={state.token} onClose={() => setRedeemOpen(false)} onResult={onRedeemed} />}

      <style>{`@keyframes stamp{0%{transform:scale(2.2) rotate(-25deg);opacity:0}100%{transform:none;opacity:1}}`}</style>
    </main>
  );
}

function StatusMessage({ state, left, onRedeem, reward }: { state: LoyaltyState; left: number; onRedeem: () => void; reward: string }) {
  const box = "animate-rise rounded-3xl border border-white/10 bg-white/[.04] p-5 text-center";
  if (state.status === "redeemed")
    return (
      <div className={box}>
        <p className="text-4xl">🎉</p>
        <p className="mt-2 font-display text-2xl font-bold">¡Premio canjeado!</p>
        <p className="mt-1 text-white/60">Disfrutalo. Tu tarjeta empieza de nuevo desde hoy.</p>
      </div>
    );
  if (state.can_redeem)
    return (
      <div className={box}>
        <p className="text-4xl">🏆</p>
        <p className="mt-2 font-display text-2xl font-bold">¡Completaste tu tarjeta!</p>
        <p className="mt-1 text-white/60">Ganaste: <b className="text-white">{reward || "tu premio"}</b>. Pedíselo al personal.</p>
        <button onClick={onRedeem} className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full font-semibold text-black active:scale-[.98]" style={{ background: "var(--accent-l)" }}>
          <Gift className="size-5" /> Canjear premio
        </button>
      </div>
    );
  if (state.status === "cooldown")
    return (
      <div className={box}>
        <p className="font-display text-xl font-bold">Ya sumaste tu sello ✨</p>
        <p className="mt-1 text-white/60">Podés sumar el próximo {when(state.next_stamp_at)}. Te faltan {left} para el premio.</p>
      </div>
    );
  return (
    <div className={box}>
      <p className="font-display text-2xl font-bold">¡Sumaste un sello{state.name ? `, ${state.name}` : ""}!</p>
      <p className="mt-1 text-white/60">{left === 1 ? "¡Te falta solo 1 para tu premio!" : `Te faltan ${left} para tu premio.`}</p>
    </div>
  );
}

/** El personal del local ingresa su PIN en el celular del cliente para entregar el premio */
function RedeemSheet({ code, token, onClose, onResult }: { code: string; token: string; onClose: () => void; onResult: (s: LoyaltyState) => void }) {
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(p: string) {
    setBusy(true);
    try {
      const s = await loyaltyRedeem(code, token, p);
      if (s.status === "redeemed") onResult(s);
      else {
        setPin("");
        setMsg(s.status === "locked" ? "Demasiados intentos. Esperá 15 minutos." : s.status === "bad_pin" ? "PIN incorrecto" : "Todavía no se puede canjear");
      }
    } catch (e) {
      setMsg(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  function press(d: string) {
    if (busy) return;
    setMsg(null);
    const next = (pin + d).slice(0, 6);
    setPin(next);
    if (next.length === 4) submit(next);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="animate-rise w-full max-w-[440px] rounded-t-[28px] bg-[#161617] px-6 pb-8 pt-5">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[.2em] text-[var(--accent-l)]"><Lock className="size-3.5" /> Solo personal del local</p>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full text-white/60 hover:bg-white/10" aria-label="Cerrar"><X className="size-5" /></button>
        </div>
        <p className="mt-2 font-display text-xl font-bold">Ingresá el PIN para entregar el premio</p>
        <div className="my-5 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn("size-4 rounded-full border-2 border-white/30 transition", i < pin.length && "border-transparent bg-[var(--accent-l)]")} />
          ))}
        </div>
        <p className={cn("mb-3 h-5 text-center text-sm", msg ? "text-red-300" : "text-white/40")}>{msg ?? (busy ? "Verificando…" : "")}</p>
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "←"].map((k) =>
            k === "" ? (
              <span key="e" />
            ) : (
              <button
                key={k}
                onClick={() => (k === "←" ? setPin(pin.slice(0, -1)) : press(k))}
                className="flex h-14 items-center justify-center rounded-2xl bg-white/[.06] text-xl font-semibold active:bg-white/15"
              >
                {k === "←" ? <Delete className="size-5" /> : k}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => i);
  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {pieces.map((i) => (
        <span
          key={i}
          className="absolute top-[-10px] block h-3 w-1.5 rounded-sm"
          style={{
            left: `${(i * 37) % 100}%`,
            background: i % 3 === 0 ? "var(--accent-l)" : i % 3 === 1 ? "#fff" : "var(--accent)",
            animation: `fall ${2 + (i % 5) * 0.4}s ${(i % 7) * 0.15}s ease-in forwards`,
          }}
        />
      ))}
      <style>{`@keyframes fall{to{transform:translateY(110vh) rotate(720deg);opacity:.2}}`}</style>
    </div>
  );
}
