\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email) values
    ('a1000000-0000-0000-0000-000000000001', 'admin-doc@teste.local'),
    ('a1000000-0000-0000-0000-000000000002', 'vet-doc@teste.local'),
    ('a1000000-0000-0000-0000-000000000003', 'func-doc@teste.local');

insert into public.usuarios (id, cpf, nome, email, role, must_change) values
    ('a1000000-0000-0000-0000-000000000001', '888.888.888-01', 'Admin Docs', 'admin-doc@teste.local', 'admin', false),
    ('a1000000-0000-0000-0000-000000000002', '888.888.888-02', 'Vet Docs', 'vet-doc@teste.local', 'veterinario', false),
    ('a1000000-0000-0000-0000-000000000003', '888.888.888-03', 'Func Docs', 'func-doc@teste.local', 'funcionario', false);

insert into public.tutores (cpf, nome, telefone)
values ('555.555.555-55', 'Tutor Docs', '(11) 99999-5555');

insert into public.pets (id, tutor_cpf, nome, especie, raca, sexo)
values ('b1000000-0000-0000-0000-000000000001', '555.555.555-55', 'Pet Docs', 'Canino', 'SRD', 'Macho');

insert into public.documentos (
    id, tutor_cpf, pet_id, nome, mime_type, tamanho_bytes, storage_path, criado_por
) values (
    'd1000000-0000-0000-0000-000000000001',
    '555.555.555-55',
    'b1000000-0000-0000-0000-000000000001',
    'exame.pdf',
    'application/pdf',
    100,
    'b1000000-0000-0000-0000-000000000001/exame.pdf',
    'a1000000-0000-0000-0000-000000000001'
);

insert into storage.objects (bucket_id, name)
values ('dayvet-documentos', 'b1000000-0000-0000-0000-000000000001/exame.pdf');

create temp table res (caso text, esperado bigint, obtido bigint, ok boolean);
create or replace function pg_temp.exec(role_name text, uid uuid, comando text)
returns bigint language plpgsql as $$
declare n bigint;
begin
    perform set_config('request.jwt.claims',
        json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
    execute format('set local role %I', role_name);
    begin
        execute comando into n;
    exception
        when insufficient_privilege then n := -1;
        when check_violation then n := -1;
    end;
    execute 'reset role';
    return n;
end $$;

create or replace function pg_temp.registrar(caso text, esperado bigint, obtido bigint)
returns void language sql as $$
    insert into res values (caso, esperado, obtido, esperado = obtido)
$$;

select pg_temp.registrar('admin|documentos|select', 1,
    pg_temp.exec('authenticated', 'a1000000-0000-0000-0000-000000000001',
        'select count(*) from public.documentos'));
select pg_temp.registrar('vet|documentos|select', 1,
    pg_temp.exec('authenticated', 'a1000000-0000-0000-0000-000000000002',
        'select count(*) from public.documentos'));
select pg_temp.registrar('func|documentos|select', 0,
    pg_temp.exec('authenticated', 'a1000000-0000-0000-0000-000000000003',
        'select count(*) from public.documentos'));

select pg_temp.registrar('vet|documentos|insert', 1,
    pg_temp.exec('authenticated', 'a1000000-0000-0000-0000-000000000002',
      $q$with x as (
        insert into public.documentos (tutor_cpf, pet_id, nome, mime_type, tamanho_bytes, storage_path, criado_por)
        values ('555.555.555-55', 'b1000000-0000-0000-0000-000000000001', 'vet.pdf',
                'application/pdf', 100, 'b1000000-0000-0000-0000-000000000001/vet.pdf',
                'a1000000-0000-0000-0000-000000000002') returning 1
      ) select count(*) from x$q$));
select pg_temp.registrar('func|documentos|insert', -1,
    pg_temp.exec('authenticated', 'a1000000-0000-0000-0000-000000000003',
      $q$with x as (
        insert into public.documentos (tutor_cpf, pet_id, nome, mime_type, tamanho_bytes, storage_path, criado_por)
        values ('555.555.555-55', 'b1000000-0000-0000-0000-000000000001', 'func.pdf',
                'application/pdf', 100, 'b1000000-0000-0000-0000-000000000001/func.pdf',
                'a1000000-0000-0000-0000-000000000003') returning 1
      ) select count(*) from x$q$));

select pg_temp.registrar('admin|storage|select', 1,
    pg_temp.exec('authenticated', 'a1000000-0000-0000-0000-000000000001',
        'select count(*) from storage.objects where bucket_id = ''dayvet-documentos'''));
select pg_temp.registrar('vet|storage|insert', 1,
    pg_temp.exec('authenticated', 'a1000000-0000-0000-0000-000000000002',
      $q$with x as (
        insert into storage.objects (bucket_id, name)
        values ('dayvet-documentos', 'b1000000-0000-0000-0000-000000000001/vet-upload.pdf')
        returning 1
      ) select count(*) from x$q$));
select pg_temp.registrar('func|storage|select', 0,
    pg_temp.exec('authenticated', 'a1000000-0000-0000-0000-000000000003',
        'select count(*) from storage.objects where bucket_id = ''dayvet-documentos'''));
select pg_temp.registrar('func|storage|insert', -1,
    pg_temp.exec('authenticated', 'a1000000-0000-0000-0000-000000000003',
      $q$with x as (
        insert into storage.objects (bucket_id, name)
        values ('dayvet-documentos', 'b1000000-0000-0000-0000-000000000001/func-upload.pdf')
        returning 1
      ) select count(*) from x$q$));

select case when bool_and(ok) then 'OK' else 'FALHA' end,
       count(*) filter (where ok), count(*) filter (where not ok)
from res;
select case when ok then 'OK  ' else 'FALHA' end || ' | ' || caso
from res order by caso;

select case when not public then 'OK' else 'FALHA' end as bucket_privado,
       case when file_size_limit = 10485760 then 'OK' else 'FALHA' end as limite_10mb
from storage.buckets where id = 'dayvet-documentos';

rollback;
