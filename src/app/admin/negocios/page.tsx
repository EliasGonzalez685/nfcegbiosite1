"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, EyeOff, Plus, Search, Store } from "lucide-react";
import { listManagedBusinesses } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { useSession } from "@/components/session";
import { Page, PageHead } from "@/components/panel/top-bar";
import { Button, EmptyState, PageLoader } from "@/components/ui";
import { NewBusinessModal } from "@/components/new-business";

function Businesses() {
  const { me } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const { data, loading } = useAsync(() => listManagedBusinesses(me!.id, me!.role), [me?.id]);
  const [q, setQ] = useState("");
  const creating = params.get("nuevo") === "1";

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? []).filter((b) => !s || [b.name, b.slug, b.city, b.category, b.owner?.fullName, b.owner?.email, b.seller?.fullName].some((v) => v?.toLowerCase().includes(s)));
  }, [data, q]);

  return (
    <Page>
      <PageHead
        title="Negocios"
        description={me?.role === "admin" ? "Todos los negocios de la plataforma." : "Los negocios que atendés."}
        actions={<Button icon={<Plus className="size-4" />} onClick={() => router.push("/admin/negocios?nuevo=1")}>Nuevo negocio</Button>}
      />
      {(data?.length ?? 0) > 4 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-white px-3">
          <Search className="size-4 text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, ciudad, dueño o vendedor" className="h-11 flex-1 bg-transparent outline-none" />
        </div>
      )}
      {loading && !data ? (
        <PageLoader />
      ) : !list.length ? (
        <EmptyState
          icon={<Store className="size-6" />}
          title={q ? "Sin resultados" : "Todavía no hay negocios"}
          description={q ? "Probá con otra búsqueda." : "Creá el primero: se arma su página, su cuenta de cliente y después sus plaquitas."}
          action={!q ? <Button onClick={() => router.push("/admin/negocios?nuevo=1")}>Crear negocio</Button> : undefined}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <li key={b.id}>
              <Link href={`/admin/negocios/${b.id}`} className="card group flex h-full flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full p-[2px]" style={{ background: b.accent }}>
                    <span className="grid size-full place-items-center overflow-hidden rounded-full bg-[#141415] font-semibold text-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {b.avatarUrl ? <img src={b.avatarUrl} alt="" className="size-full object-cover" /> : b.name.slice(0, 1)}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{b.name}</p>
                    <p className="truncate text-sm text-ink-3">/{b.slug}</p>
                  </div>
                  {!b.published && <EyeOff className="size-4 text-amber-600" aria-label="Oculta" />}
                  <ChevronRight className="size-4 text-ink-3 transition group-hover:translate-x-0.5" />
                </div>
                <div className="mt-3 space-y-0.5 text-sm">
                  <p className="truncate"><span className="text-ink-3">Dueño:</span> {b.owner ? b.owner.fullName || b.owner.email : <span className="text-clay">sin asignar</span>}</p>
                  {me?.role === "admin" && <p className="truncate"><span className="text-ink-3">Vendedor:</span> {b.seller ? b.seller.fullName || b.seller.email : "—"}</p>}
                  {(b.category || b.city) && <p className="truncate text-ink-3">{[b.category, b.city].filter(Boolean).join(" · ")}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {creating && <NewBusinessModal open onClose={() => router.replace("/admin/negocios")} initialName={params.get("nombre") ?? ""} />}
    </Page>
  );
}

export default function BusinessesPage() {
  return (
    <Suspense>
      <Businesses />
    </Suspense>
  );
}
