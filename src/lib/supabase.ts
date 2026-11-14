import { createClient } from "@supabase/supabase-js";

import { SUPABASE_KEY, SUPABASE_URL } from "./config";

export { SUPABASE_KEY, SUPABASE_URL };

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Traduce errores comunes de Supabase a mensajes claros */
export function friendlyError(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? String(e);
  if (/Invalid login credentials/i.test(msg)) return "Email o contraseña incorrectos";
  if (/duplicate key.*slug/i.test(msg)) return "Esa dirección ya la usa otro negocio";
  if (/businesses_slug_reserved/i.test(msg)) return "Esa dirección está reservada, elegí otra";
  if (/businesses_slug_format/i.test(msg)) return "La dirección solo puede tener letras minúsculas, números y guiones";
  if (/qr_target_ok/i.test(msg)) return "Revisá el destino: falta elegir el negocio o el enlace no es válido";
  if (/menus_whatsapp_digits/i.test(msg)) return "El WhatsApp de pedidos debe tener solo números, con código de país";
  if (/row-level security|permission denied/i.test(msg)) return "No tenés permiso para hacer esto";
  if (/Failed to fetch|NetworkError/i.test(msg)) return "Sin conexión. Revisá tu internet e intentá de nuevo";
  if (/User is banned/i.test(msg)) return "Tu cuenta está suspendida";
  return msg;
}

/** Llama a la función de cuentas (crear / editar usuarios) */
export async function callUsersFn<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("users", { body });
  if (error) {
    let message = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === "function") message = (await ctx.json()).error ?? message;
    } catch {
      /* respuesta sin JSON */
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}
