// Tipos de la app. Los nombres de la base están en snake_case; acá se usan en camelCase.

export type Role = "admin" | "seller" | "client";
export type AccountStatus = "active" | "suspended";

export interface UserProfile {
  id: string;
  role: Role;
  fullName: string;
  email: string;
  phone: string | null;
  status: AccountStatus;
  createdBy: string | null;
  createdAt: string;
}

export type LinkType =
  | "whatsapp" | "instagram" | "facebook" | "tiktok" | "youtube" | "x" | "linkedin"
  | "maps" | "google_review" | "website" | "menu" | "email" | "phone" | "wifi" | "vcard" | "custom";

/** Botón del biosite */
export interface ProfileLink {
  id: string;
  type: LinkType;
  label: string;
  /** URL, número o email. En wifi: nombre de la red. */
  value: string;
  /** whatsapp: mensaje predefinido */
  message?: string;
  /** wifi: contraseña (vacía = red abierta) */
  password?: string;
  enabled: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  /** Guaraníes */
  price: number;
  photoUrl: string | null;
  soldOut: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

export interface MenuImage {
  id: string;
  url: string;
  caption: string;
}

export type MenuMode = "items" | "pdf" | "images";

export interface Menu {
  enabled: boolean;
  mode: MenuMode;
  pdfUrl: string | null;
  /** Número para pedidos (595981…). Vacío = sin carrito */
  orderWhatsapp: string;
  categories: MenuCategory[];
  images: MenuImage[];
}

/** Un negocio con todo lo que muestra su página pública */
export interface Site {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  city: string;
  avatarUrl: string | null;
  accent: string;
  published: boolean;
  ownerId: string | null;
  sellerId: string | null;
  links: ProfileLink[];
  menu: Menu;
}

export interface BusinessRow {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  city: string | null;
  avatarUrl: string | null;
  accent: string;
  published: boolean;
  ownerId: string | null;
  sellerId: string | null;
  createdAt: string;
  owner?: Pick<UserProfile, "id" | "fullName" | "email"> | null;
  seller?: Pick<UserProfile, "id" | "fullName" | "email"> | null;
}

export type DeviceKind = "nfc_qr" | "qr" | "nfc";
export type PlaqueTarget = "business" | "menu" | "wifi" | "loyalty" | "url";

/** Plaquita NFC / QR con destino editable */
export interface Plaque {
  id: string;
  code: string;
  label: string;
  kind: DeviceKind;
  targetType: PlaqueTarget;
  businessId: string | null;
  targetUrl: string | null;
  active: boolean;
  notes: string;
  scans: number;
  lastScanAt: string | null;
  createdBy: string | null;
  createdAt: string;
  business?: { id: string; name: string; slug: string } | null;
}

export interface LoyaltyProgram {
  businessId: string;
  enabled: boolean;
  title: string;
  reward: string;
  stampsRequired: number;
  cooldownHours: number;
  redeemPin: string;
}

export interface LoyaltyCard {
  id: string;
  businessId: string;
  customerName: string;
  phone: string;
  stamps: number;
  totalStamps: number;
  rewardsRedeemed: number;
  lastStampAt: string | null;
  createdAt: string;
}

/** Lo que devuelven las funciones públicas de fidelización */
export interface LoyaltyState {
  status: "stamped" | "complete" | "cooldown" | "redeemed" | "bad_pin" | "locked" | "not_ready" | "invalid" | "unknown_card" | "bad_phone";
  token?: string;
  name?: string;
  stamps?: number;
  required?: number;
  reward?: string;
  rewards_redeemed?: number;
  can_redeem?: boolean;
  next_stamp_at?: string | null;
}

export interface LoyaltyInfo {
  business: { name: string; slug: string; avatar_url: string | null; accent: string };
  title: string;
  reward: string;
  required: number;
  cooldown_hours: number;
}

export type LeadStatus = "nuevo" | "contactado" | "interesado" | "cerrado" | "perdido";

export interface Lead {
  id: string;
  sellerId: string | null;
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  category: string;
  city: string;
  status: LeadStatus;
  notes: string;
  nextContactOn: string | null;
  createdAt: string;
  seller?: { fullName: string; email: string } | null;
}

export interface ActivityEntry {
  id: number;
  actorId: string | null;
  actorRole: Role | null;
  action: string;
  entity: string;
  entityId: string | null;
  businessId: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
  actor?: { fullName: string; email: string } | null;
}
