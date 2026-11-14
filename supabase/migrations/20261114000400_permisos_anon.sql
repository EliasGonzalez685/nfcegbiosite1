-- El público sin sesión solo puede LEER las páginas publicadas (negocios, botones y menús)
revoke all on public.profiles, public.qr_codes, public.qr_scans, public.leads, public.activity_log from anon;
revoke insert, update, delete, truncate on public.businesses, public.links, public.menus, public.menu_images,
  public.menu_categories, public.menu_items from anon;
revoke truncate on all tables in schema public from authenticated;
