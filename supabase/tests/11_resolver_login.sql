-- ============================================================================
-- Teste da RPC `resolver_login` (migration 0004) — caso tabelado
-- entrada (identificador) → saída esperada (e-mail ou NULL)
-- Roda no Postgres descartável de `node tests/db.mjs`; não vai para a nuvem.
-- ============================================================================
\pset pager off
\pset format aligned

-- ---------------------------------------------------------------------------
-- Fixtures: 3 perfis ativos + 1 inativo + 1 excluído
-- (ids fixos para o teste ser determinístico)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
    ('00000000-0000-0000-0000-000000000001', 'raphael.dias@dayvet.com'),
    ('00000000-0000-0000-0000-000000000002', 'lais.vet@dayvet.com'),
    ('00000000-0000-0000-0000-000000000003', 'douglas.funcionario@dayvet.com'),
    ('00000000-0000-0000-0000-000000000004', 'inativo@dayvet.com'),
    ('00000000-0000-0000-0000-000000000005', 'excluido@dayvet.com')
on conflict (id) do nothing;

insert into public.usuarios (id, cpf, nome, email, role, usuario, active, deleted_at) values
    ('00000000-0000-0000-0000-000000000001', '111.111.111-11', 'Raphael Dias', 'raphael.dias@dayvet.com', 'admin', 'raphael_dias', true, null),
    ('00000000-0000-0000-0000-000000000002', '222.222.222-22', 'Dra. Laís', 'lais.vet@dayvet.com', 'veterinario', 'lais_vet', true, null),
    ('00000000-0000-0000-0000-000000000003', '333.333.333-33', 'Douglas', 'douglas.funcionario@dayvet.com', 'funcionario', 'douglas_funcionario', true, null),
    ('00000000-0000-0000-0000-000000000004', '444.444.444-44', 'Inativo', 'inativo@dayvet.com', 'funcionario', 'inativo_user', false, null),
    ('00000000-0000-0000-0000-000000000005', '555.555.555-55', 'Excluído', 'excluido@dayvet.com', 'funcionario', 'excluido_user', true, now())
on conflict (id) do update set
    usuario = excluded.usuario, active = excluded.active, deleted_at = excluded.deleted_at;

-- ---------------------------------------------------------------------------
-- Casos: entrada → e-mail esperado (NULL = não deve resolver)
-- ---------------------------------------------------------------------------
with casos (entrada, esperado, descricao) as (values
    ('raphael_dias',              'raphael.dias@dayvet.com',          'usuario'),
    ('RAPHAEL_DIAS',              'raphael.dias@dayvet.com',          'usuario em maiusculas'),
    ('  raphael_dias  ',          'raphael.dias@dayvet.com',          'usuario com espacos'),
    ('raphael.dias@dayvet.com',   'raphael.dias@dayvet.com',          'e-mail'),
    ('RAPHAEL.DIAS@DAYVET.COM',   'raphael.dias@dayvet.com',          'e-mail em maiusculas'),
    ('111.111.111-11',            'raphael.dias@dayvet.com',          'CPF mascarado'),
    ('11111111111',               'raphael.dias@dayvet.com',          'CPF sem mascara'),
    ('lais_vet',                  'lais.vet@dayvet.com',              'usuario vet'),
    ('222.222.222-22',            'lais.vet@dayvet.com',              'CPF vet'),
    ('33333333333',               'douglas.funcionario@dayvet.com',   'CPF funcionario'),
    ('douglas.funcionario@dayvet.com', 'douglas.funcionario@dayvet.com', 'e-mail funcionario'),
    ('inativo_user',              null::text,                         'usuario inativo nao resolve'),
    ('444.444.444-44',            null::text,                         'CPF de inativo nao resolve'),
    ('excluido_user',             null::text,                         'usuario excluido nao resolve'),
    ('nao_existe',                null::text,                         'inexistente'),
    ('',                          null::text,                         'vazio'),
    ('   ',                       null::text,                         'so espacos'),
    (null,                        null::text,                         'null'),
    ('1111111111',                null::text,                         'CPF com 10 digitos nao casa'),
    ('raphael_dia',               null::text,                         'usuario parcial nao casa'),
    ('raphael_dias@x',            null::text,                         'e-mail parcial nao casa')
),
resultado as (
    select c.entrada,
           c.esperado,
           c.descricao,
           public.resolver_login(c.entrada) as obtido
      from casos c
)
select case when obtido is not distinct from esperado then 'OK' else 'FALHA' end as status,
       descricao as caso,
       coalesce(quote_literal(entrada), 'null') as entrada,
       coalesce(obtido, 'null') as obtido,
       coalesce(esperado, 'null') as esperado
  from resultado
 order by (obtido is not distinct from esperado), descricao;

-- ---------------------------------------------------------------------------
-- Limpeza: as fixtures não podem sobrar para a matriz de RLS (que espera
-- exatamente os usuários do seed). Apaga primeiro usuarios, depois auth.users.
-- ---------------------------------------------------------------------------
delete from public.usuarios
 where id in ('00000000-0000-0000-0000-000000000001',
              '00000000-0000-0000-0000-000000000002',
              '00000000-0000-0000-0000-000000000003',
              '00000000-0000-0000-0000-000000000004',
              '00000000-0000-0000-0000-000000000005');
delete from auth.users
 where id in ('00000000-0000-0000-0000-000000000001',
              '00000000-0000-0000-0000-000000000002',
              '00000000-0000-0000-0000-000000000003',
              '00000000-0000-0000-0000-000000000004',
              '00000000-0000-0000-0000-000000000005');
