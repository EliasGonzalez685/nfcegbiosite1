-- =====================================================================
-- NFCEGBIOSITE · Archivos
-- Rutas: <business_id>/<archivo>   (ej.: 5f1c…/logo.png, 5f1c…/menu/carta.pdf)
--   media → logos, fotos de productos y fotos del menú (imágenes, 5 MB)
--   menus → menús en PDF (15 MB)
-- Lectura pública; escriben solo admin, el dueño o el vendedor del negocio.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']),
  ('menus', 'menus', true, 15728640, array['application/pdf'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "archivos: subir" on storage.objects for insert to authenticated
  with check (bucket_id in ('media', 'menus') and private.can_manage_path(name));

create policy "archivos: reemplazar" on storage.objects for update to authenticated
  using (bucket_id in ('media', 'menus') and private.can_manage_path(name))
  with check (bucket_id in ('media', 'menus') and private.can_manage_path(name));

create policy "archivos: borrar" on storage.objects for delete to authenticated
  using (bucket_id in ('media', 'menus') and private.can_manage_path(name));

-- Necesario para que el panel pueda listar / reemplazar sus propios archivos
create policy "archivos: listar propios" on storage.objects for select to authenticated
  using (bucket_id in ('media', 'menus') and private.can_manage_path(name));
