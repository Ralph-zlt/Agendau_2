-- ============================================================================
-- DayVet-Gestão — Script SQL Consolidado para Supabase (PostgreSQL)
-- ============================================================================
-- Projeto: Agendau_2 — Sistema Integrado para Pet Shop e Clínica Veterinária
-- Data: 2026-11-02
-- Versão: 1.0
--
-- Este arquivo reúne em um único script:
--   1. ESTRUTURA DO BANCO (DDL) — tabelas, enums, índices, constraints, triggers, views
--   2. DADOS INICIAIS (SEEDS) — catálogos globais e exemplos comentados
--   3. SEGURANÇA (RLS) — Row Level Security por perfil e multi-clínica
--
-- ORDEM DE EXECUÇÃO RECOMENDADA NO SUPABASE SQL EDITOR:
--   1. Execute este arquivo completo (cria estrutura + seeds + RLS)
--   2. Crie a clínica inicial e o usuário admin via aplicação (fluxo de bootstrap)
--   3. Configure JWT Custom Claims no Supabase Auth (ver seção "Notas de Implementação")
--
-- OBSERVAÇÕES IMPORTANTES:
--   - Não contém dados reais (LGPD). Senhas e CPFs de exemplo são apenas ilustrativos.
--   - Projetado para PostgreSQL 15+ (Supabase).
--   - Requer extensões: pgcrypto, uuid-ossp.
-- ============================================================================


-- ============================================================================
-- PARTE 1 — ESTRUTURA DO BANCO DE DADOS (DDL)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensões necessárias
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";        -- gen_random_uuid(), funções de criptografia
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";       -- uuid_generate_v4() (alternativa)


-- ----------------------------------------------------------------------------
-- Enums (tipos enumerados para integridade de domínio e performance)
-- ----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('admin', 'veterinario', 'funcionario');
CREATE TYPE agendamento_status AS ENUM ('pendente', 'confirmado', 'cancelado', 'concluido');
CREATE TYPE historico_tipo AS ENUM ('receita', 'guia', 'vacina');
CREATE TYPE pet_especie AS ENUM ('Canino', 'Felino', 'Equino', 'Bovino', 'Suíno', 'Ovino', 'Outro');
CREATE TYPE pet_sexo AS ENUM ('Macho', 'Fêmea');
CREATE TYPE forma_farmaceutica AS ENUM ('comprimido', 'gotas', 'pomada', 'injetavel', 'outro');


-- ----------------------------------------------------------------------------
-- Função utilitária: atualização automática de updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END $$;


-- ----------------------------------------------------------------------------
-- Tabela: clinicas (raiz do multi-tenancy)
-- ----------------------------------------------------------------------------
CREATE TABLE clinicas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome            VARCHAR(255) NOT NULL,
    cnpj            VARCHAR(18) UNIQUE,           -- Formato: 00.000.000/0000-00
    endereco        TEXT,
    telefone        VARCHAR(20),
    email           VARCHAR(255),
    ativa           BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_clinicas_updated_at
BEFORE UPDATE ON clinicas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------------------------------------------
-- Tabela: usuarios (staff do sistema: admin, veterinário, funcionário)
-- PK = CPF (chave natural). Cada usuário pertence a uma clínica.
-- ----------------------------------------------------------------------------
CREATE TABLE usuarios (
    cpf             VARCHAR(14) PRIMARY KEY,      -- Formato: 000.000.000-00
    nome            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    telefone        VARCHAR(20),
    role            user_role NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,        -- Hash bcrypt (custo 12)
    must_change     BOOLEAN DEFAULT true,         -- Força troca de senha no 1º acesso
    active          BOOLEAN DEFAULT true,
    clinica_id      UUID NOT NULL REFERENCES clinicas(id),
    criado_por      VARCHAR(14) REFERENCES usuarios(cpf),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    deleted_at      TIMESTAMPTZ                   -- Soft delete (LGPD)
);

CREATE INDEX idx_usuarios_clinica_id ON usuarios(clinica_id);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_role ON usuarios(role);
CREATE INDEX idx_usuarios_active ON usuarios(active) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------------------------------------------
-- Tabelas de perfil estendido (1:1 com usuarios, por role)
-- ----------------------------------------------------------------------------

-- Perfil de administrador
CREATE TABLE administradores (
    cpf_usuario     VARCHAR(14) PRIMARY KEY REFERENCES usuarios(cpf) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_administradores_updated_at
BEFORE UPDATE ON administradores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Perfil de veterinário (dados do CRMV)
CREATE TABLE veterinarios (
    cpf_usuario     VARCHAR(14) PRIMARY KEY REFERENCES usuarios(cpf) ON DELETE CASCADE,
    crm             VARCHAR(50) NOT NULL,         -- Ex: "CRM-SP 12345"
    crm_validade    DATE NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_veterinarios_crm ON veterinarios(crm);
CREATE INDEX idx_veterinarios_crm_validade ON veterinarios(crm_validade);
CREATE TRIGGER trg_veterinarios_updated_at
BEFORE UPDATE ON veterinarios
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Perfil de funcionário
CREATE TABLE funcionarios (
    cpf_usuario     VARCHAR(14) PRIMARY KEY REFERENCES usuarios(cpf) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_funcionarios_updated_at
BEFORE UPDATE ON funcionarios
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------------------------------------------
-- Tabela: tutores (clientes — NÃO são usuários do sistema, não têm login)
-- PK = CPF (chave natural)
-- ----------------------------------------------------------------------------
CREATE TABLE tutores (
    cpf             VARCHAR(14) PRIMARY KEY,      -- Formato: 000.000.000-00
    nome            VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    telefone        VARCHAR(20) NOT NULL,         -- 11 dígitos (DDD + 9)
    endereco        TEXT,
    clinica_id      UUID NOT NULL REFERENCES clinicas(id),
    criado_por      VARCHAR(14) REFERENCES usuarios(cpf),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    deleted_at      TIMESTAMPTZ                   -- Soft delete (LGPD)
);

CREATE INDEX idx_tutores_clinica_id ON tutores(clinica_id);
CREATE INDEX idx_tutores_nome ON tutores(nome);
CREATE INDEX idx_tutores_email ON tutores(email);

CREATE TRIGGER trg_tutores_updated_at
BEFORE UPDATE ON tutores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------------------------------------------
-- Tabela: pets
-- PK = UUID (surrogate). FK → tutores.cpf
-- ----------------------------------------------------------------------------
CREATE TABLE pets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_cpf       VARCHAR(14) NOT NULL REFERENCES tutores(cpf) ON DELETE RESTRICT,
    nome            VARCHAR(255) NOT NULL,
    especie         pet_especie NOT NULL,
    raca            VARCHAR(100) NOT NULL,        -- Validado contra raca_tipos.nome (app-level)
    sexo            pet_sexo NOT NULL,
    peso_kg         DECIMAL(5,2),                 -- NULL = não informado; > 0 se preenchido
    comportamento   TEXT,
    alergias        TEXT,
    clinica_id      UUID NOT NULL REFERENCES clinicas(id),
    criado_por      VARCHAR(14) REFERENCES usuarios(cpf),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    deleted_at      TIMESTAMPTZ                   -- Soft delete
);

CREATE INDEX idx_pets_tutor_cpf ON pets(tutor_cpf);
CREATE INDEX idx_pets_clinica_id ON pets(clinica_id);
CREATE INDEX idx_pets_especie ON pets(especie);
CREATE INDEX idx_pets_nome ON pets(nome);

CREATE TRIGGER trg_pets_updated_at
BEFORE UPDATE ON pets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Constraint: peso deve ser positivo se informado
ALTER TABLE pets ADD CONSTRAINT chk_pets_peso_positivo
CHECK (peso_kg IS NULL OR peso_kg > 0);


-- ----------------------------------------------------------------------------
-- Tabela: agendamentos
-- vet_id = veterinário responsável pelo atendimento (FK → usuarios.cpf onde role='veterinario')
-- criado_por = quem cadastrou o agendamento (FK → usuarios.cpf)
-- ----------------------------------------------------------------------------
CREATE TABLE agendamentos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
    tutor_cpf       VARCHAR(14) NOT NULL REFERENCES tutores(cpf) ON DELETE RESTRICT,
    vet_id          VARCHAR(14) NOT NULL REFERENCES usuarios(cpf) ON DELETE RESTRICT,
    servico         VARCHAR(255) NOT NULL,        -- Ex: "Consulta Veterinária", "Vacinação"
    vacina_tipo     VARCHAR(100),                 -- Preenchido se serviço ILIKE '%vacin%'; ref vacina_tipos.nome
    data            DATE NOT NULL,
    hora            TIME NOT NULL,
    valor           DECIMAL(10,2) NOT NULL DEFAULT 0,
    status          agendamento_status NOT NULL DEFAULT 'pendente',
    info_complementar TEXT,                       -- Futuro: JSONB para dados flexíveis
    clinica_id      UUID NOT NULL REFERENCES clinicas(id),
    criado_por      VARCHAR(14) REFERENCES usuarios(cpf),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_agendamentos_pet_id ON agendamentos(pet_id);
CREATE INDEX idx_agendamentos_tutor_cpf ON agendamentos(tutor_cpf);
CREATE INDEX idx_agendamentos_vet_id ON agendamentos(vet_id);
CREATE INDEX idx_agendamentos_clinica_id ON agendamentos(clinica_id);
CREATE INDEX idx_agendamentos_data ON agendamentos(data);
CREATE INDEX idx_agendamentos_status ON agendamentos(status);
CREATE INDEX idx_agendamentos_data_hora ON agendamentos(data, hora);
-- Índice composto para dashboard do veterinário (filtro por vet_id + data + status)
CREATE INDEX idx_agendamentos_vet_data_status ON agendamentos(vet_id, data, status);

CREATE TRIGGER trg_agendamentos_updated_at
BEFORE UPDATE ON agendamentos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Regras de negócio no nível do banco
ALTER TABLE agendamentos ADD CONSTRAINT chk_agendamentos_hora_janela
CHECK (hora >= '07:00:00' AND hora <= '19:00:00');   -- Janela de atendimento 07h–19h

ALTER TABLE agendamentos ADD CONSTRAINT chk_agendamentos_valor_nao_negativo
CHECK (valor >= 0);


-- ----------------------------------------------------------------------------
-- Tabela: historico_clinico (registros imutáveis após criação)
-- Tipos: receita | guia | vacina
-- Imutabilidade garantida por trigger (exceto soft delete para LGPD)
-- ----------------------------------------------------------------------------
CREATE TABLE historico_clinico (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
    tutor_cpf       VARCHAR(14) NOT NULL REFERENCES tutores(cpf) ON DELETE RESTRICT,
    tipo            historico_tipo NOT NULL,
    veterinario_id  VARCHAR(14) NOT NULL REFERENCES usuarios(cpf) ON DELETE RESTRICT, -- Quem assinou/emitiu
    crmv            VARCHAR(50) NOT NULL,       -- CRMV do veterinário no momento da emissão
    data            DATE NOT NULL,
    detalhe         TEXT NOT NULL,              -- Prescrição, encaminhamento ou registro de vacina
    vacina_tipo     VARCHAR(100),               -- Se tipo='vacina'; ref vacina_tipos.nome
    clinica_id      UUID NOT NULL REFERENCES clinicas(id),
    criado_por      VARCHAR(14) REFERENCES usuarios(cpf),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    deleted_at      TIMESTAMPTZ                 -- Soft delete apenas para LGPD (arquivamento)
);

CREATE INDEX idx_historico_pet_id ON historico_clinico(pet_id);
CREATE INDEX idx_historico_tutor_cpf ON historico_clinico(tutor_cpf);
CREATE INDEX idx_historico_clinica_id ON historico_clinico(clinica_id);
CREATE INDEX idx_historico_tipo ON historico_clinico(tipo);
CREATE INDEX idx_historico_data ON historico_clinico(data);
CREATE INDEX idx_historico_veterinario ON historico_clinico(veterinario_id);

CREATE TRIGGER trg_historico_updated_at
BEFORE UPDATE ON historico_clinico
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger de imutabilidade: impede alteração de registros já criados
-- Permite apenas: inserção nova, ou setar deleted_at (soft delete)
CREATE OR REPLACE FUNCTION enforce_historico_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.created_at IS NOT NULL THEN
        IF NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at THEN
            RAISE EXCEPTION 'Histórico clínico é imutável — não pode alterar após criação';
        END IF;
        IF NEW.deleted_at IS NOT NULL THEN
            NEW.created_at := OLD.created_at;
            NEW.updated_at := now();
            RETURN NEW;
        END IF;
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER trg_historico_immutability
BEFORE UPDATE ON historico_clinico
FOR EACH ROW EXECUTE FUNCTION enforce_historico_immutability();


-- ----------------------------------------------------------------------------
-- Tabela: vacinacoes (ciclo completo: agendamento → aplicação → próximas doses)
-- Unifica o agendamento de vacinação com o registro clínico e controle de doses.
-- ----------------------------------------------------------------------------
CREATE TABLE vacinacoes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
    tutor_cpf       VARCHAR(14) NOT NULL REFERENCES tutores(cpf) ON DELETE RESTRICT,
    veterinario_id  VARCHAR(14) NOT NULL REFERENCES usuarios(cpf) ON DELETE RESTRICT,
    vacina_tipo     VARCHAR(100) NOT NULL,                -- Ref vacina_tipos.nome
    data_aplicacao  DATE NOT NULL,
    doses_total     INTEGER NOT NULL DEFAULT 1,
    dose_atual      INTEGER NOT NULL DEFAULT 1,
    proxima_dose    DATE,                                 -- Calculado pela aplicação
    agendamento_id  UUID REFERENCES agendamentos(id) ON DELETE SET NULL, -- Link opcional
    clinica_id      UUID NOT NULL REFERENCES clinicas(id),
    criado_por      VARCHAR(14) REFERENCES usuarios(cpf),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_vacinacoes_pet_id ON vacinacoes(pet_id);
CREATE INDEX idx_vacinacoes_tutor_cpf ON vacinacoes(tutor_cpf);
CREATE INDEX idx_vacinacoes_veterinario ON vacinacoes(veterinario_id);
CREATE INDEX idx_vacinacoes_clinica_id ON vacinacoes(clinica_id);
CREATE INDEX idx_vacinacoes_data ON vacinacoes(data_aplicacao);
CREATE INDEX idx_vacinacoes_proxima_dose ON vacinacoes(proxima_dose);
CREATE INDEX idx_vacinacoes_agendamento ON vacinacoes(agendamento_id);

CREATE TRIGGER trg_vacinacoes_updated_at
BEFORE UPDATE ON vacinacoes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Validações de doses
ALTER TABLE vacinacoes ADD CONSTRAINT chk_vacinacoes_doses_positivas
CHECK (doses_total > 0 AND dose_atual > 0 AND dose_atual <= doses_total);


-- ----------------------------------------------------------------------------
-- Catálogos gerenciáveis (tabelas de referência)
-- ----------------------------------------------------------------------------

-- Tipos de vacina (CRUD por admin/veterinário)
CREATE TABLE vacina_tipos (
    id              BIGSERIAL PRIMARY KEY,
    nome            VARCHAR(100) UNIQUE NOT NULL,
    ativo           BOOLEAN DEFAULT true,
    clinica_id      UUID REFERENCES clinicas(id),   -- NULL = global (todas as clínicas)
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_vacina_tipos_ativo ON vacina_tipos(ativo);
CREATE INDEX idx_vacina_tipos_clinica ON vacina_tipos(clinica_id);
CREATE TRIGGER trg_vacina_tipos_updated_at
BEFORE UPDATE ON vacina_tipos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Raças por espécie (CRUD por admin/funcionário)
CREATE TABLE raca_tipos (
    id              BIGSERIAL PRIMARY KEY,
    especie         pet_especie NOT NULL,
    nome            VARCHAR(100) NOT NULL,
    ativo           BOOLEAN DEFAULT true,
    clinica_id      UUID REFERENCES clinicas(id),   -- NULL = global
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (especie, nome, clinica_id)
);
CREATE INDEX idx_raca_tipos_especie ON raca_tipos(especie);
CREATE INDEX idx_raca_tipos_ativo ON raca_tipos(ativo);
CREATE INDEX idx_raca_tipos_clinica ON raca_tipos(clinica_id);
CREATE TRIGGER trg_raca_tipos_updated_at
BEFORE UPDATE ON raca_tipos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ----------------------------------------------------------------------------
-- Views úteis (para relatórios e dashboards)
-- ----------------------------------------------------------------------------

-- View: Agendamentos com dados expandidos (relatórios, dashboard admin)
CREATE VIEW v_agendamentos_completos AS
SELECT
    a.id,
    a.data,
    a.hora,
    a.servico,
    a.vacina_tipo,
    a.valor,
    a.status,
    a.info_complementar,
    p.nome AS pet_nome,
    p.especie AS pet_especie,
    p.raca AS pet_raca,
    t.nome AS tutor_nome,
    t.cpf AS tutor_cpf,
    t.telefone AS tutor_telefone,
    u.nome AS veterinario_nome,
    u.cpf AS veterinario_cpf,
    v.crm AS veterinario_crm,
    a.clinica_id,
    a.created_at
FROM agendamentos a
JOIN pets p ON p.id = a.pet_id
JOIN tutores t ON t.cpf = a.tutor_cpf
JOIN usuarios u ON u.cpf = a.vet_id
LEFT JOIN veterinarios v ON v.cpf_usuario = u.cpf
WHERE a.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND t.deleted_at IS NULL;

-- View: Próximas vacinações (alertas de retorno)
CREATE VIEW v_proximas_vacinacoes AS
SELECT
    v.id,
    v.pet_id,
    v.proxima_dose,
    v.vacina_tipo,
    p.nome AS pet_nome,
    t.nome AS tutor_nome,
    t.telefone AS tutor_telefone,
    t.email AS tutor_email,
    v.clinica_id
FROM vacinacoes v
JOIN pets p ON p.id = v.pet_id
JOIN tutores t ON t.cpf = v.tutor_cpf
WHERE v.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND t.deleted_at IS NULL
  AND v.proxima_dose IS NOT NULL
  AND v.proxima_dose >= CURRENT_DATE
  AND v.dose_atual < v.doses_total;


-- ============================================================================
-- PARTE 2 — DADOS INICIAIS (SEEDS)
-- ============================================================================
-- Catálogos globais (clinica_id = NULL = válidos para todas as clínicas)
-- Dados de exemplo (tutores, pets, usuários) estão comentados — devem ser
-- criados via aplicação para garantir hash de senha e auditoria correta.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Catálogo: vacina_tipos (globais)
-- ----------------------------------------------------------------------------
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


-- ----------------------------------------------------------------------------
-- 2. Catálogo: raca_tipos (globais, por espécie)
-- ----------------------------------------------------------------------------

-- Canino
INSERT INTO raca_tipos (especie, nome, ativo, clinica_id) VALUES
    ('Canino', 'Labrador Retriever', true, NULL),
    ('Canino', 'Golden Retriever', true, NULL),
    ('Canino', 'Poodle', true, NULL),
    ('Canino', 'Bulldog', true, NULL),
    ('Canino', 'Pastor Alemão', true, NULL),
    ('Canino', 'SRD', true, NULL),
    ('Canino', 'Outra', true, NULL);

-- Felino
INSERT INTO raca_tipos (especie, nome, ativo, clinica_id) VALUES
    ('Felino', 'Persa', true, NULL),
    ('Felino', 'Siamês', true, NULL),
    ('Felino', 'Maine Coon', true, NULL),
    ('Felino', 'SRD', true, NULL),
    ('Felino', 'Outra', true, NULL);

-- Equino
INSERT INTO raca_tipos (especie, nome, ativo, clinica_id) VALUES
    ('Equino', 'Quarto de Milha', true, NULL),
    ('Equino', 'Mangalarga', true, NULL),
    ('Equino', 'Árabe', true, NULL),
    ('Equino', 'Puro-Sangue Inglês', true, NULL),
    ('Equino', 'Outra', true, NULL);

-- Bovino
INSERT INTO raca_tipos (especie, nome, ativo, clinica_id) VALUES
    ('Bovino', 'Nelore', true, NULL),
    ('Bovino', 'Gir', true, NULL),
    ('Bovino', 'Holandesa', true, NULL),
    ('Bovino', 'Angus', true, NULL),
    ('Bovino', 'Outra', true, NULL);

-- Suíno
INSERT INTO raca_tipos (especie, nome, ativo, clinica_id) VALUES
    ('Suíno', 'Large White', true, NULL),
    ('Suíno', 'Landrace', true, NULL),
    ('Suíno', 'Duroc', true, NULL),
    ('Suíno', 'Outra', true, NULL);

-- Ovino
INSERT INTO raca_tipos (especie, nome, ativo, clinica_id) VALUES
    ('Ovino', 'Santa Inês', true, NULL),
    ('Ovino', 'Dorper', true, NULL),
    ('Ovino', 'Suffolk', true, NULL),
    ('Ovino', 'Outra', true, NULL);

-- Outro
INSERT INTO raca_tipos (especie, nome, ativo, clinica_id) VALUES
    ('Outro', 'Outra', true, NULL)
ON CONFLICT (especie, nome, clinica_id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 3. Exemplos comentados (NÃO EXECUTAR DIRETO — usar fluxo da aplicação)
-- ----------------------------------------------------------------------------
/*
-- Clínica inicial (exemplo)
INSERT INTO clinicas (id, nome, cnpj, endereco, telefone, email)
VALUES (gen_random_uuid(), 'DayVet Clínica Veterinária', '00.000.000/0001-00', 'Rua Exemplo, 123', '(11) 99999-9999', 'contato@dayvet.com');

-- Usuários iniciais (senhas DEVEM ser hasheadas com bcrypt ANTES do INSERT)
-- Fluxo correto: app gera senha temporária → envia por e-mail → 1º acesso força troca (must_change=true)
INSERT INTO usuarios (cpf, nome, email, telefone, role, password_hash, must_change, active, clinica_id, criado_por)
VALUES
    ('111.111.111-11', 'Dr. Douglas Ferreira', 'douglas@dayvet.com', '(11) 98765-4321',
     'admin', '$2b$12$HASH_BCRYPT_AQUI', false, true, (SELECT id FROM clinicas LIMIT 1), 'sistema'),
    ('333.333.333-33', 'Dr. Carlos Silva', 'carlos@dayvet.com', '(11) 88888-8888',
     'veterinario', '$2b$12$HASH_BCRYPT_AQUI', true, true, (SELECT id FROM clinicas LIMIT 1), '111.111.111-11'),
    ('444.444.444-44', 'Lucas Atendente', 'lucas@dayvet.com', '(11) 77777-7777',
     'funcionario', '$2b$12$HASH_BCRYPT_AQUI', true, true, (SELECT id FROM clinicas LIMIT 1), '111.111.111-11');

-- Perfis estendidos
INSERT INTO administradores (cpf_usuario) VALUES ('111.111.111-11');
INSERT INTO veterinarios (cpf_usuario, crm, crm_validade) VALUES ('333.333.333-33', 'CRM-SP 12345', '2029-12-31');
INSERT INTO funcionarios (cpf_usuario) VALUES ('444.444.444-44');

-- Tutores de exemplo
INSERT INTO tutores (cpf, nome, email, telefone, endereco, clinica_id, criado_por)
VALUES
    ('111.222.333-44', 'Douglas Silva Ferreira', 'douglas.ferreira@dayvetgestao.com', '11987654321', 'Rua do Pet, 120 - Pilar do Sul', (SELECT id FROM clinicas LIMIT 1), '111.111.111-11'),
    ('222.333.444-55', 'Laís Vieira de Oliveira', 'lais.oliveira@dayvetgestao.com', '11977778888', 'Av. Veterinária, 350 - Pilar do Sul', (SELECT id FROM clinicas LIMIT 1), '111.111.111-11');

-- Pets de exemplo
INSERT INTO pets (id, tutor_cpf, nome, especie, raca, sexo, peso_kg, comportamento, alergias, clinica_id, criado_por)
VALUES
    (gen_random_uuid(), '111.222.333-44', 'Rex', 'Canino', 'Golden Retriever', 'Macho', 32.5, 'Dócil e sociável.', 'Nenhuma registrada.', (SELECT id FROM clinicas LIMIT 1), '111.111.111-11'),
    (gen_random_uuid(), '222.333.444-55', 'Mingau', 'Felino', 'Persa', 'Fêmea', 4.2, 'Muito dócil e preguiçoso.', 'Sensibilidade a certos medicamentos.', (SELECT id FROM clinicas LIMIT 1), '111.111.111-11');
*/


-- ============================================================================
-- PARTE 3 — SEGURANÇA: ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Políticas por perfil (admin, veterinário, funcionário) + isolamento por clínica.
-- Requer configuração de JWT Custom Claims no Supabase Auth (ver notas ao final).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Habilitar RLS em todas as tabelas
-- ----------------------------------------------------------------------------
ALTER TABLE clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE administradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE veterinarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_clinico ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacinacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacina_tipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE raca_tipos ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- Funções auxiliares para RLS (resolução de identidade via JWT)
-- ----------------------------------------------------------------------------

-- Retorna o CPF do usuário autenticado a partir do claim JWT 'cpf'
-- Configurar no Supabase Auth: custom claims { cpf, role, clinica_id }
CREATE OR REPLACE FUNCTION current_user_cpf()
RETURNS VARCHAR(14) LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_cpf VARCHAR(14);
BEGIN
    v_cpf := nullif(current_setting('request.jwt.claims.cpf', true), '')::VARCHAR(14);
    IF v_cpf IS NOT NULL THEN
        RETURN v_cpf;
    END IF;
    -- Fallback: mapear via auth.uid() se houver tabela de ligação
    -- RETURN (SELECT cpf FROM auth_user_map WHERE auth_uid = auth.uid());
    RETURN NULL; -- Falha segura: políticas dependentes bloquearão acesso
END $$;

-- Retorna o role do usuário autenticado
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_role user_role;
BEGIN
    v_role := nullif(current_setting('request.jwt.claims.role', true), '')::user_role;
    IF v_role IS NOT NULL THEN
        RETURN v_role;
    END IF;
    RETURN (SELECT role FROM usuarios WHERE cpf = current_user_cpf() AND deleted_at IS NULL);
END $$;

-- Retorna o clinica_id do usuário autenticado
CREATE OR REPLACE FUNCTION current_user_clinica_id()
RETURNS UUID LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_clinica UUID;
BEGIN
    v_clinica := nullif(current_setting('request.jwt.claims.clinica_id', true), '')::UUID;
    IF v_clinica IS NOT NULL THEN
        RETURN v_clinica;
    END IF;
    RETURN (SELECT clinica_id FROM usuarios WHERE cpf = current_user_cpf() AND deleted_at IS NULL);
END $$;

-- Helpers de role
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$ BEGIN RETURN current_user_role() = 'admin'; END $$;
CREATE OR REPLACE FUNCTION is_veterinario() RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$ BEGIN RETURN current_user_role() = 'veterinario'; END $$;
CREATE OR REPLACE FUNCTION is_funcionario() RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$ BEGIN RETURN current_user_role() = 'funcionario'; END $$;

-- Verifica se o usuário é o criador do registro (auditoria)
CREATE OR REPLACE FUNCTION is_owner(p_criado_por VARCHAR(14))
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN p_criado_por = current_user_cpf();
END $$;


-- ----------------------------------------------------------------------------
-- Políticas: clinicas
-- ----------------------------------------------------------------------------
-- Admin gerencia apenas a própria clínica
CREATE POLICY "clinicas_admin_all" ON clinicas
    FOR ALL TO authenticated
    USING (id = current_user_clinica_id() AND is_admin())
    WITH CHECK (id = current_user_clinica_id() AND is_admin());


-- ----------------------------------------------------------------------------
-- Políticas: usuarios (staff)
-- ----------------------------------------------------------------------------
-- Cada usuário vê a si mesmo
CREATE POLICY "usuarios_self_select" ON usuarios
    FOR SELECT TO authenticated
    USING (cpf = current_user_cpf());

-- Admin vê todos da clínica
CREATE POLICY "usuarios_admin_select" ON usuarios
    FOR SELECT TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_admin());

-- Admin cria usuários na sua clínica
CREATE POLICY "usuarios_admin_insert" ON usuarios
    FOR INSERT TO authenticated
    WITH CHECK (clinica_id = current_user_clinica_id() AND is_admin());

-- Admin atualiza usuários da sua clínica
CREATE POLICY "usuarios_admin_update" ON usuarios
    FOR UPDATE TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_admin())
    WITH CHECK (clinica_id = current_user_clinica_id() AND is_admin());

-- Admin soft-delete usuários da sua clínica
CREATE POLICY "usuarios_admin_delete" ON usuarios
    FOR DELETE TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_admin());

-- Usuário pode atualizar próprio password_hash/must_change (troca de senha)
CREATE POLICY "usuarios_self_update_password" ON usuarios
    FOR UPDATE TO authenticated
    USING (cpf = current_user_cpf())
    WITH CHECK (cpf = current_user_cpf() AND clinica_id = current_user_clinica_id());


-- ----------------------------------------------------------------------------
-- Políticas: perfis estendidos (administradores, veterinarios, funcionarios)
-- ----------------------------------------------------------------------------
-- Admin gerencia todos os perfis da clínica
CREATE POLICY "perfis_admin_all" ON administradores
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM usuarios u WHERE u.cpf = cpf_usuario AND u.clinica_id = current_user_clinica_id() AND is_admin()))
    WITH CHECK (EXISTS (SELECT 1 FROM usuarios u WHERE u.cpf = cpf_usuario AND u.clinica_id = current_user_clinica_id() AND is_admin()));

CREATE POLICY "perfis_admin_all" ON veterinarios
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM usuarios u WHERE u.cpf = cpf_usuario AND u.clinica_id = current_user_clinica_id() AND is_admin()))
    WITH CHECK (EXISTS (SELECT 1 FROM usuarios u WHERE u.cpf = cpf_usuario AND u.clinica_id = current_user_clinica_id() AND is_admin()));

CREATE POLICY "perfis_admin_all" ON funcionarios
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM usuarios u WHERE u.cpf = cpf_usuario AND u.clinica_id = current_user_clinica_id() AND is_admin()))
    WITH CHECK (EXISTS (SELECT 1 FROM usuarios u WHERE u.cpf = cpf_usuario AND u.clinica_id = current_user_clinica_id() AND is_admin()));

-- Veterinário vê seu próprio perfil
CREATE POLICY "veterinario_self_select" ON veterinarios
    FOR SELECT TO authenticated
    USING (cpf_usuario = current_user_cpf() AND is_veterinario());

-- Funcionário vê seu próprio perfil
CREATE POLICY "funcionario_self_select" ON funcionarios
    FOR SELECT TO authenticated
    USING (cpf_usuario = current_user_cpf() AND is_funcionario());


-- ----------------------------------------------------------------------------
-- Políticas: tutores (clientes)
-- ----------------------------------------------------------------------------
-- Staff (admin/funcionário/veterinário) vê todos tutores da clínica
CREATE POLICY "tutores_staff_select" ON tutores
    FOR SELECT TO authenticated
    USING (clinica_id = current_user_clinica_id() AND (is_admin() OR is_funcionario() OR is_veterinario()));

-- Admin/Funcionário criam tutores
CREATE POLICY "tutores_staff_insert" ON tutores
    FOR INSERT TO authenticated
    WITH CHECK (clinica_id = current_user_clinica_id() AND (is_admin() OR is_funcionario()));

-- Admin/Funcionário atualizam tutores
CREATE POLICY "tutores_staff_update" ON tutores
    FOR UPDATE TO authenticated
    USING (clinica_id = current_user_clinica_id() AND (is_admin() OR is_funcionario()))
    WITH CHECK (clinica_id = current_user_clinica_id() AND (is_admin() OR is_funcionario()));

-- Admin soft-delete tutores (LGPD)
CREATE POLICY "tutores_admin_delete" ON tutores
    FOR DELETE TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_admin());


-- ----------------------------------------------------------------------------
-- Políticas: pets
-- ----------------------------------------------------------------------------
-- Staff vê pets da clínica
CREATE POLICY "pets_staff_select" ON pets
    FOR SELECT TO authenticated
    USING (clinica_id = current_user_clinica_id() AND (is_admin() OR is_funcionario() OR is_veterinario()));

-- Admin/Funcionário criam pets
CREATE POLICY "pets_staff_insert" ON pets
    FOR INSERT TO authenticated
    WITH CHECK (clinica_id = current_user_clinica_id() AND (is_admin() OR is_funcionario()));

-- Admin/Funcionário atualizam pets
CREATE POLICY "pets_staff_update" ON pets
    FOR UPDATE TO authenticated
    USING (clinica_id = current_user_clinica_id() AND (is_admin() OR is_funcionario()))
    WITH CHECK (clinica_id = current_user_clinica_id() AND (is_admin() OR is_funcionario()));

-- Admin soft-delete pets
CREATE POLICY "pets_admin_delete" ON pets
    FOR DELETE TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_admin());


-- ----------------------------------------------------------------------------
-- Políticas: agendamentos
-- ----------------------------------------------------------------------------
-- Admin vê todos da clínica
CREATE POLICY "agendamentos_admin_select" ON agendamentos
    FOR SELECT TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_admin());

-- Veterinário vê apenas SEUS agendamentos (vet_id = current_user_cpf)
CREATE POLICY "agendamentos_vet_select" ON agendamentos
    FOR SELECT TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_veterinario() AND vet_id = current_user_cpf());

-- Funcionário vê todos da clínica (somente leitura)
CREATE POLICY "agendamentos_func_select" ON agendamentos
    FOR SELECT TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_funcionario());

-- Admin cria agendamentos
CREATE POLICY "agendamentos_admin_insert" ON agendamentos
    FOR INSERT TO authenticated
    WITH CHECK (clinica_id = current_user_clinica_id() AND is_admin());

-- Veterinário cria agendamentos (consulta + vacinação)
CREATE POLICY "agendamentos_vet_insert" ON agendamentos
    FOR INSERT TO authenticated
    WITH CHECK (clinica_id = current_user_clinica_id() AND is_veterinario() AND vet_id = current_user_cpf());

-- Funcionário NÃO cria agendamentos (somente leitura conforme RBAC)

-- Admin atualiza qualquer agendamento
CREATE POLICY "agendamentos_admin_update" ON agendamentos
    FOR UPDATE TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_admin())
    WITH CHECK (clinica_id = current_user_clinica_id() AND is_admin());

-- Veterinário atualiza SEUS agendamentos
CREATE POLICY "agendamentos_vet_update" ON agendamentos
    FOR UPDATE TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_veterinario() AND vet_id = current_user_cpf())
    WITH CHECK (clinica_id = current_user_clinica_id() AND is_veterinario() AND vet_id = current_user_cpf());

-- Funcionário NÃO atualiza agendamentos (somente leitura)

-- Admin soft-delete agendamentos
CREATE POLICY "agendamentos_admin_delete" ON agendamentos
    FOR DELETE TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_admin());


-- ----------------------------------------------------------------------------
-- Políticas: historico_clinico
-- ----------------------------------------------------------------------------
-- Admin vê todos da clínica
CREATE POLICY "historico_admin_select" ON historico_clinico
    FOR SELECT TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_admin());

-- Veterinário vê seus próprios registros
CREATE POLICY "historico_vet_select" ON historico_clinico
    FOR SELECT TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_veterinario() AND veterinario_id = current_user_cpf());

-- Funcionário NÃO acessa histórico clínico (sem modo clínico)

-- Veterinário insere registros
CREATE POLICY "historico_vet_insert" ON historico_clinico
    FOR INSERT TO authenticated
    WITH CHECK (clinica_id = current_user_clinica_id() AND is_veterinario() AND veterinario_id = current_user_cpf());

-- Admin insere registros
CREATE POLICY "historico_admin_insert" ON historico_clinico
    FOR INSERT TO authenticated
    WITH CHECK (clinica_id = current_user_clinica_id() AND is_admin());

-- Imutabilidade: NENHUMA política de UPDATE/DELETE (exceto soft delete via trigger)
-- O trigger enforce_historico_immutability() bloqueia UPDATEs no nível da tabela.

-- Admin soft-delete (LGPD - arquivamento)
CREATE POLICY "historico_admin_delete" ON historico_clinico
    FOR DELETE TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_admin());


-- ----------------------------------------------------------------------------
-- Políticas: vacinacoes
-- ----------------------------------------------------------------------------
-- Admin vê todos da clínica
CREATE POLICY "vacinacoes_admin_select" ON vacinacoes
    FOR SELECT TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_admin());

-- Veterinário vê suas vacinações
CREATE POLICY "vacinacoes_vet_select" ON vacinacoes
    FOR SELECT TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_veterinario() AND veterinario_id = current_user_cpf());

-- Funcionário NÃO acessa vacinacoes (vacinação é admin/vet)

-- Admin/Veterinário inserem
CREATE POLICY "vacinacoes_staff_insert" ON vacinacoes
    FOR INSERT TO authenticated
    WITH CHECK (clinica_id = current_user_clinica_id() AND (is_admin() OR is_veterinario()) AND veterinario_id = current_user_cpf());

-- Admin/Veterinário atualizam suas vacinações
CREATE POLICY "vacinacoes_staff_update" ON vacinacoes
    FOR UPDATE TO authenticated
    USING (clinica_id = current_user_clinica_id() AND (is_admin() OR (is_veterinario() AND veterinario_id = current_user_cpf())))
    WITH CHECK (clinica_id = current_user_clinica_id() AND (is_admin() OR (is_veterinario() AND veterinario_id = current_user_cpf())));

-- Admin soft-delete
CREATE POLICY "vacinacoes_admin_delete" ON vacinacoes
    FOR DELETE TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_admin());


-- ----------------------------------------------------------------------------
-- Políticas: vacina_tipos (catálogo)
-- ----------------------------------------------------------------------------
-- Todos da clínica veem tipos ativos (globais + da clínica)
CREATE POLICY "vacina_tipos_staff_select" ON vacina_tipos
    FOR SELECT TO authenticated
    USING (ativo = true AND (clinica_id IS NULL OR clinica_id = current_user_clinica_id()));

-- Admin/Veterinário gerenciam (CRUD)
CREATE POLICY "vacina_tipos_staff_insert" ON vacina_tipos
    FOR INSERT TO authenticated
    WITH CHECK ((is_admin() OR is_veterinario()) AND (clinica_id IS NULL OR clinica_id = current_user_clinica_id()));

CREATE POLICY "vacina_tipos_staff_update" ON vacina_tipos
    FOR UPDATE TO authenticated
    USING ((is_admin() OR is_veterinario()) AND (clinica_id IS NULL OR clinica_id = current_user_clinica_id()))
    WITH CHECK ((is_admin() OR is_veterinario()) AND (clinica_id IS NULL OR clinica_id = current_user_clinica_id()));

CREATE POLICY "vacina_tipos_staff_delete" ON vacina_tipos
    FOR DELETE TO authenticated
    USING ((is_admin() OR is_veterinario()) AND (clinica_id IS NULL OR clinica_id = current_user_clinica_id()));

-- Funcionário NÃO gerencia vacina_tipos (conforme RBAC: funcionário fora do clínico)


-- ----------------------------------------------------------------------------
-- Políticas: raca_tipos (catálogo)
-- ----------------------------------------------------------------------------
-- Todos da clínica veem raças ativas (globais + da clínica)
CREATE POLICY "raca_tipos_staff_select" ON raca_tipos
    FOR SELECT TO authenticated
    USING (ativo = true AND (clinica_id IS NULL OR clinica_id = current_user_clinica_id()));

-- Admin/Funcionário gerenciam (CRUD) — conforme RBAC: raca_tipos_* para admin/funcionário
CREATE POLICY "raca_tipos_staff_insert" ON raca_tipos
    FOR INSERT TO authenticated
    WITH CHECK ((is_admin() OR is_funcionario()) AND (clinica_id IS NULL OR clinica_id = current_user_clinica_id()));

CREATE POLICY "raca_tipos_staff_update" ON raca_tipos
    FOR UPDATE TO authenticated
    USING ((is_admin() OR is_funcionario()) AND (clinica_id IS NULL OR clinica_id = current_user_clinica_id()))
    WITH CHECK ((is_admin() OR is_funcionario()) AND (clinica_id IS NULL OR clinica_id = current_user_clinica_id()));

CREATE POLICY "raca_tipos_staff_delete" ON raca_tipos
    FOR DELETE TO authenticated
    USING ((is_admin() OR is_funcionario()) AND (clinica_id IS NULL OR clinica_id = current_user_clinica_id()));

-- Veterinário NÃO gerencia raca_tipos (somente lista nos selects)


-- ----------------------------------------------------------------------------
-- Grants necessários (executar após criar políticas)
-- ----------------------------------------------------------------------------
/*
GRANT SELECT, INSERT, UPDATE, DELETE ON clinicas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON usuarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON administradores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON veterinarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON funcionarios TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tutores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON agendamentos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON historico_clinico TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON vacinacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON vacina_tipos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON raca_tipos TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
*/


-- ============================================================================
-- NOTAS DE IMPLEMENTAÇÃO NO SUPABASE
-- ============================================================================
/*
1. JWT CUSTOM CLAIMS
   Configure o Supabase Auth para incluir no token JWT os claims:
     - cpf: CPF do usuário (VARCHAR, ex: "111.111.111-11")
     - role: 'admin' | 'veterinario' | 'funcionario'
     - clinica_id: UUID da clínica
   Opções de implementação:
     a) Edge Function no login (supabase.auth.signInWithPassword → definir claims)
     b) Database trigger em auth.users → sincronizar com public.usuarios
     c) Hook "Custom Access Token" no Supabase Dashboard (Settings → Auth → Access Token Hook)

2. FUNÇÃO current_user_cpf()
   A implementação usa request.jwt.claims.cpf. Se preferir mapear via auth.uid(),
   crie uma tabela auth_user_map (auth_uid UUID, cpf VARCHAR) e ajuste a função.

3. PERFORMANCE RLS
   Índices em clinica_id, vet_id, tutor_cpf, cpf_usuario são essenciais.
   As políticas usam essas colunas nas cláusulas USING/CHECK.

4. TESTE DE POLÍTICAS
   No painel SQL do Supabase:
     SET ROLE authenticated;
     SET LOCAL request.jwt.claims = '{"cpf":"111.111.111-11","role":"admin","clinica_id":"<UUID>"}';
     SELECT * FROM agendamentos;

5. SOFT DELETE
   Todas as tabelas principais têm deleted_at. Para queries, SEMPRE filtre:
     WHERE deleted_at IS NULL
   As views v_agendamentos_completos e v_proximas_vacinacoes já fazem isso.

6. HISTÓRICO CLÍNICO IMUTÁVEL
   O trigger enforce_historico_immutability() bloqueia UPDATE/DELETE no nível da tabela,
   independentemente de RLS. Apenas SET deleted_at é permitido (para LGPD).

7. LGPD E DADOS SENSÍVEIS
   - CPF é dado sensível. Considere criptografia at-rest (pgcrypto) ou hash indexado para busca.
   - Senhas: apenas hash bcrypt (custo 12), nunca plaintext.
   - Logs de acesso a dados sensíveis devem ser auditados.
*/

-- ============================================================================
-- FIM DO SCRIPT CONSOLIDADO
-- ============================================================================