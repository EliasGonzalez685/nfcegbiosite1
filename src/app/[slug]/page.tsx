"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/data";
import { useAsync } from "@/lib/hooks";
import { BiositeView } from "@/components/biosite/biosite-view";
import { NotFoundCard } from "@/components/biosite/not-found";
import { PageLoader } from "@/components/ui";

export default function BiositePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: profile, loading } = useAsync(() => db.profiles.getBySlug(slug), [slug]);

  useEffect(() => {
    if (profile) document.title = profile.name;
  }, [profile]);

  if (loading) return <div className="min-h-dvh bg-[#0c0c0d]"><PageLoader /></div>;
  if (!profile || !profile.published) return <NotFoundCard />;

  return (
    <main className="flex min-h-dvh flex-col bg-[#0c0c0d]">
      <BiositeView profile={profile} />
    </main>
  );
}
