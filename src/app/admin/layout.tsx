"use client";

import { RequireRole } from "@/components/session";
import { TopBar } from "@/components/panel/top-bar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole role="admin">
      <div className="min-h-dvh">
        <TopBar badge="Admin" />
        {children}
      </div>
    </RequireRole>
  );
}
