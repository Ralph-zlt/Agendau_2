-- ============================================================================
-- DayVet-Gestão — Seeds SQL (Estrutura de Dados Iniciais)
-- Gerado em: 2026-11-02
-- NOTA: Não insere dados reais (LGPD). Apenas estrutura para popular via app/admin.
-- Os mocks atuais (admin, vet, funcionário) devem ser criados via fluxo de implantação.
-- ============================================================================

-- ============================================================================
-- 1. CLÍNICA PRINCIPAL (single clinic por enquanto, mas estrutura multi-tenant)
-- ============================================================================

-- A clínica deve ser criada no setup inicial. Exemplo de estrutura:
-- INSERT INTO clinicas (id, nome, cnpj, endereco, telefone, email)
-- VALUES (gen_random_uuid(), 'DayVet Clínica Veterinária', '00.000.000/0001-00', 'Rua Exemplo, 123', '(11) 99999-9999', 'contato@dayvet.com');

-- ============================================================================
-- 2. USUÁRIOS INICIAIS (Admin + Veterinário + Funcionário)
-- ============================================================================
-- IMPORTANTE: Senhas devem ser hasheadas com bcrypt (custo 12) ANTES do INSERT.
-- Não coloque hashes reais aqui — use o fluxo de implantação do sistema:
-- 1. Admin cadastra CPF+e-mail do responsável → sistema gera senha temporária
-- 2. 1º acesso força troca de senha (must_change=true)
-- 3. Após troca, must_change=false permanente

-- Exemplo de estrutura (NÃO EXECUTAR DIRETO - senhas em plaintext):
/*
INSERT INTO usuarios (cpf, nome, email, telefone, role, password_hash, must_change, active, clinica_id, criado_por)
VALUES
    -- Admin principal (criado por 'sistema' no bootstrap)
    ('111.111.111-11', 'Dr. Douglas Ferreira', 'douglas@dayvet.com', '(11) 98765-4321',
     'admin', '$2b$12$HASH_BCRYPT_AQUI', false, true,
     (SELECT id FROM clinicas LIMIT 1), 'sistema'),

    -- Veterinário
    ('333.333.333-33', 'Dr. Carlos Silva', 'carlos@dayvet.com', '(11) 88888-8888',
     'veterinario', '$2b$12$HASH_BCRYPT_AQUI', true, true,
     (SELECT id FROM clinicas LIMIT 1), '111.111.111-11'),

    -- Funcionário
    ('444.444.444-44', 'Lucas Atendente', 'lucas@dayvet.com', '(11) 77777-7777',
     'funcionario', '$2b$12$HASH_BCRYPT_AQUI', true, true,
     (SELECT id FROM clinicas LIMIT 1), '111.111.111-11');
*/

-- Perfis estendidos (executar após inserir em usuarios):
/*
INSERT INTO administradores (cpf_usuario) VALUES ('111.111.111-11');

INSERT INTO veterinarios (cpf_usuario, crm, crm_validade)
VALUES ('333.333.333-33', 'CRM-SP 12345', '2029-12-31');

INSERT INTO funcionarios (cpf_usuario) VALUES ('444.444.444-44');
*/

-- ============================================================================
-- 3. CATÁLOGO: vacina_tipos (globais - clinica_id = NULL)
-- ============================================================================

INSERT INTO vacina_tipos (nome, ativo, clinica_id) VALUES
    ('Antirrábica', true, NULL),
    ('V8', true, NULL),
    ('V10', true, NULL),
    ('V12', true, NULL),
    ('Tríplice Felina', true, NULL),
    ('Quádrupla Felina', true, NULL),
    ('Giárdia', true, NULL),
    ('Tosse dos Canis', true, NULL),
    ('Leishmaniose', true, NULL),
    ('Outra', true, NULL)
ON CONFLICT (nome) DO NOTHING;

-- ============================================================================
-- 4. CATÁLOGO: raca_tipos (globais por espécie)
-- ============================================================================

-- Canino
INSERT INTO raca_tipos (especie, nome, ativo, clinica_id) VALUES
    ('Canino', 'Labrador Retriever', true, NULL),
    ('Canino', 'Golden Retriever', true, NULL),
    ('Canino', 'Poodle', true, NULL),
    ('Canino', 'Bulldog', true, NULL),
    ('Canino', 'Pastor Alemão', true, NULL),
    ('Canino', 'SRD', true, NULL),
    ('Canino', 'Outra', true, NULL)

-- Felino
INSERT INTO raca_tipos (especie, nome, ativo, clinica_id) VALUES
    ('Felino', 'Persa', true, NULL),
    ('Felino', 'Siamês', true, NULL),
    ('Felino', 'Maine Coon', true, NULL),
    ('Felino', 'SRD', true, NULL),
    ('Felino', 'Outra', true, NULL)

-- Equino
INSERT INTO raca_tipos (especie, nome, ativo, clinica_id) VALUES
    ('Equino', 'Quarto de Milha', true, NULL),
    ('Equino', 'Mangalarga', true, NULL),
    ('Equino', 'Árabe', true, NULL),
    ('Equino', 'Puro-Sangue Inglês', true, NULL),
    ('Equino', 'Outra', true, NULL)

-- Bovino
INSERT INTO raca_tipos (especie, nome, ativo, clinica_id) VALUES
    ('Bovino', 'Nelore', true, NULL),
    ('Bovino', 'Gir', true, NULL),
    ('Bovino', 'Holandesa', true, NULL),
    ('Bovino', 'Angus', true, NULL),
    ('Bovino', 'Outra', true, NULL)

-- Suíno
INSERT INTO raca_tipos (especie, nome, ativo, clinica_id) VALUES
    ('Suíno', 'Large White', true, NULL),
    ('Suíno', 'Landrace', true, NULL),
    ('Suíno', 'Duroc', true, NULL),
    ('Suíno', 'Outra', true, NULL)

-- Ovino
INSERT INTO raca_tipos (especie, nome, ativo, clinica_id) VALUES
    ('Ovino', 'Santa Inês', true, NULL),
    ('Ovino', 'Dorper', true, NULL),
    ('Ovino', 'Suffolk', true, NULL),
    ('Ovino', 'Outra', true, NULL)

-- Outro
INSERT INTO raca_tipos (especie, nome, ativo, clinica_id) VALUES
    ('Outro', 'Outra', true, NULL)

ON CONFLICT (especie, nome, clinica_id) DO NOTHING;

-- ============================================================================
-- 5. TUTORES DE EXEMPLO (estrutura - NÃO EXECUTAR COM DADOS REAIS)
-- ============================================================================
/*
INSERT INTO tutores (cpf, nome, email, telefone, endereco, clinica_id, criado_por)
VALUES
    ('111.222.333-44', 'Douglas Silva Ferreira', 'douglas.ferreira@dayvetgestao.com', '11987654321', 'Rua do Pet, 120 - Pilar do Sul',
     (SELECT id FROM clinicas LIMIT 1), '111.111.111-11'),
    ('222.333.444-55', 'Laís Vieira de Oliveira', 'lais.oliveira@dayvetgestao.com', '11977778888', 'Av. Veterinária, 350 - Pilar do Sul',
     (SELECT id FROM clinicas LIMIT 1), '111.111.111-11');
*/

-- ============================================================================
-- 6. PETS DE EXEMPLO (estrutura)
-- ============================================================================
/*
INSERT INTO pets (id, tutor_cpf, nome, especie, raca, sexo, peso_kg, comportamento, alergias, clinica_id, criado_por)
VALUES
    (gen_random_uuid(), '111.222.333-44', 'Rex', 'Canino', 'Golden Retriever', 'Macho', 32.5, 'Dócil e sociável.', 'Nenhuma registrada.',
     (SELECT id FROM clinicas LIMIT 1), '111.111.111-11'),
    (gen_random_uuid(), '222.333.444-55', 'Mingau', 'Felino', 'Persa', 'Fêmea', 4.2, 'Muito dócil e preguiçoso.', 'Sensibilidade a certos medicamentos.',
     (SELECT id FROM clinicas LIMIT 1), '111.111.111-11');
*/

-- ============================================================================
-- INSTRUÇÕES DE USO
-- ============================================================================
/*
ORDEM DE EXECUÇÃO RECOMENDADA:

1. schema.sql          -- Cria tabelas, índices, constraints, triggers, views
2. Este arquivo (seeds.sql) -- Popula catálogos globais (vacina_tipos, raca_tipos)
3. Setup da clínica    -- Via app: admin cria clínica + seu próprio usuário (bootstrap)
4. Usuários iniciais   -- Via app: admin cria vet/funcionário (senha temp + must_change)
5. Dados de demo       -- Via app: cadastra tutores/pets/agendamentos para testar

NUNCA COMITAR HASHES DE SENHA REAIS NO REPOSITÓRIO.
Use variáveis de ambiente ou secrets do Supabase para seeds sensíveis.
*/

-- ============================================================================
-- FIM DOS SEEDS
-- ============================================================================