\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email)
values ('a0000000-0000-0000-0000-000000000011', 'horario@teste.local');

insert into public.usuarios (id, cpf, nome, email, role, must_change)
values ('a0000000-0000-0000-0000-000000000011', '999.999.999-11',
        'Admin Horário', 'horario@teste.local', 'admin', false);

insert into public.tutores (cpf, nome, telefone)
values ('111.111.111-11', 'Tutor Horário', '(11) 99999-1111');

do $$
declare
    dia_util date := date_trunc('week', current_date)::date + 1;
    sabado date := date_trunc('week', current_date)::date + 5;
    domingo date := date_trunc('week', current_date)::date + 6;
    vet uuid := 'a0000000-0000-0000-0000-000000000011';
begin
    begin
        insert into public.agendamentos (tutor_cpf, vet_id, servico, data, hora)
        values ('111.111.111-11', vet, 'Consulta', dia_util, '07:00');
        raise exception 'horário anterior à abertura foi aceito';
    exception when check_violation then
        null;
    end;

    insert into public.agendamentos (tutor_cpf, vet_id, servico, data, hora)
    values ('111.111.111-11', vet, 'Consulta', dia_util, '08:00');

    begin
        insert into public.agendamentos (tutor_cpf, vet_id, servico, data, hora)
        values ('111.111.111-11', vet, 'Consulta', sabado, '13:00');
        raise exception 'sábado após meio-dia foi aceito';
    exception when check_violation then
        null;
    end;

    begin
        insert into public.agendamentos (tutor_cpf, vet_id, servico, data, hora)
        values ('111.111.111-11', vet, 'Consulta', domingo, '10:00');
        raise exception 'domingo fechado foi aceito';
    exception when check_violation then
        null;
    end;

    update public.configuracoes_clinica
       set funcionamento_fds = 'direto'
     where id = true;
    insert into public.agendamentos (tutor_cpf, vet_id, servico, data, hora)
    values ('111.111.111-11', vet, 'Consulta', domingo, '02:00');

    update public.configuracoes_clinica
       set modo_restricao = 'livre'
     where id = true;
    insert into public.agendamentos (tutor_cpf, vet_id, servico, data, hora)
    values ('111.111.111-11', vet, 'Consulta', dia_util, '02:00');
end;
$$;

select 'OK | regras de horário comercial, sábado, domingo e modo livre';

insert into public.pets (tutor_cpf, nome, especie, raca, sexo)
select '111.111.111-11', 'Pet ' || n, 'Canino', 'SRD', 'Macho'
  from generate_series(1, 10) as n;

do $$
begin
    begin
        insert into public.pets (tutor_cpf, nome, especie, raca, sexo)
        values ('111.111.111-11', 'Pet excedente', 'Canino', 'SRD', 'Macho');
        raise exception 'limite de 10 pets foi ultrapassado';
    exception when check_violation then
        null;
    end;
end;
$$;

select 'OK | limite de 10 pets por tutor aplicado no banco';

do $$
begin
    if not exists (
        select 1 from pg_policies
         where schemaname = 'public'
           and tablename = 'configuracoes_clinica'
           and policyname = 'configuracoes_clinica_select'
    ) then
        raise exception 'policy de leitura da configuração ausente';
    end if;
    if not exists (
        select 1 from pg_policies
         where schemaname = 'public'
           and tablename = 'configuracoes_clinica'
           and policyname = 'configuracoes_clinica_update_admin'
    ) then
        raise exception 'policy de atualização admin ausente';
    end if;
end;
$$;

select 'OK | policies de leitura para staff e atualização para admin';

rollback;
