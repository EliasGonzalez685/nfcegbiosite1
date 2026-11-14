"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getMyProfile } from "@/lib/api";
import type { Role, UserProfile } from "@/lib/types";
import { PageLoader } from "@/components/ui";

interface SessionCtx {
  session: Session | null;
  me: UserProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (s: Session | null) => {
    setSession(s);
    if (s?.user) {
      try {
        setMe(await getMyProfile(s.user.id));
      } catch {
        setMe(null);
      }
    } else {
      setMe(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      // no recargar el perfil en cada renovación de token
      if (event === "TOKEN_REFRESHED") return setSession(s);
      setTimeout(() => load(s), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await load(data.session);
  }, [load]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return <Ctx.Provider value={{ session, me, loading, refresh, signOut }}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession fuera de SessionProvider");
  return ctx;
}

export const homeFor = (role: Role | undefined) => (role === "client" ? "/panel" : "/admin");

/** Protege una sección según el rol. Sin sesión → /ingresar */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { session, me, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const ok = !!me && me.status === "active" && roles.includes(me.role);

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace(`/ingresar?next=${encodeURIComponent(pathname)}`);
    else if (me && me.status === "active" && !roles.includes(me.role)) router.replace(homeFor(me.role));
  }, [loading, session, me, roles, router, pathname]);

  if (loading || (session && !me)) return <PageLoader />;
  if (session && me && me.status !== "active") {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="font-display text-2xl font-bold">Tu cuenta está suspendida</p>
          <p className="mt-2 text-ink-3">Comunicate con un administrador de NFCEGBIOSITE.</p>
          <button onClick={() => supabase.auth.signOut()} className="mt-6 text-sm font-medium text-brand underline">Cerrar sesión</button>
        </div>
      </div>
    );
  }
  if (!ok) return <PageLoader />;
  return <>{children}</>;
}
