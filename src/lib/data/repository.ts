/**
 * Contrato de la capa de datos.
 *
 * Todo el frontend habla SOLO con estas interfaces (vía `@/lib/data`).
 * Hoy la implementación es `mock/` (localStorage + datos de prueba).
 * Para conectar Supabase: crear `supabase/` que implemente estas mismas
 * interfaces y cambiar la exportación en `src/lib/data/index.ts`.
 */
import type { ClientRow, Profile, User } from "@/lib/types";

export interface ProfilesRepo {
  getBySlug(slug: string): Promise<Profile | null>;
  getByOwner(ownerId: string): Promise<Profile | null>;
  isSlugAvailable(slug: string, exceptProfileId?: string): Promise<boolean>;
  create(ownerId: string, data: { name: string; slug: string }): Promise<Profile>;
  update(id: string, patch: Partial<Omit<Profile, "id" | "ownerId" | "createdAt">>): Promise<Profile>;
}

export interface UsersRepo {
  listClients(q?: string): Promise<ClientRow[]>;
  setStatus(id: string, status: User["status"]): Promise<User>;
}

export interface StorageRepo {
  /** Sube una imagen y devuelve una URL pública. */
  uploadImage(file: File, opts?: { maxSize?: number }): Promise<string>;
}

export interface DataRepository {
  profiles: ProfilesRepo;
  users: UsersRepo;
  storage: StorageRepo;
}
