"use client";

import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Loader2, X, ImagePlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/data";
import { useToast } from "./toast";
import { BRAND } from "@/lib/brand";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "clay";

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean; icon?: ReactNode }
>(function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, ...props }, ref) {
  const variants: Record<Variant, string> = {
    primary: "bg-brand text-white hover:bg-brand-2 shadow-[0_1px_0_rgba(255,255,255,.15)_inset]",
    secondary: "bg-white text-ink border border-line hover:border-ink-3",
    ghost: "text-ink-2 hover:bg-paper-2 hover:text-ink",
    danger: "bg-white text-danger border border-danger/30 hover:bg-danger hover:text-white",
    clay: "bg-clay text-white hover:brightness-95",
  };
  const sizes = { sm: "h-8 px-3 text-sm gap-1.5", md: "h-10 px-4 text-[15px] gap-2", lg: "h-12 px-5 text-base gap-2" };
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center rounded-xl font-medium transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export function Field({ label, hint, error, children, className }: { label?: string; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span> : hint ? <span className="mt-1 block text-xs text-ink-3">{hint}</span> : null}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) {
  return <input ref={ref} className={cn("field", className)} {...p} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) {
  return <textarea ref={ref} className={cn("field min-h-[90px] resize-y", className)} {...p} />;
});

export function Select({ className, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("field appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22><path d=%22M1 1l5 5 5-5%22 stroke=%22%237c8379%22 stroke-width=%221.6%22 fill=%22none%22/></svg>')] bg-[right_14px_center] bg-no-repeat pr-9", className)} {...p}>
      {children}
    </select>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; description?: string; disabled?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", disabled && "cursor-not-allowed opacity-60")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition", checked ? "bg-brand" : "bg-line")}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </button>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-[15px] font-medium text-ink">{label}</span>}
          {description && <span className="block text-sm text-ink-3">{description}</span>}
        </span>
      )}
    </label>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "ok" | "warn" | "danger" | "brand" | "clay"; className?: string }) {
  const tones = {
    neutral: "bg-paper-2 text-ink-2",
    ok: "bg-brand-soft text-brand",
    warn: "bg-amber-100 text-amber-800",
    danger: "bg-red-50 text-danger",
    brand: "bg-brand text-white",
    clay: "bg-clay-soft text-clay",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-ink-3", className)} />;
}

export function PageLoader() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <Spinner className="size-6" />
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-white/50 px-6 py-12 text-center">
      {icon && <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-paper-2 text-ink-2">{icon}</div>}
      <p className="font-display text-lg font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-3">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        className={cn("animate-rise flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-paper-2" aria-label="Cerrar">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

export function ImageUpload({
  value,
  onChange,
  label = "Subir imagen",
  shape = "square",
  maxSize = 800,
  className,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  shape?: "square" | "circle" | "wide";
  maxSize?: number;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const shapes = { square: "aspect-square rounded-2xl", circle: "aspect-square rounded-full", wide: "aspect-[3/1] rounded-2xl" };
  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await db.storage.uploadImage(file, { maxSize }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }
  return (
    <div className={cn("group relative overflow-hidden border border-dashed border-line bg-paper-2", shapes[shape], className)}>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <button type="button" onClick={() => ref.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs text-ink-3 hover:text-ink">
          {busy ? <Spinner /> : <ImagePlus className="size-6" />}
          <span className="px-2 text-center">{label}</span>
        </button>
      )}
      {value && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink/50 opacity-0 transition group-hover:opacity-100 max-sm:opacity-100 max-sm:items-end max-sm:bg-transparent max-sm:pb-2">
          <button type="button" onClick={() => ref.current?.click()} className="rounded-lg bg-white/95 px-2.5 py-1 text-xs font-medium text-ink shadow">
            {busy ? "…" : "Cambiar"}
          </button>
          <button type="button" onClick={() => onChange(null)} className="grid size-7 place-items-center rounded-lg bg-white/95 text-danger shadow" aria-label="Quitar">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

export function SectionCard({ title, description, children, action }: { title: string; description?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display text-lg font-bold", className)}>
      <span className="relative grid size-8 place-items-center rounded-[10px] bg-brand text-white">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M8.5 8.5a5 5 0 0 1 0 7" />
          <path d="M12 6a8.5 8.5 0 0 1 0 12" />
          <path d="M15.5 3.5a12 12 0 0 1 0 17" />
          <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </svg>
        <span className="absolute -right-1 -top-1 size-2.5 rounded-full border-2 border-paper bg-clay" />
      </span>
      <span className="tracking-tight">
        {BRAND.wordmark[0]}
        <span className="text-clay">{BRAND.wordmark[1]}</span>
      </span>
    </span>
  );
}
