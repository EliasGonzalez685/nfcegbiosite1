// Gestión de cuentas de NFCEGBIOSITE.
//
// POST { action: "create", email, password, full_name?, phone?, role, business?: { name, slug, category?, city? }, seller_id? }
//   - admin: crea admin, vendedor o cliente
//   - vendedor: solo clientes (queda como su vendedor)
//
// POST { action: "update", user_id, email?, password?, full_name?, phone?, role?, status?, current_password? }
//   - uno mismo: email, contraseña, nombre y teléfono (pide la contraseña actual para email/contraseña)
//   - admin: todo, a cualquiera (no puede quitarse a sí mismo el rol de admin ni suspenderse)
//   - vendedor: email, contraseña, nombre y teléfono de sus clientes
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function key(kind: "secret" | "publishable") {
  const env = Deno.env.get(kind === "secret" ? "SUPABASE_SECRET_KEYS" : "SUPABASE_PUBLISHABLE_KEYS");
  if (env) {
    try {
      const k = JSON.parse(env)["default"];
      if (k) return k as string;
    } catch { /* clave legacy */ }
  }
  return Deno.env.get(kind === "secret" ? "SUPABASE_SERVICE_ROLE_KEY" : "SUPABASE_ANON_KEY")!;
}

const URL_ = Deno.env.get("SUPABASE_URL")!;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
type Role = "admin" | "seller" | "client";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const admin = createClient(URL_, key("secret"), { auth: { persistSession: false, autoRefreshToken: false } });

  // ¿Quién llama?
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Tenés que iniciar sesión" }, 401);
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  if (whoErr || !who.user) return json({ error: "Sesión vencida, volvé a iniciar sesión" }, 401);
  const { data: me } = await admin.from("profiles").select("id, role, status, email").eq("id", who.user.id).single();
  if (!me || me.status !== "active") return json({ error: "Tu cuenta no está activa" }, 403);

  // deno-lint-ignore no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Datos inválidos" }, 400);
  }

  const log = (action: string, entityId: string, data: unknown, businessId: string | null = null) =>
    admin.from("activity_log").insert({
      actor_id: me.id, actor_role: me.role, action, entity: "profiles", entity_id: entityId, business_id: businessId, data,
    });

  // ------------------------------------------------------------------ CREATE
  if (body.action === "create") {
    if (!["admin", "seller"].includes(me.role)) return json({ error: "No tenés permiso para crear cuentas" }, 403);
    const email = String(body.email ?? "").trim().toLowerCase();
    const role: Role = body.role ?? "client";
    if (!EMAIL_RE.test(email)) return json({ error: "Email inválido" }, 400);
    if (String(body.password ?? "").length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
    if (!["admin", "seller", "client"].includes(role)) return json({ error: "Rol inválido" }, 400);
    if (me.role === "seller" && role !== "client") return json({ error: "Un vendedor solo puede crear clientes" }, 403);

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name ?? "", phone: body.phone ?? null },
      app_metadata: { role, created_by: me.id },
    });
    if (error || !created.user) {
      return json({ error: error?.message?.toLowerCase().includes("already") ? "Ya existe una cuenta con ese email" : error?.message ?? "No se pudo crear" }, 400);
    }
    const newId = created.user.id;

    // deno-lint-ignore no-explicit-any
    let business: any = null;
    if (role === "client" && body.business?.name && body.business?.slug) {
      const { data: b, error: bErr } = await admin
        .from("businesses")
        .insert({
          owner_id: newId,
          seller_id: me.role === "seller" ? me.id : body.seller_id || null,
          name: body.business.name,
          slug: body.business.slug,
          category: body.business.category || null,
          city: body.business.city || null,
        })
        .select("id, slug, name")
        .single();
      business = bErr ? { error: bErr.message.includes("duplicate") ? "Esa dirección ya está en uso" : bErr.message } : b;
    }
    await log("create_user", newId, { email, role, full_name: body.full_name ?? "", business }, business?.id ?? null);
    return json({ user: { id: newId, email, role }, business }, 201);
  }

  // ------------------------------------------------------------------ UPDATE
  if (body.action === "update") {
    const targetId = String(body.user_id ?? "");
    const { data: target } = await admin.from("profiles").select("id, role, status, email, created_by").eq("id", targetId).single();
    if (!target) return json({ error: "Usuario no encontrado" }, 404);

    const self = target.id === me.id;
    let allowed = self || me.role === "admin";
    if (!allowed && me.role === "seller" && target.role === "client") {
      if (target.created_by === me.id) allowed = true;
      else {
        const { count } = await admin.from("businesses").select("id", { count: "exact", head: true }).eq("owner_id", target.id).eq("seller_id", me.id);
        allowed = (count ?? 0) > 0;
      }
    }
    if (!allowed) return json({ error: "No tenés permiso para editar esta cuenta" }, 403);

    const changingRole = body.role !== undefined && body.role !== target.role;
    const changingStatus = body.status !== undefined && body.status !== target.status;
    if ((changingRole || changingStatus) && me.role !== "admin") return json({ error: "Solo un administrador cambia rol o estado" }, 403);
    if ((changingRole || changingStatus) && self) return json({ error: "No podés cambiar tu propio rol ni suspenderte" }, 400);
    if (changingRole && !["admin", "seller", "client"].includes(body.role)) return json({ error: "Rol inválido" }, 400);
    if (changingStatus && !["active", "suspended"].includes(body.status)) return json({ error: "Estado inválido" }, 400);

    const email = body.email !== undefined ? String(body.email).trim().toLowerCase() : undefined;
    const changingEmail = email !== undefined && email !== target.email;
    if (changingEmail && !EMAIL_RE.test(email!)) return json({ error: "Email inválido" }, 400);
    if (body.password !== undefined && String(body.password).length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);

    // Cambios sobre la propia cuenta: confirmar con la contraseña actual
    if (self && (changingEmail || body.password)) {
      const check = createClient(URL_, key("publishable"), { auth: { persistSession: false, autoRefreshToken: false } });
      const { error: pwErr } = await check.auth.signInWithPassword({ email: target.email, password: String(body.current_password ?? "") });
      if (pwErr) return json({ error: "La contraseña actual no es correcta" }, 400);
    }

    // deno-lint-ignore no-explicit-any
    const authPatch: any = {};
    if (changingEmail) {
      authPatch.email = email;
      authPatch.email_confirm = true;
    }
    if (body.password) authPatch.password = String(body.password);
    if (body.full_name !== undefined || body.phone !== undefined) {
      authPatch.user_metadata = { full_name: body.full_name, phone: body.phone };
    }
    if (changingRole) authPatch.app_metadata = { role: body.role };
    if (changingStatus) authPatch.ban_duration = body.status === "suspended" ? "876000h" : "none";

    if (Object.keys(authPatch).length) {
      const { error } = await admin.auth.admin.updateUserById(target.id, authPatch);
      if (error) {
        return json({ error: error.message.toLowerCase().includes("already") ? "Ese email ya lo usa otra cuenta" : error.message }, 400);
      }
    }

    // deno-lint-ignore no-explicit-any
    const profilePatch: any = {};
    if (changingEmail) profilePatch.email = email;
    if (body.full_name !== undefined) profilePatch.full_name = String(body.full_name).slice(0, 80);
    if (body.phone !== undefined) profilePatch.phone = body.phone ? String(body.phone).slice(0, 30) : null;
    if (changingRole) profilePatch.role = body.role;
    if (changingStatus) profilePatch.status = body.status;
    if (Object.keys(profilePatch).length) {
      const { error } = await admin.from("profiles").update(profilePatch).eq("id", target.id);
      if (error) return json({ error: error.message }, 400);
    }

    await log("update_user", target.id, { ...profilePatch, password_changed: !!body.password });
    return json({ ok: true });
  }

  return json({ error: "Acción desconocida" }, 400);
});
