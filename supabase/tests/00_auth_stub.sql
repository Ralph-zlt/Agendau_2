-- Stub mínimo do Supabase para validar as migrations fora da nuvem.
-- Não vai para o projeto: existe só no Postgres descartável de teste.

create schema if not exists auth;
create schema if not exists storage;

create table if not exists auth.users (
    id                 uuid primary key,
    email              text unique,
    encrypted_password text,
    created_at         timestamptz not null default now()
);

-- Mesma semântica do auth.uid() do Supabase: prefere o claim único,
-- cai para o JSON de claims.
create or replace function auth.uid()
returns uuid
language sql stable
as $$
    select coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
$$;

create table if not exists storage.buckets (
    id text primary key,
    name text not null,
    public boolean not null default false,
    file_size_limit bigint,
    allowed_mime_types text[]
);

create table if not exists storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text not null references storage.buckets(id),
    name text not null,
    created_at timestamptz not null default now()
);
alter table storage.objects enable row level security;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;

grant usage on schema public to anon, authenticated;
grant usage on schema auth to anon, authenticated;
grant usage on schema storage to authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant select, insert, delete on storage.objects to authenticated;
