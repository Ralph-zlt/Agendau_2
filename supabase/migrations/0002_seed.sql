-- ============================================================================
-- DayVet-Gestão — Seed dos catálogos (idempotente)
--
-- Só entra o que é catálogo global do produto:
--   `vacina_tipos`  → o select de vacina em agendamento/histórico
--   `raca_tipos`    → o select de raça por espécie no cadastro de pet
--
-- NÃO entra aqui: clínica (não existe), usuários (nascem no Supabase Auth com
-- `must_change=true`) e tutores/pets/agendamentos (dados de cliente, LGPD).
--
-- Idempotência: `on conflict do nothing` sobre os UNIQUE reais
-- (`vacina_tipos.nome`, `raca_tipos(especie, nome)`). Rodar 2× não duplica.
-- Fonte dos nomes: `dayvet/script.js` (tiposVacina e racasPorEspecie).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TIPOS DE VACINA
-- ----------------------------------------------------------------------------
insert into public.vacina_tipos (nome) values
    ('Antirrábica'),
    ('V8'),
    ('V10'),
    ('V12'),
    ('Tríplice Felina'),
    ('Quádrupla Felina'),
    ('Giárdia'),
    ('Tosse dos Canis'),
    ('Leishmaniose'),
    ('Outra')
on conflict (nome) do nothing;

-- ----------------------------------------------------------------------------
-- 2. TIPOS DE RAÇA (por espécie)
-- ----------------------------------------------------------------------------
insert into public.raca_tipos (especie, nome) values
    ('Canino', 'Labrador Retriever'),
    ('Canino', 'Golden Retriever'),
    ('Canino', 'Poodle'),
    ('Canino', 'Bulldog'),
    ('Canino', 'Pastor Alemão'),
    ('Canino', 'SRD'),
    ('Canino', 'Outra'),
    ('Felino', 'Persa'),
    ('Felino', 'Siamês'),
    ('Felino', 'Maine Coon'),
    ('Felino', 'SRD'),
    ('Felino', 'Outra'),
    ('Equino', 'Quarto de Milha'),
    ('Equino', 'Mangalarga'),
    ('Equino', 'Árabe'),
    ('Equino', 'Puro-Sangue Inglês'),
    ('Equino', 'Outra'),
    ('Bovino', 'Nelore'),
    ('Bovino', 'Gir'),
    ('Bovino', 'Holandesa'),
    ('Bovino', 'Angus'),
    ('Bovino', 'Outra'),
    ('Suíno', 'Large White'),
    ('Suíno', 'Landrace'),
    ('Suíno', 'Duroc'),
    ('Suíno', 'Outra'),
    ('Ovino', 'Santa Inês'),
    ('Ovino', 'Dorper'),
    ('Ovino', 'Suffolk'),
    ('Ovino', 'Outra'),
    ('Outro', 'Outra')
on conflict (especie, nome) do nothing;
