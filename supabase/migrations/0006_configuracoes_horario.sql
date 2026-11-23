-- Configuração persistente do expediente e validação no banco.

create table if not exists public.configuracoes_clinica (
    id                  boolean primary key default true check (id),
    hora_abertura       time not null default '08:00',
    hora_fechamento     time not null default '18:00',
    modo_restricao      text not null default 'comercial'
                        check (modo_restricao in ('comercial', 'livre')),
    funcionamento_fds   text not null default 'sabado'
                        check (funcionamento_fds in ('sabado', 'direto', 'fechado')),
    atualizado_por      uuid references public.usuarios(id),
    updated_at          timestamptz not null default now(),
    constraint chk_config_horario_ordem check (hora_abertura < hora_fechamento)
);

insert into public.configuracoes_clinica (id)
values (true)
on conflict (id) do nothing;

drop trigger if exists trg_configuracoes_clinica_updated_at on public.configuracoes_clinica;
create trigger trg_configuracoes_clinica_updated_at
before update on public.configuracoes_clinica
for each row execute function public.set_updated_at();

alter table public.agendamentos
    drop constraint if exists chk_agendamentos_hora_janela;

create or replace function public.validar_horario_agendamento()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    cfg public.configuracoes_clinica%rowtype;
    dia_semana integer;
    limite_fechamento time;
begin
    select * into cfg
      from public.configuracoes_clinica
     where id = true;

    if not found or cfg.modo_restricao = 'livre' then
        return new;
    end if;

    dia_semana := extract(dow from new.data)::integer;
    if dia_semana = 0 then
        if cfg.funcionamento_fds <> 'direto' then
            raise check_violation using message = 'A clínica não atende neste dia.';
        end if;
        return new;
    elsif dia_semana = 6 then
        if cfg.funcionamento_fds = 'fechado' then
            raise check_violation using message = 'A clínica não atende neste dia.';
        elsif cfg.funcionamento_fds = 'direto' then
            return new;
        end if;
        limite_fechamento := least(cfg.hora_fechamento, time '12:00');
    else
        limite_fechamento := cfg.hora_fechamento;
    end if;

    if new.hora < cfg.hora_abertura or new.hora > limite_fechamento then
        raise check_violation using message = 'Agendamento fora do horário de funcionamento.';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_validar_horario_agendamento on public.agendamentos;
create trigger trg_validar_horario_agendamento
before insert or update of data, hora on public.agendamentos
for each row execute function public.validar_horario_agendamento();

alter table public.configuracoes_clinica enable row level security;
revoke all on public.configuracoes_clinica from anon;
grant select, update on public.configuracoes_clinica to authenticated;

drop policy if exists configuracoes_clinica_select on public.configuracoes_clinica;
create policy configuracoes_clinica_select on public.configuracoes_clinica
    for select to authenticated using (public.e_staff());

drop policy if exists configuracoes_clinica_update_admin on public.configuracoes_clinica;
create policy configuracoes_clinica_update_admin on public.configuracoes_clinica
    for update to authenticated
    using (public.e_admin()) with check (public.e_admin());

create or replace function public.validar_limite_pets_por_tutor()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    quantidade integer;
begin
    perform 1
      from public.tutores
     where cpf = new.tutor_cpf
     for update;

    select count(*) into quantidade
      from public.pets
     where tutor_cpf = new.tutor_cpf
       and id is distinct from new.id;

    if quantidade >= 10 then
        raise check_violation using message = 'Limite de 10 pets por tutor atingido.';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_validar_limite_pets_por_tutor on public.pets;
create trigger trg_validar_limite_pets_por_tutor
before insert or update of tutor_cpf on public.pets
for each row execute function public.validar_limite_pets_por_tutor();
