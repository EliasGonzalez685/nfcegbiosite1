"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, FileText, Images, LayoutList, Loader2, Pencil, Plus, Trash2, Upload, UtensilsCrossed } from "lucide-react";
import type { Menu, MenuCategory, MenuItem, MenuMode } from "@/lib/types";
import { uploadImage, uploadPdf } from "@/lib/api";
import { friendlyError } from "@/lib/supabase";
import { cn, formatGs, formatNumber, parseGs, uid } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Button, Field, ImageUpload, Input, Modal, Select, Textarea, Toggle } from "@/components/ui";

type Editing = { categoryId: string; item: MenuItem; isNew: boolean };

function moveIn<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

/** Sección "Menú" del panel: se guarda junto con el resto con el botón Guardar */
const MODES: { mode: MenuMode; title: string; text: string; icon: typeof LayoutList }[] = [
  { mode: "items", title: "Editable", text: "Productos con foto, precio y pedidos por WhatsApp", icon: LayoutList },
  { mode: "pdf", title: "PDF", text: "Subís tu carta en PDF", icon: FileText },
  { mode: "images", title: "Fotos", text: "Fotos de tu carta o pizarra", icon: Images },
];

export function MenuEditor({ businessId, menu, onChange, onShowPreview }: { businessId: string; menu: Menu; onChange: (m: Menu) => void; onShowPreview: () => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [catModal, setCatModal] = useState<{ id?: string; name: string } | null>(null);

  const cats = menu.categories;
  const setCats = (categories: MenuCategory[]) => onChange({ ...menu, categories });
  const patchCat = (id: string, fn: (c: MenuCategory) => MenuCategory) => setCats(cats.map((c) => (c.id === id ? fn(c) : c)));
  const totalItems = cats.reduce((n, c) => n + c.items.length, 0);

  function saveCat() {
    const name = catModal?.name.trim();
    if (!name) return;
    if (catModal?.id) patchCat(catModal.id, (c) => ({ ...c, name }));
    else setCats([...cats, { id: uid(), name, items: [] }]);
    setCatModal(null);
  }

  function removeCat(c: MenuCategory) {
    if (c.items.length && !confirm(`¿Eliminar “${c.name}” y sus ${c.items.length} productos?`)) return;
    setCats(cats.filter((x) => x.id !== c.id));
  }

  function newItem(categoryId: string) {
    setEditing({ categoryId, isNew: true, item: { id: uid(), name: "", description: "", price: 0, photoUrl: null, soldOut: false } });
  }

  function saveItem() {
    if (!editing) return;
    const { item, categoryId } = editing;
    if (!item.name.trim()) return toast.error("El producto necesita un nombre");
    // quitar de donde estaba (por si cambió de categoría) y poner en la elegida
    const without = cats.map((c) => ({ ...c, items: c.items.filter((i) => i.id !== item.id) }));
    const wasIn = cats.find((c) => c.items.some((i) => i.id === item.id));
    setCats(
      without.map((c) => {
        if (c.id !== categoryId) return c;
        if (wasIn?.id === categoryId) return { ...c, items: cats.find((x) => x.id === c.id)!.items.map((i) => (i.id === item.id ? item : i)) };
        return { ...c, items: [...c.items, item] };
      }),
    );
    setEditing(null);
  }

  function removeItem() {
    if (!editing) return;
    setCats(cats.map((c) => ({ ...c, items: c.items.filter((i) => i.id !== editing.item.id) })));
    setEditing(null);
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Menú</h2>
          <p className="mt-0.5 text-sm text-ink-3">Para restaurantes, cafeterías, lomiterías… Aparece como botón “Ver menú”.</p>
        </div>
        <Toggle checked={menu.enabled} onChange={(enabled) => onChange({ ...menu, enabled })} />
      </div>

      {!menu.enabled ? (
        <button onClick={() => onChange({ ...menu, enabled: true })} className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-line p-4 text-left text-sm text-ink-3 hover:bg-paper/60">
          <UtensilsCrossed className="size-5 shrink-0" />
          Activalo si querés mostrar tus productos con foto y precio, y recibir pedidos por WhatsApp.
        </button>
      ) : (
        <div className="mt-5 space-y-4">
          <div>
            <p className="label">¿Cómo querés mostrar tu menú?</p>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.mode}
                  type="button"
                  onClick={() => onChange({ ...menu, mode: m.mode })}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition",
                    menu.mode === m.mode ? "border-brand bg-brand-soft/60 ring-2 ring-brand/20" : "border-line hover:border-ink-3",
                  )}
                >
                  <m.icon className={cn("size-5", menu.mode === m.mode ? "text-brand" : "text-ink-3")} />
                  <span className="font-semibold">{m.title}</span>
                  <span className="text-xs leading-snug text-ink-3 max-sm:hidden">{m.text}</span>
                </button>
              ))}
            </div>
          </div>

          {menu.mode === "pdf" && <PdfSection businessId={businessId} menu={menu} onChange={onChange} />}
          {menu.mode === "images" && <ImagesSection businessId={businessId} menu={menu} onChange={onChange} onShowPreview={onShowPreview} />}

          {menu.mode === "items" && (<>
          <Field label="WhatsApp para pedidos (opcional)" hint="Si lo completás, tus clientes pueden armar el pedido y enviártelo. Vacío = el menú es solo para ver.">
            <Input inputMode="numeric" value={menu.orderWhatsapp} onChange={(e) => onChange({ ...menu, orderWhatsapp: e.target.value.replace(/\D/g, "") })} placeholder="595981123456" />
          </Field>

          {cats.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">
              Empezá creando una categoría, por ejemplo “Pizzas”, “Bebidas” o “Postres”.
            </div>
          )}

          {cats.map((c, ci) => (
            <div key={c.id} className="overflow-hidden rounded-2xl border border-line">
              <div className="flex items-center gap-1 bg-paper/70 px-3 py-2">
                <p className="min-w-0 flex-1 truncate font-semibold">
                  {c.name} <span className="font-normal text-ink-3">· {c.items.length}</span>
                </p>
                <IconBtn label="Subir categoría" disabled={ci === 0} onClick={() => setCats(moveIn(cats, ci, ci - 1))}><ChevronUp className="size-4" /></IconBtn>
                <IconBtn label="Bajar categoría" disabled={ci === cats.length - 1} onClick={() => setCats(moveIn(cats, ci, ci + 1))}><ChevronDown className="size-4" /></IconBtn>
                <IconBtn label="Renombrar" onClick={() => setCatModal({ id: c.id, name: c.name })}><Pencil className="size-4" /></IconBtn>
                <IconBtn label="Eliminar categoría" danger onClick={() => removeCat(c)}><Trash2 className="size-4" /></IconBtn>
              </div>
              <ul className="divide-y divide-line">
                {c.items.map((i, ii) => (
                  <li key={i.id} className="flex items-center gap-2 px-2 py-2">
                    <div className="flex flex-col">
                      <button onClick={() => patchCat(c.id, (x) => ({ ...x, items: moveIn(x.items, ii, ii - 1) }))} disabled={ii === 0} className="text-ink-3 hover:text-ink disabled:opacity-20" aria-label="Subir"><ChevronUp className="size-4" /></button>
                      <button onClick={() => patchCat(c.id, (x) => ({ ...x, items: moveIn(x.items, ii, ii + 1) }))} disabled={ii === c.items.length - 1} className="text-ink-3 hover:text-ink disabled:opacity-20" aria-label="Bajar"><ChevronDown className="size-4" /></button>
                    </div>
                    <button onClick={() => setEditing({ categoryId: c.id, item: i, isNew: false })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="size-12 shrink-0 overflow-hidden rounded-xl bg-paper-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {i.photoUrl && <img src={i.photoUrl} alt="" className={cn("size-full object-cover", i.soldOut && "grayscale")} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate font-medium", i.soldOut && "text-ink-3")}>{i.name}</span>
                        <span className="block text-sm tabular-nums text-ink-2">{formatGs(i.price)}</span>
                      </span>
                    </button>
                    <button
                      onClick={() => patchCat(c.id, (x) => ({ ...x, items: x.items.map((y) => (y.id === i.id ? { ...y, soldOut: !y.soldOut } : y)) }))}
                      className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", i.soldOut ? "bg-red-50 text-danger" : "bg-brand-soft text-brand")}
                      title="Cambiar disponibilidad"
                    >
                      {i.soldOut ? "Agotado" : "Disponible"}
                    </button>
                  </li>
                ))}
              </ul>
              <button onClick={() => newItem(c.id)} className="flex w-full items-center justify-center gap-1.5 border-t border-line py-2.5 text-sm font-medium text-brand hover:bg-paper/60">
                <Plus className="size-4" /> Agregar producto
              </button>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setCatModal({ name: "" })}>Nueva categoría</Button>
            {totalItems > 0 && <Button variant="ghost" icon={<UtensilsCrossed className="size-4" />} onClick={onShowPreview}>Ver menú en la vista previa</Button>}
          </div>
          </>)}
        </div>
      )}

      {/* Producto */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.isNew ? "Nuevo producto" : "Editar producto"}
        wide
        footer={
          <>
            {!editing?.isNew && <Button variant="danger" className="mr-auto" icon={<Trash2 className="size-4" />} onClick={removeItem}>Eliminar</Button>}
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveItem}>{editing?.isNew ? "Agregar" : "Listo"}</Button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-5 sm:grid-cols-[150px_1fr]">
            <div>
              <p className="label">Foto</p>
              <ImageUpload value={editing.item.photoUrl} onChange={(photoUrl) => setEditing({ ...editing, item: { ...editing.item, photoUrl } })} label="Subir foto" maxSize={900} upload={(f, max) => uploadImage(businessId, f, max)} />
            </div>
            <div className="grid gap-4">
              <Field label="Nombre">
                <Input autoFocus value={editing.item.name} onChange={(e) => setEditing({ ...editing, item: { ...editing.item, name: e.target.value } })} placeholder="Ej.: Lomito árabe" />
              </Field>
              <Field label="Descripción (opcional)">
                <Textarea rows={2} value={editing.item.description} onChange={(e) => setEditing({ ...editing, item: { ...editing.item, description: e.target.value } })} placeholder="Ingredientes, tamaño…" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Precio">
                  <div className="flex items-center rounded-xl border border-line bg-white focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
                    <span className="pl-3.5 text-sm font-medium text-ink-3">Gs.</span>
                    <input
                      inputMode="numeric"
                      value={editing.item.price ? formatNumber(editing.item.price) : ""}
                      onChange={(e) => setEditing({ ...editing, item: { ...editing.item, price: parseGs(e.target.value) } })}
                      className="h-11 min-w-0 flex-1 bg-transparent px-2 tabular-nums outline-none"
                      placeholder="25.000"
                    />
                  </div>
                </Field>
                <Field label="Categoría">
                  <Select value={editing.categoryId} onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}>
                    {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
              </div>
              <Toggle checked={editing.item.soldOut} onChange={(soldOut) => setEditing({ ...editing, item: { ...editing.item, soldOut } })} label="Agotado" description="Se sigue viendo en el menú pero no se puede pedir." />
            </div>
          </div>
        )}
      </Modal>

      {/* Categoría */}
      <Modal
        open={!!catModal}
        onClose={() => setCatModal(null)}
        title={catModal?.id ? "Renombrar categoría" : "Nueva categoría"}
        footer={<><Button variant="secondary" onClick={() => setCatModal(null)}>Cancelar</Button><Button onClick={saveCat}>Guardar</Button></>}
      >
        <form onSubmit={(e) => { e.preventDefault(); saveCat(); }}>
          <Field label="Nombre">
            <Input autoFocus value={catModal?.name ?? ""} onChange={(e) => catModal && setCatModal({ ...catModal, name: e.target.value })} placeholder="Ej.: Bebidas" />
          </Field>
        </form>
      </Modal>
    </section>
  );
}

function IconBtn({ children, label, onClick, disabled, danger }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button title={label} aria-label={label} onClick={onClick} disabled={disabled} className={cn("grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-white disabled:opacity-25", danger ? "hover:text-danger" : "hover:text-ink")}>
      {children}
    </button>
  );
}

function useFilePicker(accept: string, onFiles: (files: File[]) => Promise<void>, multiple = false) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const input = (
    <input
      ref={ref}
      type="file"
      accept={accept}
      multiple={multiple}
      className="hidden"
      onChange={async (e) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        setBusy(true);
        try {
          await onFiles(files);
        } catch (err) {
          toast.error(friendlyError(err));
        } finally {
          setBusy(false);
          if (ref.current) ref.current.value = "";
        }
      }}
    />
  );
  return { open: () => ref.current?.click(), busy, input };
}

function PdfSection({ businessId, menu, onChange }: { businessId: string; menu: Menu; onChange: (m: Menu) => void }) {
  const picker = useFilePicker("application/pdf", async ([f]) => onChange({ ...menu, pdfUrl: await uploadPdf(businessId, f) }));
  return (
    <div className="rounded-2xl border border-line p-4">
      {picker.input}
      {menu.pdfUrl ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-red-50 text-danger"><FileText className="size-6" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Menú en PDF cargado</p>
            <a href={menu.pdfUrl} target="_blank" rel="noopener" className="text-sm text-brand underline-offset-2 hover:underline">Abrir para revisar</a>
          </div>
          <Button variant="secondary" size="sm" loading={picker.busy} icon={<Upload className="size-4" />} onClick={picker.open}>Reemplazar</Button>
        </div>
      ) : (
        <button type="button" onClick={picker.open} disabled={picker.busy} className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line py-8 text-sm text-ink-3 hover:border-brand hover:text-brand">
          {picker.busy ? <Loader2 className="size-7 animate-spin" /> : <Upload className="size-7" />}
          <span className="font-medium">{picker.busy ? "Subiendo…" : "Subir menú en PDF (hasta 15 MB)"}</span>
          <span className="text-xs">Cuando cambien los precios, subí el nuevo y listo: la plaquita sigue igual.</span>
        </button>
      )}
    </div>
  );
}

function ImagesSection({ businessId, menu, onChange, onShowPreview }: { businessId: string; menu: Menu; onChange: (m: Menu) => void; onShowPreview: () => void }) {
  const picker = useFilePicker(
    "image/*",
    async (files) => {
      const added = [];
      for (const f of files) added.push({ id: uid(), url: await uploadImage(businessId, f, 1800), caption: "" });
      onChange({ ...menu, images: [...menu.images, ...added] });
    },
    true,
  );
  const imgs = menu.images;
  const set = (images: typeof imgs) => onChange({ ...menu, images });
  return (
    <div className="space-y-3">
      {picker.input}
      {imgs.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {imgs.map((m, i) => (
            <li key={m.id} className="overflow-hidden rounded-2xl border border-line bg-white">
              <div className="relative aspect-[3/4] bg-paper-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt="" className="absolute inset-0 size-full object-cover" />
                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">{i + 1}</span>
              </div>
              <div className="flex items-center gap-0.5 p-1.5">
                <input value={m.caption} onChange={(e) => set(imgs.map((x) => (x.id === m.id ? { ...x, caption: e.target.value } : x)))} placeholder="Título (opcional)" className="min-w-0 flex-1 rounded-lg px-2 py-1 text-xs outline-none focus:bg-paper" />
                <IconBtn label="Antes" disabled={i === 0} onClick={() => set(moveIn(imgs, i, i - 1))}><ChevronUp className="size-4 -rotate-90" /></IconBtn>
                <IconBtn label="Después" disabled={i === imgs.length - 1} onClick={() => set(moveIn(imgs, i, i + 1))}><ChevronDown className="size-4 -rotate-90" /></IconBtn>
                <IconBtn label="Quitar" danger onClick={() => set(imgs.filter((x) => x.id !== m.id))}><Trash2 className="size-4" /></IconBtn>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={picker.open} disabled={picker.busy} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-6 text-sm font-medium text-ink-3 hover:border-brand hover:text-brand">
        {picker.busy ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
        {picker.busy ? "Subiendo fotos…" : imgs.length ? "Agregar más fotos" : "Subir fotos del menú (podés elegir varias)"}
      </button>
      {imgs.length > 0 && <Button variant="ghost" icon={<Images className="size-4" />} onClick={onShowPreview}>Ver en la vista previa</Button>}
    </div>
  );
}
