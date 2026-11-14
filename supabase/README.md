# Base de datos · Supabase

Proyecto `nfcegbiosite` (ref `jjnerhewdfjdmawdxtux`, región São Paulo, plan Free).
Las migraciones de `migrations/` ya están aplicadas en el proyecto; se guardan acá como historial.

## Roles

| Rol | Quién | Puede |
| --- | --- | --- |
| `admin` | Ustedes (2 por ahora) | Todo: ver y editar cualquier negocio, crear vendedores y clientes, reasignar vendedores, crear/editar/borrar QR, ver prospectos y el registro de actividad completo. |
| `seller` | Vendedores (los crea un admin) | Crear clientes y sus negocios, editar los negocios que atiende, crear QR para sus clientes o con enlace libre, cargar prospectos. Ve solo lo suyo. |
| `client` | Dueños de negocios | Editar su propio negocio: perfil, botones, WiFi, menú. Ve los QR de su negocio. |

El rol se guarda en `profiles.role` y **solo lo puede cambiar un admin**. Quien se registra solo desde la web queda como `client`.

## Tablas

| Tabla | Para qué |
| --- | --- |
| `profiles` | Un perfil por usuario: rol, nombre, teléfono, estado (activo/suspendido), quién lo creó. |
| `businesses` | Cada biosite (`/slug`): dueño, vendedor, logo, color, publicado. |
| `links` | Botones del biosite: WhatsApp, Instagram, WiFi (con contraseña), guardar contacto… |
| `menus` | Configuración del menú de cada negocio: activo, **modo** (`items` editable, `pdf`, `images` fotos), PDF, WhatsApp de pedidos. |
| `menu_categories` / `menu_items` | Menú editable: categorías y productos con foto, precio en Gs. y agotado. |
| `menu_images` | Menú en fotos (fotos de la carta, pizarra…), en orden. |
| `qr_codes` | **Plaquitas NFC/QR**: código fijo (`/q/CODIGO`), tipo (NFC + QR, solo QR, solo NFC) y destino editable: negocio, menú, WiFi, fidelidad o cualquier enlace. |
| `qr_scans` | Cada escaneo de cada QR (fecha y dispositivo). |
| `leads` | Prospectos (posibles clientes) que cargan los vendedores, con estado y próximo contacto. |
| `loyalty_programs` | Programa de fidelidad de cada negocio: premio, sellos necesarios, espera entre sellos, PIN de canje. |
| `loyalty_cards` | Tarjeta de cada cliente final (nombre, WhatsApp, sellos, premios canjeados). |
| `loyalty_events` | Cada sello, canje o ajuste manual. |
| `activity_log` | Registro automático de todo lo que hace cada usuario (quién, qué, cuándo, antes/después). Lo ven los admins. |

## Archivos (Storage)

- `media` (público, imágenes hasta 5 MB): logos, fotos de productos, fotos del menú.
- `menus` (público, PDF hasta 15 MB): menús en PDF.

Ruta obligatoria: `<id-del-negocio>/<archivo>`. Solo pueden subir el admin, el dueño o el vendedor de ese negocio.

## Funciones

- `resolve_qr(code)` — pública. La usa `/q/CODIGO`: devuelve a dónde redirigir y suma el escaneo.
- `loyalty_info`, `loyalty_join`, `loyalty_stamp`, `loyalty_redeem` — públicas. Las usa la tarjeta de fidelidad `/f/CODIGO`.
- Edge Function `users` — `POST /functions/v1/users` con la sesión del usuario:
  - `{ "action": "create", "email", "password", "full_name", "role", "business"?: { "name", "slug" } }` → admin crea cualquier rol; vendedor solo clientes.
  - `{ "action": "update", "user_id", "email"?, "password"?, "full_name"?, "phone"?, "role"?, "status"?, "current_password"? }` → cada uno edita su cuenta (con su contraseña actual); el admin edita a cualquiera; el vendedor, a sus clientes.
- La función antigua `create-user` quedó reemplazada por `users`; se puede borrar desde el panel de Supabase (Edge Functions).

## Administradores

`admin1@nfcegbiosite.com` y `admin2@nfcegbiosite.com` (rol `admin`). Para crear más: desde el panel (Usuarios → Nuevo usuario → Admin).
