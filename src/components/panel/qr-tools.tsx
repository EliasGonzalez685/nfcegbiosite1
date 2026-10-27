"use client";

import { useEffect, useState } from "react";
import { Download, FileImage, FileCode2, FileText } from "lucide-react";
import { qrPdfBlob, qrPngBlob, qrPngDataUrl, qrSvg } from "@/lib/qr";
import { cn, downloadBlob } from "@/lib/utils";
import { Toggle } from "@/components/ui";

export function QrImage({ text, logo, fg, className, size = 512 }: { text: string; logo?: string | null; fg?: string; className?: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    qrPngDataUrl(text, { logo, fg, size }).then((s) => alive && setSrc(s));
    return () => {
      alive = false;
    };
  }, [text, logo, fg, size]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="Código QR" className={cn("rounded-xl bg-white", className)} />
  ) : (
    <div className={cn("animate-pulse rounded-xl bg-paper-2", className)} />
  );
}

/** Botonera de descarga PNG / SVG / PDF */
export function QrDownloads({
  text,
  filename,
  logo,
  fg,
  caption,
  pdfTitle,
  pdfSubtitle,
  compact,
}: {
  text: string;
  filename: string;
  logo?: string | null;
  fg?: string;
  caption?: string;
  pdfTitle?: string;
  pdfSubtitle?: string;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  async function run(kind: "png" | "svg" | "pdf") {
    setBusy(kind);
    try {
      if (kind === "png") downloadBlob(await qrPngBlob(text, { logo, fg, caption, size: 1400 }), `${filename}.png`);
      if (kind === "svg") downloadBlob(new Blob([await qrSvg(text, { logo, fg, caption })], { type: "image/svg+xml" }), `${filename}.svg`);
      if (kind === "pdf") downloadBlob(await qrPdfBlob([{ text, caption, subtitle: pdfSubtitle }], { logo, fg, title: pdfTitle }), `${filename}.pdf`);
    } finally {
      setBusy(null);
    }
  }
  const btn = "flex items-center justify-center gap-1.5 rounded-xl border border-line bg-white font-medium hover:border-ink-3 disabled:opacity-50";
  return (
    <div className={cn("grid grid-cols-3 gap-2", compact ? "text-xs" : "text-sm")}>
      <button className={cn(btn, compact ? "h-8" : "h-10")} disabled={!!busy} onClick={() => run("png")}>
        {busy === "png" ? <Download className="size-4 animate-bounce" /> : <FileImage className="size-4" />} PNG
      </button>
      <button className={cn(btn, compact ? "h-8" : "h-10")} disabled={!!busy} onClick={() => run("svg")}>
        {busy === "svg" ? <Download className="size-4 animate-bounce" /> : <FileCode2 className="size-4" />} SVG
      </button>
      <button className={cn(btn, compact ? "h-8" : "h-10")} disabled={!!busy} onClick={() => run("pdf")}>
        {busy === "pdf" ? <Download className="size-4 animate-bounce" /> : <FileText className="size-4" />} PDF
      </button>
    </div>
  );
}

export function QrStyleControls({
  useLogo,
  setUseLogo,
  fg,
  setFg,
  hasLogo,
}: {
  useLogo: boolean;
  setUseLogo: (v: boolean) => void;
  fg: string;
  setFg: (v: string) => void;
  hasLogo: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <Toggle checked={useLogo && hasLogo} disabled={!hasLogo} onChange={setUseLogo} label="Logo al centro" description={hasLogo ? undefined : "Subí tu logo en Perfil"} />
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-ink-2">Color</span>
        {["#111111", "#1F4D3A", "#8A4B2A", "#2D6A8E", "#7A3FA0"].map((c) => (
          <button key={c} onClick={() => setFg(c)} className={cn("size-7 rounded-full ring-offset-2", fg === c && "ring-2 ring-ink")} style={{ background: c }} aria-label={c} />
        ))}
      </div>
    </div>
  );
}
