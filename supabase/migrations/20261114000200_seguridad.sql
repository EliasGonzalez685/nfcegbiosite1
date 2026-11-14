-- =====================================================================
-- NFCEGBIOSITE · Funciones, triggers y políticas de seguridad (RLS)
-- =====================================================================

-- Las funciones auxiliares viven en un esquema no expuesto por la API
create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- Rol del usuario actual (null si no inició sesión o está suspendido)
create or replace function private.my_role()
returns public.app_role
language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = (select auth.uid()) and p.status = 'active'
$$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(private.my_role() = 'admin', false) $$;

create or replace function private.is_seller()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(private.my_role() = 'seller', false) $$;

create or replace function private.is_staff()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(private.my_role() in ('admin', 'seller'), false) $$;

-- ¿Puede el usuario actual editar este negocio? (admin, su dueño o su vendedor)
create or replace function private.can_manage_business(bid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_admin() or (
    private.my_role() is not null and exists (
      select 1 from public.businesses b
      where b.id = bid and (b.owner_id = (select auth.uid()) or b.seller_id = (select auth.uid()))
    )
  )
$$;

-- ¿Se puede ver públicamente (o la puede editar el usuario)?
create or replace function private.can_view_business(bid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.businesses b where b.id = bid and b.published)
         or private.can_manage_business(bid)
$$;

-- Versión segura para rutas de Storage: '<uuid>/archivo.jpg'
create or replace function private.can_manage_path(object_name text)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
declare
  folder text := split_part(object_name, '/', 1);
begin
  if folder !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  return private.can_manage_business(folder::uuid);
end
$$;

grant execute on all functions in schema private to anon, authenticated;

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;

create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();
create trigger businesses_touch before update on public.businesses for each row execute function private.touch_updated_at();
create trigger links_touch before update on public.links for each row execute function private.touch_updated_at();
create trigger menus_touch before update on public.menus for each row execute function private.touch_updated_at();
create trigger menu_items_touch before update on public.menu_items for each row execute function private.touch_updated_at();
create trigger qr_codes_touch before update on public.qr_codes for each row execute function private.touch_updated_at();
create trigger leads_touch before update on public.leads for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------
-- Alta de usuarios: crea el perfil. El rol sale de app_metadata, que solo
-- puede escribir el servidor (función create-user); el registro público
-- siempre queda como 'client'.
-- ---------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  r public.app_role := 'client';
begin
  if new.raw_app_meta_data ? 'role' and new.raw_app_meta_data->>'role' in ('admin', 'seller', 'client') then
    r := (new.raw_app_meta_data->>'role')::public.app_role;
  end if;
  insert into public.profiles (id, role, full_name, email, phone, created_by)
  values (
    new.id,
    r,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'phone',
    nullif(new.raw_app_meta_data->>'created_by', '')::uuid
  );
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Nadie (salvo admin) cambia su propio rol, estado, email o creador
create or replace function private.guard_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not private.is_admin() then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.email is distinct from old.email
       or new.created_by is distinct from old.created_by then
      raise exception 'Solo un administrador puede cambiar rol, estado o email';
    end if;
  end if;
  return new;
end
$$;
create trigger profiles_guard before update on public.profiles for each row execute function private.guard_profile();

-- Reglas de asignación de negocios
create or replace function private.guard_business()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  me public.app_role := private.my_role();
begin
  if (select auth.uid()) is null or me = 'admin' then
    return new;
  end if;
  -- el dueño debe ser una cuenta de cliente
  if new.owner_id is not null and new.owner_id is distinct from coalesce(old.owner_id, '00000000-0000-0000-0000-000000000000'::uuid)
     and not exists (select 1 from public.profiles p where p.id = new.owner_id and p.role = 'client') then
    raise exception 'El dueño del negocio debe ser una cuenta de cliente';
  end if;
  if tg_op = 'UPDATE' then
    if new.seller_id is distinct from old.seller_id then
      raise exception 'Solo un administrador puede cambiar el vendedor asignado';
    end if;
    if new.owner_id is distinct from old.owner_id and me <> 'seller' then
      raise exception 'No podés cambiar el dueño del negocio';
    end if;
  end if;
  return new;
end
$$;
create trigger businesses_guard before insert or update on public.businesses for each row execute function private.guard_business();

-- Cada negocio nace con su fila de menú (desactivado)
create or replace function private.create_menu_row()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.menus (business_id) values (new.id) on conflict do nothing;
  return new;
end
$$;
create trigger businesses_create_menu after insert on public.businesses for each row execute function private.create_menu_row();

-- El producto debe pertenecer a una categoría del mismo negocio
create or replace function private.guard_menu_item()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if not exists (select 1 from public.menu_categories c where c.id = new.category_id and c.business_id = new.business_id) then
    raise exception 'La categoría no pertenece a este negocio';
  end if;
  return new;
end
$$;
create trigger menu_items_guard before insert or update on public.menu_items for each row execute function private.guard_menu_item();

-- ---------------------------------------------------------------------
-- QR dinámicos: código corto automático, sin 0/O/1/I
-- ---------------------------------------------------------------------
create or replace function private.qr_defaults()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, (select auth.uid()));
    new.scans := 0;
    if new.code is null or new.code = '' then
      loop
        candidate := '';
        for i in 1..6 loop
          candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
        end loop;
        exit when not exists (select 1 from public.qr_codes q where q.code = candidate);
      end loop;
      new.code := candidate;
    end if;
    new.code := upper(new.code);
  elsif (select auth.uid()) is not null and not private.is_admin() then
    -- el código impreso y los contadores no se tocan
    if new.code is distinct from old.code or new.created_by is distinct from old.created_by
       or new.scans is distinct from old.scans then
      raise exception 'No se puede cambiar el código, el creador ni los escaneos';
    end if;
  end if;
  return new;
end
$$;
create trigger qr_codes_defaults before insert or update on public.qr_codes for each row execute function private.qr_defaults();

-- Lo llama la página /q/CODIGO: devuelve el destino actual y registra el escaneo
create or replace function public.resolve_qr(p_code text, p_user_agent text default null)
returns text
language plpgsql volatile security definer set search_path = ''
as $$
declare
  q public.qr_codes%rowtype;
  s text;
  dest text;
begin
  select * into q from public.qr_codes where code = upper(trim(p_code));
  if not found or not q.active then
    return null;
  end if;
  if q.target_type = 'url' then
    dest := q.target_url;
  else
    select b.slug into s from public.businesses b where b.id = q.business_id and b.published;
    if s is null then
      return null;
    end if;
    dest := '/' || s || case when q.target_type = 'menu' then '/menu' else '' end;
  end if;
  insert into public.qr_scans (qr_id, user_agent) values (q.id, left(p_user_agent, 300));
  update public.qr_codes set scans = scans + 1, last_scan_at = now() where id = q.id;
  return dest;
end
$$;
revoke all on function public.resolve_qr(text, text) from public;
grant execute on function public.resolve_qr(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Registro de actividad automático
-- ---------------------------------------------------------------------
create or replace function private.log_activity()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  rec jsonb := to_jsonb(coalesce(new, old));
  bid text;
begin
  if uid is null then
    return coalesce(new, old);
  end if;
  bid := case when tg_table_name = 'businesses' then rec->>'id' else rec->>'business_id' end;
  insert into public.activity_log (actor_id, actor_role, action, entity, entity_id, business_id, data)
  values (
    uid,
    (select p.role from public.profiles p where p.id = uid),
    lower(tg_op),
    tg_table_name,
    coalesce(rec->>'id', rec->>'business_id'),
    nullif(bid, '')::uuid,
    case when tg_op = 'UPDATE' then jsonb_build_object('antes', to_jsonb(old), 'despues', to_jsonb(new)) else rec end
  );
  return coalesce(new, old);
end
$$;

create trigger log_profiles after update on public.profiles for each row execute function private.log_activity();
create trigger log_businesses after insert or update or delete on public.businesses for each row execute function private.log_activity();
create trigger log_links after insert or update or delete on public.links for each row execute function private.log_activity();
create trigger log_menus after update on public.menus for each row execute function private.log_activity();
create trigger log_menu_images after insert or update or delete on public.menu_images for each row execute function private.log_activity();
create trigger log_menu_categories after insert or update or delete on public.menu_categories for each row execute function private.log_activity();
create trigger log_menu_items after insert or update or delete on public.menu_items for each row execute function private.log_activity();
create trigger log_qr_codes after insert or update or delete on public.qr_codes for each row execute function private.log_activity();
create trigger log_leads after insert or update or delete on public.leads for each row execute function private.log_activity();

-- ---------------------------------------------------------------------
-- Permisos de la API + RLS
-- ---------------------------------------------------------------------
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant select on public.businesses, public.links, public.menus, public.menu_images,
                public.menu_categories, public.menu_items to anon;
revoke insert, update, delete on public.activity_log, public.qr_scans from authenticated;

alter table public.profiles        enable row level security;
alter table public.businesses      enable row level security;
alter table public.links           enable row level security;
alter table public.menus           enable row level security;
alter table public.menu_images     enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items      enable row level security;
alter table public.qr_codes        enable row level security;
alter table public.qr_scans        enable row level security;
alter table public.leads           enable row level security;
alter table public.activity_log    enable row level security;

-- PERFILES: cada uno ve el suyo; vendedores ven los clientes que crearon o atienden; admin todo
create policy "perfiles: ver" on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or private.is_admin()
    or (private.is_seller() and role = 'client' and (
      created_by = (select auth.uid())
      or exists (select 1 from public.businesses b where b.owner_id = profiles.id and b.seller_id = (select auth.uid()))
    ))
  );
create policy "perfiles: editar" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or private.is_admin())
  with check (id = (select auth.uid()) or private.is_admin());
create policy "perfiles: borrar (admin)" on public.profiles for delete to authenticated
  using (private.is_admin());

-- NEGOCIOS: públicos si están publicados; editan admin, dueño y su vendedor
create policy "negocios: ver" on public.businesses for select to anon, authenticated
  using (
    published
    or private.is_admin()
    or (private.my_role() is not null and (owner_id = (select auth.uid()) or seller_id = (select auth.uid())))
  );
create policy "negocios: crear" on public.businesses for insert to authenticated
  with check (
    private.is_admin()
    or (private.is_seller() and seller_id = (select auth.uid()))
    or (private.my_role() = 'client' and owner_id = (select auth.uid()) and seller_id is null)
  );
create policy "negocios: editar" on public.businesses for update to authenticated
  using (private.is_admin() or (private.my_role() is not null and (owner_id = (select auth.uid()) or seller_id = (select auth.uid()))))
  with check (private.is_admin() or (private.my_role() is not null and (owner_id = (select auth.uid()) or seller_id = (select auth.uid()))));
create policy "negocios: borrar (admin)" on public.businesses for delete to authenticated
  using (private.is_admin());

-- CONTENIDO DEL NEGOCIO (botones y menú): mismo criterio para todas las tablas
create policy "links: ver" on public.links for select to anon, authenticated using (private.can_view_business(business_id));
create policy "links: crear" on public.links for insert to authenticated with check (private.can_manage_business(business_id));
create policy "links: editar" on public.links for update to authenticated using (private.can_manage_business(business_id)) with check (private.can_manage_business(business_id));
create policy "links: borrar" on public.links for delete to authenticated using (private.can_manage_business(business_id));

create policy "menus: ver" on public.menus for select to anon, authenticated using (private.can_view_business(business_id));
create policy "menus: crear" on public.menus for insert to authenticated with check (private.can_manage_business(business_id));
create policy "menus: editar" on public.menus for update to authenticated using (private.can_manage_business(business_id)) with check (private.can_manage_business(business_id));

create policy "menu_images: ver" on public.menu_images for select to anon, authenticated using (private.can_view_business(business_id));
create policy "menu_images: crear" on public.menu_images for insert to authenticated with check (private.can_manage_business(business_id));
create policy "menu_images: editar" on public.menu_images for update to authenticated using (private.can_manage_business(business_id)) with check (private.can_manage_business(business_id));
create policy "menu_images: borrar" on public.menu_images for delete to authenticated using (private.can_manage_business(business_id));

create policy "menu_categories: ver" on public.menu_categories for select to anon, authenticated using (private.can_view_business(business_id));
create policy "menu_categories: crear" on public.menu_categories for insert to authenticated with check (private.can_manage_business(business_id));
create policy "menu_categories: editar" on public.menu_categories for update to authenticated using (private.can_manage_business(business_id)) with check (private.can_manage_business(business_id));
create policy "menu_categories: borrar" on public.menu_categories for delete to authenticated using (private.can_manage_business(business_id));

create policy "menu_items: ver" on public.menu_items for select to anon, authenticated using (private.can_view_business(business_id));
create policy "menu_items: crear" on public.menu_items for insert to authenticated with check (private.can_manage_business(business_id));
create policy "menu_items: editar" on public.menu_items for update to authenticated using (private.can_manage_business(business_id)) with check (private.can_manage_business(business_id));
create policy "menu_items: borrar" on public.menu_items for delete to authenticated using (private.can_manage_business(business_id));

-- QR DINÁMICOS: admin todo; vendedor los suyos; cliente ve los de su negocio
create policy "qr: ver" on public.qr_codes for select to authenticated
  using (
    private.is_admin()
    or (private.is_seller() and created_by = (select auth.uid()))
    or (business_id is not null and private.can_manage_business(business_id))
  );
create policy "qr: crear" on public.qr_codes for insert to authenticated
  with check (
    private.is_admin()
    or (private.is_seller() and (business_id is null or private.can_manage_business(business_id)))
  );
create policy "qr: editar" on public.qr_codes for update to authenticated
  using (private.is_admin() or (private.is_seller() and created_by = (select auth.uid())))
  with check (private.is_admin() or (private.is_seller() and (business_id is null or private.can_manage_business(business_id))));
create policy "qr: borrar (admin)" on public.qr_codes for delete to authenticated
  using (private.is_admin());

create policy "escaneos: ver" on public.qr_scans for select to authenticated
  using (exists (select 1 from public.qr_codes q where q.id = qr_scans.qr_id));  -- hereda la visibilidad del QR

-- PROSPECTOS: cada vendedor los suyos; admin todos
create policy "prospectos: ver" on public.leads for select to authenticated
  using (private.is_admin() or (private.is_seller() and seller_id = (select auth.uid())));
create policy "prospectos: crear" on public.leads for insert to authenticated
  with check (private.is_admin() or (private.is_seller() and seller_id = (select auth.uid())));
create policy "prospectos: editar" on public.leads for update to authenticated
  using (private.is_admin() or (private.is_seller() and seller_id = (select auth.uid())))
  with check (private.is_admin() or (private.is_seller() and seller_id = (select auth.uid())));
create policy "prospectos: borrar" on public.leads for delete to authenticated
  using (private.is_admin() or (private.is_seller() and seller_id = (select auth.uid())));

-- ACTIVIDAD: admin ve todo; cada vendedor ve lo suyo
create policy "actividad: ver" on public.activity_log for select to authenticated
  using (private.is_admin() or (private.is_seller() and actor_id = (select auth.uid())));
