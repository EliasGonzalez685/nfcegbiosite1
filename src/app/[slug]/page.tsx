"use client";

import { Suspense, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getSiteBySlug } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { BiositeView } from "@/components/biosite/biosite-view";
import { NotFoundCard } from "@/components/biosite/not-found";
import { PageLoader } from "@/components/ui";

function Page() {
  const { slug } = useParams<{ slug: string }>();
  const openWifi = useSearchParams().get("wifi") === "1";
  const { data: site, loading, error } = useAsync(() => getSiteBySlug(slug), [slug]);

  useEffect(() => {
    if (site) document.title = site.name;
  }, [site]);

  if (loading) return <div className="min-h-dvh bg-[#0c0c0d]"><PageLoader /></div>;
  if (error) return <NotFoundCard title="No pudimos cargar la página" text="Revisá tu conexión e intentá de nuevo." />;
  if (!site || !site.published) return <NotFoundCard />;

  return (
    <main className="flex min-h-dvh flex-col bg-[#0c0c0d]">
      <BiositeView profile={site} openWifi={openWifi} />
    </main>
  );
}

export default function BiositePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#0c0c0d]" />}>
      <Page />
    </Suspense>
  );
}
