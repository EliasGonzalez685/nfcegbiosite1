"use client";

import type { Site } from "@/lib/types";
import { placeholderImage } from "@/lib/utils";
import { BiositeView } from "@/components/biosite/biosite-view";
import { PhoneFrame } from "@/components/panel/top-bar";

// Ejemplo ilustrativo (no es un negocio real)
const demo: Site = {
  id: "demo",
  slug: "demo",
  name: "El Patrón",
  tagline: "Barbería · Encarnación",
  category: "",
  city: "",
  avatarUrl: placeholderImage("💈", "#1a1a1a", "#3a3a3a"),
  accent: "#D4AF37",
  published: true,
  ownerId: null,
  sellerId: null,
  links: [
    { id: "1", type: "whatsapp", label: "Reservá tu turno", value: "595000000000", enabled: true },
    { id: "2", type: "instagram", label: "Instagram", value: "https://instagram.com", enabled: true },
    { id: "3", type: "maps", label: "Cómo llegar", value: "https://maps.google.com", enabled: true },
    { id: "4", type: "google_review", label: "Dejanos tu reseña", value: "https://google.com", enabled: true },
    { id: "5", type: "wifi", label: "WiFi del local", value: "ElPatron", password: "demo", enabled: true },
    { id: "6", type: "vcard", label: "Guardar contacto", value: "", enabled: true },
  ],
  menu: { enabled: false, mode: "items", pdfUrl: null, orderWhatsapp: "", categories: [], images: [] },
};

export function DemoPhone() {
  return (
    <PhoneFrame>
      <BiositeView profile={demo} preview />
    </PhoneFrame>
  );
}
