"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { createBusiness, createUser, isSlugAvailable, listProfiles } from "@/lib/api";
import { friendlyError } from "@/lib/supabase";
import { BRAND } from "@/lib/brand";
import { cn, slugify } from "@/lib/utils";
import { useSession } from "@/components/session";
import { useToast } from "@/components/ui/toast";
import { Button, Field, Input, Modal, Select, Spinner } from "@/components/ui";
import { PasswordStrength } from "@/components/password-strength";

type OwnerMode = "new" | "existing" | "none";

export function suggestPassword() {
  const words = ["Sol", "Mate", "Chipa", "Rio", "Luna", "Lapacho", "Yerba", "Tera"];
  return `${words[Math.floor(Math.random() * words.length)]}${Math.floor(1000 + Math.random() * 9000)}!${words[Math.floor(Math.random() * words.length)]}`;
}

export function NewBusinessModal({ open, onClose, initialName = "" }: { open: boolean; onClose: () => void; initialName?: string }) {
  const router = useRouter();
  const toast = useToast();
  const { me } = useSession();
  const isAdmin = me?.role === "admin";
  const [biz, setBiz] = useState({ name: initialName, slug: slugify(initialName), category: "", city: "" });
  const [slugTouched, setSlugTouched] = useState(false);
  const [check, setCheck] = useState<{ slug: string; ok: boolean } | null>(null);
  const [ownerMode, setOwnerMode] = useState<OwnerMode>("new");
  const [owner, setOwner] = useState({ fullName: "", email: "", phone: "", password: suggestPassword() });
  const [existingOwner, setExistingOwner] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [sellers, setSellers] = useState<UserProfile[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    listProfiles("client").then(setClients).catch(() => {});
    if (isAdmin) listProfiles("seller").then(setSellers).catch(() => {});
  }, [open, isAdmin]);

  useEffect(() => {
    if (!biz.slug) return;
    const s = biz.slug;
    const t = setTimeout(async () => setCheck({ slug: s, ok: await isSlugAvailable(s).catch(() => false) }), 350);
    return () => clearTimeout(t);
  }, [biz.slug]);
  const slugOk = check?.slug === biz.slug ? check.ok : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!biz.name.trim()) return toast.error("Escribí el nombre del negocio");
    if (slugOk === false) return toast.error("Esa dirección no está disponible");
    setBusy(true);
    try {
      let id: string | undefined;
      if (ownerMode === "new") {
        const res = await createUser({
          email: owner.email,
          password: owner.password,
          fullName: owner.fullName,
          phone: owner.phone,
          role: "client",
          business: { name: biz.name.trim(), slug: biz.slug, category: biz.category, city: biz.city },
          sellerId: isAdmin ? sellerId || null : undefined,
        });
        if (res.business?.error) throw new Error(`La cuenta se creó, pero el negocio no: ${res.business.error}`);
        id = res.business?.id;
        toast.success(`Listo: negocio y cuenta de ${owner.email} creados`);
      } else {
        id = await createBusiness({
          name: biz.name.trim(),
          slug: biz.slug,
          category: biz.category,
          city: biz.city,
          ownerId: ownerMode === "existing" ? existingOwner || null : null,
          sellerId: isAdmin ? sellerId || null : me?.id,
        });
        toast.success("Negocio creado");
      }
      onClose();
      if (id) router.push(`/admin/negocios/${id}`);
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Nuevo negocio"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="new-business" loading={busy}>Crear negocio</Button>
        </>
      }
    >
      <form id="new-business" onSubmit={submit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre del negocio">
            <Input
              required
              autoFocus
              value={biz.name}
              onChange={(e) => setBiz({ ...biz, name: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
              placeholder="Ej.: Lomitería Don Pedro"
            />
          </Field>
          <Field label="Dirección de la página" error={slugOk === false ? "Ya está en uso o no es válida" : null}>
            <div className="flex items-center rounded-xl border border-line bg-white focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
              <span className="pl-3 text-xs text-ink-3">{BRAND.domain}/</span>
              <input required value={biz.slug} onChange={(e) => { setSlugTouched(true); setBiz({ ...biz, slug: slugify(e.target.value) }); }} className="h-11 min-w-0 flex-1 bg-transparent px-1 outline-none" />
              <span className="pr-3">{!biz.slug ? null : slugOk === null ? <Spinner className="size-4" /> : slugOk ? <Check className="size-4 text-ok" /> : <X className="size-4 text-danger" />}</span>
            </div>
          </Field>
          <Field label="Rubro (opcional)"><Input value={biz.category} onChange={(e) => setBiz({ ...biz, category: e.target.value })} placeholder="Restaurante, barbería…" /></Field>
          <Field label="Ciudad (opcional)"><Input value={biz.city} onChange={(e) => setBiz({ ...biz, city: e.target.value })} placeholder="Asunción" /></Field>
        </div>

        <div>
          <p className="label">Dueño del negocio (podrá editar su página)</p>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-paper-2 p-1 text-sm font-semibold">
            {([["new", "Crear cuenta"], ["existing", "Cliente existente"], ["none", "Más tarde"]] as const).map(([m, l]) => (
              <button type="button" key={m} onClick={() => setOwnerMode(m)} className={cn("rounded-lg py-2 transition", ownerMode === m ? "bg-white shadow-sm" : "text-ink-3")}>{l}</button>
            ))}
          </div>
          <div className="mt-3 animate-rise" key={ownerMode}>
            {ownerMode === "new" && (
              <div className="grid gap-4 rounded-2xl bg-paper/70 p-4 sm:grid-cols-2">
                <Field label="Nombre del dueño"><Input value={owner.fullName} onChange={(e) => setOwner({ ...owner, fullName: e.target.value })} /></Field>
                <Field label="Teléfono"><Input type="tel" value={owner.phone} onChange={(e) => setOwner({ ...owner, phone: e.target.value })} /></Field>
                <Field label="Email para entrar"><Input type="email" required value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} /></Field>
                <Field label="Contraseña inicial" hint="Pasásela al cliente; la puede cambiar en Mi cuenta">
                  <Input required value={owner.password} onChange={(e) => setOwner({ ...owner, password: e.target.value })} className="font-mono" />
                  <PasswordStrength value={owner.password} />
                </Field>
              </div>
            )}
            {ownerMode === "existing" && (
              <Select value={existingOwner} onChange={(e) => setExistingOwner(e.target.value)} required>
                <option value="">Elegí un cliente…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.fullName || c.email} — {c.email}</option>)}
              </Select>
            )}
            {ownerMode === "none" && <p className="text-sm text-ink-3">Lo podés asignar después desde la ficha del negocio.</p>}
          </div>
        </div>

        {isAdmin && (
          <Field label="Vendedor a cargo (opcional)">
            <Select value={sellerId} onChange={(e) => setSellerId(e.target.value)}>
              <option value="">Sin vendedor</option>
              {sellers.map((s) => <option key={s.id} value={s.id}>{s.fullName || s.email}</option>)}
            </Select>
          </Field>
        )}
      </form>
    </Modal>
  );
}
