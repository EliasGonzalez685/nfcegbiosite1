/**
 * Punto único de acceso a datos.
 * Para pasar a Supabase: `export const db = supabaseRepository;`
 */
import type { DataRepository } from "./repository";
import { mockRepository } from "./mock";

export const db: DataRepository = mockRepository;
export type { DataRepository } from "./repository";
export { RESERVED_SLUGS } from "./mock";
