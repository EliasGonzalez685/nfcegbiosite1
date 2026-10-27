import type { AuthService } from "./types";
import { mockAuth } from "./mock";

/** Para Supabase: reemplazar por la implementación con supabase.auth */
export const auth: AuthService = mockAuth;
export type { AuthService, Session } from "./types";
