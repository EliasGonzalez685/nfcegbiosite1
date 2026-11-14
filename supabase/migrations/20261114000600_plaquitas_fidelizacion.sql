-- =====================================================================
-- NFCEGBIOSITE · Plaquitas NFC/QR y tarjetas de fidelización
-- (20261114000500 agregó los valores 'wifi' y 'loyalty' a qr_target y el tipo device_kind)
-- =====================================================================

-- Plaquitas: el mismo código va grabado en el chip NFC y/o impreso como QR
alter table public.qr_codes
  add column kind  public.device_kind not null default 'nfc_qr',
  add column notes text;
alter table public.qr_codes drop constraint qr_target_ok;
alter table public.qr_codes add constraint qr_target_ok check (
  (target_type = 'url' and target_url ~* '^(https?://|mailto:|tel:)')
  or (target_type <> 'url' and business_id is not null)
);

-- Destinos: negocio, menú, WiFi del negocio, tarjeta de fidelidad o cualquier enlace
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

-- ---------------------------------------------------------------------
-- Fidelización: el cliente final escanea/acerca su celular a la plaquita
-- en cada visita y suma un sello. Al completar los sellos gana el premio.
-- ---------------------------------------------------------------------
create table public.loyalty_programs (
  business_id      uuid primary key references public.businesses (id) on delete cascade,
  enabled          boolean not null default false,
  title            text not null default 'Tarjeta de fidelidad',
  reward           text not null default '',
  stamps_required  integer not null default 8 check (stamps_required between 2 and 30),
  cooldown_hours   integer not null default 12 check (cooldown_hours between 0 and 168),
  redeem_pin       text not null default lpad(floor(random() * 10000)::int::text, 4, '0') check (redeem_pin ~ '^[0-9]{4,6}$'),
  updated_at       timestamptz not null default now()
);

create table public.loyalty_cards (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses (id) on delete cascade,
  customer_name     text not null default '',
  phone             text not null check (phone ~ '^[0-9]{6,15}$'),
  token             uuid not null unique default gen_random_uuid(),
  stamps            integer not null default 0 check (stamps >= 0),
  total_stamps      integer not null default 0,
  rewards_redeemed  integer not null default 0,
  last_stamp_at     timestamptz,
  pin_fails         integer not null default 0,
  pin_locked_until  timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (business_id, phone)
);
create index loyalty_cards_business_idx on public.loyalty_cards (business_id, last_stamp_at desc);

create table public.loyalty_events (
  id           bigint generated always as identity primary key,
  card_id      uuid not null references public.loyalty_cards (id) on delete cascade,
  business_id  uuid not null references public.businesses (id) on delete cascade,
  kind         text not null check (kind in ('stamp', 'redeem', 'adjust')),
  delta        integer not null default 0,
  qr_id        uuid references public.qr_codes (id) on delete set null,
  actor_id     uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index loyalty_events_card_idx on public.loyalty_events (card_id, created_at desc);
create index loyalty_events_business_idx on public.loyalty_events (business_id, created_at desc);
create index loyalty_events_qr_idx on public.loyalty_events (qr_id);
create index loyalty_events_actor_idx on public.loyalty_events (actor_id);

create trigger loyalty_programs_touch before update on public.loyalty_programs for each row execute function private.touch_updated_at();
create trigger loyalty_cards_touch before update on public.loyalty_cards for each row execute function private.touch_updated_at();
create trigger log_loyalty_programs after update on public.loyalty_programs for each row execute function private.log_activity();
create trigger log_loyalty_cards after insert or update or delete on public.loyalty_cards for each row execute function private.log_activity();

-- Cada negocio nace con su menú y su programa de fidelidad (desactivados)
create or replace function private.create_menu_row()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.menus (business_id) values (new.id) on conflict do nothing;
  insert into public.loyalty_programs (business_id) values (new.id) on conflict do nothing;
  return new;
end
$$;
insert into public.loyalty_programs (business_id) select id from public.businesses on conflict do nothing;

-- Ajustes manuales de sellos desde el panel quedan como evento
create or replace function private.loyalty_card_adjusted()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and new.stamps is distinct from old.stamps then
    insert into public.loyalty_events (card_id, business_id, kind, delta, actor_id)
    values (new.id, new.business_id, 'adjust', new.stamps - old.stamps, (select auth.uid()));
  end if;
  return new;
end
$$;
create trigger loyalty_cards_adjusted after update on public.loyalty_cards for each row execute function private.loyalty_card_adjusted();

-- Estado de una tarjeta (lo que ve el cliente final)
create or replace function private.loyalty_state(c public.loyalty_cards, p public.loyalty_programs, st text)
returns jsonb language sql stable set search_path = ''
as $$
  select jsonb_build_object(
    'status', st,
    'token', c.token,
    'name', c.customer_name,
    'stamps', c.stamps,
    'required', p.stamps_required,
    'reward', p.reward,
    'rewards_redeemed', c.rewards_redeemed,
    'can_redeem', c.stamps >= p.stamps_required,
    'next_stamp_at', case when c.last_stamp_at is null then null
                          else c.last_stamp_at + make_interval(hours => p.cooldown_hours) end
  )
$$;

-- Busca la plaquita de fidelidad activa y su programa
create or replace function private.loyalty_lookup(p_code text, out q public.qr_codes, out p public.loyalty_programs)
language plpgsql stable security definer set search_path = ''
as $$
begin
  select * into q from public.qr_codes x
  where x.code = upper(trim(p_code)) and x.active and x.target_type = 'loyalty';
  if q.id is null then return; end if;
  select lp.* into p from public.loyalty_programs lp
  join public.businesses b on b.id = lp.business_id
  where lp.business_id = q.business_id and lp.enabled and b.published;
end
$$;

-- Suma un sello si ya pasó el tiempo mínimo entre visitas
create or replace function private.loyalty_do_stamp(p_card uuid, p_qr uuid)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  c public.loyalty_cards;
  p public.loyalty_programs;
begin
  select * into c from public.loyalty_cards where id = p_card for update;
  select * into p from public.loyalty_programs where business_id = c.business_id;
  if c.stamps >= p.stamps_required then
    return private.loyalty_state(c, p, 'complete');
  end if;
  if c.last_stamp_at is not null and now() < c.last_stamp_at + make_interval(hours => p.cooldown_hours) then
    return private.loyalty_state(c, p, 'cooldown');
  end if;
  update public.loyalty_cards
     set stamps = stamps + 1, total_stamps = total_stamps + 1, last_stamp_at = now()
   where id = c.id
  returning * into c;
  insert into public.loyalty_events (card_id, business_id, kind, delta, qr_id) values (c.id, c.business_id, 'stamp', 1, p_qr);
  return private.loyalty_state(c, p, case when c.stamps >= p.stamps_required then 'complete' else 'stamped' end);
end
$$;

-- PÚBLICAS (las usa la página /f/CODIGO, sin iniciar sesión)
create or replace function public.loyalty_info(p_code text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  r record;
  b public.businesses;
begin
  select * into r from private.loyalty_lookup(p_code);
  if (r.p).business_id is null then return null; end if;
  select * into b from public.businesses where id = (r.p).business_id;
  return jsonb_build_object(
    'business', jsonb_build_object('name', b.name, 'slug', b.slug, 'avatar_url', b.avatar_url, 'accent', b.accent),
    'title', (r.p).title, 'reward', (r.p).reward,
    'required', (r.p).stamps_required, 'cooldown_hours', (r.p).cooldown_hours
  );
end
$$;

create or replace function public.loyalty_join(p_code text, p_name text, p_phone text)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  r record;
  ph text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  cid uuid;
begin
  select * into r from private.loyalty_lookup(p_code);
  if (r.p).business_id is null then return jsonb_build_object('status', 'invalid'); end if;
  if ph !~ '^[0-9]{6,15}$' then return jsonb_build_object('status', 'bad_phone'); end if;
  insert into public.loyalty_cards (business_id, customer_name, phone)
  values ((r.p).business_id, left(trim(coalesce(p_name, '')), 60), ph)
  on conflict (business_id, phone) do update
    set customer_name = coalesce(nullif(excluded.customer_name, ''), public.loyalty_cards.customer_name)
  returning id into cid;
  return private.loyalty_do_stamp(cid, (r.q).id);
end
$$;

create or replace function public.loyalty_stamp(p_code text, p_token uuid)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  r record;
  cid uuid;
begin
  select * into r from private.loyalty_lookup(p_code);
  if (r.p).business_id is null then return jsonb_build_object('status', 'invalid'); end if;
  select id into cid from public.loyalty_cards where token = p_token and business_id = (r.p).business_id;
  if cid is null then return jsonb_build_object('status', 'unknown_card'); end if;
  return private.loyalty_do_stamp(cid, (r.q).id);
end
$$;

-- Canje del premio: lo confirma el personal del local con su PIN (5 intentos, luego 15 min de bloqueo)
create or replace function public.loyalty_redeem(p_code text, p_token uuid, p_pin text)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  r record;
  c public.loyalty_cards;
begin
  select * into r from private.loyalty_lookup(p_code);
  if (r.p).business_id is null then return jsonb_build_object('status', 'invalid'); end if;
  select * into c from public.loyalty_cards where token = p_token and business_id = (r.p).business_id for update;
  if c.id is null then return jsonb_build_object('status', 'unknown_card'); end if;
  if c.pin_locked_until is not null and now() < c.pin_locked_until then
    return private.loyalty_state(c, r.p, 'locked');
  end if;
  if coalesce(p_pin, '') <> (r.p).redeem_pin then
    update public.loyalty_cards
       set pin_fails = case when pin_fails + 1 >= 5 then 0 else pin_fails + 1 end,
           pin_locked_until = case when pin_fails + 1 >= 5 then now() + interval '15 minutes' else null end
     where id = c.id returning * into c;
    return private.loyalty_state(c, r.p, case when c.pin_locked_until is not null then 'locked' else 'bad_pin' end);
  end if;
  if c.stamps < (r.p).stamps_required then
    return private.loyalty_state(c, r.p, 'not_ready');
  end if;
  update public.loyalty_cards
     set stamps = stamps - (r.p).stamps_required, rewards_redeemed = rewards_redeemed + 1, pin_fails = 0, pin_locked_until = null
   where id = c.id returning * into c;
  insert into public.loyalty_events (card_id, business_id, kind, delta, qr_id) values (c.id, c.business_id, 'redeem', -(r.p).stamps_required, (r.q).id);
  return private.loyalty_state(c, r.p, 'redeemed');
end
$$;

revoke all on function public.loyalty_info(text), public.loyalty_join(text, text, text),
  public.loyalty_stamp(text, uuid), public.loyalty_redeem(text, uuid, text) from public;
grant execute on function public.loyalty_info(text), public.loyalty_join(text, text, text),
  public.loyalty_stamp(text, uuid), public.loyalty_redeem(text, uuid, text) to anon, authenticated;
grant execute on all functions in schema private to anon, authenticated;

-- Permisos: solo quien administra el negocio ve y edita su programa y sus tarjetas
grant select, insert, update, delete on public.loyalty_programs, public.loyalty_cards to authenticated;
grant select on public.loyalty_events to authenticated;
alter table public.loyalty_programs enable row level security;
alter table public.loyalty_cards    enable row level security;
alter table public.loyalty_events   enable row level security;

create policy "fidelidad: ver" on public.loyalty_programs for select to authenticated using (private.can_manage_business(business_id));
create policy "fidelidad: crear" on public.loyalty_programs for insert to authenticated with check (private.can_manage_business(business_id));
create policy "fidelidad: editar" on public.loyalty_programs for update to authenticated using (private.can_manage_business(business_id)) with check (private.can_manage_business(business_id));

create policy "tarjetas: ver" on public.loyalty_cards for select to authenticated using (private.can_manage_business(business_id));
create policy "tarjetas: crear" on public.loyalty_cards for insert to authenticated with check (private.can_manage_business(business_id));
create policy "tarjetas: editar" on public.loyalty_cards for update to authenticated using (private.can_manage_business(business_id)) with check (private.can_manage_business(business_id));
create policy "tarjetas: borrar" on public.loyalty_cards for delete to authenticated using (private.can_manage_business(business_id));

create policy "eventos fidelidad: ver" on public.loyalty_events for select to authenticated using (private.can_manage_business(business_id));
