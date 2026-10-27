import type { ContactInfo, LinkType, ProfileLink, WifiNetwork } from "@/lib/types";

export const LINK_TYPES: { type: LinkType; label: string; placeholder: string; hint?: string }[] = [
  { type: "whatsapp", label: "WhatsApp", placeholder: "595981123456", hint: "Número con código de país, sin + ni espacios" },
  { type: "instagram", label: "Instagram", placeholder: "https://instagram.com/tunegocio" },
  { type: "facebook", label: "Facebook", placeholder: "https://facebook.com/tunegocio" },
  { type: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@tunegocio" },
  { type: "maps", label: "Google Maps", placeholder: "https://maps.app.goo.gl/…" },
  { type: "google_review", label: "Reseñas de Google", placeholder: "https://g.page/r/…/review" },
  { type: "website", label: "Sitio web", placeholder: "https://tunegocio.com.py" },
  { type: "email", label: "Email", placeholder: "hola@tunegocio.com.py" },
  { type: "phone", label: "Llamar", placeholder: "+595 981 123 456" },
  { type: "youtube", label: "YouTube", placeholder: "https://youtube.com/@tunegocio" },
  { type: "x", label: "X (Twitter)", placeholder: "https://x.com/tunegocio" },
  { type: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/…" },
  { type: "custom", label: "Enlace personalizado", placeholder: "https://…" },
];

export const linkTypeLabel = (t: LinkType) => LINK_TYPES.find((x) => x.type === t)?.label ?? t;

export function normalizePhone(v: string) {
  return v.replace(/[^\d]/g, "");
}

export function whatsappHref(number: string, message?: string) {
  const n = normalizePhone(number);
  return `https://wa.me/${n}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

function ensureUrl(v: string) {
  const t = v.trim();
  if (!t) return "#";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export function linkHref(link: ProfileLink) {
  switch (link.type) {
    case "whatsapp":
      return whatsappHref(link.value, link.message);
    case "email":
      return `mailto:${link.value.trim()}`;
    case "phone":
      return `tel:${link.value.replace(/\s/g, "")}`;
    default:
      return ensureUrl(link.value);
  }
}

/** Cadena estándar de QR WiFi (Android/iOS la reconocen con la cámara) */
export function wifiQrString(w: Pick<WifiNetwork, "ssid" | "password" | "security" | "hidden">) {
  const esc = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
  const t = w.security === "nopass" ? "nopass" : w.security;
  return `WIFI:T:${t};S:${esc(w.ssid)};${w.security !== "nopass" ? `P:${esc(w.password)};` : ""}${w.hidden ? "H:true;" : ""};`;
}

export function buildVCard(c: ContactInfo, extra?: { url?: string; note?: string }) {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  const name = c.fullName || c.company;
  const parts = name.trim().split(/\s+/);
  const last = parts.length > 1 ? parts.slice(-1).join(" ") : "";
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : name;
  lines.push(`N:${esc(last)};${esc(first)};;;`, `FN:${esc(name)}`);
  if (c.company) lines.push(`ORG:${esc(c.company)}`);
  if (c.jobTitle) lines.push(`TITLE:${esc(c.jobTitle)}`);
  if (c.phone) lines.push(`TEL;TYPE=WORK,VOICE:${c.phone}`);
  if (c.whatsapp) lines.push(`TEL;TYPE=CELL:+${normalizePhone(c.whatsapp)}`);
  if (c.email) lines.push(`EMAIL;TYPE=INTERNET:${c.email}`);
  if (c.website) lines.push(`URL:${c.website}`);
  else if (extra?.url) lines.push(`URL:${extra.url}`);
  if (c.address) lines.push(`ADR;TYPE=WORK:;;${esc(c.address)};;;;Paraguay`);
  if (extra?.note) lines.push(`NOTE:${esc(extra.note)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export const MENU_TAGS: { value: string; label: string; color: string }[] = [
  { value: "vegano", label: "Vegano", color: "#2F7D4A" },
  { value: "vegetariano", label: "Vegetariano", color: "#5B8C2A" },
  { value: "sin gluten", label: "Sin gluten", color: "#B07A12" },
  { value: "picante", label: "Picante", color: "#C2361B" },
  { value: "nuevo", label: "Nuevo", color: "#2D5FA8" },
  { value: "recomendado", label: "Recomendado", color: "#8A3FA0" },
];

export const tagMeta = (v: string) => MENU_TAGS.find((t) => t.value === v) ?? { value: v, label: v, color: "#666" };
