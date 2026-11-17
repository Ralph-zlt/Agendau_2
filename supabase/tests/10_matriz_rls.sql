-- Matriz de permissões: executa cada operação como `authenticated` com a
-- identidade de um dos 3 perfis e compara com o esperado.
-- Roda tudo em UMA transação e faz rollback no fim (nada fica no banco).

\set ON_ERROR_STOP on

-- ============================================================
-- FIXTURES (como superusuário — RLS não se aplica ao dono)
-- ============================================================
begin;

insert into auth.users (id, email) values
    ('a0000000-0000-0000-0000-000000000001', 'admin@teste.local'),
    ('a0000000-0000-0000-0000-000000000002', 'vet@teste.local'),
    ('a0000000-0000-0000-0000-000000000003', 'func@teste.local');

insert into public.usuarios (id, cpf, nome, email, role, must_change) values
    ('a0000000-0000-0000-0000-000000000001', '999.999.999-01', 'Admin Teste', 'admin@teste.local', 'admin', false),
    ('a0000000-0000-0000-0000-000000000002', '999.999.999-02', 'Vet Teste',   'vet@teste.local',   'veterinario', false),
    ('a0000000-0000-0000-0000-000000000003', '999.999.999-03', 'Func Teste',  'func@teste.local',  'funcionario', false);

insert into public.tutores (cpf, nome, telefone) values
    ('111.111.111-11', 'Tutor Base', '(11) 99999-1111'),
    ('222.222.222-22', 'Tutor Secundario', '(11) 99999-2222');

insert into public.pets (id, tutor_cpf, nome, especie, raca, sexo) values
    ('b0000000-0000-0000-0000-000000000001', '111.111.111-11', 'Rex', 'Canino', 'SRD', 'Macho'),
    ('b0000000-0000-0000-0000-000000000002', '222.222.222-22', 'Mingau', 'Felino', 'SRD', 'Fêmea');

insert into public.agendamentos (id, tutor_cpf, pet_id, vet_id, servico, data, hora, valor, status) values
    ('c0000000-0000-0000-0000-000000000001', '111.111.111-11',
     'b0000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000002',
     'Consulta', current_date + 1, '10:00', 150, 'confirmado');

insert into public.historico_clinico (id, pet_id, tutor_cpf, tipo, veterinario_id, crmv, data, detalhe) values
    ('d0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000001', '111.111.111-11',
     'receita', 'a0000000-0000-0000-0000-000000000002', 'CRMV-TE 1',
     current_date, 'Receita de teste');

-- ============================================================
-- MOTOR DO TESTE
-- ============================================================

create temp table res (
    id        serial,
    caso      text,
    esperado  text,
    obtido    text,
    ok        boolean
);

create or replace function pg_temp.exec(role_name text, uid uuid, comando text)
returns bigint
language plpgsql
as $$
declare n bigint;
begin
    perform set_config('request.jwt.claims',
                       json_build_object('sub', uid::text, 'role', 'authenticated')::text,
                       true);
    execute format('set local role %I', role_name);
    begin
        execute comando into n;
    exception
        when insufficient_privilege then n := -1;   -- RLS negou
        when check_violation        then n := -1;   -- WITH CHECK negou
    end;
    execute 'reset role';
    return n;
end $$;

create or replace function pg_temp.registrar(
    caso text, esperado bigint, obtido bigint
) returns void language plpgsql as $$
begin
    insert into res (caso, esperado, obtido, ok)
    values (caso, esperado::text, obtido::text, esperado = obtido);
end $$;

-- Atalhos de identidade
create temp table ids as select
    'a0000000-0000-0000-0000-000000000001'::uuid as admin,
    'a0000000-0000-0000-0000-000000000002'::uuid as vet,
    'a0000000-0000-0000-0000-000000000003'::uuid as func;

-- ============================================================
-- TUTORES
-- ============================================================
select pg_temp.registrar('admin|tutores|select', 2,
    pg_temp.exec('authenticated', (select admin from ids), 'select count(*) from public.tutores'));
select pg_temp.registrar('vet|tutores|select', 2,
    pg_temp.exec('authenticated', (select vet from ids), 'select count(*) from public.tutores'));
select pg_temp.registrar('func|tutores|select', 2,
    pg_temp.exec('authenticated', (select func from ids), 'select count(*) from public.tutores'));

select pg_temp.registrar('admin|tutores|insert', 1,
    pg_temp.exec('authenticated', (select admin from ids),
      $q$with x as (insert into public.tutores (cpf, nome, telefone) values ('311.111.111-11','T Admin','(11) 90000-0001') returning 1) select count(*) from x$q$));
select pg_temp.registrar('func|tutores|insert', 1,
    pg_temp.exec('authenticated', (select func from ids),
      $q$with x as (insert into public.tutores (cpf, nome, telefone) values ('311.111.111-12','T Func','(11) 90000-0002') returning 1) select count(*) from x$q$));
select pg_temp.registrar('vet|tutores|insert', -1,
    pg_temp.exec('authenticated', (select vet from ids),
      $q$with x as (insert into public.tutores (cpf, nome, telefone) values ('311.111.111-13','T Vet','(11) 90000-0003') returning 1) select count(*) from x$q$));

-- 4 = 2 fixtures + T Admin + T Func inseridos acima nesta transação
select pg_temp.registrar('admin|tutores|update', 4,
    pg_temp.exec('authenticated', (select admin from ids),
      $q$with x as (update public.tutores set nome = nome || '!' returning 1) select count(*) from x$q$));
select pg_temp.registrar('func|tutores|update', 4,
    pg_temp.exec('authenticated', (select func from ids),
      $q$with x as (update public.tutores set nome = nome || '.' returning 1) select count(*) from x$q$));
select pg_temp.registrar('vet|tutores|update', 0,
    pg_temp.exec('authenticated', (select vet from ids),
      $q$with x as (update public.tutores set nome = 'x' returning 1) select count(*) from x$q$));

insert into public.tutores (cpf, nome, telefone) values ('411.111.111-01','Del Admin','(11) 90000-0011');
select pg_temp.registrar('admin|tutores|delete', 1,
    pg_temp.exec('authenticated', (select admin from ids),
      $q$with x as (delete from public.tutores where cpf = '411.111.111-01' returning 1) select count(*) from x$q$));
insert into public.tutores (cpf, nome, telefone) values ('411.111.111-02','Del Func','(11) 90000-0012');
select pg_temp.registrar('func|tutores|delete', 1,
    pg_temp.exec('authenticated', (select func from ids),
      $q$with x as (delete from public.tutores where cpf = '411.111.111-02' returning 1) select count(*) from x$q$));
insert into public.tutores (cpf, nome, telefone) values ('411.111.111-03','Del Vet','(11) 90000-0013');
select pg_temp.registrar('vet|tutores|delete', 0,
    pg_temp.exec('authenticated', (select vet from ids),
      $q$with x as (delete from public.tutores where cpf = '411.111.111-03' returning 1) select count(*) from x$q$));

-- ============================================================
-- PETS
-- ============================================================
select pg_temp.registrar('admin|pets|select', 2,
    pg_temp.exec('authenticated', (select admin from ids), 'select count(*) from public.pets'));
select pg_temp.registrar('vet|pets|select', 2,
    pg_temp.exec('authenticated', (select vet from ids), 'select count(*) from public.pets'));
select pg_temp.registrar('func|pets|select', 2,
    pg_temp.exec('authenticated', (select func from ids), 'select count(*) from public.pets'));

select pg_temp.registrar('admin|pets|insert', 1,
    pg_temp.exec('authenticated', (select admin from ids),
      $q$with x as (insert into public.pets (tutor_cpf, nome, especie, raca, sexo) values ('111.111.111-11','Pet Admin','Canino','SRD','Macho') returning 1) select count(*) from x$q$));
select pg_temp.registrar('func|pets|insert', 1,
    pg_temp.exec('authenticated', (select func from ids),
      $q$with x as (insert into public.pets (tutor_cpf, nome, especie, raca, sexo) values ('111.111.111-11','Pet Func','Canino','SRD','Fêmea') returning 1) select count(*) from x$q$));
select pg_temp.registrar('vet|pets|insert', -1,
    pg_temp.exec('authenticated', (select vet from ids),
      $q$with x as (insert into public.pets (tutor_cpf, nome, especie, raca, sexo) values ('111.111.111-11','Pet Vet','Canino','SRD','Macho') returning 1) select count(*) from x$q$));

-- 4 = 2 fixtures + Pet Admin + Pet Func inseridos acima nesta transação
select pg_temp.registrar('admin|pets|update', 4,
    pg_temp.exec('authenticated', (select admin from ids),
      $q$with x as (update public.pets set nome = nome returning 1) select count(*) from x$q$));
select pg_temp.registrar('func|pets|update', 0,
    pg_temp.exec('authenticated', (select func from ids),
      $q$with x as (update public.pets set nome = 'x' returning 1) select count(*) from x$q$));
select pg_temp.registrar('vet|pets|update', 0,
    pg_temp.exec('authenticated', (select vet from ids),
      $q$with x as (update public.pets set nome = 'x' returning 1) select count(*) from x$q$));

insert into public.pets (id, tutor_cpf, nome, especie, raca, sexo) values
    ('b0000000-0000-0000-0000-000000000010','222.222.222-22','Del Pet','Canino','SRD','Macho');
select pg_temp.registrar('admin|pets|delete', 1,
    pg_temp.exec('authenticated', (select admin from ids),
      $q$with x as (delete from public.pets where id = 'b0000000-0000-0000-0000-000000000010' returning 1) select count(*) from x$q$));
insert into public.pets (id, tutor_cpf, nome, especie, raca, sexo) values
    ('b0000000-0000-0000-0000-000000000011','222.222.222-22','Del Pet Vet','Canino','SRD','Macho');
select pg_temp.registrar('vet|pets|delete', 0,
    pg_temp.exec('authenticated', (select vet from ids),
      $q$with x as (delete from public.pets where id = 'b0000000-0000-0000-0000-000000000011' returning 1) select count(*) from x$q$));

-- ============================================================
-- AGENDAMENTOS
-- ============================================================
select pg_temp.registrar('admin|agendamentos|select', 1,
    pg_temp.exec('authenticated', (select admin from ids), 'select count(*) from public.agendamentos'));
select pg_temp.registrar('vet|agendamentos|select', 1,
    pg_temp.exec('authenticated', (select vet from ids), 'select count(*) from public.agendamentos'));
select pg_temp.registrar('func|agendamentos|select', 1,
    pg_temp.exec('authenticated', (select func from ids), 'select count(*) from public.agendamentos'));

select pg_temp.registrar('admin|agendamentos|insert', 1,
    pg_temp.exec('authenticated', (select admin from ids),
      $q$with x as (insert into public.agendamentos (tutor_cpf, vet_id, servico, data, hora) values ('111.111.111-11','a0000000-0000-0000-0000-000000000001','Consulta', current_date + 2, '11:00') returning 1) select count(*) from x$q$));
select pg_temp.registrar('vet|agendamentos|insert', 1,
    pg_temp.exec('authenticated', (select vet from ids),
      $q$with x as (insert into public.agendamentos (tutor_cpf, vet_id, servico, data, hora) values ('111.111.111-11','a0000000-0000-0000-0000-000000000002','Consulta', current_date + 2, '12:00') returning 1) select count(*) from x$q$));
select pg_temp.registrar('func|agendamentos|insert', -1,
    pg_temp.exec('authenticated', (select func from ids),
      $q$with x as (insert into public.agendamentos (tutor_cpf, vet_id, servico, data, hora) values ('111.111.111-11','a0000000-0000-0000-0000-000000000002','Consulta', current_date + 2, '13:00') returning 1) select count(*) from x$q$));

select pg_temp.registrar('admin|agendamentos|update', 1,
    pg_temp.exec('authenticated', (select admin from ids),
      $q$with x as (update public.agendamentos set valor = 200 where id = 'c0000000-0000-0000-0000-000000000001' returning 1) select count(*) from x$q$));
select pg_temp.registrar('vet|agendamentos|update', 1,
    pg_temp.exec('authenticated', (select vet from ids),
      $q$with x as (update public.agendamentos set valor = 250 where id = 'c0000000-0000-0000-0000-000000000001' returning 1) select count(*) from x$q$));
select pg_temp.registrar('func|agendamentos|update', 0,
    pg_temp.exec('authenticated', (select func from ids),
      $q$with x as (update public.agendamentos set valor = 999 returning 1) select count(*) from x$q$));

insert into public.agendamentos (id, tutor_cpf, vet_id, servico, data, hora) values
    ('c0000000-0000-0000-0000-000000000010','222.222.222-22','a0000000-0000-0000-0000-000000000002','Consulta', current_date + 3, '09:00');
select pg_temp.registrar('admin|agendamentos|delete', 1,
    pg_temp.exec('authenticated', (select admin from ids),
      $q$with x as (delete from public.agendamentos where id = 'c0000000-0000-0000-0000-000000000010' returning 1) select count(*) from x$q$));
insert into public.agendamentos (id, tutor_cpf, vet_id, servico, data, hora) values
    ('c0000000-0000-0000-0000-000000000011','222.222.222-22','a0000000-0000-0000-0000-000000000002','Consulta', current_date + 3, '10:00');
select pg_temp.registrar('vet|agendamentos|delete', 0,
    pg_temp.exec('authenticated', (select vet from ids),
      $q$with x as (delete from public.agendamentos where id = 'c0000000-0000-0000-0000-000000000011' returning 1) select count(*) from x$q$));

-- ============================================================
-- HISTORICO_CLINICO
-- ============================================================
select pg_temp.registrar('admin|historico|select', 1,
    pg_temp.exec('authenticated', (select admin from ids), 'select count(*) from public.historico_clinico'));
select pg_temp.registrar('vet|historico|select', 1,
    pg_temp.exec('authenticated', (select vet from ids), 'select count(*) from public.historico_clinico'));
select pg_temp.registrar('func|historico|select', 0,
    pg_temp.exec('authenticated', (select func from ids), 'select count(*) from public.historico_clinico'));

select pg_temp.registrar('admin|historico|insert', 1,
    pg_temp.exec('authenticated', (select admin from ids),
      $q$with x as (insert into public.historico_clinico (pet_id, tutor_cpf, tipo, data, detalhe) values ('b0000000-0000-0000-0000-000000000001','111.111.111-11','receita', current_date, 'Receita admin') returning 1) select count(*) from x$q$));
select pg_temp.registrar('vet|historico|insert', 1,
    pg_temp.exec('authenticated', (select vet from ids),
      $q$with x as (insert into public.historico_clinico (pet_id, tutor_cpf, tipo, data, detalhe) values ('b0000000-0000-0000-0000-000000000001','111.111.111-11','receita', current_date, 'Receita vet') returning 1) select count(*) from x$q$));
select pg_temp.registrar('func|historico|insert', -1,
    pg_temp.exec('authenticated', (select func from ids),
      $q$with x as (insert into public.historico_clinico (pet_id, tutor_cpf, tipo, data, detalhe) values ('b0000000-0000-0000-0000-000000000001','111.111.111-11','receita', current_date, 'Receita func') returning 1) select count(*) from x$q$));

select pg_temp.registrar('admin|historico|update', 1,
    pg_temp.exec('authenticated', (select admin from ids),
      $q$with x as (update public.historico_clinico set detalhe = 'Receita editada' where id = 'd0000000-0000-0000-0000-000000000001' returning 1) select count(*) from x$q$));
select pg_temp.registrar('vet|historico|update', 1,
    pg_temp.exec('authenticated', (select vet from ids),
      $q$with x as (update public.historico_clinico set detalhe = 'Receita editada 2' where id = 'd0000000-0000-0000-0000-000000000001' returning 1) select count(*) from x$q$));
select pg_temp.registrar('func|historico|update', 0,
    pg_temp.exec('authenticated', (select func from ids),
      $q$with x as (update public.historico_clinico set detalhe = 'hack' returning 1) select count(*) from x$q$));

select pg_temp.registrar('vet|historico|delete', 1,
    pg_temp.exec('authenticated', (select vet from ids),
      $q$with x as (delete from public.historico_clinico where id = 'd0000000-0000-0000-0000-000000000001' returning 1) select count(*) from x$q$));

-- ============================================================
-- VACINA_TIPOS
-- ============================================================
select pg_temp.registrar('admin|vacina_tipos|select', 10,
    pg_temp.exec('authenticated', (select admin from ids), 'select count(*) from public.vacina_tipos'));
select pg_temp.registrar('vet|vacina_tipos|select', 10,
    pg_temp.exec('authenticated', (select vet from ids), 'select count(*) from public.vacina_tipos'));
select pg_temp.registrar('func|vacina_tipos|select', 0,
    pg_temp.exec('authenticated', (select func from ids), 'select count(*) from public.vacina_tipos'));

select pg_temp.registrar('vet|vacina_tipos|insert', 1,
    pg_temp.exec('authenticated', (select vet from ids),
      $q$with x as (insert into public.vacina_tipos (nome) values ('Vacina Vet') returning 1) select count(*) from x$q$));
select pg_temp.registrar('func|vacina_tipos|insert', -1,
    pg_temp.exec('authenticated', (select func from ids),
      $q$with x as (insert into public.vacina_tipos (nome) values ('Vacina Func') returning 1) select count(*) from x$q$));
select pg_temp.registrar('vet|vacina_tipos|update', 1,
    pg_temp.exec('authenticated', (select vet from ids),
      $q$with x as (update public.vacina_tipos set ativo = false where nome = 'Vacina Vet' returning 1) select count(*) from x$q$));
select pg_temp.registrar('vet|vacina_tipos|delete', 1,
    pg_temp.exec('authenticated', (select vet from ids),
      $q$with x as (delete from public.vacina_tipos where nome = 'Vacina Vet' returning 1) select count(*) from x$q$));

-- ============================================================
-- RACA_TIPOS
-- ============================================================
select pg_temp.registrar('vet|raca_tipos|select', 31,
    pg_temp.exec('authenticated', (select vet from ids), 'select count(*) from public.raca_tipos'));
select pg_temp.registrar('func|raca_tipos|select', 31,
    pg_temp.exec('authenticated', (select func from ids), 'select count(*) from public.raca_tipos'));

select pg_temp.registrar('func|raca_tipos|insert', 1,
    pg_temp.exec('authenticated', (select func from ids),
      $q$with x as (insert into public.raca_tipos (especie, nome) values ('Canino','Raca Func') returning 1) select count(*) from x$q$));
select pg_temp.registrar('vet|raca_tipos|insert', -1,
    pg_temp.exec('authenticated', (select vet from ids),
      $q$with x as (insert into public.raca_tipos (especie, nome) values ('Canino','Raca Vet') returning 1) select count(*) from x$q$));
select pg_temp.registrar('func|raca_tipos|update', 1,
    pg_temp.exec('authenticated', (select func from ids),
      $q$with x as (update public.raca_tipos set ativo = false where nome = 'Raca Func' returning 1) select count(*) from x$q$));
select pg_temp.registrar('func|raca_tipos|delete', 1,
    pg_temp.exec('authenticated', (select func from ids),
      $q$with x as (delete from public.raca_tipos where nome = 'Raca Func' returning 1) select count(*) from x$q$));

-- ============================================================
-- USUARIOS
-- ============================================================
select pg_temp.registrar('admin|usuarios|select', 3,
    pg_temp.exec('authenticated', (select admin from ids), 'select count(*) from public.usuarios'));
select pg_temp.registrar('vet|usuarios|select', 1,
    pg_temp.exec('authenticated', (select vet from ids), 'select count(*) from public.usuarios'));
select pg_temp.registrar('func|usuarios|select', 1,
    pg_temp.exec('authenticated', (select func from ids), 'select count(*) from public.usuarios'));

-- funcionário tenta se promover a admin (deve ser 0 linhas)
select pg_temp.registrar('func|usuarios|update_promover', 0,
    pg_temp.exec('authenticated', (select func from ids),
      $q$with x as (update public.usuarios set role = 'admin' where id = auth.uid() returning 1) select count(*) from x$q$));
-- mas pode baixar a flag de troca de senha via RPC
select pg_temp.registrar('func|usuarios|rpc_senha_alterada', 1,
    pg_temp.exec('authenticated', (select func from ids), 'select 1 where public.marcar_senha_alterada() is null'));

select pg_temp.registrar('vet|usuarios|insert', -1,
    pg_temp.exec('authenticated', (select vet from ids),
      $q$with x as (insert into public.usuarios (id, cpf, nome, email, role) values ('a0000000-0000-0000-0000-000000000009','999.999.999-09','Invasor','invasor@teste.local','admin') returning 1) select count(*) from x$q$));

-- ============================================================
-- USUARIO INATIVO / EXCLUIDO perde acesso (app_role devolve null)
-- ============================================================
update public.usuarios set active = false where id = (select vet from ids);
select pg_temp.registrar('vet_inativo|tutores|select', 0,
    pg_temp.exec('authenticated', (select vet from ids), 'select count(*) from public.tutores'));
update public.usuarios set active = true, deleted_at = now() where id = (select vet from ids);
select pg_temp.registrar('vet_excluido|tutores|select', 0,
    pg_temp.exec('authenticated', (select vet from ids), 'select count(*) from public.tutores'));
update public.usuarios set deleted_at = null where id = (select vet from ids);
select pg_temp.registrar('vet_reativado|tutores|select', 5,
    pg_temp.exec('authenticated', (select vet from ids), 'select count(*) from public.tutores'));

-- ============================================================
-- INTEGRIDADE: arquivar/restaurar e vacina com tipo vazio
-- ============================================================
update public.tutores set arquivado = true where cpf = '111.111.111-11';
select pg_temp.registrar('tutor|arquivar_preenche_data', 1,
    (select count(*) from public.tutores where cpf = '111.111.111-11' and arquivado and arquivado_em is not null));
update public.tutores set arquivado = false where cpf = '111.111.111-11';
select pg_temp.registrar('tutor|restaurar_limpa_data', 1,
    (select count(*) from public.tutores where cpf = '111.111.111-11' and not arquivado and arquivado_em is null));

-- '' (string vazia) é o que o front manda quando não é vacinação
select pg_temp.registrar('agendamento|vacina_vazia_aceita', 1,
    pg_temp.exec('authenticated', (select admin from ids),
      $q$with x as (insert into public.agendamentos (tutor_cpf, vet_id, servico, data, hora, vacina_tipo) values ('111.111.111-11','a0000000-0000-0000-0000-000000000001','Consulta', current_date + 4, '15:00', '') returning 1) select count(*) from x$q$));
select pg_temp.registrar('agendamento|vacinacao_sem_tipo_barrada', -1,
    pg_temp.exec('authenticated', (select admin from ids),
      $q$with x as (insert into public.agendamentos (tutor_cpf, vet_id, servico, data, hora) values ('111.111.111-11','a0000000-0000-0000-0000-000000000001','Vacinação', current_date + 4, '16:00') returning 1) select count(*) from x$q$));
select pg_temp.registrar('historico|vacina_sem_tipo_barrada', -1,
    pg_temp.exec('authenticated', (select admin from ids),
      $q$with x as (insert into public.historico_clinico (pet_id, tutor_cpf, tipo, data, detalhe) values ('b0000000-0000-0000-0000-000000000001','111.111.111-11','vacina', current_date, 'Vacina sem tipo') returning 1) select count(*) from x$q$));

-- ============================================================
-- ANON (sem login) não vê nada
-- ============================================================
-- anon não tem nem GRANT de tabela: -1 = negado (mais forte que 0 linhas)
select pg_temp.registrar('anon|tutores|select', -1,
    pg_temp.exec('anon', null, 'select count(*) from public.tutores'));
select pg_temp.registrar('anon|usuarios|select', -1,
    pg_temp.exec('anon', null, 'select count(*) from public.usuarios'));

-- ============================================================
-- RESULTADO
-- ============================================================
\echo ''
\echo '===== MATRIZ DE PERMISSÕES ====='
select case when ok then 'OK  ' else 'FALHA' end as st, caso, esperado, obtido
  from res order by id;

select count(*) filter (where ok) as passou, count(*) filter (where not ok) as falhou from res;

rollback;
