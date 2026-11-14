-- =====================================================================
-- NFCEGBIOSITE · Esquema principal
-- Roles: admin (control total), seller (vendedor), client (negocio)
-- =====================================================================

create type public.app_role as enum ('admin', 'seller', 'client');
create type public.account_status as enum ('active', 'suspended');
create type public.link_type as enum (
  'whatsapp', 'instagram', 'facebook', 'tiktok', 'youtube', 'x', 'linkedin',
  'maps', 'google_review', 'website', 'menu', 'email', 'phone', 'wifi', 'vcard', 'custom'
);
-- Cómo se muestra el menú: productos editables, un PDF, o fotos del menú
create type public.menu_mode as enum ('items', 'pdf', 'images');
-- A dónde apunta un QR dinámico
create type public.qr_target as enum ('business', 'menu', 'url');
create type public.lead_status as enum ('nuevo', 'contactado', 'interesado', 'cerrado', 'perdido');

-- ---------------------------------------------------------------------
-- Perfiles (1 por usuario de auth). El rol solo lo cambia un admin.
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.app_role not null default 'client',
  full_name   text not null default '',
  email       text not null,
  phone       text,
  status      public.account_status not null default 'active',
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'Usuarios de la plataforma con su rol (admin, seller, client).';

-- ---------------------------------------------------------------------
-- Negocios = biosites públicos (/slug)
-- ---------------------------------------------------------------------
create table public.businesses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references public.profiles (id) on delete set null,  -- cliente dueño
  seller_id   uuid references public.profiles (id) on delete set null,  -- vendedor que lo atiende
  slug        text not null unique,
  name        text not null,
  tagline     text not null default '',
  category    text,                    -- restaurante, cafetería, barbería…
  city        text,
  avatar_url  text,
  accent      text not null default '#D4AF37',
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint businesses_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 2 and 60),
  constraint businesses_slug_reserved check (slug not in ('menu','panel','admin','ingresar','registro','recuperar','api','login','salir','ayuda','q','t','vendedor')),
  constraint businesses_accent_hex check (accent ~ '^#[0-9A-Fa-f]{6}$')
);
create index businesses_owner_idx on public.businesses (owner_id);
create index businesses_seller_idx on public.businesses (seller_id);

-- ---------------------------------------------------------------------
-- Botones del biosite (Instagram, WhatsApp, WiFi, guardar contacto…)
-- ---------------------------------------------------------------------
create table public.links (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  type           public.link_type not null,
  label          text not null default '',
  value          text not null default '',   -- URL, número, email; en wifi: nombre de la red
  message        text,                        -- whatsapp: mensaje predefinido
  wifi_password  text,                        -- wifi: contraseña (vacía = abierta)
  enabled        boolean not null default true,
  position       integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index links_business_idx on public.links (business_id, position);

-- ---------------------------------------------------------------------
-- Menú (1 por negocio): editable, PDF o fotos
-- ---------------------------------------------------------------------
create table public.menus (
  business_id     uuid primary key references public.businesses (id) on delete cascade,
  enabled         boolean not null default false,
  mode            public.menu_mode not null default 'items',
  pdf_url         text,                       -- modo pdf
  order_whatsapp  text,                       -- número para pedidos (solo modo items)
  updated_at      timestamptz not null default now(),
  constraint menus_whatsapp_digits check (order_whatsapp is null or order_whatsapp ~ '^[0-9]{8,15}$')
);

-- Fotos del menú (modo images): páginas del menú impreso, carta, pizarra…
create table public.menu_images (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  url          text not null,
  caption      text,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);
create index menu_images_business_idx on public.menu_images (business_id, position);

-- Menú editable (modo items)
create table public.menu_categories (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  name         text not null,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);
create index menu_categories_business_idx on public.menu_categories (business_id, position);

create table public.menu_items (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  category_id  uuid not null references public.menu_categories (id) on delete cascade,
  name         text not null,
  description  text not null default '',
  price        bigint not null default 0 check (price >= 0),  -- guaraníes
  photo_url    text,
  sold_out     boolean not null default false,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index menu_items_category_idx on public.menu_items (category_id, position);
create index menu_items_business_idx on public.menu_items (business_id);

-- ---------------------------------------------------------------------
-- QR dinámicos: el código impreso no cambia, el destino sí.
-- Se abren en /q/CODIGO
-- ---------------------------------------------------------------------
create table public.qr_codes (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  label         text not null default '',
  target_type   public.qr_target not null default 'url',
  business_id   uuid references public.businesses (id) on delete set null,
  target_url    text,
  active        boolean not null default true,
  created_by    uuid references public.profiles (id) on delete set null,
  scans         integer not null default 0,
  last_scan_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint qr_code_format check (code ~ '^[A-Z0-9]{4,12}$'),
  constraint qr_target_ok check (
    (target_type = 'url' and target_url ~* '^(https?://|mailto:|tel:)')
    or (target_type in ('business', 'menu') and business_id is not null)
  )
);
create index qr_codes_business_idx on public.qr_codes (business_id);
create index qr_codes_created_by_idx on public.qr_codes (created_by);

create table public.qr_scans (
  id          bigint generated always as identity primary key,
  qr_id       uuid not null references public.qr_codes (id) on delete cascade,
  scanned_at  timestamptz not null default now(),
  user_agent  text
);
create index qr_scans_qr_idx on public.qr_scans (qr_id, scanned_at desc);

-- ---------------------------------------------------------------------
-- Prospectos (posibles clientes) que cargan los vendedores
-- ---------------------------------------------------------------------
create table public.leads (
  id               uuid primary key default gen_random_uuid(),
  seller_id        uuid references public.profiles (id) on delete set null default auth.uid(),
  business_name    text not null,
  contact_name     text,
  phone            text,
  email            text,
  category         text,
  city             text,
  status           public.lead_status not null default 'nuevo',
  notes            text,
  next_contact_on  date,
  business_id      uuid references public.businesses (id) on delete set null,  -- cuando se convierte en cliente
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index leads_seller_idx on public.leads (seller_id, status);
create index leads_business_idx on public.leads (business_id);

-- ---------------------------------------------------------------------
-- Registro de actividad: los admins ven qué hace cada vendedor/cliente
-- (se llena solo con triggers)
-- ---------------------------------------------------------------------
create table public.activity_log (
  id           bigint generated always as identity primary key,
  actor_id     uuid references public.profiles (id) on delete set null,
  actor_role   public.app_role,
  action       text not null,      -- insert | update | delete | create_user …
  entity       text not null,      -- tabla afectada
  entity_id    text,
  business_id  uuid,               -- sin FK: se conserva aunque se borre el negocio
  data         jsonb,
  created_at   timestamptz not null default now()
);
create index activity_log_created_idx on public.activity_log (created_at desc);
create index activity_log_actor_idx on public.activity_log (actor_id, created_at desc);
create index activity_log_business_idx on public.activity_log (business_id, created_at desc);
create index profiles_created_by_idx on public.profiles (created_by);
