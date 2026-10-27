"use client";

import { ExternalLink } from "lucide-react";
import { db } from "@/lib/data";
import { useAsync } from "@/lib/hooks";
import { profileUrl } from "@/lib/utils";
import { useSession } from "@/components/session";
import { LivePreview, PanelPage } from "@/components/panel/editor";
import { PageHeader } from "@/components/panel/shell";
import { Button, PageLoader } from "@/components/ui";
import { QrImage } from "@/components/panel/qr-tools";

export default function PreviewPage() {
  const { profile } = useSession();
  const { data: menu, loading } = useAsync(() => db.menu.list(profile!.id), [profile?.id]);
  if (!profile || loading || !menu) return <PageLoader />;
  const showMenu = profile.sections.menu && menu.items.length > 0;

  return (
    <PanelPage wide>
      <PageHeader
        title="Vista previa"
        description="Así lo ven tus clientes desde el celular."
        actions={<a href={`/${profile.slug}`} target="_blank"><Button variant="secondary" icon={<ExternalLink className="size-4" />}>Abrir en otra pestaña</Button></a>}
      />
      <div className="flex flex-wrap items-start justify-center gap-10">
        <div>
          <p className="mb-3 text-center text-sm font-medium text-ink-3">Biosite</p>
          <LivePreview profile={profile} menu={menu} />
        </div>
        {showMenu && (
          <div>
            <p className="mb-3 text-center text-sm font-medium text-ink-3">Menú</p>
            <LivePreview profile={profile} menu={menu} view="menu" />
          </div>
        )}
        <div className="card w-full max-w-[260px] p-5 text-center">
          <p className="font-display font-semibold">Probalo en tu celular</p>
          <p className="mt-1 text-sm text-ink-3">Escaneá este QR con la cámara.</p>
          <QrImage text={profileUrl(profile.slug)} className="mx-auto mt-4 w-44" />
          <p className="mt-3 text-xs text-ink-3">Tu celular debe estar en la misma red que esta PC si estás probando en local.</p>
        </div>
      </div>
    </PanelPage>
  );
}
