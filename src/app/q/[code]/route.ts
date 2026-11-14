import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/config";

// Plaquita NFC / QR: el código es fijo, el destino se configura en el panel.
export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  let dest: string | null = null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/resolve_qr`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ p_code: code, p_user_agent: req.headers.get("user-agent") }),
      cache: "no-store",
    });
    if (res.ok) dest = await res.json();
  } catch {
    dest = null;
  }
  const target = dest ? new URL(dest, req.nextUrl.origin) : new URL(`/plaquita-inactiva?c=${encodeURIComponent(code)}`, req.nextUrl.origin);
  const response = NextResponse.redirect(target, 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
