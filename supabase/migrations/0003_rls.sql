-- ============================================================================
-- DayVet-Gestão — RLS (Row Level Security) — single-clinic
--
-- Regra: toda leitura/escrita passa por policy. `anon` não lê nada.
-- O papel vem de `public.usuarios.role` (não do JWT), então mudar o perfil no
-- banco vale na hora — e o cliente não consegue forjar `app_role` no token.
--
-- Matriz implementada (espelha `PERMISSOES` de `dayvet/script.js`):
--
--   tabela              admin   veterinario        funcionario
--   usuarios            CRUD    só o próprio       só o próprio
--   tutores             CRUD    SELECT             SELECT/INSERT/UPDATE/DELETE
--   pets                CRUD    SELECT             SELECT/INSERT
--   agendamentos        CRUD    SELECT/INSERT/UPD  SELECT
--   historico_clinico   CRUD    SELECT/INSERT/UPD/DELETE   —
--   vacina_tipos        CRUD    SELECT/INSERT/UPD/DELETE   —
--   raca_tipos          CRUD    SELECT             SELECT/INSERT/UPDATE/DELETE
--
-- Por que `pets` do veterinário é só leitura: no app `pet_editar` não está em
-- `PERMISSOES.veterinario` (só o admin, via `*`). Se isso mudar no front, esta
-- migration muda junto.
--
-- Funções auxiliares são SECURITY DEFINER de propósito: consultam `usuarios`
-- sem reentrar na policy de `usuarios` (evita recursão infinita de RLS).
-- ============================================================================

-- ============================================================================
-- 1. HELPERS
-- ============================================================================

-- Papel do usuário logado, lido do banco (nunca do claim).
create or replace function public.app_role()
returns user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select u.role
      from public.usuarios u
     where u.id = auth.uid()
       and u.active
       and u.deleted_at is null
$$;

create or replace function public.e_admin() returns boolean
language sql stable as $$ select public.app_role() = 'admin' $$;

create or replace function public.e_vet() returns boolean
language sql stable as $$ select public.app_role() = 'veterinario' $$;

create or replace function public.e_func() returns boolean
language sql stable as $$ select public.app_role() = 'funcionario' $$;

-- Qualquer perfil ativo (staff da clínica).
create or replace function public.e_staff() returns boolean
language sql stable as $$ select public.app_role() is not null $$;

-- Troca obrigatória de senha: o próprio usuário baixa a flag, sem poder
-- alterar mais nada na própria linha (não existe policy de UPDATE em usuarios
-- para ele).
create or replace function public.marcar_senha_alterada()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
    update public.usuarios
       set must_change = false,
           updated_at  = now()
     where id = auth.uid()
       and must_change
$$;

revoke all on function public.app_role()            from public;
revoke all on function public.marcar_senha_alterada() from public;
grant execute on function public.app_role()             to authenticated;
grant execute on function public.marcar_senha_alterada() to authenticated;
-- Helpers usados nas policies: explicitamente para authenticated (não PUBLIC).
revoke all on function public.e_admin(), public.e_vet(), public.e_func(), public.e_staff() from public;
grant execute on function public.e_admin(), public.e_vet(), public.e_func(), public.e_staff() to authenticated;

-- ============================================================================
-- 2. PRIVILÉGIOS DE TABELA
--    RLS filtra LINHAS; GRANT libera a OPERAÇÃO. Os dois juntos.
-- ============================================================================

revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Vale também para tabelas futuras: o Supabase concede tudo a `anon` por padrão
-- (ALTER DEFAULT PRIVILEGES), então o revoke precisa ser repetido aqui.
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- ============================================================================
-- 3. HABILITAR RLS
-- ============================================================================

alter table public.usuarios           enable row level security;
alter table public.tutores            enable row level security;
alter table public.pets               enable row level security;
alter table public.agendamentos       enable row level security;
alter table public.historico_clinico  enable row level security;
alter table public.vacina_tipos       enable row level security;
alter table public.raca_tipos         enable row level security;

-- ============================================================================
-- 4. POLICIES — USUARIOS
-- ============================================================================

drop policy if exists usuarios_select_admin on public.usuarios;
create policy usuarios_select_admin on public.usuarios
    for select to authenticated using (public.e_admin());

drop policy if exists usuarios_select_self on public.usuarios;
create policy usuarios_select_self on public.usuarios
    for select to authenticated using (id = auth.uid());

drop policy if exists usuarios_insert_admin on public.usuarios;
create policy usuarios_insert_admin on public.usuarios
    for insert to authenticated with check (public.e_admin());

drop policy if exists usuarios_update_admin on public.usuarios;
create policy usuarios_update_admin on public.usuarios
    for update to authenticated
    using (public.e_admin()) with check (public.e_admin());

drop policy if exists usuarios_delete_admin on public.usuarios;
create policy usuarios_delete_admin on public.usuarios
    for delete to authenticated using (public.e_admin());

-- ============================================================================
-- 5. POLICIES — TUTORES
--    admin CRUD · veterinario SELECT · funcionario CRUD (decisão 2026-11-13:
--    tutor_incluir/editar/arquivar/excluir estão em PERMISSOES.funcionario).
-- ============================================================================

drop policy if exists tutores_select on public.tutores;
create policy tutores_select on public.tutores
    for select to authenticated using (public.e_staff());

drop policy if exists tutores_insert on public.tutores;
create policy tutores_insert on public.tutores
    for insert to authenticated with check (public.e_admin() or public.e_func());

drop policy if exists tutores_update on public.tutores;
create policy tutores_update on public.tutores
    for update to authenticated
    using (public.e_admin() or public.e_func())
    with check (public.e_admin() or public.e_func());

drop policy if exists tutores_delete on public.tutores;
create policy tutores_delete on public.tutores
    for delete to authenticated using (public.e_admin() or public.e_func());

-- ============================================================================
-- 6. POLICIES — PETS
--    admin CRUD · veterinario SELECT · funcionario SELECT/INSERT (pet_incluir).
-- ============================================================================

drop policy if exists pets_select on public.pets;
create policy pets_select on public.pets
    for select to authenticated using (public.e_staff());

drop policy if exists pets_insert on public.pets;
create policy pets_insert on public.pets
    for insert to authenticated with check (public.e_admin() or public.e_func());

drop policy if exists pets_update on public.pets;
create policy pets_update on public.pets
    for update to authenticated using (public.e_admin()) with check (public.e_admin());

drop policy if exists pets_delete on public.pets;
create policy pets_delete on public.pets
    for delete to authenticated using (public.e_admin());

-- ============================================================================
-- 7. POLICIES — AGENDAMENTOS
--    admin CRUD · veterinario SELECT/INSERT/UPDATE · funcionario SELECT.
-- ============================================================================

drop policy if exists agendamentos_select on public.agendamentos;
create policy agendamentos_select on public.agendamentos
    for select to authenticated using (public.e_staff());

drop policy if exists agendamentos_insert on public.agendamentos;
create policy agendamentos_insert on public.agendamentos
    for insert to authenticated with check (public.e_admin() or public.e_vet());

drop policy if exists agendamentos_update on public.agendamentos;
create policy agendamentos_update on public.agendamentos
    for update to authenticated
    using (public.e_admin() or public.e_vet())
    with check (public.e_admin() or public.e_vet());

drop policy if exists agendamentos_delete on public.agendamentos;
create policy agendamentos_delete on public.agendamentos
    for delete to authenticated using (public.e_admin());

-- ============================================================================
-- 8. POLICIES — HISTORICO_CLINICO
--    Só admin e veterinário (módulo clínico). Funcionário não tem acesso.
-- ============================================================================

drop policy if exists historico_select on public.historico_clinico;
create policy historico_select on public.historico_clinico
    for select to authenticated using (public.e_admin() or public.e_vet());

drop policy if exists historico_insert on public.historico_clinico;
create policy historico_insert on public.historico_clinico
    for insert to authenticated with check (public.e_admin() or public.e_vet());

drop policy if exists historico_update on public.historico_clinico;
create policy historico_update on public.historico_clinico
    for update to authenticated
    using (public.e_admin() or public.e_vet())
    with check (public.e_admin() or public.e_vet());

drop policy if exists historico_delete on public.historico_clinico;
create policy historico_delete on public.historico_clinico
    for delete to authenticated using (public.e_admin() or public.e_vet());

-- ============================================================================
-- 9. POLICIES — VACINA_TIPOS
--    admin e veterinario (vacina_tipos_* no RBAC).
-- ============================================================================

drop policy if exists vacina_tipos_select on public.vacina_tipos;
create policy vacina_tipos_select on public.vacina_tipos
    for select to authenticated using (public.e_admin() or public.e_vet());

drop policy if exists vacina_tipos_insert on public.vacina_tipos;
create policy vacina_tipos_insert on public.vacina_tipos
    for insert to authenticated with check (public.e_admin() or public.e_vet());

drop policy if exists vacina_tipos_update on public.vacina_tipos;
create policy vacina_tipos_update on public.vacina_tipos
    for update to authenticated
    using (public.e_admin() or public.e_vet())
    with check (public.e_admin() or public.e_vet());

drop policy if exists vacina_tipos_delete on public.vacina_tipos;
create policy vacina_tipos_delete on public.vacina_tipos
    for delete to authenticated using (public.e_admin() or public.e_vet());

-- ============================================================================
-- 10. POLICIES — RACA_TIPOS
--     admin CRUD · veterinario SELECT (raca_tipos_listar) · funcionario CRUD.
-- ============================================================================

drop policy if exists raca_tipos_select on public.raca_tipos;
create policy raca_tipos_select on public.raca_tipos
    for select to authenticated using (public.e_staff());

drop policy if exists raca_tipos_insert on public.raca_tipos;
create policy raca_tipos_insert on public.raca_tipos
    for insert to authenticated with check (public.e_admin() or public.e_func());

drop policy if exists raca_tipos_update on public.raca_tipos;
create policy raca_tipos_update on public.raca_tipos
    for update to authenticated
    using (public.e_admin() or public.e_func())
    with check (public.e_admin() or public.e_func());

drop policy if exists raca_tipos_delete on public.raca_tipos;
create policy raca_tipos_delete on public.raca_tipos
    for delete to authenticated using (public.e_admin() or public.e_func());
