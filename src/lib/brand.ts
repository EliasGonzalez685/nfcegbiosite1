/** Identidad de la plataforma. Cambiar acá actualiza toda la interfaz. */
export const BRAND = {
  name: "NFCEGBIOSITE",
  /** Partes del logotipo: la segunda va en color de acento */
  wordmark: ["NFCEG", "BIOSITE"] as const,
  /** Dominio que se muestra como prefijo de las direcciones (el real sale de NEXT_PUBLIC_BASE_URL) */
  domain: "nfcegbiosite.com",
  tagline: "Biosites para tarjetas NFC y QR",
  storagePrefix: "nfcegbiosite",
} as const;
