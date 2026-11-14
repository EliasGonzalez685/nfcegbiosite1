"use client";

import { RequireRole, useSession } from "@/components/session";
import { AppShell } from "@/components/panel/top-bar";
import { navFor } from "@/components/nav";

function Shell({ children }: { children: React.ReactNode }) {
  const { me } = useSession();
  return <AppShell nav={navFor(me?.role)}>{children}</AppShell>;
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["client"]}>
      <Shell>{children}</Shell>
    </RequireRole>
  );
}
