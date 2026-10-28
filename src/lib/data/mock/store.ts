import { createSeed, SEED_VERSION, type MockDB } from "./seed";
import { BRAND } from "@/lib/brand";

const KEY = `${BRAND.storagePrefix}-mock-db`;
let memory: MockDB | null = null;
const listeners = new Set<() => void>();

export function getDB(): MockDB {
  if (memory) return memory;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MockDB;
        if (parsed.version === SEED_VERSION) {
          memory = parsed;
          return memory;
        }
      }
    } catch {
      /* localStorage no disponible o corrupto: se usa la semilla */
    }
  }
  memory = createSeed();
  persist();
  return memory;
}

export function persist() {
  if (typeof window === "undefined" || !memory) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    console.warn("[mock] No se pudo guardar en localStorage (¿imágenes muy pesadas?)");
  }
  listeners.forEach((l) => l());
}

export function resetDB() {
  memory = createSeed();
  persist();
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Simula latencia de red para que los estados de carga se vean como en producción */
export function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((res) => setTimeout(() => res(structuredClone(value)), ms));
}
