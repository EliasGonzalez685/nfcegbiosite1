import type { DataRepository } from "../repository";
import type { Profile } from "@/lib/types";
import { uid } from "@/lib/utils";
import { delay, getDB, persist } from "./store";

export const RESERVED_SLUGS = new Set(["panel", "admin", "ingresar", "registro", "recuperar", "api", "login", "salir", "ayuda"]);

function fail(message: string): never {
  throw new Error(message);
}

function emptyProfile(ownerId: string, name: string, slug: string): Profile {
  const ts = new Date().toISOString();
  return {
    id: uid("p_"),
    ownerId,
    slug,
    name,
    tagline: "",
    avatarUrl: null,
    accent: "#D4AF37",
    links: [],
    published: true,
    createdAt: ts,
    updatedAt: ts,
  };
}

async function resizeImage(file: File, maxSize: number): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  if (file.type === "image/svg+xml") return dataUrl;
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  // PNG conserva la transparencia de los logos
  return canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.85);
}

export const mockRepository: DataRepository = {
  profiles: {
    async getBySlug(slug) {
      return delay(getDB().profiles.find((p) => p.slug === slug) ?? null);
    },
    async getByOwner(ownerId) {
      return delay(getDB().profiles.find((p) => p.ownerId === ownerId) ?? null);
    },
    async isSlugAvailable(slug, exceptProfileId) {
      if (!slug || RESERVED_SLUGS.has(slug)) return delay(false, 60);
      return delay(!getDB().profiles.some((p) => p.slug === slug && p.id !== exceptProfileId), 60);
    },
    async create(ownerId, { name, slug }) {
      const db = getDB();
      if (RESERVED_SLUGS.has(slug) || db.profiles.some((p) => p.slug === slug)) fail("Esa dirección ya está en uso");
      const p = emptyProfile(ownerId, name, slug);
      db.profiles.push(p);
      persist();
      return delay(p);
    },
    async update(id, patch) {
      const db = getDB();
      const p = db.profiles.find((x) => x.id === id) ?? fail("Perfil no encontrado");
      if (patch.slug && patch.slug !== p.slug && (RESERVED_SLUGS.has(patch.slug) || db.profiles.some((x) => x.slug === patch.slug))) {
        fail("Esa dirección ya está en uso");
      }
      Object.assign(p, structuredClone(patch), { updatedAt: new Date().toISOString() });
      persist();
      return delay(p);
    },
  },

  users: {
    async listClients(q) {
      const db = getDB();
      let rows = db.users
        .filter((u) => u.role === "client")
        .map(({ password: _pw, ...user }) => {
          void _pw;
          return { user, profile: db.profiles.find((p) => p.ownerId === user.id) ?? null };
        });
      if (q) {
        const s = q.toLowerCase();
        rows = rows.filter((r) => r.user.name.toLowerCase().includes(s) || r.user.email.toLowerCase().includes(s) || r.profile?.name.toLowerCase().includes(s));
      }
      return delay(rows.sort((a, b) => b.user.createdAt.localeCompare(a.user.createdAt)));
    },
    async setStatus(id, status) {
      const u = getDB().users.find((x) => x.id === id) ?? fail("Usuario no encontrado");
      u.status = status;
      persist();
      const { password: _pw, ...user } = u;
      void _pw;
      return delay(user);
    },
  },

  storage: {
    async uploadImage(file, opts) {
      if (!file.type.startsWith("image/")) fail("El archivo debe ser una imagen");
      if (file.size > 8 * 1024 * 1024) fail("La imagen supera los 8 MB");
      return resizeImage(file, opts?.maxSize ?? 600);
    },
  },
};
