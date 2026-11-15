/**
 * Acceso a datos (Supabase). Las páginas solo llaman a estas funciones.
 * Los permisos los hace cumplir la base (RLS): si alguien no puede ver o
 * editar algo, la consulta simplemente no lo devuelve o falla.
 */
import { supabase, callUsersFn } from "./supabase";
import type {
  ActivityEntry, BusinessRow, Lead, LeadStatus, LoyaltyCard, LoyaltyInfo, LoyaltyProgram, LoyaltyState,
  Menu, Plaque, PlaqueTarget, DeviceKind, ProfileLink, Role, Site, UserProfile,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function check<T>(res: { data: T; error: unknown }): NonNullable<T> {
  if (res.error) throw res.error;
  return res.data as NonNullable<T>;
}

// ───────────────────────────── Perfiles ─────────────────────────────

const toProfile = (r: Row): UserProfile => ({
  id: r.id,
  role: r.role,
  fullName: r.full_name ?? "",
  email: r.email ?? "",
  phone: r.phone,
  status: r.status,
  createdBy: r.created_by,
  createdAt: r.created_at,
});

export async function getMyProfile(userId: string) {
  const r = check(await supabase.from("profiles").select("*").eq("id", userId).maybeSingle());
  return r ? toProfile(r) : null;
}

export async function listProfiles(role?: Role) {
  let q = supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (role) q = q.eq("role", role);
  return check(await q).map(toProfile);
}

export function createUser(input: {
  email: string; password: string; fullName: string; phone?: string; role: Role;
  business?: { name: string; slug: string; category?: string; city?: string }; sellerId?: string | null;
}) {
  return callUsersFn<{ user: { id: string }; business: { id?: string; error?: string } | null }>({
    action: "create",
    email: input.email,
    password: input.password,
    full_name: input.fullName,
    phone: input.phone || null,
    role: input.role,
    business: input.business,
    seller_id: input.sellerId ?? null,
  });
}

export function updateUser(userId: string, patch: {
  email?: string; password?: string; fullName?: string; phone?: string | null; role?: Role;
  status?: "active" | "suspended"; currentPassword?: string;
}) {
  return callUsersFn({
    action: "update",
    user_id: userId,
    email: patch.email,
    password: patch.password || undefined,
    full_name: patch.fullName,
    phone: patch.phone,
    role: patch.role,
    status: patch.status,
    current_password: patch.currentPassword,
  });
}

// ───────────────────────────── Negocios ─────────────────────────────

const SITE_SELECT = "*, links(*), menus(*), menu_categories(*), menu_items(*), menu_images(*)";
const byPos = (a: Row, b: Row) => (a.position ?? 0) - (b.position ?? 0);

function toSite(r: Row): Site {
  const m: Row = Array.isArray(r.menus) ? r.menus[0] ?? {} : r.menus ?? {};
  const items: Row[] = [...(r.menu_items ?? [])].sort(byPos);
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    tagline: r.tagline ?? "",
    category: r.category ?? "",
    city: r.city ?? "",
    avatarUrl: r.avatar_url,
    accent: r.accent,
    published: r.published,
    ownerId: r.owner_id,
    sellerId: r.seller_id,
    links: [...(r.links ?? [])].sort(byPos).map((l) => ({
      id: l.id,
      type: l.type,
      label: l.label,
      value: l.value,
      message: l.message ?? undefined,
      password: l.wifi_password ?? undefined,
      enabled: l.enabled,
    })),
    menu: {
      enabled: !!m.enabled,
      mode: m.mode ?? "items",
      pdfUrl: m.pdf_url ?? null,
      orderWhatsapp: m.order_whatsapp ?? "",
      categories: [...(r.menu_categories ?? [])].sort(byPos).map((c) => ({
        id: c.id,
        name: c.name,
        items: items
          .filter((i) => i.category_id === c.id)
          .map((i) => ({ id: i.id, name: i.name, description: i.description, price: Number(i.price), photoUrl: i.photo_url, soldOut: i.sold_out })),
      })),
      images: [...(r.menu_images ?? [])].sort(byPos).map((i) => ({ id: i.id, url: i.url, caption: i.caption ?? "" })),
    },
  };
}

export async function getSiteBySlug(slug: string) {
  const r = check(await supabase.from("businesses").select(SITE_SELECT).eq("slug", slug).maybeSingle());
  return r ? toSite(r) : null;
}

export async function getSite(id: string) {
  const r = check(await supabase.from("businesses").select(SITE_SELECT).eq("id", id).maybeSingle());
  return r ? toSite(r) : null;
}

const toBusinessRow = (r: Row): BusinessRow => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  category: r.category,
  city: r.city,
  avatarUrl: r.avatar_url,
  accent: r.accent,
  published: r.published,
  ownerId: r.owner_id,
  sellerId: r.seller_id,
  createdAt: r.created_at,
  owner: r.owner ? { id: r.owner.id, fullName: r.owner.full_name, email: r.owner.email } : null,
  seller: r.seller ? { id: r.seller.id, fullName: r.seller.full_name, email: r.seller.email } : null,
});

/** Negocios que el usuario puede administrar (admin: todos; vendedor: los suyos; cliente: los propios) */
export async function listManagedBusinesses(userId: string, role: Role) {
  let q = supabase
    .from("businesses")
    .select("*, owner:profiles!businesses_owner_id_fkey(id, full_name, email), seller:profiles!businesses_seller_id_fkey(id, full_name, email)")
    .order("created_at", { ascending: false });
  if (role === "seller") q = q.eq("seller_id", userId);
  if (role === "client") q = q.eq("owner_id", userId);
  return check(await q).map(toBusinessRow);
}

export async function createBusiness(input: { name: string; slug: string; category?: string; city?: string; ownerId?: string | null; sellerId?: string | null }) {
  const r = check(
    await supabase
      .from("businesses")
      .insert({
        name: input.name,
        slug: input.slug,
        category: input.category || null,
        city: input.city || null,
        owner_id: input.ownerId || null,
        seller_id: input.sellerId || null,
      })
      .select("id")
      .single(),
  );
  return r.id as string;
}

export async function updateBusinessAssignment(id: string, patch: { ownerId?: string | null; sellerId?: string | null }) {
  const row: Row = {};
  if (patch.ownerId !== undefined) row.owner_id = patch.ownerId;
  if (patch.sellerId !== undefined) row.seller_id = patch.sellerId;
  check(await supabase.from("businesses").update(row).eq("id", id));
}

export async function deleteBusiness(id: string) {
  check(await supabase.from("businesses").delete().eq("id", id));
}

export async function isSlugAvailable(slug: string, exceptId?: string) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 2) return false;
  const reserved = ["menu", "panel", "admin", "ingresar", "registro", "recuperar", "api", "login", "salir", "ayuda", "q", "t", "f", "vendedor", "cuenta", "restablecer", "plaquita-inactiva"];
  if (reserved.includes(slug)) return false;
  // Solo ve negocios publicados o propios: un negocio ajeno oculto se detecta al guardar
  const r = check(await supabase.from("businesses").select("id").eq("slug", slug).maybeSingle());
  return !r || r.id === exceptId;
}

// Guarda solo lo que cambió (así el registro de actividad queda limpio)
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

async function syncRows(table: string, before: Row[], after: Row[]) {
  const prev = new Map(before.map((r) => [r.id, r]));
  const changed = after.filter((r) => !same(prev.get(r.id), r));
  const removed = before.filter((r) => !after.some((a) => a.id === r.id)).map((r) => r.id);
  if (changed.length) check(await supabase.from(table).upsert(changed));
  if (removed.length) check(await supabase.from(table).delete().in("id", removed));
}

const linkRows = (s: Site) =>
  s.links.map((l: ProfileLink, i) => ({
    id: l.id, business_id: s.id, type: l.type, label: l.label, value: l.value,
    message: l.message ?? null, wifi_password: l.password ?? null, enabled: l.enabled, position: i,
  }));
const categoryRows = (s: Site) => s.menu.categories.map((c, i) => ({ id: c.id, business_id: s.id, name: c.name, position: i }));
const itemRows = (s: Site) =>
  s.menu.categories.flatMap((c) =>
    c.items.map((it, i) => ({
      id: it.id, business_id: s.id, category_id: c.id, name: it.name, description: it.description,
      price: it.price, photo_url: it.photoUrl, sold_out: it.soldOut, position: i,
    })),
  );
const imageRows = (s: Site) => s.menu.images.map((m, i) => ({ id: m.id, business_id: s.id, url: m.url, caption: m.caption || null, position: i }));
const menuRow = (m: Menu) => ({ enabled: m.enabled, mode: m.mode, pdf_url: m.pdfUrl, order_whatsapp: m.orderWhatsapp || null });
const businessRow = (s: Site) => ({
  slug: s.slug, name: s.name, tagline: s.tagline, category: s.category || null, city: s.city || null,
  avatar_url: s.avatarUrl, accent: s.accent, published: s.published,
});

export async function saveSite(before: Site, after: Site) {
  if (!same(businessRow(before), businessRow(after))) {
    check(await supabase.from("businesses").update(businessRow(after)).eq("id", after.id));
  }
  await syncRows("links", linkRows(before), linkRows(after));
  if (!same(menuRow(before.menu), menuRow(after.menu))) {
    check(await supabase.from("menus").upsert({ business_id: after.id, ...menuRow(after.menu) }));
  }
  // primero categorías (los productos dependen de ellas), los borrados al final
  const catsBefore = categoryRows(before);
  const catsAfter = categoryRows(after);
  const prevCats = new Map(catsBefore.map((r) => [r.id, r]));
  const changedCats = catsAfter.filter((r) => !same(prevCats.get(r.id), r));
  if (changedCats.length) check(await supabase.from("menu_categories").upsert(changedCats));
  await syncRows("menu_items", itemRows(before), itemRows(after));
  const removedCats = catsBefore.filter((r) => !catsAfter.some((a) => a.id === r.id)).map((r) => r.id);
  if (removedCats.length) check(await supabase.from("menu_categories").delete().in("id", removedCats));
  await syncRows("menu_images", imageRows(before), imageRows(after));
  return getSite(after.id);
}

// ───────────────────────────── Archivos ─────────────────────────────

async function resizeImage(file: File, maxSize: number): Promise<Blob> {
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  return new Promise((res) => canvas.toBlob((b) => res(b!), type, 0.85));
}

export async function uploadImage(businessId: string, file: File, maxSize = 1000) {
  if (!file.type.startsWith("image/")) throw new Error("El archivo debe ser una imagen");
  if (file.size > 15 * 1024 * 1024) throw new Error("La imagen es demasiado pesada (máx. 15 MB)");
  const blob = await resizeImage(file, maxSize);
  if (blob.size > 5 * 1024 * 1024) throw new Error("La imagen supera los 5 MB");
  const ext = blob.type === "image/png" ? "png" : blob.type === "image/svg+xml" ? "svg" : blob.type === "image/gif" ? "gif" : "jpg";
  const path = `${businessId}/${crypto.randomUUID()}.${ext}`;
  check(await supabase.storage.from("media").upload(path, blob, { contentType: blob.type, cacheControl: "31536000" }));
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}

export async function uploadPdf(businessId: string, file: File) {
  if (file.type !== "application/pdf") throw new Error("El archivo debe ser un PDF");
  if (file.size > 15 * 1024 * 1024) throw new Error("El PDF supera los 15 MB");
  const path = `${businessId}/menu-${Date.now()}.pdf`;
  check(await supabase.storage.from("menus").upload(path, file, { contentType: "application/pdf", cacheControl: "3600" }));
  return supabase.storage.from("menus").getPublicUrl(path).data.publicUrl;
}

// ───────────────────────────── Plaquitas ─────────────────────────────

const toPlaque = (r: Row): Plaque => ({
  id: r.id,
  code: r.code,
  label: r.label ?? "",
  kind: r.kind,
  targetType: r.target_type,
  businessId: r.business_id,
  targetUrl: r.target_url,
  active: r.active,
  notes: r.notes ?? "",
  scans: r.scans,
  lastScanAt: r.last_scan_at,
  createdBy: r.created_by,
  createdAt: r.created_at,
  business: r.business ? { id: r.business.id, name: r.business.name, slug: r.business.slug } : null,
});

export async function listPlaques(businessId?: string) {
  let q = supabase.from("qr_codes").select("*, business:businesses(id, name, slug)").order("created_at", { ascending: false });
  if (businessId) q = q.eq("business_id", businessId);
  return check(await q).map(toPlaque);
}

export interface PlaqueInput {
  label: string;
  kind: DeviceKind;
  targetType: PlaqueTarget;
  businessId: string | null;
  targetUrl: string | null;
  active: boolean;
  notes: string;
}

const plaqueRow = (p: PlaqueInput) => ({
  label: p.label,
  kind: p.kind,
  target_type: p.targetType,
  business_id: p.businessId || null,
  target_url: p.targetType === "url" ? p.targetUrl : null,
  active: p.active,
  notes: p.notes || null,
});

export async function createPlaque(p: PlaqueInput) {
  return toPlaque(check(await supabase.from("qr_codes").insert(plaqueRow(p)).select("*, business:businesses(id, name, slug)").single()));
}

/** Lote de plaquitas en blanco (sin destino) para imprimir y grabar antes de vender */
export async function createBlankPlaques(n: number, kind: DeviceKind, labelPrefix: string, businessId: string | null) {
  const rows = Array.from({ length: n }, (_, i) => ({
    label: n > 1 ? `${labelPrefix} ${i + 1}`.trim() : labelPrefix,
    kind,
    target_type: "none",
    business_id: businessId,
    active: true,
  }));
  return check(await supabase.from("qr_codes").insert(rows).select("*, business:businesses(id, name, slug)")).map(toPlaque);
}

export async function updatePlaque(id: string, p: PlaqueInput) {
  return toPlaque(check(await supabase.from("qr_codes").update(plaqueRow(p)).eq("id", id).select("*, business:businesses(id, name, slug)").single()));
}

export async function deletePlaque(id: string) {
  check(await supabase.from("qr_codes").delete().eq("id", id));
}

export async function plaqueScansByDay(days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  return check(await supabase.from("qr_scans").select("qr_id, scanned_at").gte("scanned_at", since)) as { qr_id: string; scanned_at: string }[];
}

// ───────────────────────────── Fidelización ─────────────────────────────

export async function getLoyaltyProgram(businessId: string): Promise<LoyaltyProgram | null> {
  const r = check(await supabase.from("loyalty_programs").select("*").eq("business_id", businessId).maybeSingle());
  return r
    ? { businessId: r.business_id, enabled: r.enabled, title: r.title, reward: r.reward, stampsRequired: r.stamps_required, cooldownHours: r.cooldown_hours, redeemPin: r.redeem_pin }
    : null;
}

export async function saveLoyaltyProgram(p: LoyaltyProgram) {
  check(
    await supabase.from("loyalty_programs").upsert({
      business_id: p.businessId, enabled: p.enabled, title: p.title, reward: p.reward,
      stamps_required: p.stampsRequired, cooldown_hours: p.cooldownHours, redeem_pin: p.redeemPin,
    }),
  );
}

export async function listLoyaltyCards(businessId: string): Promise<LoyaltyCard[]> {
  return check(
    await supabase.from("loyalty_cards").select("*").eq("business_id", businessId).order("last_stamp_at", { ascending: false, nullsFirst: false }),
  ).map((r: Row) => ({
    id: r.id, businessId: r.business_id, customerName: r.customer_name, phone: r.phone, stamps: r.stamps,
    totalStamps: r.total_stamps, rewardsRedeemed: r.rewards_redeemed, lastStampAt: r.last_stamp_at, createdAt: r.created_at,
  }));
}

export async function setCardStamps(cardId: string, stamps: number) {
  check(await supabase.from("loyalty_cards").update({ stamps: Math.max(0, stamps) }).eq("id", cardId));
}

export async function markCardRedeemed(card: LoyaltyCard, required: number) {
  check(
    await supabase
      .from("loyalty_cards")
      .update({ stamps: Math.max(0, card.stamps - required), rewards_redeemed: card.rewardsRedeemed + 1 })
      .eq("id", card.id),
  );
}

export async function deleteLoyaltyCard(cardId: string) {
  check(await supabase.from("loyalty_cards").delete().eq("id", cardId));
}

// Públicas (página /f/CODIGO)
export async function loyaltyInfo(code: string) {
  return check(await supabase.rpc("loyalty_info", { p_code: code })) as LoyaltyInfo | null;
}
export async function loyaltyJoin(code: string, name: string, phone: string) {
  return check(await supabase.rpc("loyalty_join", { p_code: code, p_name: name, p_phone: phone })) as LoyaltyState;
}
export async function loyaltyStamp(code: string, token: string) {
  return check(await supabase.rpc("loyalty_stamp", { p_code: code, p_token: token })) as LoyaltyState;
}
export async function loyaltyRedeem(code: string, token: string, pin: string) {
  return check(await supabase.rpc("loyalty_redeem", { p_code: code, p_token: token, p_pin: pin })) as LoyaltyState;
}

// ───────────────────────────── Prospectos ─────────────────────────────

const toLead = (r: Row): Lead => ({
  id: r.id, sellerId: r.seller_id, businessName: r.business_name, contactName: r.contact_name ?? "", phone: r.phone ?? "",
  email: r.email ?? "", category: r.category ?? "", city: r.city ?? "", status: r.status, notes: r.notes ?? "",
  nextContactOn: r.next_contact_on, createdAt: r.created_at,
  seller: r.seller ? { fullName: r.seller.full_name, email: r.seller.email } : null,
});

export async function listLeads() {
  return check(await supabase.from("leads").select("*, seller:profiles!leads_seller_id_fkey(full_name, email)").order("updated_at", { ascending: false })).map(toLead);
}

export async function saveLead(l: Partial<Lead> & { businessName: string; status: LeadStatus }) {
  const row = {
    business_name: l.businessName, contact_name: l.contactName || null, phone: l.phone || null, email: l.email || null,
    category: l.category || null, city: l.city || null, status: l.status, notes: l.notes || null, next_contact_on: l.nextContactOn || null,
  };
  if (l.id) check(await supabase.from("leads").update(row).eq("id", l.id));
  else check(await supabase.from("leads").insert(row));
}

export async function deleteLead(id: string) {
  check(await supabase.from("leads").delete().eq("id", id));
}

// ───────────────────────────── Actividad y resumen ─────────────────────────────

export async function listActivity(opts: { limit?: number; actorId?: string; businessId?: string } = {}) {
  let q = supabase
    .from("activity_log")
    .select("*, actor:profiles!activity_log_actor_id_fkey(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.actorId) q = q.eq("actor_id", opts.actorId);
  if (opts.businessId) q = q.eq("business_id", opts.businessId);
  return check(await q).map(
    (r: Row): ActivityEntry => ({
      id: r.id, actorId: r.actor_id, actorRole: r.actor_role, action: r.action, entity: r.entity, entityId: r.entity_id,
      businessId: r.business_id, data: r.data, createdAt: r.created_at,
      actor: r.actor ? { fullName: r.actor.full_name, email: r.actor.email } : null,
    }),
  );
}

export async function dashboardCounts() {
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const count = async (table: string, f?: (q: any) => any) => {
    let q: any = supabase.from(table).select("*", { count: "exact", head: true });
    if (f) q = f(q);
    const { count: c } = await q;
    return c ?? 0;
  };
  const [businesses, plaques, scans, cards, leads] = await Promise.all([
    count("businesses"),
    count("qr_codes"),
    count("qr_scans", (q) => q.gte("scanned_at", since)),
    count("loyalty_cards"),
    count("leads"),
  ]);
  return { businesses, plaques, scans, cards, leads };
}
