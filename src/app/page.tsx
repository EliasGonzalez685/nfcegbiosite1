import Link from "next/link";
import { ArrowRight, Nfc, QrCode, UtensilsCrossed, Wifi, BarChart3, RefreshCcw } from "lucide-react";
import { LogoMark } from "@/components/ui";

const features = [
  { icon: Nfc, title: "NFC y QR", text: "Un código corto permanente por tarjeta o placa. Si cambiás de negocio o perfil, se reasigna." },
  { icon: UtensilsCrossed, title: "Menú con pedidos", text: "Fotos, precios en guaraníes, etiquetas y pedido directo por WhatsApp." },
  { icon: Wifi, title: "WiFi para clientes", text: "Botón para copiar la contraseña y QR de WiFi para imprimir en la mesa." },
  { icon: BarChart3, title: "Estadísticas", text: "Cuántas veces escanean tus tarjetas y en qué enlaces tocan." },
  { icon: QrCode, title: "QR con tu logo", text: "Descargalos en PNG, SVG o PDF listos para imprenta." },
  { icon: RefreshCcw, title: "Editás vos", text: "Cambiás horarios, precios o enlaces al instante, sin reimprimir nada." },
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

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1.1fr_.9fr] lg:pt-20">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-ink-2">
            <span className="size-1.5 rounded-full bg-clay" /> Hecho en Paraguay 🇵🇾
          </span>
          <h1 className="mt-5 font-display text-5xl font-bold leading-[1.02] sm:text-6xl">
            Tu negocio, a <span className="relative whitespace-nowrap text-brand">un toque<svg className="absolute -bottom-2 left-0 w-full text-clay" viewBox="0 0 200 12" preserveAspectRatio="none"><path d="M2 8c50-6 130-6 196-2" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" /></svg></span> del celular.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-ink-2">
            Tarjetas NFC y placas QR que abren tu biosite: redes, WhatsApp, WiFi y tu menú con precios en guaraníes. Lo editás vos, cuando quieras.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/registro" className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-5 font-medium text-white hover:bg-brand-2">
              Empezar gratis <ArrowRight className="size-4" />
            </Link>
            <Link href="/la-cabana-cafe" className="inline-flex h-12 items-center rounded-xl border border-line bg-white px-5 font-medium hover:border-ink-3">
              Ver un ejemplo
            </Link>
          </div>
          <div className="mt-10 rounded-2xl border border-dashed border-line bg-white/50 p-4 text-sm">
            <p className="font-semibold">Probá la demo (datos de prueba)</p>
            <ul className="mt-2 grid gap-1 text-ink-2 sm:grid-cols-2">
              <li>→ <Link className="underline" href="/la-cabana-cafe">Biosite de cafetería</Link></li>
              <li>→ <Link className="underline" href="/la-cabana-cafe/menu">Menú con pedido por WhatsApp</Link></li>
              <li>→ <Link className="underline" href="/t/DEMO24">Activar una tarjeta nueva (DEMO24)</Link></li>
              <li>→ <Link className="underline" href="/t/K7M2QX">Escanear una tarjeta activa</Link></li>
            </ul>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-10 -z-10 rounded-full bg-clay/15 blur-3xl" />
          <div className="relative mx-auto h-[560px] w-[280px] rounded-[44px] border-[10px] border-ink bg-ink shadow-2xl">
            <iframe src="/la-cabana-cafe" title="Ejemplo de biosite" className="size-full rounded-[34px] bg-white" />
          </div>
          <div className="absolute -left-10 bottom-16 aspect-[1.6/1] w-44 rotate-[-10deg] rounded-2xl bg-gradient-to-br from-brand to-[#0f2a1f] p-3 shadow-2xl max-sm:hidden">
            <Nfc className="size-6 text-white/80" />
            <p className="absolute bottom-3 left-3 font-mono text-xs tracking-[.3em] text-white/90">K7M2QX</p>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-6xl gap-px overflow-hidden px-5 py-16 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="p-6">
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
