-- ═══════════════════════════════════════════════════════════════════════
-- EuroBraces — almacenamiento de imágenes de casos clínicos
--
-- Crea el bucket `casos` y las políticas que permiten al panel subir fotos.
-- Sustituye al esquema anterior, donde cada imagen se guardaba como
-- data:image/jpeg;base64 dentro de la propia fila: 12 imágenes inflaban el
-- DOM de la home a 2,2 MB y ninguna era rastreable por Google Imágenes.
--
-- Es idempotente: se puede ejecutar varias veces sin efectos secundarios.
--
-- Cómo ejecutarlo:
--   Opción A — Supabase → SQL Editor → pegar → Run
--   Opción B — Management API, ver supabase/README.md
-- ═══════════════════════════════════════════════════════════════════════


-- ── 1. El bucket ──────────────────────────────────────────────────────
-- public = true      : las imágenes se sirven por URL pública y CDN, que es
--                      justamente lo que las hace indexables.
-- file_size_limit    : 2 MB. El panel ya redimensiona a 1280 px antes de
--                      subir, así que nada legítimo se acerca a ese techo.
-- allowed_mime_types : sólo imágenes. Junto con el límite de tamaño, es la
--                      contención frente a subidas indeseadas (ver README).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'casos',
  'casos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ── 2. Políticas de acceso ────────────────────────────────────────────
-- RLS está activo sobre storage.objects, así que sin políticas explícitas
-- toda subida falla, incluso en un bucket público.

drop policy if exists "casos_lectura_publica" on storage.objects;
drop policy if exists "casos_subida_anon"     on storage.objects;
drop policy if exists "casos_update_anon"     on storage.objects;

-- Lectura: redundante en un bucket público, pero deja la intención explícita
-- y evita sorpresas si alguien pasa el bucket a privado más adelante.
create policy "casos_lectura_publica"
  on storage.objects for select
  to public
  using (bucket_id = 'casos');

-- Subida desde el panel de administración.
create policy "casos_subida_anon"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'casos');

-- Sobrescritura: es lo que usa la cabecera x-upsert de BlogStore.uploadImage().
create policy "casos_update_anon"
  on storage.objects for update
  to anon
  using      (bucket_id = 'casos')
  with check (bucket_id = 'casos');

-- Nota: NO se concede DELETE a anon a propósito. Borrar una imagen desde el
-- panel no está implementado, y no darlo evita que alguien con la clave
-- publishable —que viaja en el JavaScript público— pueda vaciar el bucket.


-- ── 3. Comprobación ───────────────────────────────────────────────────
select
  b.id                                              as bucket,
  b.public,
  b.file_size_limit,
  b.allowed_mime_types,
  (select count(*) from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname like 'casos_%')                as politicas
from storage.buckets b
where b.id = 'casos';
