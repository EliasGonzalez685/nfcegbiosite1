// Tipos de dominio. Están pensados para mapear 1:1 con tablas de Supabase más adelante.

export type Role = "client" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: "active" | "suspended";
  createdAt: string;
}

export type LinkType =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "whatsapp"
  | "maps"
  | "google_review"
  | "website"
  | "email"
  | "phone"
  | "youtube"
  | "x"
  | "linkedin"
  | "custom";

export interface ProfileLink {
  id: string;
  type: LinkType;
  label: string;
  /** URL o valor (número de teléfono, usuario, email) según el tipo */
  value: string;
  /** Solo WhatsApp: mensaje predefinido */
  message?: string;
  enabled: boolean;
}

export type WifiSecurity = "WPA" | "WEP" | "nopass";

export interface WifiNetwork {
  id: string;
  ssid: string;
  password: string;
  security: WifiSecurity;
  hidden: boolean;
  note?: string;
}

export interface ContactInfo {
  fullName: string;
  company: string;
  jobTitle: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  address: string;
}

export type ThemeMode = "light" | "dark";

export interface ProfileTheme {
  accent: string;
  mode: ThemeMode;
  buttonStyle: "rounded" | "pill" | "square";
}

export interface Profile {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  tagline: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  theme: ProfileTheme;
  contact: ContactInfo;
  links: ProfileLink[];
  wifi: WifiNetwork[];
  sections: {
    contact: boolean;
    wifi: boolean;
    menu: boolean;
  };
  /** Número para pedidos del menú (formato internacional sin +, ej. 595981123456) */
  orderWhatsapp: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategory {
  id: string;
  profileId: string;
  name: string;
  order: number;
}

export interface MenuItem {
  id: string;
  profileId: string;
  categoryId: string;
  name: string;
  description: string;
  /** Precio en guaraníes, entero */
  price: number;
  photoUrl: string | null;
  tags: string[];
  soldOut: boolean;
  order: number;
}

export type CodeStatus = "unassigned" | "active" | "disabled";
export type CodeKind = "nfc" | "qr" | "placa";

export interface ShortCode {
  code: string;
  profileId: string | null;
  batchId: string | null;
  status: CodeStatus;
  kind: CodeKind;
  label: string;
  createdAt: string;
  activatedAt: string | null;
}

export interface CodeBatch {
  id: string;
  name: string;
  kind: CodeKind;
  quantity: number;
  note: string;
  createdAt: string;
}

export type EventType = "scan" | "view" | "click";

export interface AnalyticsEvent {
  id: string;
  type: EventType;
  profileId: string;
  code?: string;
  linkId?: string;
  at: string;
}

export interface StatsSummary {
  scans: number;
  views: number;
  clicks: number;
  daily: { date: string; scans: number; views: number; clicks: number }[];
  topLinks: { linkId: string; label: string; clicks: number }[];
  byCode: { code: string; scans: number }[];
}

export interface ClientRow {
  user: User;
  profile: Profile | null;
  codes: number;
  scans30d: number;
}
