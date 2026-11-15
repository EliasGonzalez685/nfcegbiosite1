"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileDown, ImagePlus, Loader2, Trash2 } from "lucide-react";
import type { DeviceKind, Plaque } from "@/lib/types";
import { qrPngDataUrl } from "@/lib/qr";
import { cn, downloadBlob, getBaseUrl } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Button, Field, Input, Modal, Toggle } from "@/components/ui";

const plaqueUrl = (code: string) => `${getBaseUrl()}/q/${code}`;

// ───────────────────────────── Plantillas ─────────────────────────────

type IconId = "star" | "camera" | "chat" | "wifi" | "utensils" | "gift" | "store" | "link";
export type TemplateId = "resena" | "instagram" | "whatsapp" | "wifi" | "menu" | "fidelidad" | "pagina" | "enlace";

interface Template {
  name: string;
  title: string;
  subtitle: string;
  icon: IconId;
  stars?: boolean;
  /** colores de cabecera sugeridos ("ig" = degradado) */
  colors: string[];
  footer?: string[];
}

export const TEMPLATES: Record<TemplateId, Template> = {
  resena: { name: "Reseñas", title: "TU OPINIÓN NOS IMPORTA", subtitle: "TUS RESEÑAS NOS AYUDAN A MEJORAR", icon: "star", stars: true, colors: ["#1A73E8", "#111111"], footer: ["#4285F4", "#FBBC05", "#34A853", "#EA4335"] },
  instagram: { name: "Instagram", title: "SEGUINOS EN INSTAGRAM", subtitle: "", icon: "camera", colors: ["ig", "#111111"] },
  whatsapp: { name: "WhatsApp", title: "ESCRIBINOS AL WHATSAPP", subtitle: "", icon: "chat", colors: ["#1DA851", "#075E54"] },
  wifi: { name: "WiFi", title: "CONECTATE AL WIFI", subtitle: "", icon: "wifi", colors: ["#111111", "#1E3A8A"] },
  menu: { name: "Menú", title: "MIRÁ NUESTRO MENÚ", subtitle: "", icon: "utensils", colors: ["#B91C1C", "#111111"] },
  fidelidad: { name: "Fidelidad", title: "SUMÁ TUS SELLOS", subtitle: "Y GANÁ PREMIOS", icon: "gift", colors: ["#D4AF37", "#111111"] },
  pagina: { name: "Negocio", title: "CONOCÉ MÁS DE NOSOTROS", subtitle: "", icon: "store", colors: ["#1F4D3A", "#111111"] },
  enlace: { name: "Libre", title: "ESCANEÁ AQUÍ", subtitle: "", icon: "link", colors: ["#111111", "#D9643A"] },
};

/** Plantilla sugerida según el destino de la plaquita */
export function templateFor(p: Plaque): TemplateId {
  if (p.targetType === "menu") return "menu";
  if (p.targetType === "wifi") return "wifi";
  if (p.targetType === "loyalty") return "fidelidad";
  if (p.targetType === "business") return "pagina";
  const u = p.targetUrl ?? "";
  if (/g\.page\/r|writereview|search\.google\.com\/local/i.test(u)) return "resena";
  if (/instagram\.com/i.test(u)) return "instagram";
  if (/wa\.me|whatsapp/i.test(u)) return "whatsapp";
  return p.targetType === "none" ? "pagina" : "enlace";
}

// Íconos genéricos (trazos en una grilla de 24×24)
const ICON_PATHS: Record<IconId, string[]> = {
  star: ["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"],
  camera: ["M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z", "M15 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"],
  chat: ["M7.9 20A9 9 0 1 0 4 16.1L2 22z", "M9 11h.01", "M12 11h.01", "M15 11h.01"],
  wifi: ["M12 20h.01", "M2 8.82a15 15 0 0 1 20 0", "M5 12.86a10 10 0 0 1 14 0", "M8.5 16.43a5 5 0 0 1 7 0"],
  utensils: ["M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2", "M7 2v20", "M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"],
  gift: ["M3 8h18v4H3z", "M12 8v13", "M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7", "M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"],
  store: ["M2 7l4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7", "M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8", "M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4", "M2 7h20v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-2-1 2.7 2.7 0 0 1-4 0 2.7 2.7 0 0 1-4 0 2.7 2.7 0 0 1-4 0 2.7 2.7 0 0 1-2 1 2 2 0 0 1-2-2z"],
  link: ["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"],
};
const NFC_PATHS = ["M6 8.32a7.43 7.43 0 0 1 0 7.36", "M9.46 6.21a11.76 11.76 0 0 1 0 11.58", "M12.91 4.1a15.91 15.91 0 0 1 .01 15.8", "M16.37 2a20.16 20.16 0 0 1 0 20"];

function Icon({ id, x, y, size, color, width = 2 }: { id: IconId; x: number; y: number; size: number; color: string; width?: number }) {
  const s = size / 24;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={id === "star" ? color : "none"} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[id].map((d) => <path key={d} d={d} />)}
    </g>
  );
}

const luminance = (hex: string) => {
  const h = hex.replace("#", "");
  if (h.length !== 6) return 0;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

/** Parte el título en 1 o 2 líneas equilibradas */
function splitTitle(t: string): string[] {
  const words = t.trim().split(/\s+/);
  if (t.length <= 16 || words.length < 2) return [t];
  let best = [t];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [a, b];
    }
  }
  return best;
}

export interface DesignOptions {
  template: TemplateId;
  color: string;
  title: string;
  subtitle: string;
  centerImage: string | null;
  logoImage: string | null;
  showCode: boolean;
  kind: DeviceKind;
}

// ───────────────────────────── Arte de la placa (SVG 1000×1000) ─────────────────────────────

export const PlaqueArt = forwardRef<SVGSVGElement, { o: DesignOptions; qr: string | null; code: string }>(function PlaqueArt({ o, qr, code }, ref) {
  const t = TEMPLATES[o.template];
  const ig = o.color === "ig";
  const head = ig ? "url(#ig)" : o.color;
  const solid = ig ? "#C13584" : o.color;
  const textColor = !ig && luminance(o.color) > 0.72 ? "#111111" : "#FFFFFF";
  const tint = ig ? "#F9D8E6" : `${o.color}26`;
  const lines = splitTitle(o.title.toUpperCase());
  const longest = Math.max(...lines.map((l) => l.length), 1);
  const fs = Math.min(lines.length === 1 ? 76 : 62, 860 / (longest * 0.7));
  const titleTop = lines.length === 1 ? 95 : 72;
  const afterTitle = titleTop + (lines.length - 1) * fs * 1.05;
  const hasStars = !!t.stars && o.template === "resena";
  const footer = t.footer ?? [solid];
  const showNfc = o.kind !== "qr";
  const showQr = o.kind !== "nfc";
  const font = "'Arial Black', 'Arial', 'Helvetica', sans-serif";

  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="100%" height="100%">
      <defs>
        <linearGradient id="ig" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#833AB4" />
          <stop offset=".5" stopColor="#E1306C" />
          <stop offset="1" stopColor="#F77737" />
        </linearGradient>
        <clipPath id="badge"><circle cx="500" cy="380" r="90" /></clipPath>
        <clipPath id="logo"><rect x="58" y="420" width="104" height="104" rx="22" /></clipPath>
      </defs>
      <rect width="1000" height="1000" fill="#FFFFFF" />
      {/* bordes laterales */}
      <rect x="0" y="0" width="26" height="1000" fill={tint} />
      <rect x="974" y="0" width="26" height="1000" fill={tint} />
      {/* cabecera con onda */}
      <path d="M0 0H1000V290C820 370 660 240 500 310C340 380 190 270 0 340Z" fill={head} />
      {lines.map((l, i) => (
        <text key={i} x="500" y={titleTop + i * fs * 1.05} fontFamily={font} fontWeight={900} fontSize={fs} fill={textColor} textAnchor="middle" dominantBaseline="middle">
          {l}
        </text>
      ))}
      {hasStars && (
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <Icon key={i} id="star" x={350 + i * 62} y={afterTitle + 38} size={52} color="#FBBC05" width={1} />
          ))}
        </g>
      )}
      {o.subtitle && (
        <text x="500" y={afterTitle + (hasStars ? 120 : 62)} fontFamily={font} fontWeight={800} fontSize={28} fill={textColor} textAnchor="middle" dominantBaseline="middle">
          {o.subtitle.toUpperCase()}
        </text>
      )}

      {/* insignia central */}
      <circle cx="500" cy="380" r="102" fill="#FFFFFF" />
      <circle cx="500" cy="380" r="102" fill="none" stroke={solid} strokeOpacity=".15" strokeWidth="6" />
      {o.centerImage ? (
        <image href={o.centerImage} x="410" y="290" width="180" height="180" preserveAspectRatio="xMidYMid meet" clipPath="url(#badge)" />
      ) : (
        <Icon id={t.icon} x={436} y={316} size={128} color={o.template === "resena" ? "#FBBC05" : solid} width={2} />
      )}

      {/* logo del negocio */}
      {o.logoImage && (
        <>
          <rect x="52" y="414" width="116" height="116" rx="26" fill="#FFFFFF" stroke="#E5E5E5" strokeWidth="3" />
          <image href={o.logoImage} x="58" y="420" width="104" height="104" preserveAspectRatio="xMidYMid slice" clipPath="url(#logo)" />
        </>
      )}

      {/* NFC */}
      {showNfc && (
        <g transform={showQr ? "translate(0 15)" : "translate(230 5)"}>
          <ellipse cx="250" cy="645" rx="122" ry="88" fill="#FFFFFF" stroke="#111111" strokeWidth="12" />
          <ellipse cx="250" cy="645" rx="62" ry="62" fill="#111111" />
          <g transform="translate(212 603) scale(3.2)" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round">
            {NFC_PATHS.map((d) => <path key={d} d={d} />)}
          </g>
          <text x="250" y="692" fontFamily={font} fontSize="16" fontWeight={900} fill="#FFFFFF" textAnchor="middle">NFC</text>
          <g transform="rotate(-12 372 620)">
            <rect x="326" y="528" width="96" height="176" rx="18" fill="#FFFFFF" stroke="#111111" strokeWidth="11" />
            <circle cx="374" cy="682" r="6" fill="#111111" />
          </g>
          <path d="M392 690c24 8 40 30 38 58l-6 40" fill="none" stroke="#111111" strokeWidth="11" strokeLinecap="round" />
          <text x="270" y="820" fontFamily={font} fontWeight={900} fontSize="30" fill="#111111" textAnchor="middle">ACERCÁ TU</text>
          <text x="270" y="858" fontFamily={font} fontWeight={900} fontSize="30" fill="#111111" textAnchor="middle">CELULAR</text>
        </g>
      )}

      {/* QR */}
      {showQr && qr && (
        <g>
          <image href={qr} x={showNfc ? 566 : 340} y={showNfc ? 520 : 512} width={showNfc ? 280 : 320} height={showNfc ? 280 : 320} />
          <text x={showNfc ? 706 : 500} y={showNfc ? 835 : 865} fontFamily={font} fontWeight={900} fontSize="30" fill="#111111" textAnchor="middle">ESCANEÁ CON</text>
          <text x={showNfc ? 706 : 500} y={showNfc ? 873 : 903} fontFamily={font} fontWeight={900} fontSize="30" fill="#111111" textAnchor="middle">LA CÁMARA</text>
        </g>
      )}

      {o.showCode && (
        <text x="950" y="918" fontFamily="'Courier New', monospace" fontWeight={700} fontSize="22" fill="#9A9A9A" textAnchor="end">{code}</text>
      )}

      {/* barra inferior */}
      {footer.map((c, i) => (
        <rect key={i} x={(1000 / footer.length) * i} y="932" width={1000 / footer.length + 1} height="68" fill={c === "ig" ? "url(#ig)" : c} />
      ))}
    </svg>
  );
});

// ───────────────────────────── Exportar ─────────────────────────────

async function svgToPng(svg: SVGSVGElement, px: number): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("width", String(px));
  clone.setAttribute("height", String(px));
  const xml = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, px, px);
    ctx.drawImage(img, 0, 0, px, px);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

const readFile = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });

const SIZES = [
  { mm: 60, label: "6 × 6 cm" },
  { mm: 70, label: "7 × 7 cm" },
  { mm: 80, label: "8 × 8 cm" },
  { mm: 100, label: "10 × 10 cm" },
];

// ───────────────────────────── Diseñador ─────────────────────────────

export function PlaqueDesigner({ plaques, onClose }: { plaques: Plaque[]; onClose: () => void }) {
  const toast = useToast();
  const first = plaques[0];
  const initialTemplate = templateFor(first);
  const [o, setO] = useState<DesignOptions>(() => ({
    template: initialTemplate,
    color: TEMPLATES[initialTemplate].colors[0],
    title: TEMPLATES[initialTemplate].title,
    subtitle: TEMPLATES[initialTemplate].subtitle,
    centerImage: null,
    logoImage: null,
    showCode: true,
    kind: first.kind,
  }));
  const [idx, setIdx] = useState(0);
  const [qrs, setQrs] = useState<Record<string, string>>({});
  const [size, setSize] = useState(70);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const artRef = useRef<SVGSVGElement>(null);
  const exportRef = useRef<SVGSVGElement>(null);
  const [exportCode, setExportCode] = useState<string | null>(null);

  const current = plaques[idx];

  // QR de cada plaquita (se generan una vez)
  useEffect(() => {
    let alive = true;
    (async () => {
      const out: Record<string, string> = {};
      for (const p of plaques) {
        out[p.code] = await qrPngDataUrl(plaqueUrl(p.code), { size: 900, margin: 1 });
        if (!alive) return;
      }
      setQrs(out);
    })();
    return () => {
      alive = false;
    };
  }, [plaques]);

  const pickTemplate = (id: TemplateId) =>
    setO((s) => ({ ...s, template: id, color: TEMPLATES[id].colors[0], title: TEMPLATES[id].title, subtitle: TEMPLATES[id].subtitle }));

  async function upload(key: "centerImage" | "logoImage", f?: File) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Elegí una imagen");
    const data = await readFile(f);
    setO((s) => ({ ...s, [key]: data }));
  }

  /** Dibuja una plaquita concreta en el SVG oculto y la pasa a PNG */
  async function renderCode(code: string, px: number) {
    setExportCode(code);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return svgToPng(exportRef.current!, px);
  }

  async function downloadPng() {
    setBusy("png");
    try {
      const png = await renderCode(current.code, 1600);
      const blob = await (await fetch(png)).blob();
      downloadBlob(blob, `plaquita-${current.code}.png`);
    } finally {
      setBusy(null);
      setExportCode(null);
    }
  }

  async function downloadPdf() {
    setBusy("pdf");
    setProgress(0);
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const W = 210, H = 297, M = 10, G = 6;
      const cols = Math.max(1, Math.floor((W - 2 * M + G) / (size + G)));
      const rows = Math.max(1, Math.floor((H - 2 * M + G) / (size + G)));
      const perPage = cols * rows;
      const offX = (W - (cols * size + (cols - 1) * G)) / 2;
      const offY = (H - (rows * size + (rows - 1) * G)) / 2;
      const px = Math.round((size / 25.4) * 300); // 300 ppp
      for (let i = 0; i < plaques.length; i++) {
        if (i > 0 && i % perPage === 0) pdf.addPage();
        const pos = i % perPage;
        const x = offX + (pos % cols) * (size + G);
        const y = offY + Math.floor(pos / cols) * (size + G);
        const png = await renderCode(plaques[i].code, px);
        pdf.addImage(png, "PNG", x, y, size, size);
        // marcas de corte
        pdf.setDrawColor(190);
        pdf.setLineWidth(0.1);
        pdf.setLineDashPattern([1, 1], 0);
        pdf.rect(x, y, size, size);
        setProgress(Math.round(((i + 1) / plaques.length) * 100));
      }
      downloadBlob(pdf.output("blob"), `plaquitas-${plaques.length}-${size}mm.pdf`);
      toast.success("PDF listo para imprimir");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
      setExportCode(null);
    }
  }

  const local = useMemo(() => /localhost|127\.0\.0\.1|192\.168\./.test(getBaseUrl()), []);

  return (
    <Modal open onClose={onClose} wide title={plaques.length > 1 ? `Diseñar ${plaques.length} plaquitas` : `Diseñar plaquita ${first.code}`}>
      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <div>
            <p className="label">Plantilla</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => (
                <button key={id} onClick={() => pickTemplate(id)} className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition", o.template === id ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink-3")}>
                  {TEMPLATES[id].name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="label">Color</p>
            <div className="flex flex-wrap items-center gap-2">
              {Array.from(new Set([...TEMPLATES[o.template].colors, "#111111", "#1E3A8A", "#1A73E8", "#1DA851", "#B91C1C", "#D9643A", "#D4AF37", "#7C3AED"])).map((c) => (
                <button key={c} onClick={() => setO({ ...o, color: c })} aria-label={c} className={cn("size-8 rounded-full border border-black/10 ring-offset-2 transition hover:scale-110", o.color === c && "ring-2 ring-ink")} style={{ background: c === "ig" ? "linear-gradient(135deg,#833AB4,#E1306C,#F77737)" : c }} />
              ))}
              <label className="relative grid size-8 cursor-pointer place-items-center rounded-full border border-dashed border-ink-3 text-ink-3" title="Otro color">
                +
                <input type="color" value={o.color.startsWith("#") ? o.color : "#111111"} onChange={(e) => setO({ ...o, color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
              </label>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Título"><Input value={o.title} maxLength={34} onChange={(e) => setO({ ...o, title: e.target.value })} /></Field>
            <Field label="Subtítulo (opcional)"><Input value={o.subtitle} maxLength={40} onChange={(e) => setO({ ...o, subtitle: e.target.value })} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ImagePick label="Imagen del centro" hint="Subir (opcional)" value={o.centerImage} onPick={(f) => upload("centerImage", f)} onClear={() => setO({ ...o, centerImage: null })} />
            <ImagePick label="Logo del negocio" hint="Subir (opcional)" value={o.logoImage} onPick={(f) => upload("logoImage", f)} onClear={() => setO({ ...o, logoImage: null })} />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <p className="label">Muestra</p>
              <div className="flex gap-1 rounded-xl bg-paper-2 p-1 text-xs font-semibold">
                {([["nfc_qr", "NFC + QR"], ["qr", "Solo QR"], ["nfc", "Solo NFC"]] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setO({ ...o, kind: k })} className={cn("rounded-lg px-3 py-1.5", o.kind === k ? "bg-white shadow-sm" : "text-ink-3")}>{l}</button>
                ))}
              </div>
            </div>
            <Toggle checked={o.showCode} onChange={(showCode) => setO({ ...o, showCode })} label="Código chico abajo" />
          </div>
        </div>

        <div>
          <div className="aspect-square overflow-hidden rounded-xl shadow-lg ring-1 ring-line">
            <PlaqueArt ref={artRef} o={o} qr={qrs[current.code] ?? null} code={current.code} />
          </div>
          {plaques.length > 1 && (
            <div className="mt-2 flex items-center justify-between text-sm">
              <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} className="grid size-8 place-items-center rounded-lg hover:bg-paper-2 disabled:opacity-30" aria-label="Anterior"><ChevronLeft className="size-4" /></button>
              <span className="font-mono font-semibold">{current.code} · {idx + 1}/{plaques.length}</span>
              <button onClick={() => setIdx((i) => Math.min(plaques.length - 1, i + 1))} disabled={idx === plaques.length - 1} className="grid size-8 place-items-center rounded-lg hover:bg-paper-2 disabled:opacity-30" aria-label="Siguiente"><ChevronRight className="size-4" /></button>
            </div>
          )}
          <p className="mt-2 text-center text-xs text-ink-3">Cada plaquita lleva su propio QR. El destino lo cambiás después cuando quieras.</p>
        </div>
      </div>

      {local && <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">Estás en modo local: los QR apuntan a {getBaseUrl()}. Para imprimir las definitivas, descargalas desde la web publicada.</p>}

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <span className="text-sm text-ink-3">Tamaño al imprimir:</span>
        <div className="flex gap-1 rounded-xl bg-paper-2 p-1 text-xs font-semibold">
          {SIZES.map((s) => (
            <button key={s.mm} onClick={() => setSize(s.mm)} className={cn("rounded-lg px-2.5 py-1.5", size === s.mm ? "bg-white shadow-sm" : "text-ink-3")}>{s.label}</button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" loading={busy === "png"} disabled={!!busy || !qrs[current.code]} icon={<Download className="size-4" />} onClick={downloadPng}>PNG</Button>
          <Button loading={busy === "pdf"} disabled={!!busy || Object.keys(qrs).length < plaques.length} icon={busy === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />} onClick={downloadPdf}>
            {busy === "pdf" ? `Armando… ${progress}%` : `PDF para imprimir (${plaques.length})`}
          </Button>
        </div>
      </div>

      {/* SVG oculto para exportar cada plaquita con su QR */}
      <div className="pointer-events-none fixed -left-[9999px] top-0 size-[1000px]" aria-hidden>
        {exportCode && <PlaqueArt ref={exportRef} o={o} qr={qrs[exportCode] ?? null} code={exportCode} />}
      </div>
    </Modal>
  );
}

function ImagePick({ label, hint, value, onPick, onClear }: { label: string; hint: string; value: string | null; onPick: (f?: File) => void; onClear: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="min-w-0">
      <p className="label">{label}</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => ref.current?.click()} className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-dashed border-line bg-white px-3 text-sm text-ink-3 hover:border-ink-3">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="size-7 rounded object-contain" />
          ) : (
            <ImagePlus className="size-4" />
          )}
          <span className="truncate">{value ? "Cambiar" : hint}</span>
        </button>
        {value && <button type="button" onClick={onClear} className="grid size-9 place-items-center rounded-lg text-ink-3 hover:bg-red-50 hover:text-danger" aria-label="Quitar"><Trash2 className="size-4" /></button>}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
    </div>
  );
}
