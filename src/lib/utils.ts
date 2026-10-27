export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const gsFormatter = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 });

/** 25000 -> "Gs. 25.000" */
export function formatGs(value: number) {
  return `Gs. ${gsFormatter.format(Math.round(value || 0))}`;
}

/** "25.000" -> 25000 */
export function parseGs(input: string) {
  const digits = input.replace(/\D/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

export function formatNumber(n: number) {
  return gsFormatter.format(n);
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function uid(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function formatDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} d`;
}

export function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}

export function codeUrl(code: string) {
  return `${getBaseUrl()}/t/${code}`;
}

export function profileUrl(slug: string) {
  return `${getBaseUrl()}/${slug}`;
}

/** Imagen de relleno (SVG en data URL) para los datos de prueba */
export function placeholderImage(emoji: string, from: string, to: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${from}'/><stop offset='1' stop-color='${to}'/></linearGradient></defs><rect width='400' height='300' fill='url(#g)'/><circle cx='320' cy='60' r='90' fill='white' opacity='0.08'/><circle cx='60' cy='260' r='70' fill='white' opacity='0.06'/><text x='200' y='175' font-size='120' text-anchor='middle' dominant-baseline='middle'>${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
