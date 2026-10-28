"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/data";
import { useAsync } from "@/lib/hooks";
import { hasMenu } from "@/lib/menu";
import { MenuView } from "@/components/biosite/menu-view";
import { NotFoundCard } from "@/components/biosite/not-found";
import { PageLoader } from "@/components/ui";

export default function MenuPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: profile, loading } = useAsync(() => db.profiles.getBySlug(slug), [slug]);

  useEffect(() => {
    if (profile) document.title = `Menú · ${profile.name}`;
  }, [profile]);

  if (loading) return <div className="min-h-dvh bg-[#0c0c0d]"><PageLoader /></div>;
  if (!profile || !profile.published || !hasMenu(profile)) return <NotFoundCard title="Menú no disponible" text="Este negocio todavía no publicó su menú." />;

  return (
    <main className="flex min-h-dvh flex-col bg-[#0c0c0d]">
      <MenuView profile={profile} />
    </main>
  );
}
