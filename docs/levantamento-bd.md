# Levantamento de Banco de Dados — Sistema Dayvet

> **Origem:** `Dayvet_Levantamento_BD.pdf` (extraído em 2026-11-02)
> **Status:** Documento de levantamento inicial — **não é veredito final**. Serve como base para análise e melhorias.

---

## Introdução

Este documento descreve as entidades de dados do sistema Dayvet, uma plataforma de agendamento e gestão de consultas veterinárias. Cada entidade é apresentada com seus principais atributos e como se relaciona com as demais.

---

## Entidades

### 1. Usuarios
- **Atributos:** `cpf`, `nome`, `email`, `telefone`, `profissao`
- **Relacionamentos:**
  - 1:1 com `Funcionario`
  - 1:1 com `Veterinario`
  - 1:1 com `Administrador`
  - 1:N com `Receita`
  - 1:N com `Guia`
  - 1:N com `Vacinacao`
  - 1:N com `Agendamento`

### 2. Funcionario
- **Atributos:** `cpf_usuario` (FK)
- **Relacionamentos:** 1:1 com `Usuarios`

### 3. Veterinario
- **Atributos:** `crm`, `cpf_usuario`
- **Relacionamentos:**
  - 1:1 com `Usuarios`
  - 1:N com `Receita`
  - 1:N com `Guia`
  - 1:N com `Vacinacao`

### 4. Administrador
- **Atributos:** `cpf_usuario`
- **Relacionamentos:** 1:1 com `Usuarios`

### 5. Receita
- **Atributos:** `cod_receita`, `medicamento`, `quantidade`, `forma_farmaceutica`, `posologia`, `descricao_uso`, `validade`, `data`
- **Relacionamentos:**
  - N:1 com `Veterinario`
  - N:1 com `Usuarios`

### 6. Guia
- **Atributos:** `cod_guia`, `data_emissao`, `horario_emissao`, `descricao`, `anamnese`, `exame`, `diagnostico_previo`, `conduta_terapeutica`, `validade`
- **Relacionamentos:**
  - N:1 com `Veterinario`
  - N:1 com `Usuarios`

### 7. Vacinacao
- **Atributos:** `cod_pet`, `cpf_usuario`, `crm_veterinario`
- **Relacionamentos:**
  - N:1 com `Pet`
  - N:1 com `Usuarios` (tutor)
  - N:1 com `Veterinario`

### 8. Pet
- **Atributos:** `cod`, `nome`, `idade`, `raca`, `cor`, `cpf_tutor`
- **Relacionamentos:**
  - N:1 com `Tutor`
  - 1:N com `Agendamento`
  - 1:N com `Vacinacao`

### 9. Endereco
- **Atributos:** `cod`, `cep`, `rua`, `bairro`, `cidade`, `complemento`
- **Relacionamentos:** 1:N com `Tutor`

### 10. Tutor
- **Atributos:** `cpf`, `nome`, `telefone`, `email`, `cod_endereco`
- **Relacionamentos:**
  - N:1 com `Endereco`
  - 1:N com `Pet`

### 11. Agendamento
- **Atributos:** `cod`, `cod_pet`, `cpf_usuario`, `data`, `horario`, `info_complementar`
- **Relacionamentos:**
  - N:1 com `Pet`
  - N:1 com `Usuarios` (veterinário/funcionário responsável)

---

## Resumo dos Relacionamentos

| Entidade | Relacionamentos |
|----------|-----------------|
| Usuarios | 1:1 com funcionario, veterinario, administrador; 1:N com receita, guia, vacinacao, agendamento |
| Funcionario | 1:1 com usuario |
| Veterinario | 1:1 com usuario; 1:N com receita, guia, vacinacao |
| Administrador | 1:1 com usuario |
| Receita | N:1 veterinario; N:1 usuario |
| Guia | N:1 veterinario; N:1 usuario |
| Vacinacao | N:1 pet, usuario, veterinario |
| Pet | N:1 tutor; 1:N agendamento, vacinacao |
| Endereco | 1:N tutor |
| Tutor | N:1 endereco; 1:N pet |
| Agendamento | N:1 pet; N:1 usuario |

---

## Observações para Análise (Fase 2)

Este levantamento apresenta pontos que precisam de decisão/aperfeiçoamento antes de gerar o SQL final:

1. **Herança de Usuarios** → `Funcionario`, `Veterinario`, `Administrador` são subtipos 1:1. No PostgreSQL/Supabase, avaliar: tabela única com `role` + colunas opcionais, ou tabelas separadas (atual).
2. **Chaves primárias** → Uso misto de `cpf` (natural) e `cod_*` (surrogate). Recomenda-se `uuid` ou `bigserial` como PK, com `cpf` como `UNIQUE NOT NULL`.
3. **Vacinacao** → Tem 3 FKs (`cod_pet`, `cpf_usuario`, `crm_veterinario`). Parece tabela de junção, mas falta PK composta ou surrogate.
4. **Agendamento** → `cpf_usuario` ambíguo: refere-se ao veterinário? ao funcionário que agendou? ao tutor? Precisa disambiguar.
5. **Dados sensíveis** → `cpf` em múltiplas tabelas. Avaliar LGPD, criptografia, RLS no Supabase.
6. **Auditoria/Soft Delete** → Não há `created_at`, `updated_at`, `deleted_at`. Necessário para produção.
7. **Tipos PostgreSQL nativos** → `jsonb` para campos flexíveis (ex: `info_complementar`), `tsvector` para busca, `uuid_generate_v4()`.
8. **RLS (Row Level Security)** → Essencial no Supabase para isolamento por clínica/usuário.
9. **Enums vs Tabelas** → `raca`, `forma_farmaceutica`, `profissao` — avaliar tabelas de referência ou `CHECK`/`ENUM`.
10. **Multi-tenancy** → Sistema atende múltiplas clínicas? Se sim, adicionar `clinica_id` em todas as tabelas.

---

## Próximos Passos

1. **Fase 2:** Análise do código atual (`dayvet/`) + entrevista de requisitos para resolver ambiguidades acima.
2. **Fase 3:** Geração do script SQL final (`schema.sql`, `seeds.sql`, `rls-policies.sql`) otimizado para Supabase.

---

## Decisão: Single-Clinic (Simplificação Atual)

> **Status:** Implementado no `schema.sql` — o banco roda **apenas para uma clínica** por simplicidade.
> O multi-tenancy (`clinica_id` em todas as tabelas + RLS por clínica) está **projetado e comentado** no schema para reativação futura.

### Como reverter para Multi-Clinic (passos comentados no schema):

1. **Descomentar** `clinica_id` em todas as tabelas (já presente no schema atual, mas RLS desativado).
2. **Ativar RLS** no Supabase com policies:
   ```sql
   -- Exemplo para usuarios
   ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "isolamento_por_clinica" ON usuarios
     USING (clinica_id = current_setting('app.current_clinica_id')::uuid);
   ```
3. **Criar tabela `clinicas`** (já existe no schema) e popular com seed.
4. **Middleware/Auth** definir `app.current_clinica_id` na sessão (JWT claim ou header).
5. **Ajustar APIs** para filtrar automaticamente por `clinica_id`.
6. **Testes de isolamento**: garantir que clínica A não vê dados da clínica B.

> Quando houver demanda real de multi-clinic, basta seguir os passos acima. O schema já suporta nativamente.