import type { DataRepository, ResolveResult } from "../repository";
import type { Profile, ShortCode, StatsSummary } from "@/lib/types";
import { uid } from "@/lib/utils";
import { delay, getDB, persist } from "./store";

export const RESERVED_SLUGS = new Set([
  "t", "panel", "admin", "ingresar", "registro", "recuperar", "api", "login", "salir", "menu", "ayuda", "precios",
]);

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I para evitar confusiones al imprimir

function newCode(existing: Set<string>) {
  let c = "";
  do {
    c = Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");
  } while (existing.has(c));
  existing.add(c);
  return c;
}

function fail(message: string): never {
  throw new Error(message);
}

function findCode(code: string): ShortCode {
  const c = getDB().codes.find((x) => x.code === code.toUpperCase());
  if (!c) fail("Código inexistente");
  return c;
}

function emptyProfile(ownerId: string, name: string, slug: string): Profile {
  const ts = new Date().toISOString();
  return {
    id: uid("p_"),
    ownerId,
    slug,
    name,
    tagline: "",
    bio: "",
    avatarUrl: null,
    coverUrl: null,
    theme: { accent: "#1F4D3A", mode: "light", buttonStyle: "rounded" },
    contact: { fullName: name, company: name, jobTitle: "", phone: "", whatsapp: "", email: "", website: "", address: "" },
    links: [],
    wifi: [],
    sections: { contact: true, wifi: false, menu: false },
    orderWhatsapp: "",
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
  return canvas.toDataURL("image/jpeg", 0.82);
}

export const mockRepository: DataRepository = {
  profiles: {
    async getBySlug(slug) {
      return delay(getDB().profiles.find((p) => p.slug === slug) ?? null);
    },
    async getById(id) {
      return delay(getDB().profiles.find((p) => p.id === id) ?? null);
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
      if (patch.slug && patch.slug !== p.slug) {
        if (RESERVED_SLUGS.has(patch.slug) || db.profiles.some((x) => x.slug === patch.slug)) fail("Esa dirección ya está en uso");
      }
      Object.assign(p, structuredClone(patch), { updatedAt: new Date().toISOString() });
      persist();
      return delay(p);
    },
  },

  menu: {
    async list(profileId) {
      const db = getDB();
      return delay({
        categories: db.categories.filter((c) => c.profileId === profileId).sort((a, b) => a.order - b.order),
        items: db.items.filter((i) => i.profileId === profileId).sort((a, b) => a.order - b.order),
      });
    },
    async saveCategory(cat) {
      const db = getDB();
      if (cat.id) {
        const c = db.categories.find((x) => x.id === cat.id) ?? fail("Categoría no encontrada");
        Object.assign(c, cat);
        persist();
        return delay(c);
      }
      const c = { ...cat, id: uid("c_") };
      db.categories.push(c);
      persist();
      return delay(c);
    },
    async deleteCategory(id) {
      const db = getDB();
      db.categories = db.categories.filter((c) => c.id !== id);
      db.items = db.items.filter((i) => i.categoryId !== id);
      persist();
      return delay(undefined);
    },
    async reorderCategories(profileId, orderedIds) {
      const db = getDB();
      orderedIds.forEach((id, idx) => {
        const c = db.categories.find((x) => x.id === id && x.profileId === profileId);
        if (c) c.order = idx;
      });
      persist();
      return delay(undefined);
    },
    async saveItem(item) {
      const db = getDB();
      if (item.id) {
        const it = db.items.find((x) => x.id === item.id) ?? fail("Producto no encontrado");
        Object.assign(it, structuredClone(item));
        persist();
        return delay(it);
      }
      const it = { ...structuredClone(item), id: uid("i_") };
      db.items.push(it);
      persist();
      return delay(it);
    },
    async deleteItem(id) {
      const db = getDB();
      db.items = db.items.filter((i) => i.id !== id);
      persist();
      return delay(undefined);
    },
  },

  codes: {
    async resolve(code): Promise<ResolveResult> {
      const db = getDB();
      const c = db.codes.find((x) => x.code === code.toUpperCase());
      if (!c) return delay({ kind: "not_found" });
      if (c.status === "disabled") return delay({ kind: "disabled", code: c });
      if (c.status === "unassigned" || !c.profileId) return delay({ kind: "unassigned", code: c });
      const profile = db.profiles.find((p) => p.id === c.profileId);
      if (!profile) return delay({ kind: "unassigned", code: c });
      return delay({ kind: "assigned", code: c, profile });
    },
    async listByProfile(profileId) {
      return delay(getDB().codes.filter((c) => c.profileId === profileId));
    },
    async listAll(filter) {
      let list = getDB().codes;
      if (filter?.status) list = list.filter((c) => c.status === filter.status);
      if (filter?.batchId) list = list.filter((c) => c.batchId === filter.batchId);
      if (filter?.q) {
        const q = filter.q.toUpperCase();
        list = list.filter((c) => c.code.includes(q) || c.label.toUpperCase().includes(q));
      }
      return delay([...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    },
    async activate(code, profileId) {
      const c = findCode(code);
      if (c.status === "disabled") fail("Este código está desactivado. Contactá con soporte.");
      if (c.profileId && c.profileId !== profileId) fail("Este código ya fue activado por otro negocio.");
      c.profileId = profileId;
      c.status = "active";
      c.activatedAt = c.activatedAt ?? new Date().toISOString();
      persist();
      return delay(c);
    },
    async assign(code, profileId) {
      const c = findCode(code);
      c.profileId = profileId;
      c.status = profileId ? "active" : "unassigned";
      c.activatedAt = profileId ? new Date().toISOString() : null;
      persist();
      return delay(c);
    },
    async setStatus(code, status) {
      const c = findCode(code);
      c.status = status;
      if (status === "unassigned") c.profileId = null;
      if (status === "active" && !c.profileId) c.status = "unassigned";
      persist();
      return delay(c);
    },
    async setLabel(code, label) {
      const c = findCode(code);
      c.label = label;
      persist();
      return delay(c);
    },
    async listBatches() {
      const db = getDB();
      return delay(
        [...db.batches]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((b) => ({ ...b, activated: db.codes.filter((c) => c.batchId === b.id && c.profileId).length })),
      );
    },
    async createBatch({ name, kind, quantity, note }) {
      const db = getDB();
      const existing = new Set(db.codes.map((c) => c.code));
      const ts = new Date().toISOString();
      const batch = { id: uid("b_"), name, kind, quantity, note, createdAt: ts };
      const codes: ShortCode[] = Array.from({ length: quantity }, () => ({
        code: newCode(existing),
        profileId: null,
        batchId: batch.id,
        status: "unassigned",
        kind,
        label: "",
        createdAt: ts,
        activatedAt: null,
      }));
      db.batches.push(batch);
      db.codes.push(...codes);
      persist();
      return delay({ batch, codes }, 300);
    },
  },

  users: {
    async getById(id) {
      const u = getDB().users.find((x) => x.id === id);
      if (!u) return delay(null);
      const { password: _pw, ...user } = u;
      void _pw;
      return delay(user);
    },
    async listClients(q) {
      const db = getDB();
      const since = Date.now() - 30 * 86400000;
      let rows = db.users
        .filter((u) => u.role === "client")
        .map((u) => {
          const { password: _pw, ...user } = u;
          void _pw;
          const profile = db.profiles.find((p) => p.ownerId === u.id) ?? null;
          return {
            user,
            profile,
            codes: profile ? db.codes.filter((c) => c.profileId === profile.id).length : 0,
            scans30d: profile
              ? db.events.filter((e) => e.type === "scan" && e.profileId === profile.id && new Date(e.at).getTime() > since).length
              : 0,
          };
        });
      if (q) {
        const s = q.toLowerCase();
        rows = rows.filter(
          (r) => r.user.name.toLowerCase().includes(s) || r.user.email.toLowerCase().includes(s) || r.profile?.name.toLowerCase().includes(s),
        );
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

  analytics: {
    async track(event) {
      getDB().events.push({ ...event, id: uid("e_"), at: new Date().toISOString() });
      persist();
    },
    async summary(profileId, days): Promise<StatsSummary> {
      const db = getDB();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (days - 1));
      const events = db.events.filter((e) => (!profileId || e.profileId === profileId) && new Date(e.at) >= start);
      const daily = Array.from({ length: days }, (_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return { date: d.toISOString().slice(0, 10), scans: 0, views: 0, clicks: 0 };
      });
      const idx = new Map(daily.map((d, i) => [d.date, i]));
      const linkClicks = new Map<string, number>();
      const codeScans = new Map<string, number>();
      for (const e of events) {
        const local = new Date(e.at);
        const key = new Date(local.getFullYear(), local.getMonth(), local.getDate()).toISOString().slice(0, 10);
        const day = daily[idx.get(key) ?? -1];
        if (e.type === "scan") {
          if (day) day.scans++;
          if (e.code) codeScans.set(e.code, (codeScans.get(e.code) ?? 0) + 1);
        } else if (e.type === "view") {
          if (day) day.views++;
        } else {
          if (day) day.clicks++;
          if (e.linkId) linkClicks.set(`${e.profileId}:${e.linkId}`, (linkClicks.get(`${e.profileId}:${e.linkId}`) ?? 0) + 1);
        }
      }
      const topLinks = [...linkClicks.entries()]
        .map(([k, clicks]) => {
          const [pid, linkId] = k.split(":");
          const p = db.profiles.find((x) => x.id === pid);
          const link = p?.links.find((l) => l.id === linkId);
          return { linkId, label: (profileId ? "" : `${p?.name ?? "?"} · `) + (link?.label ?? linkId), clicks };
        })
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 6);
      return delay({
        scans: events.filter((e) => e.type === "scan").length,
        views: events.filter((e) => e.type === "view").length,
        clicks: events.filter((e) => e.type === "click").length,
        daily,
        topLinks,
        byCode: [...codeScans.entries()].map(([code, scans]) => ({ code, scans })).sort((a, b) => b.scans - a.scans),
      });
    },
    async recent(profileId, limit) {
      const list = getDB().events.filter((e) => !profileId || e.profileId === profileId);
      return delay([...list].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit));
    },
  },

  storage: {
    async uploadImage(file, opts) {
      if (!file.type.startsWith("image/")) fail("El archivo debe ser una imagen");
      if (file.size > 8 * 1024 * 1024) fail("La imagen supera los 8 MB");
      return resizeImage(file, opts?.maxSize ?? 800);
    },
  },
};
