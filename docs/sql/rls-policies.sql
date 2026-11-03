-- ============================================================================
-- DayVet-Gestão — Políticas RLS (Row Level Security) para Supabase
-- Gerado em: 2026-11-02
-- Baseado no RBAC do código atual + multi-clinic + decisões de entrevista
-- ============================================================================

-- ============================================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ============================================================================

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

-- ============================================================================
-- FUNÇÕES AUXILIARES PARA RLS
-- ============================================================================

-- Obter CPF do usuário autenticado (via auth.uid() → users.cpf)
-- Supabase Auth usa UUID; nossa tabela usuarios usa CPF como PK.
-- Mapeamento: auth.uid() → usuarios.cpf via tabela de ligação ou claim JWT.
-- Aqui assumimos que o JWT customizado tem claim 'cpf' ou usamos uma função RPC.

CREATE OR REPLACE FUNCTION current_user_cpf()
RETURNS VARCHAR(14) LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_cpf VARCHAR(14);
BEGIN
    -- Tentar obter do JWT claim 'cpf' (configurado no Supabase Auth via hook/custom claims)
    v_cpf := nullif(current_setting('request.jwt.claims.cpf', true), '')::VARCHAR(14);
    IF v_cpf IS NOT NULL THEN
        RETURN v_cpf;
    END IF;
    -- Fallback: buscar por auth.uid() em tabela de mapeamento (se existir)
    -- RETURN (SELECT cpf FROM auth_user_map WHERE auth_uid = auth.uid());
    RETURN NULL; -- Se não encontrar, políticas que dependem disso falharão (seguro)
END $$;

CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_role user_role;
BEGIN
    v_role := nullif(current_setting('request.jwt.claims.role', true), '')::user_role;
    IF v_role IS NOT NULL THEN
        RETURN v_role;
    END IF;
    -- Fallback: buscar na tabela usuarios
    RETURN (SELECT role FROM usuarios WHERE cpf = current_user_cpf() AND deleted_at IS NULL);
END $$;

CREATE OR REPLACE FUNCTION current_user_clinica_id()
RETURNS UUID LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_clinica UUID;
BEGIN
    v_clinica := nullif(current_setting('request.jwt.claims.clinica_id', true), '')::UUID;
    IF v_clinica IS NOT NULL THEN
        RETURN v_clinica;
    END IF
    -- Fallback: buscar na tabela usuarios
    RETURN (SELECT clinica_id FROM usuarios WHERE cpf = current_user_cpf() AND deleted_at IS NULL);
END $$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN current_user_role() = 'admin';
END $$;

CREATE OR REPLACE FUNCTION is_veterinario()
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN current_user_role() = 'veterinario';
END $$;

CREATE OR REPLACE FUNCTION is_funcionario()
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN current_user_role() = 'funcionario';
END $$;

-- Verificar se usuário é dono do registro (criado_por = current_user_cpf)
CREATE OR REPLACE FUNCTION is_owner(p_criado_por VARCHAR(14))
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN p_criado_por = current_user_cpf();
END $$;

-- ============================================================================
-- POLÍTICAS: clinicas
-- ============================================================================

-- Admin vê/gerencia apenas sua clínica
CREATE POLICY "clinicas_admin_all" ON clinicas
    FOR ALL TO authenticated
    USING (id = current_user_clinica_id() AND is_admin())
    WITH CHECK (id = current_user_clinica_id() AND is_admin());

-- ============================================================================
-- POLÍTICAS: usuarios (staff)
-- ============================================================================

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

-- ============================================================================
-- POLÍTICAS: administradores / veterinarios / funcionarios (perfis 1:1)
-- ============================================================================

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

-- ============================================================================
-- POLÍTICAS: tutores (clientes)
-- ============================================================================

-- Admin/Funcionário/Veterinário veem todos tutores da clínica
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

-- ============================================================================
-- POLÍTICAS: pets
-- ============================================================================

-- Staff vê pets da clínica
CREATE POLICY "pets_staff_select" ON pets
    FOR SELECT TO authenticated
    USING (clinica_id = current_user_clinica_id() AND (is_admin() OR is_funcionario() OR is_veterinario()));

-- Admin/Funcionário criam pets (funcionário tem pet_incluir)
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

-- ============================================================================
-- POLÍTICAS: agendamentos
-- ============================================================================

-- Admin vê todos agendamentos da clínica
CREATE POLICY "agendamentos_admin_select" ON agendamentos
    FOR SELECT TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_admin());

-- Veterinário vê apenas SEUS agendamentos (vet_id = current_user_cpf)
CREATE POLICY "agendamentos_vet_select" ON agendamentos
    FOR SELECT TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_veterinario() AND vet_id = current_user_cpf());

-- Funcionário vê todos agendamentos da clínica (só leitura)
CREATE POLICY "agendamentos_func_select" ON agendamentos
    FOR SELECT TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_funcionario());

-- Admin cria agendamentos
CREATE POLICY "agendamentos_admin_insert" ON agendamentos
    FOR INSERT TO authenticated
    WITH CHECK (clinica_id = current_user_clinica_id() AND is_admin());

-- Veterinário cria agendamentos (consulta_agendar + vacinacao_agendar)
CREATE POLICY "agendamentos_vet_insert" ON agendamentos
    FOR INSERT TO authenticated
    WITH CHECK (clinica_id = current_user_clinica_id() AND is_veterinario() AND vet_id = current_user_cpf());

-- Funcionário NÃO cria agendamentos (só-leitura conforme RBAC)

-- Admin atualiza qualquer agendamento
CREATE POLICY "agendamentos_admin_update" ON agendamentos
    FOR UPDATE TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_admin())
    WITH CHECK (clinica_id = current_user_clinica_id() AND is_admin());

-- Veterinário atualiza SEUS agendamentos (consulta_editar + vacinacao_editar + confirmar/cancelar)
CREATE POLICY "agendamentos_vet_update" ON agendamentos
    FOR UPDATE TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_veterinario() AND vet_id = current_user_cpf())
    WITH CHECK (clinica_id = current_user_clinica_id() AND is_veterinario() AND vet_id = current_user_cpf());

-- Funcionário NÃO atualiza agendamentos (só-leitura)

-- Admin soft-delete agendamentos
CREATE POLICY "agendamentos_admin_delete" ON agendamentos
    FOR DELETE TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_admin());

-- ============================================================================
-- POLÍTICAS: historico_clinico
-- ============================================================================

-- Admin vê todos da clínica
CREATE POLICY "historico_admin_select" ON historico_clinico
    FOR SELECT TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_admin());

-- Veterinário vê seus próprios registros (veterinario_id = current_user_cpf) + pode criar
CREATE POLICY "historico_vet_select" ON historico_clinico
    FOR SELECT TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_veterinario() AND veterinario_id = current_user_cpf());

-- Funcionário NÃO acessa histórico clínico (sem modo clínico)

-- Veterinário insere registros (clinica_criar)
CREATE POLICY "historico_vet_insert" ON historico_clinico
    FOR INSERT TO authenticated
    WITH CHECK (clinica_id = current_user_clinica_id() AND is_veterinario() AND veterinario_id = current_user_cpf());

-- Admin insere registros
CREATE POLICY "historico_admin_insert" ON historico_clinico
    FOR INSERT TO authenticated
    WITH CHECK (clinica_id = current_user_clinica_id() AND is_admin());

-- Imutabilidade: NENHUMA POLÍTICA DE UPDATE/DELETE (exceto soft delete via trigger)
-- O trigger enforce_historico_immutability() já bloqueia UPDATEs no nível da tabela.

-- Admin soft-delete (LGPD - arquivamento)
CREATE POLICY "historico_admin_delete" ON historico_clinico
    FOR DELETE TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_admin());

-- ============================================================================
-- POLÍTICAS: vacinacoes
-- ============================================================================

-- Admin vê todos da clínica
CREATE POLICY "vacinacoes_admin_select" ON vacinacoes
    FOR SELECT TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_admin());

-- Veterinário vê suas vacinações (veterinario_id = current_user_cpf)
CREATE POLICY "vacinacoes_vet_select" ON vacinacoes
    FOR SELECT TO authenticated
    USING (clinica_id = current_user_clinica_id() AND is_veterinario() AND veterinario_id = current_user_cpf());

-- Funcionário NÃO acessa vacinacoes (vacinação é admin/vet)

-- Admin/Veterinário inserem (vacinação é admin/vet total)
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

-- ============================================================================
-- POLÍTICAS: vacina_tipos (catálogo)
-- ============================================================================

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

-- Funcionário NÃO gerencia vacina_tipos (conforme item 18: funcionário fora do clínico)

-- ============================================================================
-- POLÍTICAS: raca_tipos (catálogo)
-- ============================================================================

-- Todos da clínica veem raças ativas (globais + da clínica)
CREATE POLICY "raca_tipos_staff_select" ON raca_tipos
    FOR SELECT TO authenticated
    USING (ativo = true AND (clinica_id IS NULL OR clinica_id = current_user_clinica_id()));

-- Admin/Funcionário gerenciam (CRUD) - conforme RBAC: raca_tipos_* para admin/funcionário
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

-- Veterinário NÃO gerencia raca_tipos (só lista nos selects)

-- ============================================================================
-- GRANTS NECESSÁRIOS (executar após criar políticas)
-- ============================================================================

-- Usuários autenticados precisam de SELECT/INSERT/UPDATE/DELETE nas tabelas conforme políticas
-- O Supabase Auth usa role 'authenticated' por padrão.

-- Exemplo de grants (ajustar conforme necessidade):
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

-- Para sequences (bigserial)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
*/

-- ============================================================================
-- NOTAS DE IMPLEMENTAÇÃO NO SUPABASE
-- ============================================================================
/*
1. JWT CLAIMS: Configure o Supabase Auth para incluir custom claims no JWT:
   - cpf: CPF do usuário (VARCHAR)
   - role: 'admin' | 'veterinario' | 'funcionario'
   - clinica_id: UUID da clínica
   Isso pode ser feito via:
   a) Edge Function no login (supabase.auth.signInWithPassword → set claims)
   b) Database trigger em auth.users → sincronizar com public.usuarios
   c) Hook de "Custom Access Token" no Supabase Dashboard

2. FUNÇÃO current_user_cpf(): A implementação acima usa request.jwt.claims.cpf.
   Se preferir mapear via auth.uid(), crie uma tabela auth_user_map (auth_uid UUID, cpf VARCHAR)
   e atualize a função.

3. RLS PERFORMANCE: Índices em clinica_id, vet_id, tutor_cpf, cpf_usuario são essenciais.
   As políticas usam essas colunas no USING/CHECK.

4. TESTE DE POLÍTICAS: Use o painel SQL do Supabase com SET ROLE authenticated;
   e SET LOCAL request.jwt.claims = '{"cpf":"111.111.111-11","role":"admin","clinica_id":"..."}';

5. SOFT DELETE: Todas as políticas USING incluem verificação implícita via índices.
   Para queries, SEMPRE adicione "WHERE deleted_at IS NULL" (ou use views que já filtram).

6. HISTÓRICO CLÍNICO IMUTÁVEL: O trigger enforce_historico_immutability() bloqueia UPDATE/DELETE
   no nível da tabela, independentemente de RLS. Apenas SET deleted_at é permitido (para LGPD).
*/

-- ============================================================================
-- FIM DAS POLÍTICAS RLS
-- ============================================================================