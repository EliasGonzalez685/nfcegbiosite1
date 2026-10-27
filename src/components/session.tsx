"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { auth, type Session } from "@/lib/auth";
import { db } from "@/lib/data";
import type { Profile, Role } from "@/lib/types";
import { PageLoader } from "@/components/ui";

interface SessionCtx {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  setProfile: (p: Profile) => void;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (s: Session | null) => {
    setSession(s);
    setProfile(s?.user.role === "client" ? await db.profiles.getByOwner(s.user.id) : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    auth.getSession().then(load);
    return auth.onChange(load);
  }, [load]);

  const refreshProfile = useCallback(async () => {
    if (session?.user.role === "client") setProfile(await db.profiles.getByOwner(session.user.id));
  }, [session]);

  return <Ctx.Provider value={{ session, profile, loading, refreshProfile, setProfile }}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession fuera de SessionProvider");
  return ctx;
}

/** Protege una sección del sitio según el rol. Redirige a /ingresar si no hay sesión. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { session, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const ok = session?.user.role === role;

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace(`/ingresar?next=${encodeURIComponent(pathname)}`);
    else if (!ok) router.replace(session.user.role === "admin" ? "/admin" : "/panel");
  }, [loading, session, ok, router, pathname]);

  if (loading || !ok) return <PageLoader />;
  return <>{children}</>;
}
