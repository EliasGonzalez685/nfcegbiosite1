import type {
  AnalyticsEvent,
  CodeBatch,
  MenuCategory,
  MenuItem,
  Profile,
  ShortCode,
  User,
} from "@/lib/types";
import { placeholderImage } from "@/lib/utils";

export interface MockDB {
  version: number;
  users: (User & { password: string })[];
  profiles: Profile[];
  categories: MenuCategory[];
  items: MenuItem[];
  codes: ShortCode[];
  batches: CodeBatch[];
  events: AnalyticsEvent[];
}

export const SEED_VERSION = 3;

const now = new Date();
const daysAgo = (d: number, h = 12) => {
  const x = new Date(now);
  x.setDate(x.getDate() - d);
  x.setHours(h, 0, 0, 0);
  return x.toISOString();
};

// Generador pseudo-aleatorio determinístico para que las estadísticas de prueba sean estables
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const users: MockDB["users"] = [
  { id: "u_admin", email: "admin@nfcegbiosite.com", password: "admin123", name: "Administrador", role: "admin", status: "active", createdAt: daysAgo(120) },
  { id: "u_cafe", email: "cafe@demo.com", password: "demo123", name: "Lorena Giménez", role: "client", status: "active", createdAt: daysAgo(60) },
  { id: "u_dra", email: "dra@demo.com", password: "demo123", name: "Silvia Benítez", role: "client", status: "active", createdAt: daysAgo(35) },
  { id: "u_barber", email: "barber@demo.com", password: "demo123", name: "Hugo Acosta", role: "client", status: "active", createdAt: daysAgo(12) },
];

const baseProfile = {
  avatarUrl: null,
  coverUrl: null,
  wifi: [],
  published: true,
};

const profiles: Profile[] = [
  {
    ...baseProfile,
    id: "p_cafe",
    ownerId: "u_cafe",
    slug: "la-cabana-cafe",
    name: "La Cabaña Café",
    tagline: "Café de especialidad · Ciudad del Este",
    bio: "Tostamos nuestro propio café y horneamos todo en casa. Abierto todos los días de 7:00 a 21:00.",
    avatarUrl: placeholderImage("☕", "#6B3E26", "#C98A5A"),
    coverUrl: placeholderImage("🥐", "#E9C9A8", "#B97A4A"),
    theme: { accent: "#8A4B2A", mode: "light", buttonStyle: "rounded" },
    contact: {
      fullName: "La Cabaña Café",
      company: "La Cabaña Café",
      jobTitle: "",
      phone: "+595 61 500 123",
      whatsapp: "595981123456",
      email: "hola@lacabana.com.py",
      website: "https://lacabana.com.py",
      address: "Av. San Blas km 2, Ciudad del Este",
    },
    links: [
      { id: "l1", type: "whatsapp", label: "Escribinos por WhatsApp", value: "595981123456", message: "¡Hola! Vi su biosite y quería consultar…", enabled: true },
      { id: "l2", type: "instagram", label: "Instagram", value: "https://instagram.com/lacabanacafe", enabled: true },
      { id: "l3", type: "maps", label: "Cómo llegar", value: "https://maps.google.com/?q=La+Cabaña+Café+Ciudad+del+Este", enabled: true },
      { id: "l4", type: "google_review", label: "Dejanos tu reseña", value: "https://g.page/r/lacabana/review", enabled: true },
      { id: "l5", type: "tiktok", label: "TikTok", value: "https://tiktok.com/@lacabanacafe", enabled: true },
      { id: "l6", type: "facebook", label: "Facebook", value: "https://facebook.com/lacabanacafe", enabled: false },
    ],
    wifi: [
      { id: "w1", ssid: "LaCabana_Clientes", password: "cafecito2026", security: "WPA", hidden: false, note: "Velocidad 100 Mbps" },
    ],
    sections: { contact: true, wifi: true, menu: true },
    orderWhatsapp: "595981123456",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(2),
  },
  {
    ...baseProfile,
    id: "p_dra",
    ownerId: "u_dra",
    slug: "dra-silvia-benitez",
    name: "Dra. Silvia Benítez",
    tagline: "Odontología estética y ortodoncia",
    bio: "Consultorio en Asunción. Atención con turno previo de lunes a sábado.",
    avatarUrl: placeholderImage("🦷", "#2D6A8E", "#7FB8D6"),
    theme: { accent: "#2D6A8E", mode: "light", buttonStyle: "pill" },
    contact: {
      fullName: "Silvia Benítez",
      company: "Consultorio Odontológico Benítez",
      jobTitle: "Odontóloga",
      phone: "+595 21 600 456",
      whatsapp: "595971654321",
      email: "turnos@drabenitez.com.py",
      website: "",
      address: "Mcal. López 1234, Asunción",
    },
    links: [
      { id: "l1", type: "whatsapp", label: "Pedir turno", value: "595971654321", message: "Hola Dra., quisiera agendar un turno.", enabled: true },
      { id: "l2", type: "instagram", label: "Instagram", value: "https://instagram.com/drasilviabenitez", enabled: true },
      { id: "l3", type: "maps", label: "Ubicación del consultorio", value: "https://maps.google.com/?q=Mcal+Lopez+1234+Asuncion", enabled: true },
    ],
    sections: { contact: true, wifi: false, menu: false },
    orderWhatsapp: "",
    createdAt: daysAgo(35),
    updatedAt: daysAgo(5),
  },
  {
    ...baseProfile,
    id: "p_barber",
    ownerId: "u_barber",
    slug: "barberia-el-patron",
    name: "Barbería El Patrón",
    tagline: "Cortes clásicos y modernos",
    bio: "",
    avatarUrl: placeholderImage("💈", "#1E1E1E", "#5A5A5A"),
    theme: { accent: "#C9A227", mode: "dark", buttonStyle: "square" },
    contact: {
      fullName: "Barbería El Patrón",
      company: "Barbería El Patrón",
      jobTitle: "",
      phone: "",
      whatsapp: "595991222333",
      email: "",
      website: "",
      address: "Encarnación",
    },
    links: [
      { id: "l1", type: "whatsapp", label: "Reservá tu turno", value: "595991222333", message: "Hola, quiero reservar un corte.", enabled: true },
      { id: "l2", type: "instagram", label: "Instagram", value: "https://instagram.com/elpatronbarber", enabled: true },
    ],
    sections: { contact: true, wifi: false, menu: false },
    orderWhatsapp: "",
    createdAt: daysAgo(12),
    updatedAt: daysAgo(12),
  },
];

const categories: MenuCategory[] = [
  { id: "c1", profileId: "p_cafe", name: "Cafetería", order: 0 },
  { id: "c2", profileId: "p_cafe", name: "Desayunos", order: 1 },
  { id: "c3", profileId: "p_cafe", name: "Almuerzos", order: 2 },
  { id: "c4", profileId: "p_cafe", name: "Dulces", order: 3 },
];

const item = (
  id: string,
  categoryId: string,
  name: string,
  description: string,
  price: number,
  emoji: string,
  colors: [string, string],
  tags: string[] = [],
  soldOut = false,
  order = 0,
): MenuItem => ({
  id,
  profileId: "p_cafe",
  categoryId,
  name,
  description,
  price,
  photoUrl: placeholderImage(emoji, colors[0], colors[1]),
  tags,
  soldOut,
  order,
});

const items: MenuItem[] = [
  item("i1", "c1", "Espresso", "Blend de la casa, tueste medio.", 12000, "☕", ["#4A2C1D", "#8C5A3C"], [], false, 0),
  item("i2", "c1", "Capuchino", "Espresso doble con leche texturizada y cacao.", 18000, "☕", ["#7A4E33", "#D2A679"], [], false, 1),
  item("i3", "c1", "Tereré de la casa", "Yerba con yuyos frescos: menta’i, cedrón y burrito.", 15000, "🧉", ["#2F6B3A", "#8FC28F"], ["vegano"], false, 2),
  item("i4", "c1", "Cold brew", "Infusión en frío por 18 horas.", 20000, "🧊", ["#2A2A3A", "#6D6D8F"], ["vegano"], true, 3),
  item("i5", "c2", "Chipa caliente (3 u.)", "Recién horneada, con queso Paraguay.", 10000, "🥯", ["#C98A2E", "#F2D08A"], ["sin gluten"], false, 0),
  item("i6", "c2", "Tostado completo", "Pan de campo, jamón, queso y tomate.", 22000, "🥪", ["#B5651D", "#E8B07A"], [], false, 1),
  item("i7", "c2", "Bowl de frutas y granola", "Frutas de estación, yogur natural y miel.", 25000, "🥣", ["#C2416B", "#F3A6BE"], ["vegetariano"], false, 2),
  item("i8", "c3", "Milanesa a caballo", "Con huevo frito y papas rústicas.", 45000, "🍳", ["#A8551F", "#EBA05C"], [], false, 0),
  item("i9", "c3", "Sopa paraguaya y bife", "Porción de sopa con bife a la plancha.", 48000, "🥩", ["#7A2E1E", "#C9674F"], ["sin gluten"], false, 1),
  item("i10", "c3", "Wrap picante de pollo", "Pollo grillé, salsa de jalapeño y vegetales.", 38000, "🌯", ["#B33A1E", "#F07A4F"], ["picante"], false, 2),
  item("i11", "c4", "Torta de chocolate", "Húmeda, con ganache de cacao 70%.", 22000, "🍰", ["#3B1F17", "#8A5040"], ["vegetariano"], false, 0),
  item("i12", "c4", "Alfajor de maicena", "Relleno de dulce de leche y coco.", 9000, "🍪", ["#D9A65A", "#F5DDB0"], [], false, 1),
];

const batches: CodeBatch[] = [
  { id: "b1", name: "Lote inicial tarjetas", kind: "nfc", quantity: 6, note: "Tarjetas PVC blancas", createdAt: daysAgo(70) },
  { id: "b2", name: "Placas de mesa octubre", kind: "placa", quantity: 4, note: "Acrílico 10x15", createdAt: daysAgo(20) },
];

const codes: ShortCode[] = [
  { code: "K7M2QX", profileId: "p_cafe", batchId: "b1", status: "active", kind: "nfc", label: "Tarjeta mostrador", createdAt: daysAgo(70), activatedAt: daysAgo(58) },
  { code: "P4HN8R", profileId: "p_cafe", batchId: "b2", status: "active", kind: "placa", label: "Mesa 1", createdAt: daysAgo(20), activatedAt: daysAgo(18) },
  { code: "T9WC3V", profileId: "p_cafe", batchId: "b2", status: "active", kind: "placa", label: "Mesa 2", createdAt: daysAgo(20), activatedAt: daysAgo(18) },
  { code: "B3ZK6D", profileId: "p_dra", batchId: "b1", status: "active", kind: "nfc", label: "Tarjeta personal", createdAt: daysAgo(70), activatedAt: daysAgo(34) },
  { code: "H6RY2M", profileId: "p_barber", batchId: "b1", status: "active", kind: "nfc", label: "", createdAt: daysAgo(70), activatedAt: daysAgo(11) },
  { code: "DEMO24", profileId: null, batchId: "b1", status: "unassigned", kind: "nfc", label: "", createdAt: daysAgo(70), activatedAt: null },
  { code: "F8JX4N", profileId: null, batchId: "b1", status: "unassigned", kind: "nfc", label: "", createdAt: daysAgo(70), activatedAt: null },
  { code: "W2QP7L", profileId: null, batchId: "b1", status: "disabled", kind: "nfc", label: "Tarjeta dañada", createdAt: daysAgo(70), activatedAt: null },
  { code: "M5TV9C", profileId: null, batchId: "b2", status: "unassigned", kind: "placa", label: "", createdAt: daysAgo(20), activatedAt: null },
  { code: "R3GD8K", profileId: null, batchId: "b2", status: "unassigned", kind: "placa", label: "", createdAt: daysAgo(20), activatedAt: null },
];

function buildEvents(): AnalyticsEvent[] {
  const r = rng(42);
  const events: AnalyticsEvent[] = [];
  let n = 0;
  const plans: { profileId: string; codes: string[]; links: string[]; base: number; since: number }[] = [
    { profileId: "p_cafe", codes: ["K7M2QX", "P4HN8R", "T9WC3V"], links: ["l1", "l2", "l3", "l4", "l5"], base: 14, since: 45 },
    { profileId: "p_dra", codes: ["B3ZK6D"], links: ["l1", "l2", "l3"], base: 5, since: 34 },
    { profileId: "p_barber", codes: ["H6RY2M"], links: ["l1", "l2"], base: 3, since: 11 },
  ];
  for (const p of plans) {
    for (let d = Math.min(p.since, 45); d >= 0; d--) {
      const weekday = new Date(daysAgo(d)).getDay();
      const weekendBoost = weekday === 5 || weekday === 6 ? 1.5 : 1;
      const scans = Math.round(p.base * weekendBoost * (0.6 + r() * 0.8));
      for (let i = 0; i < scans; i++) {
        const hour = 8 + Math.floor(r() * 13);
        const at = daysAgo(d, hour);
        const code = p.codes[Math.floor(r() * p.codes.length)];
        events.push({ id: `e${n++}`, type: "scan", profileId: p.profileId, code, at });
        events.push({ id: `e${n++}`, type: "view", profileId: p.profileId, at });
        if (r() < 0.55) {
          const linkId = p.links[Math.floor(Math.pow(r(), 1.6) * p.links.length)];
          events.push({ id: `e${n++}`, type: "click", profileId: p.profileId, linkId, at });
        }
      }
      // visitas directas (sin escaneo)
      const direct = Math.round(p.base * 0.3 * r());
      for (let i = 0; i < direct; i++) {
        events.push({ id: `e${n++}`, type: "view", profileId: p.profileId, at: daysAgo(d, 9 + Math.floor(r() * 12)) });
      }
    }
  }
  return events;
}

export function createSeed(): MockDB {
  return {
    version: SEED_VERSION,
    users: structuredClone(users),
    profiles: structuredClone(profiles),
    categories: structuredClone(categories),
    items: structuredClone(items),
    codes: structuredClone(codes),
    batches: structuredClone(batches),
    events: buildEvents(),
  };
}
