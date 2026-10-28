"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import type { Menu, MenuCategory, MenuItem } from "@/lib/types";
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
export function MenuEditor({ menu, onChange, onShowPreview }: { menu: Menu; onChange: (m: Menu) => void; onShowPreview: () => void }) {
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
    else setCats([...cats, { id: uid("c_"), name, items: [] }]);
    setCatModal(null);
  }

  function removeCat(c: MenuCategory) {
    if (c.items.length && !confirm(`¿Eliminar “${c.name}” y sus ${c.items.length} productos?`)) return;
    setCats(cats.filter((x) => x.id !== c.id));
  }

  function newItem(categoryId: string) {
    setEditing({ categoryId, isNew: true, item: { id: uid("i_"), name: "", description: "", price: 0, photoUrl: null, soldOut: false } });
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
              <ImageUpload value={editing.item.photoUrl} onChange={(photoUrl) => setEditing({ ...editing, item: { ...editing.item, photoUrl } })} label="Subir foto" maxSize={700} />
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
