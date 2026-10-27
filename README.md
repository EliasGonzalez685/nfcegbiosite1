# NFCEGBIOSITE — Biosites para tarjetas NFC y QR

Frontend de la plataforma (Next.js App Router + TypeScript + Tailwind v4) con **datos de prueba**.
Supabase se conecta después reemplazando la capa de datos.

## Cómo ejecutarlo

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abrí http://localhost:3000

### Cuentas de prueba

| Rol | Email | Contraseña |
| --- | --- | --- |
| Cliente con menú (La Cabaña Café) | cafe@demo.com | demo123 |
| Cliente sin menú (Dra. Silvia Benítez) | dra@demo.com | demo123 |
| Cliente (Barbería El Patrón, tema oscuro) | barber@demo.com | demo123 |
| Administrador | admin@nfcegbiosite.com | admin123 |

Códigos en blanco para probar la activación: `DEMO24`, `F8JX4N`, `M5TV9C`, `R3GD8K`.
Códigos ya activos: `K7M2QX`, `P4HN8R`, `T9WC3V` (café), `B3ZK6D` (dra), `H6RY2M` (barbería).

Los datos se guardan en el `localStorage` del navegador. Para volver al estado inicial:
panel admin → **Reiniciar demo**.

### Probar desde el celular

`npm run dev -- -H 0.0.0.0` y abrí `http://IP-DE-TU-PC:3000` desde el celular (misma red WiFi).
Para que los QR generados apunten a esa IP, creá `.env.local` con
`NEXT_PUBLIC_BASE_URL=http://IP-DE-TU-PC:3000`.

## Rutas

| Ruta | Pantalla |
| --- | --- |
| `/` | Inicio / presentación |
| `/[slug]` | Biosite público |
| `/[slug]/menu` | Menú con carrito y pedido por WhatsApp |
| `/t/[CODIGO]` | Código corto: redirige al biosite o muestra la activación |
| `/registro`, `/ingresar`, `/recuperar` | Autenticación |
| `/panel/*` | Panel del cliente (inicio, perfil, enlaces, wifi, menú, códigos, vista previa) |
| `/admin/*` | Panel admin (resumen, clientes, lotes, códigos) |

## Estructura

```
src/
  app/                    rutas (App Router)
  components/
    biosite/              biosite y menú públicos (también usados en la vista previa)
    panel/                shell de paneles, editores, gráficos, herramientas QR
    ui/                   componentes base (botones, inputs, modal, toasts)
  lib/
    types.ts              tipos de dominio (≈ tablas de Supabase)
    data/
      repository.ts       ← CONTRATO de la capa de datos
      index.ts            ← elige la implementación (hoy: mock)
      mock/               implementación con localStorage + semilla
    auth/                 contrato de auth + implementación mock
    qr.ts                 generación de QR PNG / SVG / PDF con logo
    links.ts              enlaces, WhatsApp, vCard, QR WiFi
```

## Pasar a Supabase

1. Crear `src/lib/data/supabase/index.ts` que implemente `DataRepository` (`repository.ts`).
2. Crear `src/lib/auth/supabase.ts` que implemente `AuthService` con `supabase.auth`.
3. Cambiar las exportaciones en `src/lib/data/index.ts` y `src/lib/auth/index.ts`.
4. Las páginas no cambian: solo hablan con `db` y `auth`.

Recomendaciones para ese paso:
- `/t/[code]` conviene convertirlo en Route Handler o página de servidor que haga el `redirect` (más rápido al escanear y registra el escaneo en el servidor).
- `/[slug]` como Server Component para SEO y vista previa al compartir en WhatsApp.
- Fotos en Supabase Storage (bucket público `media`), RLS para que cada cliente solo edite su perfil.

## Notas

- El nombre, dominio y logotipo de la plataforma se configuran en `src/lib/brand.ts`.
- Una web no puede conectar el celular al WiFi automáticamente; por eso el biosite ofrece “Copiar contraseña” y el panel genera el QR de WiFi para imprimir.
