// Tipos de dominio. Pensados para mapear 1:1 con tablas de Supabase más adelante.

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
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "x"
  | "linkedin"
  | "maps"
  | "google_review"
  | "website"
  | "menu"
  | "email"
  | "phone"
  | "wifi"
  | "vcard"
  | "custom";

/** Cada botón del biosite. Todo (redes, WiFi, guardar contacto) es un botón. */
export interface ProfileLink {
  id: string;
  type: LinkType;
  label: string;
  /** URL, número, usuario o email según el tipo. En "wifi" es el nombre de la red. En "vcard" no se usa. */
  value: string;
  /** whatsapp: mensaje predefinido */
  message?: string;
  /** wifi: contraseña (vacía = red abierta) */
  password?: string;
  enabled: boolean;
}

export interface Profile {
  id: string;
  ownerId: string;
  slug: string;
  name: string;
  tagline: string;
  avatarUrl: string | null;
  /** Color de la marca: reemplaza al dorado del diseño */
  accent: string;
  links: ProfileLink[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientRow {
  user: User;
  profile: Profile | null;
}
