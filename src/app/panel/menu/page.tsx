"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, UtensilsCrossed, MoreHorizontal } from "lucide-react";
import type { MenuCategory, MenuItem } from "@/lib/types";
import { db } from "@/lib/data";
import { useAsync } from "@/lib/hooks";
import { MENU_TAGS, tagMeta } from "@/lib/links";
import { cn, formatGs, formatNumber, parseGs } from "@/lib/utils";
import { useSession } from "@/components/session";
import { useToast } from "@/components/ui/toast";
import { EditorLayout, LivePreview, PanelPage, useProfileDraft } from "@/components/panel/editor";
import { PageHeader } from "@/components/panel/shell";
import { Button, EmptyState, Field, ImageUpload, Input, Modal, PageLoader, SectionCard, Select, Textarea, Toggle } from "@/components/ui";

type ItemDraft = Omit<MenuItem, "id"> & { id?: string };

export default function MenuEditor() {
  const { profile } = useSession();
  const { draft, update, save, saving, dirty, discard } = useProfileDraft();
  const toast = useToast();
  const { data: menu, setData: setMenu, loading } = useAsync(() => db.menu.list(profile!.id), [profile?.id]);
  const [item, setItem] = useState<ItemDraft | null>(null);
  const [cat, setCat] = useState<Partial<MenuCategory> | null>(null);
  const [savingItem, setSavingItem] = useState(false);
  const [previewView, setPreviewView] = useState<"menu" | "biosite">("menu");
  const [catMenu, setCatMenu] = useState<string | null>(null);

  if (!draft || loading || !menu) return <PageLoader />;
  const { categories, items } = menu;

  async function saveItem() {
    if (!item) return;
    if (!item.name.trim()) return toast.error("El producto necesita un nombre");
    setSavingItem(true);
    try {
      const saved = await db.menu.saveItem(item);
      setMenu((m) => m && { ...m, items: item.id ? m.items.map((i) => (i.id === saved.id ? saved : i)) : [...m.items, saved] });
      setItem(null);
      toast.success(item.id ? "Producto actualizado" : "Producto agregado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingItem(false);
    }
  }

  async function quickToggle(i: MenuItem) {
    const saved = await db.menu.saveItem({ ...i, soldOut: !i.soldOut });
    setMenu((m) => m && { ...m, items: m.items.map((x) => (x.id === saved.id ? saved : x)) });
  }

  async function removeItem(i: MenuItem) {
    if (!confirm(`¿Eliminar “${i.name}”?`)) return;
    await db.menu.deleteItem(i.id);
    setMenu((m) => m && { ...m, items: m.items.filter((x) => x.id !== i.id) });
    setItem(null);
  }

  async function moveItem(i: MenuItem, dir: -1 | 1) {
    const list = items.filter((x) => x.categoryId === i.categoryId);
    const idx = list.findIndex((x) => x.id === i.id);
    const other = list[idx + dir];
    if (!other) return;
    const a = await db.menu.saveItem({ ...i, order: other.order });
    const b = await db.menu.saveItem({ ...other, order: i.order === other.order ? i.order + dir : i.order });
    setMenu((m) => m && { ...m, items: m.items.map((x) => (x.id === a.id ? a : x.id === b.id ? b : x)).sort((p, q) => p.order - q.order) });
  }

  async function saveCat() {
    if (!cat?.name?.trim()) return;
    const saved = await db.menu.saveCategory({ profileId: profile!.id, name: cat.name.trim(), order: cat.order ?? categories.length, ...(cat.id ? { id: cat.id } : {}) });
    setMenu((m) => m && { ...m, categories: cat.id ? m.categories.map((c) => (c.id === saved.id ? saved : c)) : [...m.categories, saved] });
    setCat(null);
  }

  async function removeCat(c: MenuCategory) {
    const n = items.filter((i) => i.categoryId === c.id).length;
    if (!confirm(n ? `¿Eliminar “${c.name}” y sus ${n} productos?` : `¿Eliminar “${c.name}”?`)) return;
    await db.menu.deleteCategory(c.id);
    setMenu((m) => m && { categories: m.categories.filter((x) => x.id !== c.id), items: m.items.filter((i) => i.categoryId !== c.id) });
  }

  async function moveCat(idx: number, dir: -1 | 1) {
    const next = [...categories];
    const t = idx + dir;
    if (t < 0 || t >= next.length) return;
    [next[idx], next[t]] = [next[t], next[idx]];
    await db.menu.reorderCategories(profile!.id, next.map((c) => c.id));
    setMenu((m) => m && { ...m, categories: next.map((c, i) => ({ ...c, order: i })) });
  }

  const newItem = (categoryId: string): ItemDraft => ({
    profileId: profile!.id,
    categoryId,
    name: "",
    description: "",
    price: 0,
    photoUrl: null,
    tags: [],
    soldOut: false,
    order: items.filter((i) => i.categoryId === categoryId).length,
  });

  const preview = (
    <div>
      <div className="mx-auto mb-3 flex w-fit rounded-xl bg-paper-2 p-1 text-xs font-semibold">
        {(["menu", "biosite"] as const).map((v) => (
          <button key={v} onClick={() => setPreviewView(v)} className={cn("rounded-lg px-3 py-1.5", previewView === v ? "bg-white shadow-sm" : "text-ink-3")}>{v === "menu" ? "Menú" : "Biosite"}</button>
        ))}
      </div>
      <LivePreview profile={{ ...draft, sections: { ...draft.sections, menu: true } }} menu={menu} view={previewView} />
    </div>
  );

  return (
    <PanelPage>
      <PageHeader
        title="Menú gastronómico"
        description="Categorías, productos con foto y precios en guaraníes."
        actions={<Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setCat({ name: "" })}>Nueva categoría</Button>}
      />
      <EditorLayout preview={preview} dirty={dirty} saving={saving} onSave={save} onDiscard={discard}>
        <SectionCard title="Ajustes del menú">
          <div className="grid gap-4 sm:grid-cols-2">
            <Toggle checked={draft.sections.menu} onChange={(v) => update((d) => ({ sections: { ...d.sections, menu: v } }))} label="Mostrar menú en el biosite" description="Agrega el botón “Ver menú”." />
            <Field label="WhatsApp para pedidos" hint="Si lo dejás vacío, el menú se muestra sin carrito.">
              <Input inputMode="numeric" value={draft.orderWhatsapp} onChange={(e) => update({ orderWhatsapp: e.target.value.replace(/\D/g, "") })} placeholder="595981123456" />
            </Field>
          </div>
        </SectionCard>

        {categories.length === 0 ? (
          <EmptyState icon={<UtensilsCrossed className="size-6" />} title="Tu menú está vacío" description="Empezá creando una categoría, por ejemplo “Pizzas” o “Bebidas”." action={<Button onClick={() => setCat({ name: "" })}>Crear categoría</Button>} />
        ) : (
          categories.map((c, ci) => {
            const list = items.filter((i) => i.categoryId === c.id);
            return (
              <section key={c.id} className="card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-line bg-paper/50 px-4 py-3">
                  <h2 className="flex-1 truncate font-display text-lg font-semibold">{c.name} <span className="text-sm font-normal text-ink-3">· {list.length}</span></h2>
                  <Button size="sm" variant="ghost" icon={<Plus className="size-4" />} onClick={() => setItem(newItem(c.id))}>Producto</Button>
                  <div className="relative">
                    <button onClick={() => setCatMenu(catMenu === c.id ? null : c.id)} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-paper-2" aria-label="Opciones"><MoreHorizontal className="size-4" /></button>
                    {catMenu === c.id && (
                      <div className="absolute right-0 top-9 z-10 w-44 overflow-hidden rounded-xl border border-line bg-white py-1 text-sm shadow-xl" onMouseLeave={() => setCatMenu(null)}>
                        <button className="flex w-full items-center gap-2 px-3 py-2 hover:bg-paper" onClick={() => { setCat(c); setCatMenu(null); }}><Pencil className="size-4" /> Renombrar</button>
                        <button disabled={ci === 0} className="flex w-full items-center gap-2 px-3 py-2 hover:bg-paper disabled:opacity-40" onClick={() => { moveCat(ci, -1); setCatMenu(null); }}><ChevronUp className="size-4" /> Subir</button>
                        <button disabled={ci === categories.length - 1} className="flex w-full items-center gap-2 px-3 py-2 hover:bg-paper disabled:opacity-40" onClick={() => { moveCat(ci, 1); setCatMenu(null); }}><ChevronDown className="size-4" /> Bajar</button>
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-danger hover:bg-red-50" onClick={() => { removeCat(c); setCatMenu(null); }}><Trash2 className="size-4" /> Eliminar</button>
                      </div>
                    )}
                  </div>
                </div>
                {list.length === 0 ? (
                  <button onClick={() => setItem(newItem(c.id))} className="w-full px-4 py-6 text-sm text-ink-3 hover:bg-paper/50">+ Agregar el primer producto</button>
                ) : (
                  <ul className="divide-y divide-line">
                    {list.map((i, ii) => (
                      <li key={i.id} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="flex flex-col">
                          <button onClick={() => moveItem(i, -1)} disabled={ii === 0} className="text-ink-3 hover:text-ink disabled:opacity-20"><ChevronUp className="size-4" /></button>
                          <button onClick={() => moveItem(i, 1)} disabled={ii === list.length - 1} className="text-ink-3 hover:text-ink disabled:opacity-20"><ChevronDown className="size-4" /></button>
                        </div>
                        <button onClick={() => setItem(i)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-paper-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {i.photoUrl && <img src={i.photoUrl} alt="" className={cn("size-full object-cover", i.soldOut && "grayscale")} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={cn("truncate font-medium", i.soldOut && "text-ink-3")}>{i.name}</p>
                            <p className="text-sm tabular-nums text-ink-2">{formatGs(i.price)}</p>
                            {i.tags.length > 0 && (
                              <div className="mt-0.5 flex flex-wrap gap-1">
                                {i.tags.map((t) => <span key={t} className="text-[10px] font-semibold" style={{ color: tagMeta(t).color }}>{tagMeta(t).label}</span>)}
                              </div>
                            )}
                          </div>
                        </button>
                        <button
                          onClick={() => quickToggle(i)}
                          className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", i.soldOut ? "bg-red-50 text-danger" : "bg-brand-soft text-brand")}
                          title="Cambiar disponibilidad"
                        >
                          {i.soldOut ? "Agotado" : "Disponible"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })
        )}
      </EditorLayout>

      {/* Modal producto */}
      <Modal
        open={!!item}
        onClose={() => setItem(null)}
        title={item?.id ? "Editar producto" : "Nuevo producto"}
        wide
        footer={
          <>
            {item?.id && <Button variant="danger" className="mr-auto" icon={<Trash2 className="size-4" />} onClick={() => removeItem(item as MenuItem)}>Eliminar</Button>}
            <Button variant="secondary" onClick={() => setItem(null)}>Cancelar</Button>
            <Button loading={savingItem} onClick={saveItem}>Guardar</Button>
          </>
        }
      >
        {item && (
          <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
            <div>
              <p className="label">Foto</p>
              <ImageUpload value={item.photoUrl} onChange={(photoUrl) => setItem({ ...item, photoUrl })} label="Subir foto" />
              <p className="mt-1.5 text-xs text-ink-3">Cuadrada, bien iluminada.</p>
            </div>
            <div className="grid gap-4">
              <Field label="Nombre"><Input autoFocus value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} placeholder="Ej.: Lomito árabe" /></Field>
              <Field label="Descripción"><Textarea rows={2} value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} placeholder="Ingredientes, tamaño…" /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Precio">
                  <div className="flex items-center rounded-xl border border-line bg-white focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
                    <span className="pl-3.5 text-sm font-medium text-ink-3">Gs.</span>
                    <input inputMode="numeric" value={item.price ? formatNumber(item.price) : ""} onChange={(e) => setItem({ ...item, price: parseGs(e.target.value) })} className="h-11 min-w-0 flex-1 bg-transparent px-2 text-[15px] tabular-nums outline-none" placeholder="25.000" />
                  </div>
                </Field>
                <Field label="Categoría">
                  <Select value={item.categoryId} onChange={(e) => setItem({ ...item, categoryId: e.target.value })}>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
              </div>
              <div>
                <p className="label">Etiquetas</p>
                <div className="flex flex-wrap gap-1.5">
                  {MENU_TAGS.map((t) => {
                    const on = item.tags.includes(t.value);
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setItem({ ...item, tags: on ? item.tags.filter((x) => x !== t.value) : [...item.tags, t.value] })}
                        className={cn("rounded-full border px-3 py-1 text-sm font-medium transition", on ? "border-transparent text-white" : "border-line bg-white text-ink-2")}
                        style={on ? { background: t.color } : undefined}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Toggle checked={item.soldOut} onChange={(soldOut) => setItem({ ...item, soldOut })} label="Marcar como agotado" description="Se sigue viendo, pero no se puede pedir." />
            </div>
          </div>
        )}
      </Modal>

      {/* Modal categoría */}
      <Modal
        open={!!cat}
        onClose={() => setCat(null)}
        title={cat?.id ? "Renombrar categoría" : "Nueva categoría"}
        footer={<><Button variant="secondary" onClick={() => setCat(null)}>Cancelar</Button><Button onClick={saveCat}>Guardar</Button></>}
      >
        <form onSubmit={(e) => { e.preventDefault(); saveCat(); }}>
          <Field label="Nombre"><Input autoFocus value={cat?.name ?? ""} onChange={(e) => setCat({ ...cat, name: e.target.value })} placeholder="Ej.: Bebidas" /></Field>
        </form>
      </Modal>
    </PanelPage>
  );
}
