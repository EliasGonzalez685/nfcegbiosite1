import type { User } from "@/lib/types";

export interface Session {
  user: User;
}

/** Contrato de autenticación. La versión Supabase usará supabase.auth.* */
export interface AuthService {
  getSession(): Promise<Session | null>;
  signIn(email: string, password: string): Promise<Session>;
  signUp(input: { name: string; email: string; password: string; businessName: string; slug: string }): Promise<Session>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  onChange(cb: (s: Session | null) => void): () => void;
}
