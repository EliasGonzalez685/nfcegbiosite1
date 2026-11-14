"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Pencil, Plus, Search, ShieldCheck, UserRound, Users } from "lucide-react";
import type { Role, UserProfile } from "@/lib/types";
import { createUser, listProfiles, updateUser } from "@/lib/api";
import { friendlyError } from "@/lib/supabase";
import { cn, formatDate } from "@/lib/utils";
import { useAsync } from "@/lib/hooks";
import { useSession } from "@/components/session";
import { useToast } from "@/components/ui/toast";
import { Page, PageHead } from "@/components/panel/top-bar";
import { Badge, Button, EmptyState, Field, Input, Modal, PageLoader, Select } from "@/components/ui";
import { PasswordStrength } from "@/components/password-strength";
import { suggestPassword } from "@/components/new-business";

const ROLE: Record<Role, { label: string; tone: "brand" | "clay" | "neutral" }> = {
  admin: { label: "Admin", tone: "brand" },
  seller: { label: "Vendedor", tone: "clay" },
  client: { label: "Cliente", tone: "neutral" },
};

function Users_() {
  const { me } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const isAdmin = me?.role === "admin";
  const { data, loading, reload } = useAsync(() => listProfiles(), []);
  const [filter, setFilter] = useState<Role | "all">("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const creating = params.get("nuevo") === "1";

  const others = (data ?? []).filter((u) => u.id !== me?.id);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return others.filter((u) => (filter === "all" || u.role === filter) && (!s || u.fullName.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)));
  }, [others, filter, q]);
  const count = (r: Role) => others.filter((u) => u.role === r).length;

  return (
    <Page>
      <PageHead
        title={isAdmin ? "Usuarios" : "Mis clientes"}
        description={isAdmin ? "Administradores, vendedores y clientes. Creá cuentas y cambiá contraseñas, emails, roles o estado." : "Las cuentas de los negocios que atendés."}
        actions={<Button icon={<Plus className="size-4" />} onClick={() => router.push("/admin/usuarios?nuevo=1")}>{isAdmin ? "Nuevo usuario" : "Nuevo cliente"}</Button>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {isAdmin && (
          <div className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-line">
            {(["all", "admin", "seller", "client"] as const).map((r) => (
              <button key={r} onClick={() => setFilter(r)} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition", filter === r ? "bg-ink text-white" : "text-ink-2 hover:bg-paper")}>
                {r === "all" ? `Todos (${others.length})` : `${ROLE[r].label}${r === "seller" ? "es" : r === "admin" ? "s" : "s"} (${count(r)})`}
              </button>
            ))}
          </div>
        )}
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-line bg-white px-3">
          <Search className="size-4 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o email" className="h-10 flex-1 bg-transparent outline-none" />
        </div>
      </div>

      {loading && !data ? (
        <PageLoader />
      ) : !list.length ? (
        <EmptyState icon={<Users className="size-6" />} title={q ? "Sin resultados" : "Todavía no hay cuentas"} />
      ) : (
        <ul className="card divide-y divide-line">
          {list.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-full font-semibold", u.role === "admin" ? "bg-brand text-white" : u.role === "seller" ? "bg-clay-soft text-clay" : "bg-paper-2")}>
                {(u.fullName || u.email).slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{u.fullName || "Sin nombre"} <Badge tone={ROLE[u.role].tone}>{ROLE[u.role].label}</Badge> {u.status === "suspended" && <Badge tone="danger">Suspendido</Badge>}</p>
                <p className="truncate text-sm text-ink-3">{u.email}{u.phone ? ` · ${u.phone}` : ""} · alta {formatDate(u.createdAt)}</p>
              </div>
              <Button size="sm" variant="secondary" icon={<Pencil className="size-3.5" />} onClick={() => setEditing(u)}>Editar</Button>
            </li>
          ))}
        </ul>
      )}

      {creating && <CreateUserModal onClose={() => router.replace("/admin/usuarios")} onDone={reload} />}
      {editing && <EditUserModal user={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); reload(); }} />}
    </Page>
  );
}

function CreateUserModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { me } = useSession();
  const toast = useToast();
  const isAdmin = me?.role === "admin";
  const [f, setF] = useState({ role: (isAdmin ? "seller" : "client") as Role, fullName: "", email: "", phone: "", password: suggestPassword() });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await createUser(f);
      toast.success(`Cuenta creada: ${f.email}`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isAdmin ? "Nuevo usuario" : "Nuevo cliente"}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="new-user" loading={busy}>Crear cuenta</Button></>}
    >
      <form id="new-user" onSubmit={submit} className="space-y-4">
        {isAdmin && (
          <div>
            <p className="label">Tipo de cuenta</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["seller", "Vendedor", "Crea y atiende clientes"],
                ["client", "Cliente", "Edita su negocio"],
                ["admin", "Admin", "Control total"],
              ] as const).map(([r, l, d]) => (
                <button type="button" key={r} onClick={() => setF({ ...f, role: r })} className={cn("rounded-2xl border p-3 text-left transition", f.role === r ? "border-brand bg-brand-soft/60 ring-2 ring-brand/20" : "border-line hover:border-ink-3")}>
                  <span className="block font-semibold">{l}</span>
                  <span className="block text-xs text-ink-3">{d}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre"><Input required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} autoFocus /></Field>
          <Field label="Teléfono"><Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        </div>
        <Field label="Email para entrar" hint="Puede ser real o interno (ej. vendedor1@nfcegbiosite.com); se cambia después.">
          <Input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label="Contraseña inicial" hint="Compartila de forma privada. La persona la puede cambiar en Mi cuenta.">
          <Input required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className="font-mono" />
          <PasswordStrength value={f.password} />
        </Field>
        {f.role === "client" && <p className="rounded-xl bg-paper px-3 py-2 text-sm text-ink-2">Para crear el negocio junto con la cuenta, usá <b>Negocios → Nuevo negocio</b>.</p>}
      </form>
    </Modal>
  );
}

function EditUserModal({ user, onClose, onDone }: { user: UserProfile; onClose: () => void; onDone: () => void }) {
  const { me } = useSession();
  const toast = useToast();
  const isAdmin = me?.role === "admin";
  const [f, setF] = useState({ fullName: user.fullName, phone: user.phone ?? "", email: user.email, role: user.role, status: user.status, password: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.password && f.password.length < 8) return toast.error("La contraseña debe tener al menos 8 caracteres");
    setBusy(true);
    try {
      await updateUser(user.id, {
        fullName: f.fullName,
        phone: f.phone || null,
        email: f.email,
        password: f.password || undefined,
        ...(isAdmin ? { role: f.role, status: f.status } : {}),
      });
      toast.success(f.password ? "Cuenta actualizada y contraseña cambiada" : "Cuenta actualizada");
      onDone();
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Editar ${user.fullName || user.email}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="edit-user" loading={busy}>Guardar</Button></>}
    >
      <form id="edit-user" onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre"><Input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
          <Field label="Teléfono"><Input type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        </div>
        <Field label="Email para entrar"><Input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Nueva contraseña (opcional)" hint="Dejala vacía para no cambiarla.">
          <div className="flex gap-2">
            <Input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className="font-mono" placeholder="••••••••" />
            <Button type="button" variant="secondary" icon={<KeyRound className="size-4" />} onClick={() => setF({ ...f, password: suggestPassword() })}>Generar</Button>
          </div>
          <PasswordStrength value={f.password} />
        </Field>
        {isAdmin && (
          <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
            <Field label="Rol">
              <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
                <option value="client">Cliente</option>
                <option value="seller">Vendedor</option>
                <option value="admin">Administrador</option>
              </Select>
            </Field>
            <Field label="Estado" hint={f.status === "suspended" ? "No va a poder entrar" : undefined}>
              <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as "active" | "suspended" })}>
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
              </Select>
            </Field>
          </div>
        )}
        <p className="flex items-center gap-2 text-xs text-ink-3">
          {isAdmin ? <ShieldCheck className="size-3.5" /> : <UserRound className="size-3.5" />} Todos los cambios quedan en el registro de actividad.
        </p>
      </form>
    </Modal>
  );
}

export default function UsersPage() {
  return (
    <Suspense>
      <Users_ />
    </Suspense>
  );
}
