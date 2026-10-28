import type { Menu, MenuItem, Profile, User } from "@/lib/types";
import { placeholderImage } from "@/lib/utils";

export interface MockDB {
  version: number;
  users: (User & { password: string })[];
  profiles: Profile[];
}

export const SEED_VERSION = 5;

const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

const noMenu: Menu = { enabled: false, orderWhatsapp: "", categories: [] };

const item = (id: string, name: string, description: string, price: number, emoji: string, c: [string, string], soldOut = false): MenuItem => ({
  id,
  name,
  description,
  price,
  photoUrl: placeholderImage(emoji, c[0], c[1]),
  soldOut,
});

const cafeMenu: Menu = {
  enabled: true,
  orderWhatsapp: "595981123456",
  categories: [
    {
      id: "c1",
      name: "Cafetería",
      items: [
        item("i1", "Espresso", "Blend de la casa, tueste medio.", 12000, "☕", ["#4A2C1D", "#8C5A3C"]),
        item("i2", "Capuchino", "Espresso doble con leche texturizada y cacao.", 18000, "☕", ["#7A4E33", "#D2A679"]),
        item("i3", "Tereré de la casa", "Yerba con yuyos frescos: menta’i, cedrón y burrito.", 15000, "🧉", ["#2F6B3A", "#8FC28F"]),
        item("i4", "Cold brew", "Infusión en frío por 18 horas.", 20000, "🧊", ["#2A2A3A", "#6D6D8F"], true),
      ],
    },
    {
      id: "c2",
      name: "Desayunos",
      items: [
        item("i5", "Chipa caliente (3 u.)", "Recién horneada, con queso Paraguay.", 10000, "🥯", ["#C98A2E", "#F2D08A"]),
        item("i6", "Tostado completo", "Pan de campo, jamón, queso y tomate.", 22000, "🥪", ["#B5651D", "#E8B07A"]),
        item("i7", "Bowl de frutas y granola", "Frutas de estación, yogur natural y miel.", 25000, "🥣", ["#C2416B", "#F3A6BE"]),
      ],
    },
    {
      id: "c3",
      name: "Dulces",
      items: [
        item("i8", "Torta de chocolate", "Húmeda, con ganache de cacao 70%.", 22000, "🍰", ["#3B1F17", "#8A5040"]),
        item("i9", "Alfajor de maicena", "Relleno de dulce de leche y coco.", 9000, "🍪", ["#D9A65A", "#F5DDB0"]),
      ],
    },
  ],
};

const parrillaMenu: Menu = {
  enabled: true,
  orderWhatsapp: "595982444555",
  categories: [
    {
      id: "c1",
      name: "Parrilla",
      items: [
        item("i1", "Costilla vacuna (500 g)", "A la leña, con mandioca hervida.", 75000, "🥩", ["#5A1E14", "#B5513A"]),
        item("i2", "Vacío (400 g)", "Jugoso, con chimichurri de la casa.", 68000, "🥩", ["#6B2416", "#C2614A"]),
        item("i3", "Chorizo parrillero", "Con pan y salsa criolla.", 18000, "🌭", ["#7A2E1E", "#D1784F"]),
        item("i4", "Parrillada para 2", "Costilla, vacío, chorizo, morcilla y guarniciones.", 150000, "🍖", ["#4A1A12", "#A84A35"]),
      ],
    },
    {
      id: "c2",
      name: "Guarniciones",
      items: [
        item("i5", "Sopa paraguaya", "Porción individual.", 12000, "🌽", ["#B8862B", "#EBC46A"]),
        item("i6", "Mandioca frita", "Crocante por fuera.", 10000, "🍟", ["#C9A227", "#F0D77A"]),
        item("i7", "Ensalada mixta", "Lechuga, tomate y cebolla.", 12000, "🥗", ["#2F6B3A", "#8FC28F"]),
      ],
    },
    {
      id: "c3",
      name: "Bebidas",
      items: [
        item("i8", "Gaseosa 500 ml", "Coca-Cola, Fanta o Sprite.", 8000, "🥤", ["#7A1E1E", "#D04A4A"]),
        item("i9", "Cerveza 1 L", "Bien fría.", 18000, "🍺", ["#B8862B", "#F0C75A"]),
        item("i10", "Jugo natural", "Naranja, piña o frutilla.", 12000, "🍹", ["#C2416B", "#F3A6BE"], true),
      ],
    },
  ],
};

const users: MockDB["users"] = [
  { id: "u_admin", email: "admin@nfcegbiosite.com", password: "admin123", name: "Administrador", role: "admin", status: "active", createdAt: daysAgo(120) },
  { id: "u_barber", email: "barber@demo.com", password: "demo123", name: "Hugo Acosta", role: "client", status: "active", createdAt: daysAgo(12) },
  { id: "u_cafe", email: "cafe@demo.com", password: "demo123", name: "Lorena Giménez", role: "client", status: "active", createdAt: daysAgo(60) },
  { id: "u_dra", email: "dra@demo.com", password: "demo123", name: "Silvia Benítez", role: "client", status: "active", createdAt: daysAgo(35) },
  { id: "u_parrilla", email: "parrilla@demo.com", password: "demo123", name: "Julio Ortiz", role: "client", status: "active", createdAt: daysAgo(8) },
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
    menu: noMenu,
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
      { id: "l2", type: "whatsapp", label: "Pedidos por WhatsApp", value: "595981123456", message: "¡Hola! Quiero hacer un pedido.", enabled: true },
      { id: "l3", type: "instagram", label: "Instagram", value: "https://instagram.com/lacabanacafe", enabled: true },
      { id: "l4", type: "wifi", label: "WiFi", value: "LaCabana_Clientes", password: "cafecito2026", enabled: true },
      { id: "l5", type: "maps", label: "Ubicación", value: "https://maps.google.com/?q=Ciudad+del+Este", enabled: true },
    ],
    menu: cafeMenu,
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
    menu: noMenu,
    published: true,
    createdAt: daysAgo(35),
    updatedAt: daysAgo(5),
  },
  {
    id: "p_parrilla",
    ownerId: "u_parrilla",
    slug: "parrilla-lo-de-julio",
    name: "Lo de Julio",
    tagline: "Parrilla · San Lorenzo",
    avatarUrl: placeholderImage("🔥", "#3a0f0a", "#8a2a1a"),
    accent: "#E5484D",
    links: [
      { id: "l1", type: "whatsapp", label: "Reservas", value: "595982444555", message: "Hola, quiero reservar una mesa.", enabled: true },
      { id: "l2", type: "instagram", label: "Instagram", value: "https://instagram.com/lodejulio", enabled: true },
      { id: "l3", type: "maps", label: "Cómo llegar", value: "https://maps.google.com/?q=San+Lorenzo+Paraguay", enabled: true },
      { id: "l4", type: "wifi", label: "WiFi", value: "LoDeJulio", password: "asado2026", enabled: true },
    ],
    menu: parrillaMenu,
    published: true,
    createdAt: daysAgo(8),
    updatedAt: daysAgo(1),
  },
];

export function createSeed(): MockDB {
  return { version: SEED_VERSION, users: structuredClone(users), profiles: structuredClone(profiles) };
}
