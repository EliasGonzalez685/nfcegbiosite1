"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Eye, EyeOff, QrCode, UserPlus, UtensilsCrossed, Wifi, ChevronRight, MapPin } from "lucide-react";
import type { Profile } from "@/lib/types";
import { buildVCard, linkHref, wifiQrString } from "@/lib/links";
import { cn, downloadBlob, profileUrl, slugify } from "@/lib/utils";
import { useCopy } from "@/lib/hooks";
import { qrPngDataUrl } from "@/lib/qr";
import { LinkIcon, BRAND_COLORS } from "./link-icon";
import { BRAND } from "@/lib/brand";

export function themeVars(p: Profile) {
  const dark = p.theme.mode === "dark";
  return {
    "--accent": p.theme.accent,
    "--bg": dark ? "#121212" : `color-mix(in srgb, ${p.theme.accent} 7%, #fbfaf7)`,
    "--surface": dark ? "#1e1e1e" : "#ffffff",
    "--text": dark ? "#f3f3f3" : "#1b1b1b",
    "--muted": dark ? "#a3a3a3" : "#6b6b6b",
    "--border": dark ? "#2c2c2c" : `color-mix(in srgb, ${p.theme.accent} 14%, #e9e6df)`,
  } as React.CSSProperties;
}

export function radiusFor(p: Profile) {
  return p.theme.buttonStyle === "pill" ? "rounded-full" : p.theme.buttonStyle === "square" ? "rounded-md" : "rounded-2xl";
}

export function BiositeView({
  profile: p,
  preview = false,
  onLinkClick,
  hasMenu = false,
}: {
  profile: Profile;
  preview?: boolean;
  onLinkClick?: (linkId: string) => void;
  hasMenu?: boolean;
}) {
  const links = p.links.filter((l) => l.enabled && l.value.trim());
  const radius = radiusFor(p);
  const showMenu = p.sections.menu && hasMenu;

  function saveContact() {
    const vcf = buildVCard(p.contact, { url: profileUrl(p.slug), note: p.tagline });
    downloadBlob(new Blob([vcf], { type: "text/vcard;charset=utf-8" }), `${slugify(p.name) || "contacto"}.vcf`);
  }

  return (
    <div style={themeVars(p)} className="@container min-h-full bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto w-full max-w-[480px] pb-10">
        {/* Portada */}
        <div className="relative h-36 overflow-hidden" style={{ background: `linear-gradient(135deg, ${p.theme.accent}, color-mix(in srgb, ${p.theme.accent} 55%, #000))` }}>
          {p.coverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
        </div>

        <div className="relative px-5">
          <div className="-mt-12 flex justify-center">
            <div className="size-24 overflow-hidden rounded-full border-4 border-[var(--bg)] bg-[var(--surface)] shadow-lg">
              {p.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.avatarUrl} alt={p.name} className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center font-display text-3xl font-bold text-white" style={{ background: p.theme.accent }}>
                  {p.name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 text-center">
            <h1 className="font-display text-2xl font-bold leading-tight">{p.name || "Tu negocio"}</h1>
            {p.tagline && <p className="mt-1 text-[15px] text-[var(--muted)]">{p.tagline}</p>}
            {p.contact.address && (
              <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                <MapPin className="size-3" /> {p.contact.address}
              </p>
            )}
            {p.bio && <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">{p.bio}</p>}
          </div>

          {/* Acciones principales */}
          {(showMenu || p.sections.contact) && (
            <div className={cn("mt-6 grid gap-2.5", showMenu && p.sections.contact ? "grid-cols-2" : "grid-cols-1")}>
              {showMenu && (
                <Link
                  href={preview ? "#" : `/${p.slug}/menu`}
                  onClick={(e) => preview && e.preventDefault()}
                  className={cn("flex h-12 items-center justify-center gap-2 whitespace-nowrap font-semibold text-white shadow-sm transition active:scale-[.98] @max-sm:gap-1.5 @max-sm:text-sm", radius)}
                  style={{ background: p.theme.accent }}
                >
                  <UtensilsCrossed className="size-4" /> Ver menú
                </Link>
              )}
              {p.sections.contact && (
                <button
                  onClick={() => !preview && saveContact()}
                  className={cn(
                    "flex h-12 items-center justify-center gap-2 whitespace-nowrap border font-semibold transition active:scale-[.98] @max-sm:gap-1.5 @max-sm:text-sm",
                    radius,
                    showMenu ? "border-[var(--border)] bg-[var(--surface)]" : "border-transparent text-white",
                  )}
                  style={showMenu ? undefined : { background: p.theme.accent }}
                >
                  <UserPlus className="size-4" /> <span className="@max-[17rem]:hidden">Guardar</span> contacto
                </button>
              )}
            </div>
          )}

          {/* Enlaces */}
          {links.length > 0 && (
            <ul className="mt-5 space-y-2.5">
              {links.map((l) => (
                <li key={l.id}>
                  <a
                    href={preview ? undefined : linkHref(l)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onLinkClick?.(l.id)}
                    className={cn(
                      "group flex min-h-14 cursor-pointer items-center gap-3 border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,.04)] transition hover:-translate-y-px hover:shadow-md active:scale-[.99]",
                      radius,
                    )}
                  >
                    <span
                      className={cn("grid size-10 shrink-0 place-items-center text-white", p.theme.buttonStyle === "pill" ? "rounded-full" : "rounded-xl")}
                      style={{ background: BRAND_COLORS[l.type] ?? p.theme.accent }}
                    >
                      <LinkIcon type={l.type} className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{l.label}</span>
                    <ChevronRight className="size-4 text-[var(--muted)] transition group-hover:translate-x-0.5" />
                  </a>
                </li>
              ))}
            </ul>
          )}

          {/* WiFi */}
          {p.sections.wifi && p.wifi.length > 0 && (
            <div className="mt-6 space-y-3">
              {p.wifi.map((w) => (
                <WifiCard key={w.id} ssid={w.ssid} password={w.password} security={w.security} hidden={w.hidden} note={w.note} radius={radius} />
              ))}
            </div>
          )}

          <p className="mt-10 text-center text-[11px] text-[var(--muted)] opacity-70">
            Hecho con <span className="font-semibold">{BRAND.name}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function WifiCard({ ssid, password, security, hidden, note, radius }: { ssid: string; password: string; security: "WPA" | "WEP" | "nopass"; hidden: boolean; note?: string; radius: string }) {
  const { copied, copy } = useCopy();
  const [show, setShow] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (qrOpen && !qr) qrPngDataUrl(wifiQrString({ ssid, password, security, hidden }), { size: 480 }).then(setQr);
  }, [qrOpen, qr, ssid, password, security, hidden]);

  return (
    <div className={cn("overflow-hidden border border-[var(--border)] bg-[var(--surface)]", radius === "rounded-full" ? "rounded-3xl" : radius)}>
      <div className="flex items-center gap-3 p-4">
        <span className="grid size-10 place-items-center rounded-xl text-white" style={{ background: "var(--accent)" }}>
          <Wifi className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Red WiFi</p>
          <p className="truncate font-semibold">{ssid}</p>
        </div>
      </div>
      {security !== "nopass" ? (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="text-xs text-[var(--muted)]">Contraseña</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate font-mono text-[15px]">{show ? password : "•".repeat(Math.min(password.length, 12))}</code>
            <button onClick={() => setShow((s) => !s)} className="grid size-9 place-items-center rounded-lg text-[var(--muted)] hover:bg-black/5" aria-label="Mostrar contraseña">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => copy(password, "wifi")}
              className="flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white active:scale-[.98]"
              style={{ background: "var(--accent)" }}
            >
              {copied === "wifi" ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied === "wifi" ? "¡Copiada!" : "Copiar contraseña"}
            </button>
            <button onClick={() => setQrOpen((o) => !o)} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] text-sm font-semibold active:scale-[.98]">
              <QrCode className="size-4" /> QR WiFi
            </button>
          </div>
        </div>
      ) : (
        <p className="border-t border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]">Red abierta, sin contraseña.</p>
      )}
      {qrOpen && (
        <div className="border-t border-[var(--border)] p-4 text-center">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR WiFi" className="mx-auto size-48 rounded-xl bg-white p-2" />
          ) : (
            <div className="mx-auto size-48 animate-pulse rounded-xl bg-black/5" />
          )}
          <p className="mt-2 text-xs text-[var(--muted)]">Escaneá este código con la cámara de otro celular para conectarte.</p>
        </div>
      )}
      <p className="bg-black/[.03] px-4 py-2.5 text-xs leading-relaxed text-[var(--muted)]">
        {note ? `${note} · ` : ""}Copiá la contraseña y pegala en Ajustes → WiFi → {ssid}.
      </p>
    </div>
  );
}
