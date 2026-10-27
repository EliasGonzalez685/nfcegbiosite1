"use client";

import { useState } from "react";
import Link from "next/link";
import { Boxes, FileSpreadsheet, FileText, Plus } from "lucide-react";
import type { CodeKind } from "@/lib/types";
import { db } from "@/lib/data";
import { useAsync } from "@/lib/hooks";
import { qrPdfBlob } from "@/lib/qr";
import { codeUrl, downloadBlob, formatDate, slugify } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { PanelPage } from "@/components/panel/editor";
import { PageHeader } from "@/components/panel/shell";
import { Badge, Button, EmptyState, Field, Input, Modal, PageLoader, Select } from "@/components/ui";

const KIND_LABEL: Record<CodeKind, string> = { nfc: "Tarjetas NFC", qr: "Stickers QR", placa: "Placas de mesa" };

export default function Batches() {
  const toast = useToast();
  const { data, loading, reload } = useAsync(() => db.codes.listBatches(), []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", kind: "nfc" as CodeKind, quantity: 20, note: "" });
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  async function create() {
    if (!form.name.trim() || form.quantity < 1 || form.quantity > 1000) return toast.error("Completá un nombre y una cantidad entre 1 y 1000");
    setBusy(true);
    const { batch } = await db.codes.createBatch({ ...form, name: form.name.trim() });
    setBusy(false);
    setOpen(false);
    setForm({ name: "", kind: "nfc", quantity: 20, note: "" });
    toast.success(`Lote “${batch.name}” creado con ${batch.quantity} códigos`);
    reload();
  }

  async function exportPdf(batchId: string, name: string) {
    setExporting(batchId + "pdf");
    const codes = await db.codes.listAll({ batchId });
    const blob = await qrPdfBlob(
      codes.map((c) => ({ text: codeUrl(c.code), caption: c.code, subtitle: codeUrl(c.code).replace(/^https?:\/\//, "") })),
      { title: name, perRow: 4 },
    );
    downloadBlob(blob, `lote-${slugify(name)}.pdf`);
    setExporting(null);
  }

  async function exportCsv(batchId: string, name: string) {
    setExporting(batchId + "csv");
    const codes = await db.codes.listAll({ batchId });
    const rows = [["codigo", "url", "tipo", "estado", "etiqueta"], ...codes.map((c) => [c.code, codeUrl(c.code), c.kind, c.status, c.label])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadBlob(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }), `lote-${slugify(name)}.csv`);
    setExporting(null);
  }

  return (
    <PanelPage>
      <PageHeader
        title="Lotes de códigos"
        description="Generá códigos en blanco para grabar en chips NFC o imprimir antes de vender."
        actions={<Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>Nuevo lote</Button>}
      />
      {loading || !data ? (
        <PageLoader />
      ) : data.length === 0 ? (
        <EmptyState icon={<Boxes className="size-6" />} title="Sin lotes" action={<Button onClick={() => setOpen(true)}>Crear el primero</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((b) => {
            const pct = Math.round((b.activated / b.quantity) * 100);
            return (
              <div key={b.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-lg font-semibold">{b.name}</h3>
                    <p className="text-sm text-ink-3">{formatDate(b.createdAt)}{b.note ? ` · ${b.note}` : ""}</p>
                  </div>
                  <Badge tone="clay">{KIND_LABEL[b.kind]}</Badge>
                </div>
                <div className="mt-4 flex items-end justify-between text-sm">
                  <span><b className="font-display text-2xl">{b.activated}</b> <span className="text-ink-3">/ {b.quantity} activados</span></span>
                  <span className="text-ink-3">{pct}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-2"><div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} /></div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" loading={exporting === b.id + "pdf"} icon={<FileText className="size-4" />} onClick={() => exportPdf(b.id, b.name)}>PDF para imprimir</Button>
                  <Button size="sm" variant="secondary" loading={exporting === b.id + "csv"} icon={<FileSpreadsheet className="size-4" />} onClick={() => exportCsv(b.id, b.name)}>CSV (para grabar NFC)</Button>
                  <Link href={`/admin/codigos?lote=${b.id}`}><Button size="sm" variant="ghost">Ver códigos</Button></Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nuevo lote"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button loading={busy} onClick={create}>Generar códigos</Button></>}
      >
        <div className="grid gap-4">
          <Field label="Nombre del lote"><Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej.: Tarjetas negras noviembre" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo">
              <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as CodeKind })}>
                <option value="nfc">Tarjetas NFC</option>
                <option value="placa">Placas de mesa</option>
                <option value="qr">Stickers QR</option>
              </Select>
            </Field>
            <Field label="Cantidad" hint="Máximo 1000"><Input type="number" min={1} max={1000} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} /></Field>
          </div>
          <Field label="Nota (opcional)"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Proveedor, material…" /></Field>
          <p className="rounded-xl bg-paper px-3 py-2 text-xs text-ink-3">Cada código es de 6 caracteres sin letras confusas (sin 0/O ni 1/I). La URL a grabar en el chip es <span className="font-mono">{codeUrl("XXXXXX")}</span></p>
        </div>
      </Modal>
    </PanelPage>
  );
}
