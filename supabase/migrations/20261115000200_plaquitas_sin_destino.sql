-- Plaquitas en blanco: se imprimen/graban primero y el destino se asigna después
alter table public.qr_codes drop constraint qr_target_ok;
alter table public.qr_codes add constraint qr_target_ok check (
  target_type = 'none'
  or (target_type = 'url' and target_url ~* '^(https?://|mailto:|tel:)')
  or (target_type not in ('url', 'none') and business_id is not null)
);

-- Una plaquita sin destino cuenta el escaneo (sirve para probarla) pero no redirige
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
  if q.target_type = 'none' then
    update public.qr_codes set scans = scans + 1, last_scan_at = now() where id = q.id;
    return null;
  end if;
  if q.target_type = 'url' then
    dest := q.target_url;
  else
    select b.slug into s from public.businesses b where b.id = q.business_id and b.published;
    if s is null then
      return null;
    end if;
    dest := case q.target_type
      when 'menu' then '/' || s || '/menu'
      when 'wifi' then '/' || s || '?wifi=1'
      when 'loyalty' then '/f/' || q.code
      else '/' || s
    end;
  end if;
  insert into public.qr_scans (qr_id, user_agent) values (q.id, left(p_user_agent, 300));
  update public.qr_codes set scans = scans + 1, last_scan_at = now() where id = q.id;
  return dest;
end
$$;
