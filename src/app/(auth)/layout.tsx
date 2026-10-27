import Link from "next/link";
import { LogoMark } from "@/components/ui";
import { BRAND } from "@/lib/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/"><LogoMark /></Link>
        <div className="mx-auto my-auto w-full max-w-sm py-10">{children}</div>
        <p className="text-xs text-ink-3">© {new Date().getFullYear()} {BRAND.name} · Hecho en Paraguay</p>
      </div>
      <aside className="relative hidden overflow-hidden bg-brand lg:block">
        <div className="absolute inset-0 opacity-[.07]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="absolute -bottom-40 -right-40 size-[520px] rounded-full bg-clay/30 blur-3xl" />
        <div className="relative flex h-full flex-col justify-end p-14 text-white">
          <div className="mb-auto mt-10 flex gap-4">
            <div className="h-56 w-36 rotate-[-8deg] rounded-[28px] border border-white/20 bg-white/10 p-3 backdrop-blur">
              <div className="h-14 rounded-xl bg-white/25" />
              <div className="mx-auto -mt-5 size-10 rounded-full border-2 border-white/40 bg-clay" />
              <div className="mt-3 space-y-1.5">{[0, 1, 2, 3].map((i) => <div key={i} className="h-5 rounded-lg bg-white/20" />)}</div>
            </div>
            <div className="mt-16 aspect-[1.6/1] w-56 rotate-[6deg] rounded-2xl bg-gradient-to-br from-[#f3d6c7] to-clay p-4 shadow-2xl">
              <svg viewBox="0 0 24 24" className="size-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8.5 8.5a5 5 0 0 1 0 7" /><path d="M12 6a8.5 8.5 0 0 1 0 12" /><path d="M15.5 3.5a12 12 0 0 1 0 17" /></svg>
            </div>
          </div>
          <p className="font-display text-4xl font-bold leading-[1.05]">Tu negocio,<br />a un toque del celular.</p>
          <p className="mt-4 max-w-md text-white/75">Redes, WhatsApp, WiFi y tu menú con precios en guaraníes — todo desde una tarjeta NFC o un QR en la mesa.</p>
        </div>
      </aside>
    </div>
  );
}
