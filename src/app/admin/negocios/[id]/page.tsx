"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import type { UserProfile } from "@/lib/types";
import { deleteBusiness, getSite, listProfiles, updateBusinessAssignment } from "@/lib/api";
import { friendlyError } from "@/lib/supabase";
import { useSession } from "@/components/session";
import { useToast } from "@/components/ui/toast";
import { Button, Select } from "@/components/ui";
import { BusinessEditor } from "@/components/editor/business-editor";

function Assignment({ businessId }: { businessId: string }) {
  const { me } = useSession();
  const toast = useToast();
  const router = useRouter();
  const isAdmin = me?.role === "admin";
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [sellers, setSellers] = useState<UserProfile[]>([]);
  const [owner, setOwner] = useState<string>("");
  const [seller, setSeller] = useState<string>("");

  useEffect(() => {
    getSite(businessId).then((s) => {
      setOwner(s?.ownerId ?? "");
      setSeller(s?.sellerId ?? "");
    });
    listProfiles("client").then(setClients).catch(() => {});
    if (isAdmin) listProfiles("seller").then(setSellers).catch(() => {});
  }, [businessId, isAdmin]);

  async function save(patch: { ownerId?: string | null; sellerId?: string | null }) {
    try {
      await updateBusinessAssignment(businessId, patch);
      toast.success("Asignación guardada");
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  async function remove() {
    if (!confirm("¿Eliminar este negocio con su página, menú, botones y tarjetas de fidelidad? Sus plaquitas quedan sin destino. No se puede deshacer.")) return;
    try {
      await deleteBusiness(businessId);
      toast.success("Negocio eliminado");
      router.replace("/admin/negocios");
    } catch (e) {
      toast.error(friendlyError(e));
    }
  }

  return (
    <div className="card mb-5 flex flex-wrap items-end gap-4 p-4">
      <label className="min-w-[200px] flex-1">
        <span className="label">Dueño (cliente)</span>
        <Select value={owner} onChange={(e) => { setOwner(e.target.value); save({ ownerId: e.target.value || null }); }}>
          <option value="">Sin dueño</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.fullName || c.email} — {c.email}</option>)}
        </Select>
      </label>
      {isAdmin && (
        <label className="min-w-[200px] flex-1">
          <span className="label">Vendedor a cargo</span>
          <Select value={seller} onChange={(e) => { setSeller(e.target.value); save({ sellerId: e.target.value || null }); }}>
            <option value="">Sin vendedor</option>
            {sellers.map((s) => <option key={s.id} value={s.id}>{s.fullName || s.email}</option>)}
          </Select>
        </label>
      )}
      {isAdmin && <Button variant="danger" size="sm" icon={<Trash2 className="size-4" />} onClick={remove}>Eliminar negocio</Button>}
    </div>
  );
}

export default function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const { me } = useSession();
  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6">
        <Link href="/admin/negocios" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-3 hover:text-ink"><ArrowLeft className="size-4" /> Negocios</Link>
      </div>
      <BusinessEditor
        key={id}
        businessId={id}
        aside={<Assignment businessId={id} />}
        canConfigurePlaques
        canDeletePlaques={me?.role === "admin"}
      />
    </>
  );
}
