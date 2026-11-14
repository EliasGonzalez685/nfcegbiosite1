import { cn } from "@/lib/utils";

/** Barrita de seguridad de la contraseña */
export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  const level = value.length < 8 ? 0 : Math.min(3, Math.max(1, score - 1));
  const labels = ["Muy corta (mínimo 8)", "Aceptable", "Buena", "Muy segura"];
  const colors = ["bg-danger", "bg-amber-500", "bg-brand-2", "bg-ok"];
  return (
    <span className="mt-2 block">
      <span className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full bg-line transition", i <= level && colors[level])} />
        ))}
      </span>
      <span className="mt-1 block text-xs text-ink-3">{labels[level]}</span>
    </span>
  );
}
