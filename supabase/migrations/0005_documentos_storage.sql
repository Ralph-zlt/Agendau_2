-- ============================================================================
-- 0005 — ANEXOS CLÍNICOS PERSISTENTES
-- Metadados no Postgres e arquivos em bucket privado; somente admin/vet acessam.
-- ============================================================================

create table if not exists public.documentos (
    id              uuid primary key default gen_random_uuid(),
    tutor_cpf       varchar(14) not null
                    references public.tutores(cpf) on update cascade on delete restrict,
    pet_id          uuid not null references public.pets(id) on delete restrict,
    nome            varchar(255) not null,
    mime_type       varchar(150) not null,
    tamanho_bytes   integer not null check (tamanho_bytes > 0 and tamanho_bytes <= 10485760),
    storage_path    text not null unique,
    criado_por      uuid not null references public.usuarios(id) on delete restrict,
    created_at      timestamptz not null default now(),
    constraint chk_documentos_nome check (length(btrim(nome)) between 1 and 255),
    constraint chk_documentos_path check (
        storage_path !~ '(^/|\\.\\.|\\\\|//)'
        and storage_path like (pet_id::text || '/%')
    )
);

create index if not exists idx_documentos_pet_id on public.documentos(pet_id);
create index if not exists idx_documentos_tutor_cpf on public.documentos(tutor_cpf);

alter table public.documentos enable row level security;
revoke all on public.documentos from anon;
grant select, insert, delete on public.documentos to authenticated;

drop policy if exists documentos_select_clinico on public.documentos;
create policy documentos_select_clinico on public.documentos
    for select to authenticated using (public.e_admin() or public.e_vet());

drop policy if exists documentos_insert_clinico on public.documentos;
create policy documentos_insert_clinico on public.documentos
    for insert to authenticated
    with check (
        (public.e_admin() or public.e_vet())
        and criado_por = auth.uid()
        and exists (
            select 1 from public.pets p
            where p.id = documentos.pet_id and p.tutor_cpf = documentos.tutor_cpf
        )
    );

drop policy if exists documentos_delete_clinico on public.documentos;
create policy documentos_delete_clinico on public.documentos
    for delete to authenticated using (public.e_admin() or public.e_vet());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'dayvet-documentos',
    'dayvet-documentos',
    false,
    10485760,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists dayvet_documentos_select on storage.objects;
create policy dayvet_documentos_select on storage.objects
    for select to authenticated
    using (bucket_id = 'dayvet-documentos' and (public.e_admin() or public.e_vet()));

drop policy if exists dayvet_documentos_insert on storage.objects;
create policy dayvet_documentos_insert on storage.objects
    for insert to authenticated
    with check (bucket_id = 'dayvet-documentos' and (public.e_admin() or public.e_vet()));

drop policy if exists dayvet_documentos_delete on storage.objects;
create policy dayvet_documentos_delete on storage.objects
    for delete to authenticated
    using (bucket_id = 'dayvet-documentos' and (public.e_admin() or public.e_vet()));
