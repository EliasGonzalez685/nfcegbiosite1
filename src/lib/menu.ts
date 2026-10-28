import type { Profile } from "@/lib/types";

/** Categorías con al menos un producto */
export const visibleCategories = (p: Profile) => p.menu.categories.filter((c) => c.items.length > 0);

/** El negocio tiene el menú activado y con productos */
export const hasMenu = (p: Profile) => p.menu.enabled && visibleCategories(p).length > 0;
