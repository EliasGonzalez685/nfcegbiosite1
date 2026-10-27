import type { AuthService, Session } from "./types";
import { getDB, persist } from "@/lib/data/mock/store";
import { mockRepository, RESERVED_SLUGS } from "@/lib/data/mock";
import { uid } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

const KEY = `${BRAND.storagePrefix}-mock-session`;
const listeners = new Set<(s: Session | null) => void>();

function readUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function sessionFor(userId: string | null): Session | null {
  if (!userId) return null;
  const u = getDB().users.find((x) => x.id === userId);
  if (!u || u.status !== "active") return null;
  const { password: _pw, ...user } = u;
  void _pw;
  return { user };
}

function emit() {
  const s = sessionFor(readUserId());
  listeners.forEach((l) => l(s));
}

const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms));

export const mockAuth: AuthService = {
  async getSession() {
    return sessionFor(readUserId());
  },
  async signIn(email, password) {
    await wait();
    const u = getDB().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u || u.password !== password) throw new Error("Email o contraseña incorrectos");
    if (u.status !== "active") throw new Error("Tu cuenta está suspendida. Contactá con soporte.");
    window.localStorage.setItem(KEY, u.id);
    emit();
    return sessionFor(u.id)!;
  },
  async signUp({ name, email, password, businessName, slug }) {
    await wait();
    const db = getDB();
    if (db.users.some((x) => x.email.toLowerCase() === email.trim().toLowerCase())) {
      throw new Error("Ya existe una cuenta con ese email");
    }
    if (RESERVED_SLUGS.has(slug) || db.profiles.some((p) => p.slug === slug)) {
      throw new Error("Esa dirección ya está en uso, probá con otra");
    }
    const id = uid("u_");
    db.users.push({ id, email: email.trim().toLowerCase(), password, name, role: "client", status: "active", createdAt: new Date().toISOString() });
    persist();
    await mockRepository.profiles.create(id, { name: businessName, slug });
    window.localStorage.setItem(KEY, id);
    emit();
    return sessionFor(id)!;
  },
  async signOut() {
    window.localStorage.removeItem(KEY);
    emit();
  },
  async requestPasswordReset(email) {
    await wait(600);
    // En el mock no se envía nada. Supabase: supabase.auth.resetPasswordForEmail(email)
    void email;
  },
  onChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};
