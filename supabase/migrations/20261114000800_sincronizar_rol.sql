-- Supabase Auth crea el usuario y recién después escribe app_metadata (rol, creador).
-- Este trigger mantiene el perfil sincronizado. app_metadata solo lo puede escribir el servidor.
create or replace function private.sync_role_from_auth()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  r text := new.raw_app_meta_data->>'role';
  creator text := new.raw_app_meta_data->>'created_by';
begin
  if r in ('admin', 'seller', 'client') and r is distinct from (old.raw_app_meta_data->>'role') then
    update public.profiles set role = r::public.app_role where id = new.id;
  end if;
  if creator is not null and creator is distinct from (old.raw_app_meta_data->>'created_by') then
    update public.profiles set created_by = creator::uuid where id = new.id and created_by is null;
  end if;
  return new;
end
$$;

create trigger on_auth_user_app_meta_updated
  after update of raw_app_meta_data on auth.users
  for each row execute function private.sync_role_from_auth();

update public.profiles p
   set role = (u.raw_app_meta_data->>'role')::public.app_role
  from auth.users u
 where u.id = p.id
   and u.raw_app_meta_data->>'role' in ('admin', 'seller', 'client')
   and p.role::text <> u.raw_app_meta_data->>'role';
update public.profiles p
   set created_by = (u.raw_app_meta_data->>'created_by')::uuid
  from auth.users u
 where u.id = p.id and p.created_by is null and u.raw_app_meta_data ? 'created_by';
