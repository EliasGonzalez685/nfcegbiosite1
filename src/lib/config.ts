// Valores públicos del proyecto Supabase (seguros en el navegador: la seguridad la dan las políticas RLS).
// Se pueden sobrescribir con .env.local
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://jjnerhewdfjdmawdxtux.supabase.co";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_3A4yhBj6iAGIMDvzOckTyA_AVz9bHt4";
