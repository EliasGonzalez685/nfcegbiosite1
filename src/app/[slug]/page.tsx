"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/data";
import { useAsync } from "@/lib/hooks";
import { BiositeView } from "@/components/biosite/biosite-view";
import { NotFoundCard } from "@/components/biosite/not-found";
import { PageLoader } from "@/components/ui";

export default function BiositePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, loading } = useAsync(async () => {
    const profile = await db.profiles.getBySlug(slug);
    if (!profile) return null;
    const menu = profile.sections.menu ? await db.menu.list(profile.id) : { items: [] };
    return { profile, hasMenu: menu.items.length > 0 };
  }, [slug]);
  const tracked = useRef(false);

  useEffect(() => {
    if (!data?.profile || tracked.current) return;
    tracked.current = true;
    document.title = data.profile.name;
    // Las vistas que vienen de /t/CODIGO ya registraron el escaneo; igual contamos la vista.
    db.analytics.track({ type: "view", profileId: data.profile.id });
  }, [data]);

  if (loading) return <PageLoader />;
  if (!data || !data.profile.published) return <NotFoundCard />;

  return (
    <main className="min-h-dvh">
      <BiositeView
        profile={data.profile}
        hasMenu={data.hasMenu}
        onLinkClick={(linkId) => db.analytics.track({ type: "click", profileId: data.profile.id, linkId })}
      />
    </main>
  );
}
