"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/data";
import { useAsync } from "@/lib/hooks";
import { MenuView } from "@/components/biosite/menu-view";
import { NotFoundCard } from "@/components/biosite/not-found";
import { PageLoader } from "@/components/ui";

export default function MenuPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading } = useAsync(async () => {
    const profile = await db.profiles.getBySlug(slug);
    if (!profile || !profile.sections.menu) return null;
    return { profile, ...(await db.menu.list(profile.id)) };
  }, [slug]);

  useEffect(() => {
    if (data) document.title = `Menú · ${data.profile.name}`;
  }, [data]);

  if (loading) return <PageLoader />;
  if (!data || !data.profile.published) return <NotFoundCard />;

  const usedCats = data.categories.filter((c) => data.items.some((i) => i.categoryId === c.id));
  return (
    <main className="min-h-dvh">
      <MenuView profile={data.profile} categories={usedCats} items={data.items} />
    </main>
  );
}
