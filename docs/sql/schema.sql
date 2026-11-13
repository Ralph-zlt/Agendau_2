-- ============================================================================
-- DayVet-Gestão — Schema SQL para Supabase (PostgreSQL)
-- Gerado em: 2026-11-02
-- Baseado em: Levantamento PDF + Código Atual + Decisões de Entrevista
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";        -- gen_random_uuid(), criptografia
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";       -- uuid_generate_v4() (alternativa)

-- ============================================================================
-- ENUMS (tipos enumerados para integridade e performance)
-- ============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'veterinario', 'funcionario');
CREATE TYPE agendamento_status AS ENUM ('pendente', 'confirmado', 'cancelado', 'concluido');
CREATE TYPE historico_tipo AS ENUM ('receita', 'guia', 'vacina');
CREATE TYPE pet_especie AS ENUM ('Canino', 'Felino', 'Equino', 'Bovino', 'Suíno', 'Ovino', 'Outro');
CREATE TYPE pet_sexo AS ENUM ('Macho', 'Fêmea');
CREATE TYPE forma_farmaceutica AS ENUM ('comprimido', 'gotas', 'pomada', 'injetavel', 'outro');

-- ============================================================================
-- TABELA: clinicas (multi-tenancy root)
-- ============================================================================

CREATE TABLE clinicas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome            VARCHAR(255) NOT NULL,
    cnpj            VARCHAR(18) UNIQUE,           -- 00.000.000/0000-00
    endereco        TEXT,
    telefone        VARCHAR(20),
    email           VARCHAR(255),
    ativa           BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END $$;

CREATE TRIGGER trg_clinicas_updated_at
BEFORE UPDATE ON clinicas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABELA: usuarios (staff do sistema - admin, veterinario, funcionario)
-- PK = CPF (natural key) conforme decisão. UNIQUE NOT NULL.
-- ============================================================================

CREATE TABLE usuarios (
    cpf             VARCHAR(14) PRIMARY KEY,      -- 000.000.000-00
    nome            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    telefone        VARCHAR(20),
    role            user_role NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,        -- bcrypt
    must_change     BOOLEAN DEFAULT true,         -- força troca no 1º acesso
    active          BOOLEAN DEFAULT true,
    clinica_id      UUID NOT NULL REFERENCES clinicas(id),
    criado_por      VARCHAR(14) REFERENCES usuarios(cpf),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    deleted_at      TIMESTAMPTZ                   -- soft delete
);

CREATE INDEX idx_usuarios_clinica_id ON usuarios(clinica_id);
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_role ON usuarios(role);
CREATE INDEX idx_usuarios_active ON usuarios(active) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABELA: administradores (perfil estendido 1:1 com usuarios onde role='admin')
-- ============================================================================

CREATE TABLE administradores (
    cpf_usuario     VARCHAR(14) PRIMARY KEY REFERENCES usuarios(cpf) ON DELETE CASCADE,
    -- Campos adicionais futuros se necessário
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_administradores_updated_at
BEFORE UPDATE ON administradores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABELA: veterinarios (perfil estendido 1:1 com usuarios onde role='veterinario')
-- ============================================================================

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

-- ============================================================================
-- TABELA: funcionarios (perfil estendido 1:1 com usuarios onde role='funcionario')
-- ============================================================================

CREATE TABLE funcionarios (
    cpf_usuario     VARCHAR(14) PRIMARY KEY REFERENCES usuarios(cpf) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER trg_funcionarios_updated_at
BEFORE UPDATE ON funcionarios
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABELA: tutores (clientes - NÃO são usuários do sistema, sem login)
-- PK = CPF (natural key)
-- ============================================================================

CREATE TABLE tutores (
    cpf             VARCHAR(14) PRIMARY KEY,      -- 000.000.000-00
    nome            VARCHAR(255) NOT NULL,
    email           VARCHAR(255),
    telefone        VARCHAR(20) NOT NULL,         -- 11 dígitos (DDD + 9)
    endereco        TEXT,
    clinica_id      UUID NOT NULL REFERENCES clinicas(id),
    criado_por      VARCHAR(14) REFERENCES usuarios(cpf),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    deleted_at      TIMESTAMPTZ                   -- soft delete (LGPD)
);

CREATE INDEX idx_tutores_clinica_id ON tutores(clinica_id);
CREATE INDEX idx_tutores_nome ON tutores(nome);
CREATE INDEX idx_tutores_email ON tutores(email);

CREATE TRIGGER trg_tutores_updated_at
BEFORE UPDATE ON tutores
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABELA: pets
-- PK = UUID (surrogate). FK → tutores.cpf
-- ============================================================================

CREATE TABLE pets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_cpf       VARCHAR(14) NOT NULL REFERENCES tutores(cpf) ON DELETE RESTRICT,
    nome            VARCHAR(255) NOT NULL,
    especie         pet_especie NOT NULL,
    raca            VARCHAR(100) NOT NULL,        -- Referencia raca_tipos.nome (validação app-level)
    sexo            pet_sexo NOT NULL,
    peso_kg         DECIMAL(5,2),                 -- NULL = não informado; > 0 se preenchido
    comportamento   TEXT,
    alergias        TEXT,
    clinica_id      UUID NOT NULL REFERENCES clinicas(id),
    criado_por      VARCHAR(14) REFERENCES usuarios(cpf),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    deleted_at      TIMESTAMPTZ                   -- soft delete
);

CREATE INDEX idx_pets_tutor_cpf ON pets(tutor_cpf);
CREATE INDEX idx_pets_clinica_id ON pets(clinica_id);
CREATE INDEX idx_pets_especie ON pets(especie);
CREATE INDEX idx_pets_nome ON pets(nome);

CREATE TRIGGER trg_pets_updated_at
BEFORE UPDATE ON pets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Constraint: peso > 0 se informado
ALTER TABLE pets ADD CONSTRAINT chk_pets_peso_positivo
CHECK (peso_kg IS NULL OR peso_kg > 0);

-- ============================================================================
-- TABELA: agendamentos
-- PK = UUID. vet_id = veterinário responsável (FK→usuarios.cpf onde role='veterinario')
-- criado_por = quem cadastrou (FK→usuarios.cpf)
-- ============================================================================

CREATE TABLE agendamentos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
    tutor_cpf       VARCHAR(14) NOT NULL REFERENCES tutores(cpf) ON DELETE RESTRICT,
    vet_id          VARCHAR(14) NOT NULL REFERENCES usuarios(cpf) ON DELETE RESTRICT,
    servico         VARCHAR(255) NOT NULL,        -- Ex: "Consulta Veterinária", "Vacinação"
    vacina_tipo     VARCHAR(100),                 -- Preenchido se servico ILIKE '%vacin%'; ref vacina_tipos.nome
    data            DATE NOT NULL,
    hora            TIME NOT NULL,
    valor           DECIMAL(10,2) NOT NULL DEFAULT 0,
    status          agendamento_status NOT NULL DEFAULT 'pendente',
    info_complementar TEXT,                       -- JSONB futuro se necessário
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
-- Para dashboard do vet: filtro por vet_id + data + status
CREATE INDEX idx_agendamentos_vet_data_status ON agendamentos(vet_id, data, status);

CREATE TRIGGER trg_agendamentos_updated_at
BEFORE UPDATE ON agendamentos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Constraint: janela de atendimento 07:00–19:00
ALTER TABLE agendamentos ADD CONSTRAINT chk_agendamentos_hora_janela
CHECK (hora >= '07:00:00' AND hora <= '19:00:00');

-- Constraint: valor >= 0
ALTER TABLE agendamentos ADD CONSTRAINT chk_agendamentos_valor_nao_negativo
CHECK (valor >= 0);

-- ============================================================================
-- TABELA: historico_clinico (registros imutáveis após criação)
-- tipo: receita | guia | vacina
-- ============================================================================

CREATE TABLE historico_clinico (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
    tutor_cpf       VARCHAR(14) NOT NULL REFERENCES tutores(cpf) ON DELETE RESTRICT,
    tipo            historico_tipo NOT NULL,
    veterinario_id  VARCHAR(14) NOT NULL REFERENCES usuarios(cpf) ON DELETE RESTRICT, -- quem assinou/emitiu
    crmv            VARCHAR(50) NOT NULL,       -- CRMV do veterinário no momento da emissão
    data            DATE NOT NULL,
    detalhe         TEXT NOT NULL,              -- Prescrição, encaminhamento, registro de vacina
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

-- Imutabilidade: impedir UPDATE/DELETE após criação (exceto soft delete via deleted_at)
-- Regra: created_at = updated_at sempre; updated_at só muda se deleted_at for setado
CREATE OR REPLACE FUNCTION enforce_historico_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Permitir apenas setar deleted_at (soft delete) ou criar novo registro
    IF OG.created_at IS NOT NULL THEN
        IF NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at THEN
            RAISE EXCEPTION 'histórico clínico é imutável — não pode alterar após criação';
        END IF;
        -- Se está fazendo soft delete, permite mas não muda outros campos
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

-- ============================================================================
-- TABELA: vacinacoes (tabela separada unificando agenda + registro clínico)
-- Conforme decisão: vacinação tem ciclo próprio (agendamento → aplicação → próximas doses)
-- ============================================================================

CREATE TABLE vacinacoes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE RESTRICT,
    tutor_cpf       VARCHAR(14) NOT NULL REFERENCES tutores(cpf) ON DELETE RESTRICT,
    veterinario_id  VARCHAR(14) NOT NULL REFERENCES usuarios(cpf) ON DELETE RESTRICT,
    vacina_tipo     VARCHAR(100) NOT NULL,                -- Ref vacina_tipos.nome
    data_aplicacao  DATE NOT NULL,
    doses_total     INTEGER NOT NULL DEFAULT 1,
    dose_atual      INTEGER NOT NULL DEFAULT 1,
    proxima_dose    DATE,                                 -- Calculado pelo app
    agendamento_id  UUID REFERENCES agendamentos(id) ON DELETE SET NULL, -- Link opcional com agendamento
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

-- Constraints de validação
ALTER TABLE vacinacoes ADD CONSTRAINT chk_vacinacoes_doses_positivas
CHECK (doses_total > 0 AND dose_atual > 0 AND dose_atual <= doses_total);

-- ============================================================================
-- TABELA: vacina_tipos (catálogo gerenciável por admin/veterinário)
-- ============================================================================

CREATE TABLE vacina_tipos (
    id              BIGSERIAL PRIMARY KEY,
    nome            VARCHAR(100) UNIQUE NOT NULL,
    ativo           BOOLEAN DEFAULT true,
    clinica_id      UUID REFERENCES clinicas(id),   -- NULL = global (todas clínicas)
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vacina_tipos_ativo ON vacina_tipos(ativo);
CREATE INDEX idx_vacina_tipos_clinica ON vacina_tipos(clinica_id);

CREATE TRIGGER trg_vacina_tipos_updated_at
BEFORE UPDATE ON vacina_tipos
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABELA: raca_tipos (catálogo gerenciável por admin/funcionário, por espécie)
-- ============================================================================

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

-- ============================================================================
-- VIEWS ÚTEIS (opcional - para queries comuns)
-- ============================================================================

-- View: Agendamentos com dados expandidos (para relatórios/dashboard)
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

-- View: Próximas vacinações (para alertas)
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
-- FIM DO SCHEMA
-- ============================================================================