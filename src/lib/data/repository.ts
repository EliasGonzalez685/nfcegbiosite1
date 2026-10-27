/**
 * Contrato de la capa de datos.
 *
 * Todo el frontend habla SOLO con estas interfaces (vía `@/lib/data`).
 * Hoy la implementación es `mock/` (localStorage + datos de prueba).
 * Para conectar Supabase: crear `supabase/` que implemente estas mismas
 * interfaces y cambiar la exportación en `src/lib/data/index.ts`.
 */
import type {
  AnalyticsEvent,
  ClientRow,
  CodeBatch,
  CodeKind,
  EventType,
  MenuCategory,
  MenuItem,
  Profile,
  ShortCode,
  StatsSummary,
  User,
} from "@/lib/types";

export type ResolveResult =
  | { kind: "assigned"; code: ShortCode; profile: Profile }
  | { kind: "unassigned"; code: ShortCode }
  | { kind: "disabled"; code: ShortCode }
  | { kind: "not_found" };

export interface ProfilesRepo {
  getBySlug(slug: string): Promise<Profile | null>;
  getById(id: string): Promise<Profile | null>;
  getByOwner(ownerId: string): Promise<Profile | null>;
  isSlugAvailable(slug: string, exceptProfileId?: string): Promise<boolean>;
  create(ownerId: string, data: { name: string; slug: string }): Promise<Profile>;
  update(id: string, patch: Partial<Omit<Profile, "id" | "ownerId" | "createdAt">>): Promise<Profile>;
}

export interface MenuRepo {
  list(profileId: string): Promise<{ categories: MenuCategory[]; items: MenuItem[] }>;
  saveCategory(cat: Omit<MenuCategory, "id"> & { id?: string }): Promise<MenuCategory>;
  deleteCategory(id: string): Promise<void>;
  reorderCategories(profileId: string, orderedIds: string[]): Promise<void>;
  saveItem(item: Omit<MenuItem, "id"> & { id?: string }): Promise<MenuItem>;
  deleteItem(id: string): Promise<void>;
}

export interface CodesRepo {
  resolve(code: string): Promise<ResolveResult>;
  listByProfile(profileId: string): Promise<ShortCode[]>;
  listAll(filter?: { status?: ShortCode["status"]; batchId?: string; q?: string }): Promise<ShortCode[]>;
  /** Cliente: activa un código en blanco vinculándolo a su perfil */
  activate(code: string, profileId: string): Promise<ShortCode>;
  /** Admin: asigna / reasigna / libera (profileId null) */
  assign(code: string, profileId: string | null): Promise<ShortCode>;
  setStatus(code: string, status: ShortCode["status"]): Promise<ShortCode>;
  setLabel(code: string, label: string): Promise<ShortCode>;
  listBatches(): Promise<(CodeBatch & { activated: number })[]>;
  createBatch(input: { name: string; kind: CodeKind; quantity: number; note: string }): Promise<{ batch: CodeBatch; codes: ShortCode[] }>;
}

export interface UsersRepo {
  getById(id: string): Promise<User | null>;
  listClients(q?: string): Promise<ClientRow[]>;
  setStatus(id: string, status: User["status"]): Promise<User>;
}

export interface AnalyticsRepo {
  track(event: { type: EventType; profileId: string; code?: string; linkId?: string }): Promise<void>;
  summary(profileId: string | null, days: number): Promise<StatsSummary>;
  recent(profileId: string | null, limit: number): Promise<AnalyticsEvent[]>;
}

export interface StorageRepo {
  /** Sube una imagen y devuelve una URL pública. */
  uploadImage(file: File, opts?: { maxSize?: number }): Promise<string>;
}

export interface DataRepository {
  profiles: ProfilesRepo;
  menu: MenuRepo;
  codes: CodesRepo;
  users: UsersRepo;
  analytics: AnalyticsRepo;
  storage: StorageRepo;
}
