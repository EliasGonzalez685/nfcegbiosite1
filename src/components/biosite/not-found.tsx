import Link from "next/link";
import { LogoMark } from "@/components/ui";

export function NotFoundCard({ title = "No encontramos esta página", text = "Puede que la dirección esté mal escrita o que el negocio haya pausado su biosite." }: { title?: string; text?: string }) {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-sm text-center">
        <LogoMark />
        <p className="mt-8 font-display text-6xl font-bold text-clay">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-ink-3">{text}</p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-brand underline underline-offset-4">Ir al inicio</Link>
      </div>
    </main>
  );
}
