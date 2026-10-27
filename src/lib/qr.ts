import QRCode from "qrcode";

export interface QrOptions {
  /** Color de los módulos */
  fg?: string;
  bg?: string;
  /** Imagen (URL o data URL) para el centro */
  logo?: string | null;
  /** Tamaño en px para PNG */
  size?: number;
  margin?: number;
  /** Texto bajo el QR (ej. el código corto) */
  caption?: string;
}

function matrix(text: string, withLogo: boolean) {
  const qr = QRCode.create(text, { errorCorrectionLevel: withLogo ? "H" : "M" });
  const n = qr.modules.size;
  const data = qr.modules.data;
  return { n, get: (x: number, y: number) => !!data[y * n + x] };
}

const LOGO_RATIO = 0.22;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

/** Dibuja el QR en un canvas y devuelve el canvas */
export async function qrCanvas(text: string, opts: QrOptions = {}) {
  const { fg = "#111111", bg = "#FFFFFF", logo, size = 1024, margin = 4, caption } = opts;
  const { n, get } = matrix(text, !!logo);
  const captionH = caption ? Math.round(size * 0.1) : 0;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size + captionH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cell = size / (n + margin * 2);
  ctx.fillStyle = fg;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (get(x, y)) ctx.fillRect(Math.floor((x + margin) * cell), Math.floor((y + margin) * cell), Math.ceil(cell), Math.ceil(cell));
    }
  }
  if (logo) {
    try {
      const img = await loadImage(logo);
      const box = size * LOGO_RATIO;
      const pad = box * 0.12;
      const x = (size - box) / 2;
      ctx.fillStyle = bg;
      roundRect(ctx, x - pad, x - pad, box + pad * 2, box + pad * 2, box * 0.2);
      ctx.fill();
      ctx.save();
      roundRect(ctx, x, x, box, box, box * 0.16);
      ctx.clip();
      const s = Math.max(box / img.width, box / img.height);
      ctx.drawImage(img, x + (box - img.width * s) / 2, x + (box - img.height * s) / 2, img.width * s, img.height * s);
      ctx.restore();
    } catch {
      /* si el logo no carga, el QR sigue siendo válido */
    }
  }
  if (caption) {
    ctx.fillStyle = fg;
    ctx.font = `600 ${Math.round(captionH * 0.5)}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(caption, size / 2, size + captionH * 0.35);
  }
  return canvas;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function qrPngDataUrl(text: string, opts: QrOptions = {}) {
  return (await qrCanvas(text, opts)).toDataURL("image/png");
}

export async function qrPngBlob(text: string, opts: QrOptions = {}) {
  const c = await qrCanvas(text, opts);
  return new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/png"));
}

/** SVG vectorial (ideal para imprenta). El logo se embebe como <image>. */
export async function qrSvg(text: string, opts: QrOptions = {}) {
  const { fg = "#111111", bg = "#FFFFFF", logo, margin = 4, caption } = opts;
  const { n, get } = matrix(text, !!logo);
  const total = n + margin * 2;
  const captionH = caption ? total * 0.1 : 0;
  let path = "";
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (get(x, y)) {
        let w = 1;
        while (x + w < n && get(x + w, y)) w++;
        path += `M${x + margin} ${y + margin}h${w}v1h-${w}z`;
        x += w;
      } else x++;
    }
  }
  let logoSvg = "";
  if (logo) {
    let href = logo;
    if (!logo.startsWith("data:")) {
      try {
        const blob = await (await fetch(logo)).blob();
        href = await new Promise<string>((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.readAsDataURL(blob);
        });
      } catch {
        href = "";
      }
    }
    if (href) {
      const box = total * LOGO_RATIO;
      const pad = box * 0.12;
      const x = (total - box) / 2;
      logoSvg = `<rect x="${x - pad}" y="${x - pad}" width="${box + pad * 2}" height="${box + pad * 2}" rx="${box * 0.2}" fill="${bg}"/><clipPath id="lc"><rect x="${x}" y="${x}" width="${box}" height="${box}" rx="${box * 0.16}"/></clipPath><image href="${href}" x="${x}" y="${x}" width="${box}" height="${box}" preserveAspectRatio="xMidYMid slice" clip-path="url(#lc)"/>`;
    }
  }
  const captionSvg = caption
    ? `<text x="${total / 2}" y="${total + captionH * 0.35}" font-family="ui-monospace, monospace" font-weight="600" font-size="${captionH * 0.5}" text-anchor="middle" dominant-baseline="middle" fill="${fg}">${caption}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total + captionH}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${bg}"/><path d="${path}" fill="${fg}"/>${logoSvg}${captionSvg}</svg>`;
}

/** PDF con uno o varios QR. Una sola: página centrada. Varias: grilla A4 para imprimir y recortar. */
export async function qrPdfBlob(
  entries: { text: string; caption?: string; subtitle?: string }[],
  opts: QrOptions & { title?: string; perRow?: number } = {},
) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  if (entries.length === 1) {
    const e = entries[0];
    const img = await qrPngDataUrl(e.text, { ...opts, size: 1200, caption: undefined });
    const s = 120;
    if (opts.title) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text(opts.title, W / 2, 50, { align: "center" });
    }
    pdf.addImage(img, "PNG", (W - s) / 2, 70, s, s);
    pdf.setFont("courier", "bold");
    pdf.setFontSize(18);
    if (e.caption) pdf.text(e.caption, W / 2, 205, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(e.subtitle ?? e.text, W / 2, 214, { align: "center" });
  } else {
    const perRow = opts.perRow ?? 4;
    const marginX = 12;
    const gap = 6;
    const cellW = (W - marginX * 2 - gap * (perRow - 1)) / perRow;
    const cellH = cellW + 12;
    const top = 22;
    const rows = Math.floor((H - top - 12) / (cellH + gap));
    const perPage = rows * perRow;
    for (let i = 0; i < entries.length; i++) {
      if (i > 0 && i % perPage === 0) pdf.addPage();
      const pos = i % perPage;
      if (pos === 0 && opts.title) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(`${opts.title} · página ${Math.floor(i / perPage) + 1}`, marginX, 14);
      }
      const r = Math.floor(pos / perRow);
      const c = pos % perRow;
      const x = marginX + c * (cellW + gap);
      const y = top + r * (cellH + gap);
      const img = await qrPngDataUrl(entries[i].text, { ...opts, size: 600, caption: undefined });
      pdf.setDrawColor(210);
      pdf.setLineDashPattern([1, 1], 0);
      pdf.rect(x, y, cellW, cellH);
      pdf.addImage(img, "PNG", x + 2, y + 2, cellW - 4, cellW - 4);
      pdf.setFont("courier", "bold");
      pdf.setFontSize(10);
      pdf.text(entries[i].caption ?? "", x + cellW / 2, y + cellW + 4, { align: "center" });
      if (entries[i].subtitle) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6);
        pdf.text(entries[i].subtitle!, x + cellW / 2, y + cellW + 8, { align: "center" });
      }
    }
  }
  return pdf.output("blob");
}
