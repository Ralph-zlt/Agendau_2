-- ============================================================================
-- DayVet-Gestão — Schema v2 (Supabase / PostgreSQL 15+)
-- Substitui docs/sql/schema.sql (obsoleto).
--
-- DECISÕES DESTA VERSÃO (dono, 2026-11-13):
--   1. SINGLE-CLINIC: sem tabela `clinicas` e sem `clinica_id` nas tabelas.
--   2. Autenticação pelo Supabase Auth (`auth.users`): a senha NÃO fica aqui.
--      `public.usuarios.id` = `auth.users.id`.
--   3. RF-10 cancelado: enum de histórico só tem 'receita' e 'vacina'.
--   4. Sem tabela `vacinacoes` nem enum `forma_farmaceutica` (o produto não usa:
--      vacina vive em `agendamentos.vacina_tipo` + `historico_clinico`).
--   5. `agendamentos.pet_id` é NULLABLE (o app permite agendar sem pet).
--   6. Histórico clínico é editável/excluível por admin e veterinário (o
--      produto tem essas ações); a proteção fica no RLS, não em trigger.
--   7. Anexos (`documentos`) entram em migration futura junto com o Storage.
--
-- Execução: supabase/migrations/0001 → 0002 (seed) → 0003 (RLS)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

do $$ begin create type user_role as enum ('admin', 'veterinario', 'funcionario');
exception when duplicate_object then null; end $$;

do $$ begin create type agendamento_status as enum ('pendente', 'confirmado', 'cancelado', 'concluido');
exception when duplicate_object then null; end $$;

do $$ begin create type historico_tipo as enum ('receita', 'vacina');
exception when duplicate_object then null; end $$;

do $$ begin create type pet_especie as enum ('Canino', 'Felino', 'Equino', 'Bovino', 'Suíno', 'Ovino', 'Outro');
exception when duplicate_object then null; end $$;

do $$ begin create type pet_sexo as enum ('Macho', 'Fêmea');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- 2. FUNÇÃO DE updated_at (usada por todas as tabelas com o campo)
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at := now();
    return new;
end $$;

-- ============================================================================
-- 3. USUÁRIOS (staff) — perfil 1:1 com auth.users
--    A senha mora em auth.users; aqui ficam apenas dados de perfil e RBAC.
-- ============================================================================

create table if not exists public.usuarios (
    id              uuid primary key references auth.users(id) on delete cascade,
    cpf             varchar(14) not null unique,
    nome            varchar(255) not null,
    email           varchar(255) not null unique,
    telefone        varchar(20),
    role            user_role not null,
    crm             varchar(50),
    crm_validade    date,
    must_change     boolean not null default true,
    active          boolean not null default true,
    criado_por      uuid references public.usuarios(id),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    deleted_at      timestamptz,
    constraint chk_usuarios_cpf check (cpf ~ '^\d{3}\.\d{3}\.\d{3}-\d{2}$'),
    constraint chk_usuarios_telefone check (
        telefone is null or length(regexp_replace(telefone, '\D', '', 'g')) = 11
    )
);

create index if not exists idx_usuarios_role on public.usuarios(role);
create index if not exists idx_usuarios_active on public.usuarios(active) where deleted_at is null;

drop trigger if exists trg_usuarios_updated_at on public.usuarios;
create trigger trg_usuarios_updated_at
before update on public.usuarios
for each row execute function public.set_updated_at();

-- ============================================================================
-- 4. TUTORES (clientes, sem login) — PK = CPF (chave natural usada pelo app)
-- ============================================================================

create table if not exists public.tutores (
    cpf             varchar(14) primary key,
    nome            varchar(255) not null,
    email           varchar(255),
    telefone        varchar(20) not null,
    endereco        text,
    arquivado       boolean not null default false,   -- soft delete (arquivar/restaurar)
    arquivado_em    timestamptz,
    criado_por      uuid references public.usuarios(id),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    constraint chk_tutores_cpf check (cpf ~ '^\d{3}\.\d{3}\.\d{3}-\d{2}$'),
    constraint chk_tutores_telefone check (
        length(regexp_replace(telefone, '\D', '', 'g')) = 11
    ),
    constraint chk_tutores_arquivado_em check (
        (arquivado and arquivado_em is not null) or (not arquivado and arquivado_em is null)
    )
);

create index if not exists idx_tutores_nome on public.tutores(nome);
create index if not exists idx_tutores_email on public.tutores(email);
create index if not exists idx_tutores_arquivado on public.tutores(arquivado);

drop trigger if exists trg_tutores_updated_at on public.tutores;
create trigger trg_tutores_updated_at
before update on public.tutores
for each row execute function public.set_updated_at();

-- O app alterna só `arquivado` (arquivar/restaurar); a data acompanha sozinha.
-- A constraint chk_tutores_arquivado_em continua valendo como rede de segurança.
create or replace function public.set_tutor_arquivado_em()
returns trigger language plpgsql as $$
begin
    if new.arquivado then
        if tg_op = 'INSERT' or not coalesce(old.arquivado, false) or new.arquivado_em is null then
            new.arquivado_em := coalesce(new.arquivado_em, now());
        end if;
    else
        new.arquivado_em := null;
    end if;
    return new;
end $$;

drop trigger if exists trg_tutores_arquivado_em on public.tutores;
create trigger trg_tutores_arquivado_em
before insert or update of arquivado on public.tutores
for each row execute function public.set_tutor_arquivado_em();

-- ============================================================================
-- 5. PETS — PK = UUID; FK para o CPF do tutor (ON UPDATE CASCADE: o app
--    permite corrigir o CPF do tutor e propaga para os vínculos).
-- ============================================================================

create table if not exists public.pets (
    id              uuid primary key default gen_random_uuid(),
    tutor_cpf       varchar(14) not null
                    references public.tutores(cpf) on update cascade on delete restrict,
    nome            varchar(255) not null,
    especie         pet_especie not null,
    raca            varchar(100) not null,
    sexo            pet_sexo not null,
    peso_kg         numeric(5,2),
    comportamento   text,
    alergias        text,
    criado_por      uuid references public.usuarios(id),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    constraint chk_pets_peso_positivo check (peso_kg is null or peso_kg > 0)
);

create index if not exists idx_pets_tutor_cpf on public.pets(tutor_cpf);
create index if not exists idx_pets_nome on public.pets(nome);
create index if not exists idx_pets_especie on public.pets(especie);

drop trigger if exists trg_pets_updated_at on public.pets;
create trigger trg_pets_updated_at
before update on public.pets
for each row execute function public.set_updated_at();

-- ============================================================================
-- 6. AGENDAMENTOS — `pet_id` nullable (tutor pode não ter pet cadastrado);
--    `vet_id` é quem atende (admin também agenda para si, como no produto).
-- ============================================================================

create table if not exists public.agendamentos (
    id                  uuid primary key default gen_random_uuid(),
    tutor_cpf           varchar(14) not null
                        references public.tutores(cpf) on update cascade on delete restrict,
    pet_id              uuid references public.pets(id) on delete restrict,
    vet_id              uuid not null references public.usuarios(id) on delete restrict,
    servico             varchar(255) not null,
    vacina_tipo         varchar(100),
    data                date not null,
    hora                time not null,
    valor               numeric(10,2) not null default 0,
    status              agendamento_status not null default 'pendente',
    info_complementar   text,
    criado_por          uuid references public.usuarios(id),
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    constraint chk_agendamentos_hora_janela check (hora >= '07:00' and hora <= '19:00'),
    constraint chk_agendamentos_valor check (valor >= 0),
    -- O front grava '' (string vazia) quando não é vacinação; por isso o
    -- coalesce: '' equivale a "sem vacina" e continua barrando vacina sem tipo.
    constraint chk_agendamentos_vacina check (
        (servico not ilike '%vacin%' and coalesce(vacina_tipo, '') = '')
        or (servico ilike '%vacin%' and coalesce(vacina_tipo, '') <> '')
    )
);

create index if not exists idx_agendamentos_tutor_cpf on public.agendamentos(tutor_cpf);
create index if not exists idx_agendamentos_pet_id on public.agendamentos(pet_id);
create index if not exists idx_agendamentos_vet_id on public.agendamentos(vet_id);
create index if not exists idx_agendamentos_data on public.agendamentos(data);
create index if not exists idx_agendamentos_status on public.agendamentos(status);
create index if not exists idx_agendamentos_vet_data_status on public.agendamentos(vet_id, data, status);

drop trigger if exists trg_agendamentos_updated_at on public.agendamentos;
create trigger trg_agendamentos_updated_at
before update on public.agendamentos
for each row execute function public.set_updated_at();

-- ============================================================================
-- 7. HISTÓRICO CLÍNICO — receita | vacina (guia cancelada, RF-10)
--    Editável/excluível por admin e veterinário (RLS em 0003).
-- ============================================================================

create table if not exists public.historico_clinico (
    id              uuid primary key default gen_random_uuid(),
    pet_id          uuid not null references public.pets(id) on delete restrict,
    tutor_cpf       varchar(14) not null
                    references public.tutores(cpf) on update cascade on delete restrict,
    tipo            historico_tipo not null,
    veterinario_id  uuid references public.usuarios(id) on delete restrict,
    crmv            varchar(50),
    data            date not null,
    detalhe         text not null,
    vacina_tipo     varchar(100),
    criado_por      uuid references public.usuarios(id),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    constraint chk_historico_vacina check (
        (tipo = 'vacina' and coalesce(vacina_tipo, '') <> '')
        or (tipo <> 'vacina' and coalesce(vacina_tipo, '') = '')
    )
);

create index if not exists idx_historico_pet_id on public.historico_clinico(pet_id);
create index if not exists idx_historico_tutor_cpf on public.historico_clinico(tutor_cpf);
create index if not exists idx_historico_tipo on public.historico_clinico(tipo);
create index if not exists idx_historico_data on public.historico_clinico(data);
create index if not exists idx_historico_veterinario on public.historico_clinico(veterinario_id);

drop trigger if exists trg_historico_updated_at on public.historico_clinico;
create trigger trg_historico_updated_at
before update on public.historico_clinico
for each row execute function public.set_updated_at();

-- ============================================================================
-- 8. CATÁLOGOS
--    `vacina_tipos`: admin + veterinário.  `raca_tipos`: admin + funcionário.
--    Sem `clinica_id` (single-clinic), então o UNIQUE funciona de verdade.
-- ============================================================================

create table if not exists public.vacina_tipos (
    id          bigserial primary key,
    nome        varchar(100) not null unique,
    ativo       boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index if not exists idx_vacina_tipos_ativo on public.vacina_tipos(ativo);

drop trigger if exists trg_vacina_tipos_updated_at on public.vacina_tipos;
create trigger trg_vacina_tipos_updated_at
before update on public.vacina_tipos
for each row execute function public.set_updated_at();

create table if not exists public.raca_tipos (
    id          bigserial primary key,
    especie     pet_especie not null,
    nome        varchar(100) not null,
    ativo       boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    constraint uq_raca_tipos_especie_nome unique (especie, nome)
);

create index if not exists idx_raca_tipos_especie on public.raca_tipos(especie);
create index if not exists idx_raca_tipos_ativo on public.raca_tipos(ativo);

drop trigger if exists trg_raca_tipos_updated_at on public.raca_tipos;
create trigger trg_raca_tipos_updated_at
before update on public.raca_tipos
for each row execute function public.set_updated_at();
