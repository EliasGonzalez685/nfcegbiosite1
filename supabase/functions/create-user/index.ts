// Crea cuentas desde el panel:
//   - un ADMIN puede crear administradores, vendedores y clientes
//   - un VENDEDOR solo puede crear clientes (y queda asignado a su negocio)
// POST { email, password, full_name, phone?, role, business?: { name, slug, category?, city? }, seller_id? }
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

function secretKey() {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) {
    try {
      const k = JSON.parse(keys)["default"];
      if (k) return k as string;
    } catch { /* usar la clave legacy */ }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) ¿Quién llama?
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Falta iniciar sesión" }, 401);
  const { data: caller, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller.user) return json({ error: "Sesión inválida" }, 401);

  const { data: me } = await admin.from("profiles").select("id, role, status").eq("id", caller.user.id).single();
  if (!me || me.status !== "active" || !["admin", "seller"].includes(me.role)) {
    return json({ error: "No tenés permiso para crear cuentas" }, 403);
  }

  // 2) Validar datos
  let body: {
    email?: string; password?: string; full_name?: string; phone?: string;
    role?: "admin" | "seller" | "client"; seller_id?: string;
    business?: { name?: string; slug?: string; category?: string; city?: string };
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  const email = body.email?.trim().toLowerCase();
  const role = body.role ?? "client";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Email inválido" }, 400);
  if (!body.password || body.password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
  if (!["admin", "seller", "client"].includes(role)) return json({ error: "Rol inválido" }, 400);
  if (me.role === "seller" && role !== "client") return json({ error: "Un vendedor solo puede crear clientes" }, 403);

  // 3) Crear el usuario (el rol va en app_metadata: el usuario no lo puede modificar)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: true,
    user_metadata: { full_name: body.full_name ?? "", phone: body.phone ?? null },
    app_metadata: { role, created_by: me.id },
  });
  if (createErr || !created.user) {
    const msg = createErr?.message?.includes("already") ? "Ya existe una cuenta con ese email" : createErr?.message ?? "No se pudo crear";
    return json({ error: msg }, 400);
  }
  const newId = created.user.id;

  // 4) Negocio opcional para clientes
  let business = null;
  if (role === "client" && body.business?.name && body.business?.slug) {
    const sellerId = me.role === "seller" ? me.id : body.seller_id ?? null;
    const { data: b, error: bErr } = await admin
      .from("businesses")
      .insert({
        owner_id: newId,
        seller_id: sellerId,
        name: body.business.name,
        slug: body.business.slug,
        category: body.business.category ?? null,
        city: body.business.city ?? null,
      })
      .select("id, slug, name")
      .single();
    if (bErr) {
      // la cuenta queda creada; se informa el problema del negocio
      business = { error: bErr.message.includes("duplicate") ? "Esa dirección ya está en uso" : bErr.message };
    } else {
      business = b;
    }
  }

  // 5) Registro de actividad (visible para los administradores)
  await admin.from("activity_log").insert({
    actor_id: me.id,
    actor_role: me.role,
    action: "create_user",
    entity: "profiles",
    entity_id: newId,
    business_id: business && "id" in business ? business.id : null,
    data: { email, role, full_name: body.full_name ?? "", business },
  });

  return json({ user: { id: newId, email, role }, business }, 201);
});
