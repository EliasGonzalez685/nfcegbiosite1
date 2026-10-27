"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ClientRow, ShortCode } from "@/lib/types";
import { db } from "@/lib/data";
import { useAsync } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Button, Modal, Spinner } from "@/components/ui";

/** Modal para asignar o reasignar un código a un perfil de cliente */
export function AssignCodeModal({ code, onClose, onDone }: { code: ShortCode | null; onClose: () => void; onDone: (c: ShortCode) => void }) {
  const { data: clients, loading } = useAsync(() => db.users.listClients(), [code?.code]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const list = useMemo(() => {
    const s = q.toLowerCase();
    return (clients ?? []).filter((c): c is ClientRow & { profile: NonNullable<ClientRow["profile"]> } => !!c.profile && (!s || c.profile.name.toLowerCase().includes(s) || c.user.email.toLowerCase().includes(s)));
  }, [clients, q]);

  async function assign() {
    if (!code || !sel) return;
    setBusy(true);
    try {
      const c = await db.codes.assign(code.code, sel);
      toast.success(`${c.code} asignado`);
      onDone(c);
      setSel(null);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!!code}
      onClose={onClose}
      title={code?.profileId ? `Reasignar ${code.code}` : `Asignar ${code?.code}`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={!sel || sel === code?.profileId} loading={busy} onClick={assign}>{code?.profileId ? "Reasignar" : "Asignar"}</Button></>}
    >
      {code?.profileId && <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">Este código ya apunta a otro perfil. Al reasignarlo, la tarjeta física abrirá el nuevo biosite.</p>}
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-line px-3">
        <Search className="size-4 text-ink-3" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente" className="h-10 flex-1 bg-transparent text-sm outline-none" />
      </div>
      {loading ? (
        <div className="grid h-32 place-items-center"><Spinner /></div>
      ) : (
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {list.map((c) => (
            <li key={c.profile.id}>
              <button onClick={() => setSel(c.profile.id)} className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left", sel === c.profile.id ? "border-brand bg-brand-soft" : "border-transparent hover:bg-paper")}>
                <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-paper-2 text-sm font-semibold">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.profile.avatarUrl ? <img src={c.profile.avatarUrl} alt="" className="size-full object-cover" /> : c.profile.name.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{c.profile.name} {c.profile.id === code?.profileId && <span className="text-xs text-ink-3">(actual)</span>}</span>
                  <span className="block truncate text-xs text-ink-3">/{c.profile.slug} · {c.user.email}</span>
                </span>
              </button>
            </li>
          ))}
          {list.length === 0 && <p className="py-6 text-center text-sm text-ink-3">Sin resultados</p>}
        </ul>
      )}
    </Modal>
  );
}
