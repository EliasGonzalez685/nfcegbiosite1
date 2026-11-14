"use client";

import { useState } from "react";
import { Store } from "lucide-react";
import { listManagedBusinesses } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/session";
import { EmptyState, PageLoader } from "@/components/ui";
import { BusinessEditor } from "@/components/editor/business-editor";

export default function ClientPanel() {
  const { me } = useSession();
  const { data, loading } = useAsync(() => listManagedBusinesses(me!.id, "client"), [me?.id]);
  const [selected, setSelected] = useState<string | null>(null);

  if (loading || !data) return <PageLoader />;
  if (!data.length)
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState icon={<Store className="size-6" />} title="Todavía no tenés una página" description="Tu vendedor de NFCEGBIOSITE la va a crear y la vas a ver acá para editarla cuando quieras." />
      </div>
    );

  const current = selected ?? data[0].id;
  return (
    <>
      {data.length > 1 && (
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {data.map((b) => (
              <button key={b.id} onClick={() => setSelected(b.id)} className={cn("flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium", current === b.id ? "border-ink bg-ink text-white" : "border-line bg-white")}>
                <span className="size-2.5 rounded-full" style={{ background: b.accent }} /> {b.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <BusinessEditor key={current} businessId={current} canConfigurePlaques={false} />
    </>
  );
}
