"use client";

import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import type { Profile, ProfileLink } from "@/lib/types";
import { buildVCard, isAction, isComplete, linkHref, wifiQrString } from "@/lib/links";
import { cn, downloadBlob, profileUrl, slugify } from "@/lib/utils";
import { useCopy } from "@/lib/hooks";
import { qrPngDataUrl } from "@/lib/qr";
import { BRAND } from "@/lib/brand";
import { LinkIcon } from "./link-icon";

/** Variables de color a partir del color de marca del negocio */
export function themeVars(accent: string) {
  return {
    "--accent": accent,
    // versión más clara para bordes/íconos, legible sobre fondo oscuro aunque el color sea oscuro
    "--accent-l": `color-mix(in srgb, ${accent} 78%, white)`,
    "--glow": `color-mix(in srgb, ${accent} 45%, transparent)`,
    background: `radial-gradient(120% 55% at 50% 0%, color-mix(in srgb, ${accent} 26%, #0c0c0d) 0%, #0c0c0d 62%), #0c0c0d`,
  } as React.CSSProperties;
}

export function BiositeView({ profile: p, preview = false }: { profile: Profile; preview?: boolean }) {
  const links = p.links.filter(isComplete);
  const [wifi, setWifi] = useState<ProfileLink | null>(null);

  function onAction(l: ProfileLink) {
    if (l.type === "wifi") setWifi(l);
    if (l.type === "vcard" && !preview) {
      downloadBlob(new Blob([buildVCard(p, profileUrl(p.slug))], { type: "text/vcard;charset=utf-8" }), `${slugify(p.name) || "contacto"}.vcf`);
    }
  }

  return (
    <div style={themeVars(p.accent)} className="relative flex min-h-full flex-1 flex-col overflow-hidden text-white">
      {/* brillo de fondo */}
      <div className="pointer-events-none absolute left-1/2 top-10 size-72 -translate-x-1/2 rounded-full opacity-40 blur-3xl" style={{ background: "var(--glow)" }} />

      <div className="relative mx-auto flex w-full max-w-[440px] flex-1 flex-col px-6 pb-8 pt-14">
        {/* Logo */}
        <div className="mx-auto size-32 rounded-full p-[3px] shadow-[0_0_50px_var(--glow)]" style={{ background: "linear-gradient(145deg, var(--accent-l), var(--accent) 60%, color-mix(in srgb, var(--accent) 55%, black))" }}>
          <div className="size-full overflow-hidden rounded-full bg-[#141415]">
            {p.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.avatarUrl} alt={p.name} className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center font-display text-5xl font-bold text-[var(--accent-l)]">{(p.name || "?").slice(0, 1).toUpperCase()}</div>
            )}
          </div>
        </div>

        <h1 className="mt-6 text-center font-display text-[32px] font-bold leading-tight tracking-tight">{p.name || "Tu negocio"}</h1>
        {p.tagline && <p className="mt-1.5 text-center text-[15px] text-white/60">{p.tagline}</p>}
        <div className="mx-auto mt-5 h-px w-16" style={{ background: "linear-gradient(90deg, transparent, var(--accent-l), transparent)" }} />

        {/* Botones */}
        <ul className="mt-7 space-y-3.5">
          {links.map((l) => {
            const inner = (
              <>
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--accent-l)]">
                  <LinkIcon type={l.type} className="size-[22px]" />
                </span>
                <span className="block truncate px-12 text-center text-[16px] font-medium tracking-wide">{l.label}</span>
              </>
            );
            const cls =
              "relative block w-full rounded-full border border-[color-mix(in_srgb,var(--accent-l)_55%,transparent)] bg-white/[.04] py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur transition hover:bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] hover:border-[var(--accent-l)] active:scale-[.98]";
            return (
              <li key={l.id}>
                {isAction(l.type) ? (
                  <button type="button" onClick={() => onAction(l)} className={cls}>
                    {inner}
                  </button>
                ) : (
                  <a href={preview ? undefined : linkHref(l)} target="_blank" rel="noopener noreferrer" className={cn(cls, "cursor-pointer")}>
                    {inner}
                  </a>
                )}
              </li>
            );
          })}
          {links.length === 0 && <li className="rounded-3xl border border-dashed border-white/15 py-8 text-center text-sm text-white/40">Todavía no hay botones</li>}
        </ul>

        <p className="mt-auto pt-12 text-center text-[11px] tracking-wide text-white/30">
          Hecho con <span className="font-semibold text-white/50">{BRAND.name}</span>
        </p>
      </div>

      {wifi && <WifiSheet link={wifi} preview={preview} onClose={() => setWifi(null)} />}
    </div>
  );
}

function WifiSheet({ link, onClose, preview }: { link: ProfileLink; onClose: () => void; preview: boolean }) {
  const { copied, copy } = useCopy();
  const [qr, setQr] = useState<string | null>(null);
  const pass = link.password ?? "";

  useEffect(() => {
    qrPngDataUrl(wifiQrString(link.value, pass), { size: 420 }).then(setQr);
  }, [link.value, pass]);

  return (
    <div className={cn(preview ? "absolute" : "fixed", "inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm")} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="animate-rise w-full max-w-[440px] rounded-t-[28px] border-t border-[color-mix(in_srgb,var(--accent-l)_40%,transparent)] bg-[#161617] px-6 pb-8 pt-5 text-white">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[.2em] text-[var(--accent-l)]">Red WiFi</p>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-full text-white/60 hover:bg-white/10" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-1 font-display text-2xl font-bold">{link.value}</p>

        {pass ? (
          <>
            <div className="mt-5 rounded-2xl bg-white/[.06] px-4 py-3">
              <p className="text-xs text-white/50">Contraseña</p>
              <p className="mt-0.5 break-all font-mono text-lg">{pass}</p>
            </div>
            <button
              onClick={() => copy(pass, "wifi")}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3.5 font-semibold text-black active:scale-[.98]"
              style={{ background: "var(--accent-l)" }}
            >
              {copied === "wifi" ? <Check className="size-5" /> : <Copy className="size-5" />}
              {copied === "wifi" ? "¡Contraseña copiada!" : "Copiar contraseña"}
            </button>
            <p className="mt-3 text-center text-xs text-white/50">Pegala en Ajustes → WiFi → {link.value}</p>
          </>
        ) : (
          <p className="mt-4 text-sm text-white/60">Red abierta, no necesita contraseña.</p>
        )}

        <div className="mt-6 flex items-center gap-4 rounded-2xl bg-white/[.04] p-3">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR WiFi" className="size-24 shrink-0 rounded-xl bg-white p-1" />
          ) : (
            <div className="size-24 shrink-0 animate-pulse rounded-xl bg-white/10" />
          )}
          <p className="text-xs leading-relaxed text-white/55">¿Otra persona quiere conectarse? Que escanee este código con la cámara de su celular y se conecta directo.</p>
        </div>
      </div>
    </div>
  );
}
