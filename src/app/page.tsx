import Link from "next/link";
import { ArrowRight, Nfc, Palette, UtensilsCrossed, Wifi } from "lucide-react";
import { LogoMark } from "@/components/ui";

const features = [
  { icon: Nfc, title: "Tarjeta NFC o QR", text: "La acercan al celular o la escanean y se abre tu página. Sin instalar nada." },
  { icon: Palette, title: "Con tu marca", text: "Tu logo, tu nombre y tu color. Lo editás vos y se actualiza al instante." },
  { icon: UtensilsCrossed, title: "Menú para gastronomía", text: "Restaurantes y cafeterías: productos con foto y precio en Gs., y pedidos por WhatsApp." },
  { icon: Wifi, title: "WiFi y contacto", text: "Botón para copiar la contraseña del WiFi y otro para guardar tu contacto." },
];

export default function Home() {
  return (
    <main className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <LogoMark />
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/ingresar" className="rounded-xl px-3 py-2 font-medium text-ink-2 hover:bg-paper-2">Ingresar</Link>
          <Link href="/registro" className="rounded-xl bg-ink px-4 py-2 font-medium text-white hover:bg-ink/90">Crear cuenta</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-8 lg:grid-cols-[1.1fr_.9fr] lg:pt-16">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-ink-2">
            <span className="size-1.5 rounded-full bg-clay" /> Hecho en Paraguay 🇵🇾
          </span>
          <h1 className="mt-5 font-display text-5xl font-bold leading-[1.02] sm:text-6xl">
            Todos tus enlaces, en <span className="text-clay">un toque.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-2">
            Una página elegante con tu logo y tus botones — WhatsApp, Instagram, ubicación, WiFi — que se abre desde una tarjeta NFC o un QR.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/registro" className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-5 font-medium text-white hover:bg-brand-2">
              Crear mi página <ArrowRight className="size-4" />
            </Link>
            <Link href="/barberia-el-patron" className="inline-flex h-12 items-center rounded-xl border border-line bg-white px-5 font-medium hover:border-ink-3">
              Ver un ejemplo
            </Link>
          </div>
          <p className="mt-6 text-sm text-ink-3">
            Más ejemplos: <Link className="underline" href="/parrilla-lo-de-julio">parrilla con menú</Link> · <Link className="underline" href="/la-cabana-cafe">cafetería</Link> · <Link className="underline" href="/dra-silvia-benitez">odontóloga</Link>
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-10 -z-10 rounded-full bg-[#D4AF37]/20 blur-3xl" />
          <div className="relative mx-auto h-[580px] w-[290px] rounded-[44px] border-[9px] border-[#1b1b1c] bg-[#1b1b1c] shadow-2xl">
            <iframe src="/barberia-el-patron" title="Ejemplo" className="size-full rounded-[35px] bg-[#0c0c0d]" />
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-2 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="p-5">
              <f.icon className="size-6 text-clay" />
              <h3 className="mt-3 font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-ink-3">{f.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
