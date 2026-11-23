-- ============================================================================
-- 0004 — PONTE DE LOGIN (Fase C, 2026-11-23)
-- ----------------------------------------------------------------------------
-- PROBLEMA: o Supabase Auth só autentica por e-mail. A tela de login aceita
--   usuário (`raphael_dias`), CPF (com ou sem máscara) e e-mail — o mesmo
--   contrato do mock, testado em `RegrasLogin`.
--
-- SOLUÇÃO: coluna `usuario` (login curto, único, opcional) + RPC
--   `resolver_login(identificador)` que devolve o e-mail da conta ativa.
--   O front chama a RPC, recebe o e-mail e faz `signInWithPassword`.
--
-- SEGURANÇA:
--   * SECURITY DEFINER com `search_path` fixo (evita sequestro de schema).
--   * Só devolve e-mail de conta `active` e não excluída.
--   * Devolve no máximo uma linha e nada mais (não lista contas).
--   * Risco aceito e registrado: a RPC permite descobrir se um identificador
--     existe (enumeração). Mitigação: mensagem de erro única no front e o
--     rate-limit nativo do `signInWithPassword`. Endurecer antes de produção
--     real (ex.: exigir CPF completo + captcha).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. COLUNA `usuario` (login curto)
-- ----------------------------------------------------------------------------
alter table public.usuarios add column if not exists usuario varchar(50);

do $$ begin
    alter table public.usuarios
        add constraint chk_usuarios_usuario_fmt
        check (usuario is null or usuario ~ '^[a-z0-9._-]{3,50}$');
exception when duplicate_object then null; end $$;

-- Único sem diferenciar maiúsculas (o login compara em minúsculas).
create unique index if not exists ux_usuarios_usuario
    on public.usuarios (lower(usuario))
    where usuario is not null and deleted_at is null;

-- ----------------------------------------------------------------------------
-- 2. BACKFILL DOS 3 PERFIS DE DEMONSTRAÇÃO
--    (mantém o mesmo identificador que o mock já usava)
-- ----------------------------------------------------------------------------
update public.usuarios set usuario = 'raphael_dias'
 where email = 'raphael.dias@dayvet.com' and usuario is null;

update public.usuarios set usuario = 'lais_vet'
 where email = 'lais.vet@dayvet.com' and usuario is null;

update public.usuarios set usuario = 'douglas_funcionario'
 where email = 'douglas.funcionario@dayvet.com' and usuario is null;

-- ----------------------------------------------------------------------------
-- 3. RPC `resolver_login` — identificador → e-mail
-- ----------------------------------------------------------------------------
create or replace function public.resolver_login(p_identificador text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    with entrada as (
        select lower(btrim(coalesce(p_identificador, ''))) as texto,
               regexp_replace(coalesce(p_identificador, ''), '\D', '', 'g') as digitos
    )
    select u.email
      from public.usuarios u
      cross join entrada e
     where e.texto <> ''
       and u.active
       and u.deleted_at is null
       and (
              lower(u.email)  = e.texto
           or lower(u.usuario) = e.texto
           or (length(e.digitos) = 11
               and regexp_replace(u.cpf, '\D', '', 'g') = e.digitos)
       )
     limit 1;
$$;

comment on function public.resolver_login(text) is
    'Fase C: resolve usuario/CPF/e-mail para o e-mail do Supabase Auth. Só contas ativas.';

revoke all on function public.resolver_login(text) from public;
grant execute on function public.resolver_login(text) to anon, authenticated;
