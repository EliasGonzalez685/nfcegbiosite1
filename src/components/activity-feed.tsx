"use client";

import { Activity, FilePlus2, Pencil, Trash2, UserPlus } from "lucide-react";
import type { ActivityEntry } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";

const ENTITY: Record<string, string> = {
  businesses: "el negocio",
  links: "un botón",
  menus: "el menú",
  menu_items: "el producto",
  menu_categories: "la categoría",
  menu_images: "una foto del menú",
  qr_codes: "la plaquita",
  leads: "el prospecto",
  profiles: "la cuenta",
  loyalty_programs: "la fidelización",
  loyalty_cards: "la tarjeta de fidelidad de",
};

const FIELD: Record<string, string> = {
  name: "nombre", slug: "dirección", tagline: "frase", avatar_url: "logo", accent: "color", published: "publicación",
  owner_id: "dueño", seller_id: "vendedor", label: "texto", value: "enlace", enabled: "activo", position: "orden",
  price: "precio", sold_out: "agotado", photo_url: "foto", description: "descripción", mode: "modo", pdf_url: "PDF",
  order_whatsapp: "WhatsApp de pedidos", target_type: "destino", target_url: "enlace", business_id: "negocio",
  active: "activa", status: "estado", reward: "premio", stamps_required: "sellos", cooldown_hours: "espera", redeem_pin: "PIN",
  stamps: "sellos", full_name: "nombre", phone: "teléfono", role: "rol", email: "email", wifi_password: "contraseña WiFi",
  category_id: "categoría", notes: "notas", kind: "tipo", caption: "título", next_contact_on: "próximo contacto",
};
const IGNORE = new Set(["updated_at", "created_at", "id", "last_stamp_at", "scans", "last_scan_at", "total_stamps", "pin_fails", "pin_locked_until"]);

type Data = Record<string, unknown>;
function nameOf(d: Data | null | undefined) {
  if (!d) return "";
  const v = d.name ?? d.label ?? d.business_name ?? d.customer_name ?? d.code ?? d.email ?? d.full_name;
  return typeof v === "string" ? v : "";
}

export function describe(e: ActivityEntry) {
  const d = (e.data ?? {}) as Data;
  if (e.action === "create_user") return { verb: "creó la cuenta", what: `${d.email ?? ""} (${d.role === "seller" ? "vendedor" : d.role === "admin" ? "admin" : "cliente"})`, changes: [] as string[] };
  if (e.action === "update_user") {
    const ch = Object.keys(d).filter((k) => k !== "password_changed").map((k) => FIELD[k] ?? k);
    if (d.password_changed) ch.push("contraseña");
    return { verb: "actualizó una cuenta", what: "", changes: ch };
  }
  const before = (d.antes ?? null) as Data | null;
  const after = (d.despues ?? d) as Data;
  const verb = e.action === "insert" ? "creó" : e.action === "delete" ? "eliminó" : "editó";
  const changes =
    e.action === "update" && before
      ? Object.keys(after).filter((k) => !IGNORE.has(k) && JSON.stringify(after[k]) !== JSON.stringify(before[k])).map((k) => FIELD[k] ?? k)
      : [];
  return { verb, what: `${ENTITY[e.entity] ?? e.entity} ${nameOf(after) || nameOf(before)}`.trim(), changes };
}

const ICON = { insert: FilePlus2, update: Pencil, delete: Trash2, create_user: UserPlus, update_user: Pencil } as Record<string, typeof Activity>;

export function ActivityFeed({ entries, compact = false }: { entries: ActivityEntry[]; compact?: boolean }) {
  if (!entries.length) return <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-3">Todavía no hay actividad.</p>;
  return (
    <ol className="relative space-y-1">
      {entries.map((e) => {
        const { verb, what, changes } = describe(e);
        const Icon = ICON[e.action] ?? Activity;
        return (
          <li key={e.id} className="flex gap-3 rounded-xl px-2 py-2 transition hover:bg-paper/70">
            <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full", e.action === "delete" ? "bg-red-50 text-danger" : e.action.startsWith("create") || e.action === "insert" ? "bg-brand-soft text-brand" : "bg-paper-2 text-ink-2")}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="leading-snug">
                <b className="font-semibold">{e.actor?.fullName || e.actor?.email || "Alguien"}</b>{" "}
                {e.actorRole && !compact && <span className="mr-1 rounded bg-paper-2 px-1.5 py-px text-[10px] font-semibold uppercase text-ink-3">{e.actorRole === "seller" ? "vendedor" : e.actorRole === "admin" ? "admin" : "cliente"}</span>}
                {verb} <span className="text-ink-2">{what}</span>
              </p>
              {changes.length > 0 && <p className="truncate text-xs text-ink-3">Cambió: {Array.from(new Set(changes)).join(", ")}</p>}
            </div>
            <span className="shrink-0 text-xs text-ink-3" title={new Date(e.createdAt).toLocaleString("es-PY")}>{relativeTime(e.createdAt)}</span>
          </li>
        );
      })}
    </ol>
  );
}
