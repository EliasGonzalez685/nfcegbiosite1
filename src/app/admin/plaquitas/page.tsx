"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { listManagedBusinesses } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { useSession } from "@/components/session";
import { Page, PageHead } from "@/components/panel/top-bar";
import { PlaqueManager } from "@/components/plaques";
import { PageLoader } from "@/components/ui";

function Plaques() {
  const { me } = useSession();
  const startCreating = useSearchParams().get("nueva") === "1";
  const { data: businesses, loading } = useAsync(() => listManagedBusinesses(me!.id, me!.role), [me?.id]);

  return (
    <Page wide>
      <PageHead
        title="Plaquitas NFC y QR"
        description="Cada plaquita tiene un código fijo (grabado en el chip NFC y/o impreso como QR). Lo que abre lo cambiás cuando quieras, sin reimprimir ni volver a grabar."
      />
      {loading && !businesses ? <PageLoader /> : <PlaqueManager businesses={businesses ?? []} canEdit canDelete={me?.role === "admin"} startCreating={startCreating} />}
    </Page>
  );
}

export default function PlaquesPage() {
  return (
    <Suspense>
      <Plaques />
    </Suspense>
  );
}
