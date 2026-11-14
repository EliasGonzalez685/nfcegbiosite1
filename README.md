# NFCEGBIOSITE

Plataforma de plaquitas **NFC y QR** para negocios de Paraguay: cada negocio tiene su página (logo, color, botones de WhatsApp, redes, WiFi, guardar contacto), un menú opcional (editable, PDF o fotos) y una **tarjeta de fidelidad** con sellos. Las plaquitas tienen un código fijo y su destino se cambia desde el panel cuando quieran.

Next.js (App Router) + TypeScript + Tailwind v4, con **Supabase** (auth, base de datos, archivos y funciones).

## Ejecutar

Requisitos: Node.js 20 o superior.

```bash
npm install
npm run dev        # http://localhost:3000
npm run dev:red    # para abrirlo desde el celular en la misma red WiFi
```

No hace falta `.env.local`: la dirección y la clave pública de Supabase ya vienen por defecto (ver `src/lib/config.ts`). Para producción conviene definir `NEXT_PUBLIC_BASE_URL` con el dominio real, porque es la dirección que se graba en las plaquitas (ver `.env.example`).

## Cuentas

- Administradores: `admin1` y `admin2` (en el login se puede escribir solo el usuario; el email completo es `admin1@nfcegbiosite.com`). Cada uno puede cambiar su email y contraseña en **Mi cuenta**.
- Los vendedores y clientes los crean los administradores (y los vendedores pueden crear clientes) desde el panel.

## Roles

| Rol | Ve y hace |
| --- | --- |
| Admin | Todo: negocios, usuarios (crear, cambiar email/contraseña/rol, suspender), plaquitas, prospectos, actividad de todos. |
| Vendedor | Crea clientes y negocios, edita los negocios que atiende, configura y graba sus plaquitas, carga prospectos. Ve solo lo suyo. |
| Cliente | Edita su página, menú y fidelización. Ve sus plaquitas. |

## Pantallas

| Ruta | Para qué |
| --- | --- |
| `/` | Presentación |
| `/ingresar`, `/recuperar`, `/restablecer` | Acceso y recuperación de contraseña |
| `/cuenta` | Mi cuenta: nombre, teléfono, email y contraseña |
| `/panel` | Cliente: su negocio (Página · Menú · Fidelización · Plaquitas) |
| `/admin` | Inicio del admin/vendedor |
| `/admin/negocios`, `/admin/negocios/[id]` | Negocios y su editor (más dueño y vendedor) |
| `/admin/plaquitas` | Plaquitas NFC/QR: crear, cambiar destino, descargar QR, **grabar y leer NFC** |
| `/admin/usuarios` | Cuentas |
| `/admin/prospectos` | Posibles clientes con su estado |
| `/admin/actividad` | Registro de todo lo que hace cada persona |
| `/[direccion]` y `/[direccion]/menu` | Página pública del negocio y su menú |
| `/q/CODIGO` | Lo que abre una plaquita (redirige al destino configurado) |
| `/f/CODIGO` | Tarjeta de fidelidad del cliente final (sumar sellos y canjear) |

## Plaquitas NFC / QR

- Cada plaquita tiene un código de 6 caracteres. Su dirección es `https://<dominio>/q/CODIGO`: eso se graba en el chip NFC y se imprime como QR.
- Destinos: página del negocio, menú, WiFi, tarjeta de fidelidad, WhatsApp, Instagram, reseña de Google, ubicación o cualquier enlace. Se cambia sin reimprimir ni volver a grabar.
- **Grabar NFC** funciona desde **Chrome en Android** (Web NFC). En iPhone o compu, el panel ofrece copiar el enlace para grabarlo con la app NFC Tools.
- Grabá las plaquitas definitivas desde la web publicada (no desde `localhost`), así quedan con el dominio correcto.

## Fidelización

El cliente final escanea o acerca el celular a una plaquita con destino **Tarjeta de fidelidad**: la primera vez deja su nombre y WhatsApp y suma un sello; las siguientes suma solo (su tarjeta queda guardada en el celular). Hay un tiempo mínimo entre sellos para evitar trampas. Al completar los sellos, el personal del local entrega el premio ingresando su **PIN** en el celular del cliente (5 intentos y bloqueo de 15 minutos).

## Base de datos

Todo lo de Supabase (tablas, permisos, funciones y migraciones) está en [`supabase/`](supabase/README.md).
