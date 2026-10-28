import type { Profile, User } from "@/lib/types";
import { placeholderImage } from "@/lib/utils";

export interface MockDB {
  version: number;
  users: (User & { password: string })[];
  profiles: Profile[];
}

export const SEED_VERSION = 4;

const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

const users: MockDB["users"] = [
  { id: "u_admin", email: "admin@nfcegbiosite.com", password: "admin123", name: "Administrador", role: "admin", status: "active", createdAt: daysAgo(120) },
  { id: "u_barber", email: "barber@demo.com", password: "demo123", name: "Hugo Acosta", role: "client", status: "active", createdAt: daysAgo(12) },
  { id: "u_cafe", email: "cafe@demo.com", password: "demo123", name: "Lorena Giménez", role: "client", status: "active", createdAt: daysAgo(60) },
  { id: "u_dra", email: "dra@demo.com", password: "demo123", name: "Silvia Benítez", role: "client", status: "active", createdAt: daysAgo(35) },
];

const profiles: Profile[] = [
  {
    id: "p_barber",
    ownerId: "u_barber",
    slug: "barberia-el-patron",
    name: "El Patrón",
    tagline: "Barbería · Encarnación",
    avatarUrl: placeholderImage("💈", "#1a1a1a", "#3a3a3a"),
    accent: "#D4AF37",
    links: [
      { id: "l1", type: "whatsapp", label: "Reservá tu turno", value: "595991222333", message: "Hola, quiero reservar un corte.", enabled: true },
      { id: "l2", type: "instagram", label: "Instagram", value: "https://instagram.com/elpatronbarber", enabled: true },
      { id: "l3", type: "tiktok", label: "TikTok", value: "https://tiktok.com/@elpatronbarber", enabled: true },
      { id: "l4", type: "maps", label: "Cómo llegar", value: "https://maps.google.com/?q=Encarnacion+Paraguay", enabled: true },
      { id: "l5", type: "google_review", label: "Dejanos tu reseña", value: "https://g.page/r/elpatron/review", enabled: true },
      { id: "l6", type: "wifi", label: "WiFi del local", value: "ElPatron_Clientes", password: "barba2026", enabled: true },
      { id: "l7", type: "vcard", label: "Guardar contacto", value: "", enabled: true },
    ],
    published: true,
    createdAt: daysAgo(12),
    updatedAt: daysAgo(1),
  },
  {
    id: "p_cafe",
    ownerId: "u_cafe",
    slug: "la-cabana-cafe",
    name: "La Cabaña Café",
    tagline: "Café de especialidad · Ciudad del Este",
    avatarUrl: placeholderImage("☕", "#6B3E26", "#C98A5A"),
    accent: "#E0915A",
    links: [
      { id: "l1", type: "menu", label: "Ver menú", value: "https://lacabana.com.py/menu.pdf", enabled: true },
      { id: "l2", type: "whatsapp", label: "Pedidos por WhatsApp", value: "595981123456", message: "¡Hola! Quiero hacer un pedido.", enabled: true },
      { id: "l3", type: "instagram", label: "Instagram", value: "https://instagram.com/lacabanacafe", enabled: true },
      { id: "l4", type: "wifi", label: "WiFi", value: "LaCabana_Clientes", password: "cafecito2026", enabled: true },
      { id: "l5", type: "maps", label: "Ubicación", value: "https://maps.google.com/?q=Ciudad+del+Este", enabled: true },
    ],
    published: true,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(2),
  },
  {
    id: "p_dra",
    ownerId: "u_dra",
    slug: "dra-silvia-benitez",
    name: "Dra. Silvia Benítez",
    tagline: "Odontología estética · Asunción",
    avatarUrl: placeholderImage("🦷", "#2D6A8E", "#7FB8D6"),
    accent: "#5BB4E5",
    links: [
      { id: "l1", type: "whatsapp", label: "Pedir turno", value: "595971654321", message: "Hola Dra., quisiera agendar un turno.", enabled: true },
      { id: "l2", type: "instagram", label: "Instagram", value: "https://instagram.com/drasilviabenitez", enabled: true },
      { id: "l3", type: "maps", label: "Consultorio", value: "https://maps.google.com/?q=Asuncion", enabled: true },
      { id: "l4", type: "vcard", label: "Guardar contacto", value: "", enabled: true },
    ],
    published: true,
    createdAt: daysAgo(35),
    updatedAt: daysAgo(5),
  },
];

export function createSeed(): MockDB {
  return { version: SEED_VERSION, users: structuredClone(users), profiles: structuredClone(profiles) };
}
