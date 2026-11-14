import type { Site } from "@/lib/types";

/** Categorías con al menos un producto */
export const visibleCategories = (p: Site) => p.menu.categories.filter((c) => c.items.length > 0);

/** El negocio tiene el menú activado y con contenido según su modo */
export const hasMenu = (p: Site) => {
  if (!p.menu.enabled) return false;
  if (p.menu.mode === "pdf") return !!p.menu.pdfUrl;
  if (p.menu.mode === "images") return p.menu.images.length > 0;
  return visibleCategories(p).length > 0;
};
