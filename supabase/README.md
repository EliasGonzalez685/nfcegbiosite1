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
| `qr_codes` | **QR dinámicos**: código fijo impreso (`/q/CODIGO`) cuyo destino se cambia cuando quieran: un negocio, su menú o cualquier enlace. |
| `qr_scans` | Cada escaneo de cada QR (fecha y dispositivo). |
| `leads` | Prospectos (posibles clientes) que cargan los vendedores, con estado y próximo contacto. |
| `activity_log` | Registro automático de todo lo que hace cada usuario (quién, qué, cuándo, antes/después). Lo ven los admins. |

## Archivos (Storage)

- `media` (público, imágenes hasta 5 MB): logos, fotos de productos, fotos del menú.
- `menus` (público, PDF hasta 15 MB): menús en PDF.

Ruta obligatoria: `<id-del-negocio>/<archivo>`. Solo pueden subir el admin, el dueño o el vendedor de ese negocio.

## Funciones

- `resolve_qr(code)` — pública. La usa la página `/q/CODIGO`: devuelve a dónde redirigir y suma el escaneo.
- Edge Function `create-user` — `POST /functions/v1/create-user` con la sesión del admin o vendedor:
  ```json
  { "email": "...", "password": "...", "full_name": "...", "role": "seller | client | admin",
    "business": { "name": "Lo de Julio", "slug": "lo-de-julio" } }
  ```

## Crear los dos administradores

1. Cada uno se registra en la web (queda como cliente).
2. Un admin existente (o el SQL Editor de Supabase) lo promueve:
   ```sql
   update public.profiles set role = 'admin' where email = 'correo@ejemplo.com';
   ```
