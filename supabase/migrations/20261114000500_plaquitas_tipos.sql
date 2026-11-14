-- Plaquitas: nuevos destinos (WiFi, fidelización) y tipo de plaquita
alter type public.qr_target add value if not exists 'wifi';
alter type public.qr_target add value if not exists 'loyalty';
create type public.device_kind as enum ('nfc_qr', 'qr', 'nfc');
