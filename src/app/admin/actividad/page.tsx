"use client";

import { useState } from "react";
import { listActivity, listProfiles } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { useSession } from "@/components/session";
import { Page, PageHead } from "@/components/panel/top-bar";
import { ActivityFeed } from "@/components/activity-feed";
import { Button, PageLoader, Select } from "@/components/ui";

export default function ActivityPage() {
  const { me } = useSession();
  const isAdmin = me?.role === "admin";
  const [actor, setActor] = useState("");
  const [limit, setLimit] = useState(60);
  const people = useAsync(() => (isAdmin ? listProfiles() : Promise.resolve([])), [isAdmin]);
  const feed = useAsync(() => listActivity({ limit, actorId: actor || undefined }), [actor, limit]);
  const staff = (people.data ?? []).filter((p) => p.role !== "client" || true);

  return (
    <Page>
      <PageHead
        title="Actividad"
        description={isAdmin ? "Todo lo que hace cada persona en la plataforma: quién, qué y cuándo." : "Lo que hiciste en la plataforma."}
        actions={
          isAdmin ? (
            <Select value={actor} onChange={(e) => setActor(e.target.value)} className="w-64">
              <option value="">Todas las personas</option>
              {staff.map((p) => <option key={p.id} value={p.id}>{p.fullName || p.email} ({p.role === "seller" ? "vendedor" : p.role === "admin" ? "admin" : "cliente"})</option>)}
            </Select>
          ) : undefined
        }
      />
      <div className="card p-2">{feed.loading && !feed.data ? <PageLoader /> : <ActivityFeed entries={feed.data ?? []} />}</div>
      {(feed.data?.length ?? 0) >= limit && (
        <div className="mt-4 text-center"><Button variant="secondary" loading={feed.loading} onClick={() => setLimit(limit + 60)}>Ver más</Button></div>
      )}
    </Page>
  );
}
