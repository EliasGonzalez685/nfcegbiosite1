"use client";

import { useState } from "react";
import { Eye, EyeOff, Info, Plus, Trash2, Wifi } from "lucide-react";
import type { WifiNetwork } from "@/lib/types";
import { wifiQrString } from "@/lib/links";
import { slugify, uid } from "@/lib/utils";
import { EditorLayout, LivePreview, PanelPage, useProfileDraft } from "@/components/panel/editor";
import { PageHeader } from "@/components/panel/shell";
import { QrDownloads, QrImage } from "@/components/panel/qr-tools";
import { Button, EmptyState, Field, Input, PageLoader, SectionCard, Select, Toggle } from "@/components/ui";

export default function WifiEditor() {
  const { draft, update, save, saving, dirty, discard } = useProfileDraft();
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  if (!draft) return <PageLoader />;
  const nets = draft.wifi;
  const patch = (id: string, p: Partial<WifiNetwork>) => update({ wifi: nets.map((w) => (w.id === id ? { ...w, ...p } : w)) });
  const add = () =>
    update((d) => ({
      wifi: [...d.wifi, { id: uid("w_"), ssid: "", password: "", security: "WPA", hidden: false, note: "" }],
      sections: { ...d.sections, wifi: true },
    }));

  return (
    <PanelPage>
      <PageHeader title="WiFi" description="Que tus clientes se conecten sin preguntarte la contraseña." actions={<Button icon={<Plus className="size-4" />} onClick={add}>Agregar red</Button>} />
      <EditorLayout preview={<LivePreview profile={draft} />} dirty={dirty} saving={saving} onSave={save} onDiscard={discard}>
        <div className="flex gap-3 rounded-2xl border border-brand/20 bg-brand-soft/60 p-4 text-sm text-ink-2">
          <Info className="mt-0.5 size-4 shrink-0 text-brand" />
          <p>
            Por seguridad, una página web <b>no puede conectar el celular al WiFi automáticamente</b>. En el biosite mostramos la red y un botón para <b>copiar la contraseña</b>.
            Para conexión directa, imprimí el <b>QR de WiFi</b> en una placa de mesa: la cámara del celular lo reconoce y se conecta al instante.
          </p>
        </div>

        <Toggle checked={draft.sections.wifi} onChange={(v) => update((d) => ({ sections: { ...d.sections, wifi: v } }))} label="Mostrar WiFi en mi biosite" />

        {nets.length === 0 ? (
          <EmptyState icon={<Wifi className="size-6" />} title="No hay redes cargadas" action={<Button onClick={add}>Agregar red WiFi</Button>} />
        ) : (
          nets.map((w) => (
            <SectionCard
              key={w.id}
              title={w.ssid || "Nueva red"}
              action={<Button variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={() => update({ wifi: nets.filter((x) => x.id !== w.id) })}>Quitar</Button>}
            >
              <div className="grid gap-6 md:grid-cols-[1fr_200px]">
                <div className="grid gap-4">
                  <Field label="Nombre de la red (SSID)" hint="Escribilo exactamente igual, respetando mayúsculas.">
                    <Input value={w.ssid} onChange={(e) => patch(w.id, { ssid: e.target.value })} placeholder="MiNegocio_Clientes" />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Seguridad">
                      <Select value={w.security} onChange={(e) => patch(w.id, { security: e.target.value as WifiNetwork["security"] })}>
                        <option value="WPA">WPA/WPA2/WPA3</option>
                        <option value="WEP">WEP (antigua)</option>
                        <option value="nopass">Sin contraseña</option>
                      </Select>
                    </Field>
                    {w.security !== "nopass" && (
                      <Field label="Contraseña">
                        <div className="relative">
                          <Input type={visible[w.id] ? "text" : "password"} value={w.password} onChange={(e) => patch(w.id, { password: e.target.value })} className="pr-10" />
                          <button type="button" onClick={() => setVisible((v) => ({ ...v, [w.id]: !v[w.id] }))} className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center text-ink-3">
                            {visible[w.id] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </Field>
                    )}
                  </div>
                  <Field label="Nota (opcional)"><Input value={w.note ?? ""} onChange={(e) => patch(w.id, { note: e.target.value })} placeholder="Ej.: Red para clientes · 2º piso" /></Field>
                  <Toggle checked={w.hidden} onChange={(hidden) => patch(w.id, { hidden })} label="Red oculta" description="Marcalo si tu red no aparece en la lista de redes." />
                </div>
                <div>
                  <p className="label">QR de WiFi para la mesa</p>
                  {w.ssid ? (
                    <>
                      <QrImage text={wifiQrString(w)} className="w-full border border-line p-2" />
                      <div className="mt-2">
                        <QrDownloads compact text={wifiQrString(w)} filename={`wifi-${slugify(w.ssid)}`} caption={`WiFi: ${w.ssid}`} pdfTitle="Escaneá para conectarte al WiFi" pdfSubtitle={`Red: ${w.ssid}`} />
                      </div>
                    </>
                  ) : (
                    <div className="grid aspect-square place-items-center rounded-xl border border-dashed border-line text-center text-xs text-ink-3">Completá el nombre de la red</div>
                  )}
                </div>
              </div>
            </SectionCard>
          ))
        )}
      </EditorLayout>
    </PanelPage>
  );
}
