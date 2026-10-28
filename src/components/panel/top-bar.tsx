"use client";

import { useRouter } from "next/navigation";
import { ExternalLink, LogOut } from "lucide-react";
import { auth } from "@/lib/auth";
import { LogoMark } from "@/components/ui";
import { useSession } from "@/components/session";

/** Barra superior simple para el panel del cliente y el admin */
export function TopBar({ badge }: { badge?: string }) {
  const router = useRouter();
  const { session, profile } = useSession();

  async function logout() {
    await auth.signOut();
    router.replace("/ingresar");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <LogoMark className="text-base" />
        {badge && <span className="rounded-md bg-clay px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{badge}</span>}
        <div className="ml-auto flex items-center gap-1">
          {profile && (
            <a href={`/${profile.slug}`} target="_blank" className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-ink-2 hover:bg-paper-2">
              <ExternalLink className="size-4" /> <span className="max-sm:hidden">Ver mi página</span>
            </a>
          )}
          <span className="mx-2 hidden text-sm text-ink-3 md:block">{session?.user.email}</span>
          <button onClick={logout} className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-ink-2 hover:bg-paper-2" title="Cerrar sesión">
            <LogOut className="size-4" /> <span className="max-sm:hidden">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto h-[640px] w-[316px] rounded-[46px] border-[9px] border-[#1b1b1c] bg-[#1b1b1c] shadow-[0_30px_60px_-20px_rgba(27,31,26,.5)]">
      <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#1b1b1c]" />
      <div className="no-scrollbar relative flex size-full flex-col overflow-y-auto overflow-x-hidden rounded-[37px] bg-[#0c0c0d]">{children}</div>
    </div>
  );
}
