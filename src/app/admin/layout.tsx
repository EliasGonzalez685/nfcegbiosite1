"use client";

import { RequireRole, useSession } from "@/components/session";
import { AppShell } from "@/components/panel/top-bar";
import { navFor } from "@/components/nav";

function Shell({ children }: { children: React.ReactNode }) {
  const { me } = useSession();
  return <AppShell nav={navFor(me?.role)}>{children}</AppShell>;
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole roles={["admin", "seller"]}>
      <Shell>{children}</Shell>
    </RequireRole>
  );
}
