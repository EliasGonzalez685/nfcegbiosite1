"use client";

import { useState } from "react";
import { Check, Copy, Nfc, Pencil, QrCode, SquareStack } from "lucide-react";
import type { ShortCode } from "@/lib/types";
import { db } from "@/lib/data";
import { useAsync, useCopy } from "@/lib/hooks";
import { codeUrl, formatDate, profileUrl } from "@/lib/utils";
import { useSession } from "@/components/session";
import { useToast } from "@/components/ui/toast";
import { PanelPage } from "@/components/panel/editor";
import { PageHeader } from "@/components/panel/shell";
import { QrDownloads, QrImage, QrStyleControls } from "@/components/panel/qr-tools";
import { Badge, Button, EmptyState, Field, Input, Modal, PageLoader, SectionCard } from "@/components/ui";

const KIND = { nfc: { label: "Tarjeta NFC", icon: Nfc }, qr: { label: "QR", icon: QrCode }, placa: { label: "Placa", icon: SquareStack } } as const;

export default function MyCodes() {
  const { profile } = useSession();
  const toast = useToast();
  const { data: codes, setData, loading } = useAsync(() => db.codes.listByProfile(profile!.id), [profile?.id]);
  const stats = useAsync(() => db.analytics.summary(profile!.id, 30), [profile?.id]);
  const [useLogo, setUseLogo] = useState(true);
  const [fg, setFg] = useState("#111111");
  const [activateOpen, setActivateOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ShortCode | null>(null);
  const { copied, copy } = useCopy();

  if (!profile || loading || !codes) return <PageLoader />;
  const logo = useLogo ? profile.avatarUrl : null;
  const scansFor = (c: string) => stats.data?.byCode.find((x) => x.code === c)?.scans ?? 0;

  async function activate() {
    setBusy(true);
    try {
      const c = await db.codes.activate(newCode.trim().toUpperCase(), profile!.id);
      setData((list) => [...(list ?? []).filter((x) => x.code !== c.code), c]);
      toast.success(`Código ${c.code} activado`);
      setActivateOpen(false);
      setNewCode("");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveLabel() {
    if (!editing) return;
    const c = await db.codes.setLabel(editing.code, editing.label);
    setData((list) => list?.map((x) => (x.code === c.code ? c : x)) ?? null);
    setEditing(null);
  }

  return (
    <PanelPage>
      <PageHeader
        title="Mis códigos QR"
        description="Tus tarjetas y placas apuntan a un código permanente. Si cambiás algo en tu biosite, no hace falta reimprimir."
        actions={<Button icon={<Nfc className="size-4" />} onClick={() => setActivateOpen(true)}>Activar código</Button>}
      />

      <div className="mb-5 card p-4">
        <QrStyleControls useLogo={useLogo} setUseLogo={setUseLogo} fg={fg} setFg={setFg} hasLogo={!!profile.avatarUrl} />
      </div>

      {codes.length === 0 ? (
        <EmptyState
          icon={<Nfc className="size-6" />}
          title="Todavía no activaste ninguna tarjeta"
          description="Escaneá tu tarjeta o placa nueva con el celular, o escribí el código impreso."
          action={<Button onClick={() => setActivateOpen(true)}>Activar con código</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {codes.map((c) => {
            const K = KIND[c.kind];
            const url = codeUrl(c.code);
            return (
              <div key={c.code} className="card flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-lg font-bold tracking-widest">{c.code}</p>
                    <button onClick={() => setEditing(c)} className="group flex items-center gap-1 text-sm text-ink-3 hover:text-ink">
                      <span className="truncate">{c.label || "Sin nombre"}</span> <Pencil className="size-3 opacity-0 group-hover:opacity-100" />
                    </button>
                  </div>
                  <Badge tone={c.status === "active" ? "ok" : "danger"}><K.icon className="size-3" /> {K.label}</Badge>
                </div>
                <QrImage text={url} logo={logo} fg={fg} className="mx-auto my-4 w-full max-w-[200px]" />
                <div className="mb-3 flex items-center justify-between text-xs text-ink-3">
                  <span>{scansFor(c.code)} escaneos (30 d)</span>
                  <span>Activado {formatDate(c.activatedAt)}</span>
                </div>
                <button onClick={() => copy(url, c.code)} className="mb-2 flex items-center gap-2 truncate rounded-lg bg-paper px-2.5 py-1.5 text-left text-xs text-ink-2 hover:bg-paper-2">
                  {copied === c.code ? <Check className="size-3.5 shrink-0 text-ok" /> : <Copy className="size-3.5 shrink-0" />}
                  <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
                </button>
                <div className="mt-auto">
                  <QrDownloads text={url} filename={`qr-${c.code}`} logo={logo} fg={fg} caption={c.code} pdfTitle={profile.name} pdfSubtitle={c.label || url} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <SectionCard title="QR directo a tu biosite" description="Para compartir en redes o imprimir en folletos. Ojo: si cambiás la dirección de tu biosite, este QR deja de funcionar — para impresos permanentes usá un código de arriba.">
          <div className="grid items-center gap-5 sm:grid-cols-[180px_1fr]">
            <QrImage text={profileUrl(profile.slug)} logo={logo} fg={fg} className="w-full max-w-[180px] border border-line p-2" />
            <div>
              <p className="mb-3 break-all text-sm font-medium text-brand">{profileUrl(profile.slug)}</p>
              <div className="max-w-sm"><QrDownloads text={profileUrl(profile.slug)} filename={`qr-${profile.slug}`} logo={logo} fg={fg} pdfTitle={profile.name} /></div>
            </div>
          </div>
        </SectionCard>
      </div>

      <Modal
        open={activateOpen}
        onClose={() => setActivateOpen(false)}
        title="Activar tarjeta o placa"
        footer={<><Button variant="secondary" onClick={() => setActivateOpen(false)}>Cancelar</Button><Button loading={busy} disabled={newCode.trim().length < 4} onClick={activate}>Activar</Button></>}
      >
        <p className="mb-4 text-sm text-ink-2">Lo más fácil es <b>escanear la tarjeta con tu celular</b> estando con tu sesión iniciada. Si preferís, escribí el código impreso al dorso.</p>
        <Field label="Código" hint="Probá con DEMO24, F8JX4N, M5TV9C o R3GD8K (datos de prueba)">
          <Input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} maxLength={10} className="font-mono text-lg tracking-[.25em] uppercase" placeholder="ABC123" />
        </Field>
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Nombre para ${editing?.code}`} footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button><Button onClick={saveLabel}>Guardar</Button></>}>
        <Field label="Nombre" hint="Te ayuda a saber qué tarjeta o mesa escanean más.">
          <Input autoFocus value={editing?.label ?? ""} onChange={(e) => editing && setEditing({ ...editing, label: e.target.value })} placeholder="Mesa 5" />
        </Field>
      </Modal>
    </PanelPage>
  );
}
