"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { getSiteBySlug } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { hasMenu } from "@/lib/menu";
import { MenuScreen } from "@/components/biosite/menu-view";
import { NotFoundCard } from "@/components/biosite/not-found";
import { PageLoader } from "@/components/ui";

export default function MenuPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: site, loading } = useAsync(() => getSiteBySlug(slug), [slug]);

  useEffect(() => {
    if (site) document.title = `Menú · ${site.name}`;
  }, [site]);

  if (loading) return <div className="min-h-dvh bg-[#0c0c0d]"><PageLoader /></div>;
  if (!site || !site.published || !hasMenu(site)) return <NotFoundCard title="Menú no disponible" text="Este negocio todavía no publicó su menú." />;

  return (
    <main className="flex min-h-dvh flex-col bg-[#0c0c0d]">
      <MenuScreen profile={site} />
    </main>
  );
}
