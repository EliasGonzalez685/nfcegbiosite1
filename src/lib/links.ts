import type { LinkType, Profile, ProfileLink } from "@/lib/types";

export const LINK_TYPES: { type: LinkType; label: string; placeholder: string; field: string; hint?: string }[] = [
  { type: "whatsapp", label: "WhatsApp", placeholder: "595981123456", field: "Número", hint: "Con código de país, sin + ni espacios" },
  { type: "instagram", label: "Instagram", placeholder: "https://instagram.com/tunegocio", field: "Enlace" },
  { type: "facebook", label: "Facebook", placeholder: "https://facebook.com/tunegocio", field: "Enlace" },
  { type: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@tunegocio", field: "Enlace" },
  { type: "maps", label: "Ubicación", placeholder: "https://maps.app.goo.gl/…", field: "Enlace de Google Maps" },
  { type: "google_review", label: "Reseñas de Google", placeholder: "https://g.page/r/…/review", field: "Enlace" },
  { type: "wifi", label: "WiFi", placeholder: "MiNegocio_Clientes", field: "Nombre de la red" },
  { type: "vcard", label: "Guardar contacto", placeholder: "", field: "" },
  { type: "menu", label: "Menú / Catálogo", placeholder: "https://… (PDF, Drive, web)", field: "Enlace" },
  { type: "website", label: "Sitio web", placeholder: "https://tunegocio.com.py", field: "Enlace" },
  { type: "phone", label: "Llamar", placeholder: "+595 981 123 456", field: "Teléfono" },
  { type: "email", label: "Email", placeholder: "hola@tunegocio.com.py", field: "Email" },
  { type: "youtube", label: "YouTube", placeholder: "https://youtube.com/@tunegocio", field: "Enlace" },
  { type: "x", label: "X (Twitter)", placeholder: "https://x.com/tunegocio", field: "Enlace" },
  { type: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/…", field: "Enlace" },
  { type: "custom", label: "Otro enlace", placeholder: "https://…", field: "Enlace" },
];

export const linkMeta = (t: LinkType) => LINK_TYPES.find((x) => x.type === t) ?? LINK_TYPES[LINK_TYPES.length - 1];

export const normalizePhone = (v: string) => v.replace(/[^\d]/g, "");

export function whatsappHref(number: string, message?: string) {
  return `https://wa.me/${normalizePhone(number)}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

function ensureUrl(v: string) {
  const t = v.trim();
  if (!t) return "#";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

/** Botones que no abren un enlace sino una acción dentro de la página */
export const isAction = (t: LinkType) => t === "wifi" || t === "vcard";

/** Un botón se muestra si está activo y tiene lo necesario */
export const isComplete = (l: ProfileLink) => l.enabled && (l.type === "vcard" || l.value.trim() !== "");

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
export function wifiQrString(ssid: string, password = "") {
  const esc = (s: string) => s.replace(/([\;,:"])/g, "\\$1");
  return password ? `WIFI:T:WPA;S:${esc(ssid)};P:${esc(password)};;` : `WIFI:T:nopass;S:${esc(ssid)};;`;
}

/** vCard armada con los datos de los botones del perfil (WhatsApp, teléfono, email, web, ubicación) */
export function buildVCard(p: Profile, pageUrl: string) {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
  const on = p.links.filter((l) => l.enabled && l.value.trim());
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:;${esc(p.name)};;;`, `FN:${esc(p.name)}`, `ORG:${esc(p.name)}`];
  if (p.tagline) lines.push(`NOTE:${esc(p.tagline)}`);
  for (const l of on) {
    if (l.type === "whatsapp") lines.push(`TEL;TYPE=CELL:+${normalizePhone(l.value)}`);
    if (l.type === "phone") lines.push(`TEL;TYPE=WORK,VOICE:${l.value.trim()}`);
    if (l.type === "email") lines.push(`EMAIL;TYPE=INTERNET:${l.value.trim()}`);
    if (l.type === "website") lines.push(`URL:${ensureUrl(l.value)}`);
  }
  lines.push(`URL;TYPE=biosite:${pageUrl}`);
  if (p.avatarUrl?.startsWith("data:image/jpeg")) lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${p.avatarUrl.split(",")[1]}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}
