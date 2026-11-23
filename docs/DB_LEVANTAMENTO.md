# LEVANTAMENTO — Banco de Dados (DayVet-Gestão)

> Documento de levantamento **sem código**. Define entidades, mapeia TODOs existentes e lista opções de persistência.
> Última atualização: 2026-11-23.
> Status: levantamento conceitual e parcialmente histórico. O projeto Supabase está ativo; migrations `0001..0006` foram validadas em Postgres 17 na VPS e confirmadas no projeto remoto. Auth e a Edge Function `admin-criar-usuario` estão implantadas. O smoke autenticado real de tutor (cadastro, edição, reload e exclusão dos dados sintéticos) passou; outros fluxos ainda requerem validação. Para o estado operacional, priorize `ROADMAP.md`, `MAPA_DO_SISTEMA.md` e `supabase/migrations/`.
> **Nota histórica (2026-11-13):** o SQL em `docs/sql/` e a receita em `docs/levantamento-bd.md` antecedem o schema single-clinic efetivo em `supabase/migrations/`; não os use como fonte de implementação atual.
> **Nota (2026-09-17):** Laudos foram removidos do escopo por decisão da clínica. Não criar tabela nem endpoint para laudo.
> **Nota (2026-11-13):** Guias de encaminhamento (RF-10) foram removidas do escopo por decisão do dono. O enum de `historico_clinico` fica `receita` e `vacina`.

---

## 1. Entidades identificadas

### 1.1 Usuario (tabela `users`)
- **cpf** (PK, string) — chave primária
- **email** (string, UNIQUE NOT NULL) — email obrigatório e único
- **password_hash** (string, bcrypt12) — hash da senha
- **must_change** (boolean, default false) — força redefinição no primeiro acesso
- **reset_token_hash** (string, opcional) — hash do token de redefinição
- **reset_expires** (timestamp, opcional) — expiração do token (1h)
- **failed_attempts** (integer, default 0) — tentativas falhas de login
- **locked_until** (timestamp, opcional) — bloqueio temporário após muitas tentativas
- **created_by** (string, opcional) — ID do usuário que criou
- **created_at** (timestamp) — data de criação
- **active** (boolean, default true) — status ativo

**Relacionamento:** Um `Usuario` pode ser `administradores` (se role = `admin`/`veterinario`, com CRMV adicional).

**Endpoints relacionados:**
- POST `/api/bootstrap` — criar admin inicial (setup virgem)
- POST `/api/login` — autenticar (CPF ou email + senha)
- POST `/api/users` — criar usuário (admin only)
- POST `/api/password-recover` — solicitar recuperação de senha
- POST `/api/password-reset` — redefinir senha com token

**LGPD:** Criptografia at-rest, sem senha em log, consentimento e retenção de dados.

> ⚠️ **RISCO ALTO DE SEGURANÇA — SOMENTE PROTOTIPAÇÃO:** contas 1/2/3 entram sem senha válida e sem troca obrigatória. REMOVER `perfisTestes`, `password_demo` e qualquer bypass antes da implantação. Em produção: hash de senha, sem bypass, `mustChange=true` p/ todo primeiro acesso.

### 1.2 Administrador (tabela `administradores`)
- **id** (PK, FK → users.id)
- **crm** (string, ex: "CRM-SP 45678")
- **crmValidade** (date)
- **profissao** (string)

**Relacionamento:** 1:1 com `Usuario`.

### 1.3 Tutor (tabela `tutores`)
- **id** (PK, string/UUID)
- **nome** (string)
- **cpf** (único, formato canônico `000.000.000-00`; validado antes do cadastro/edição)
- **email** (string)
- **tel** (string, 11 dígitos)
- **endereco** (string)
- **arquivado** (boolean, default false) — soft delete; tutor arquivado não aparece em agendamentos/novos vínculos (decisão 2026-11-13)
- **senha** (string — observação: tutores possuem senha no mock; definir se terão acesso ao sistema)

**Regra de negócio:** Máximo 10 pets por tutor (RNF via RF-02).

### 1.4 Pet (tabela `pets`)
- **id** (PK, string/UUID)
- **tutorId** (FK → tutores.id)
- **nome** (string)
- **especie** (enum: `Canino`, `Felino`, `Equino`, `Bovino`, `Suíno`, `Ovino`, `Outro`)
- **raca** (string — catálogo por espécie gerenciado por funcionário/admin: `racasPorEspecie`, RBAC `raca_tipos_*`; tabela futura `raca_tipos`)
- **sexo** (enum: `Macho`, `Fêmea`)
- **peso** (decimal, kg, NULL — opcional; se informado, > 0)
- **comportamento** (text)
- **alergias** (text)
- **arquivado** (boolean, default false) — soft delete

**Relacionamento:** N:1 com `Tutor`.

### 1.5 Agendamento (tabela `agendamentos`)
- **id** (PK, string/UUID)
- **petId** (FK → pets.id)
- **tutorId** (FK → tutores.id)
- **vetId** (FK → users.id — veterinário dono do atendimento; dashboard do vet filtra por ele)
- **servico** (string)
- **data** (date)
- **hora** (time)
- **valor** (decimal)
- **status** (enum: `pendente`, `confirmado`, `cancelado`, `concluido`)

**Regra de negócio:** Janela 07h–19h; confirma/conclui quem tem `*_confirmar` (admin tudo, vet consulta+vacinação); funcionário só-leitura.

### 1.6 HistoricoClinico (tabela `historico_clinico`)
- **id** (PK, string/UUID)
- **petId** (FK → pets.id)
- **tipo** (enum: `receita`, `vacina`) ~~`guia`~~ ~~`laudo`~~ **FORA DE ESCOPO** — laudo por decisão clínica 2026-09-17; guia por decisão do dono 2026-11-13
- **data** (date)
- **detalhe** (text)

**Regra de negócio:** Registros são **imutáveis** após criação (auditoria).

### 1.6b Catálogos gerenciáveis (tabelas persistidas no schema atual)
- **`vacina_tipos`** (`id` PK, `nome` UNIQUE, `ativo` boolean) — CRUD por admin/veterinário (RBAC `vacina_tipos_*`); coluna `vacinaTipo` em `agendamentos` e `historico_clinico` referencia pelo nome (decisão 2026-09-25, item 18: funcionário sem acesso).
- **`raca_tipos`** (`id` PK, `especie` enum, `nome`, `ativo` boolean) — CRUD por admin/funcionário (RBAC `raca_tipos_*`).

### 1.7 Receita (subtipo de `historico_clinico`)

**Receita** (campos adicionais):
- **veterinarioId** (FK → users.id) — assinatura do vet
- **crmv** (string) — CRMV do veterinário responsável

> **⚠ Laudo — FORA DE ESCOPO:** A entidade `Laudo` (com `diagnostico`, `veterinarioId`, `crmv`) foi removida do escopo por decisão da clínica em 2026-09-17. O sistema não emitirá laudos. Não criar tabela nem endpoint para laudo.

### 1.8 Vacina (pode ser tabela separada ou subtipo de `historico_clinico`)
- **id** (PK)
- **petId** (FK → pets.id)
- **nome** (string)
- **dataAplicacao** (date)
- **doses** (integer)
- **doseAtual** (integer)
- **proximaDose** (date, opcional)

---

## 2. Mapeamento histórico de TODOs e endpoints

> A tabela e a lista de endpoints abaixo descrevem o levantamento anterior à integração Supabase e não representam a implementação atual. O código atual usa Supabase JS/PostgREST/Auth/Storage, não endpoints próprios `/api/*`; consulte os TODOs ativos no `script.js` antes de implementar trabalho novo.

As linhas e endpoints abaixo são um inventário histórico e não mapeiam os TODOs ativos da implementação atual:

| Linha | Trecho | Endpoint futuro | Entidade afetada |
|---|---|---|---|
| 14 | Tabela `administradores` — dados do profissional | `GET /api/profissional/:id` | Administrador |
| 45 | Tabela `users` — CPF como chave de acesso | `POST /api/login`, `GET /api/me` | Usuario |
| 73 | (mock de dados iniciais) | — | Diversos |
| 102 | Mapeamento CPF → role pelo backend | `POST /api/login { cpf, senha }` | Usuario |
| 112 | Cargo (role) armazenado no banco | `GET /api/me` com Bearer token | Usuario |
| 1007 | Criar usuário via POST | `POST /api/users { nome, cpf, role }` | Usuario |
| 1037 | Excluir usuário via DELETE | `DELETE /api/users/:id` | Usuario |

### Endpoints necessários (inicial)

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| POST | `/api/login` | Autenticar por CPF + senha, retornar token + user | Não |
| GET | `/api/me` | Retornar dados do usuário autenticado | Bearer |
| POST | `/api/users` | Criar usuário (validar CPF único) | Admin |
| DELETE | `/api/users/:id` | Remover usuário | Admin |
| GET | `/api/profissional/:id` | Dados do profissional (CRMV) | Bearer |

---

## 3. Opções de persistência

### 3.1 localStorage (-browser)
| Aspecto | Detalhe |
|---|---|
| **Prós** | Zero configuração, funciona offline, sem servidor |
| **Contras** | Dados no navegador (não compartilhados), limite ~5MB, sem backup automático, vulnerável a limpeza de cache |
| **Adequação** | Protótipo/apresentação; **não serve para produção** |

### 3.2 SQLite (local ou via server)
| Aspecto | Detalhe |
|---|---|
| **Prós** | Leve, zero config (SQLite local), SQL padrão, bom para single-user/small team |
| **Contras** | Precisa de backend (Node/Python/etc.), concorrência limitada, deploy mais complexo |
| **Adequação** | Boa para MVP interno ou deploy em rede local |

### 3.3 Supabase (Postgres SQL) — DECISÃO ADOTADA
| Aspecto | Detalhe |
|---|---|
| **Prós** | Auth built-in, Postgres SQL, real-time, hospedado, escala, RLS para RBAC |
| **Contras** | Lock-in de fornecedor, limites de plano gratuito |
| **Adequação** | **DECISÃO ADOTADA em 2026-09-22: SQL via Supabase.** Projeto e Auth existem; a integração está em validação |

### 3.4 API própria (Node/Express + PostgreSQL/MySQL)
| Aspecto | Detalhe |
|---|---|
| **Prós** | Controle total, sem lock-in, customizável, framework livre |
| **Contras** | Mais trabalho, manutenção de infra, deploy, segurança |
| **Adequação** | Adequado se houver necessidade de customização profunda |

### 3.5 Comparativo rápido

| Critério | localStorage | SQLite | Supabase/Firebase | API própria |
|---|---|---|---|---|
| Setup | Nenhum | Baixo | Médio | Alto |
| Escala | Baixa | Média | Alta | Alta |
| Custo | Grátis | Grátis | Freemium | Infra + deploy |
| Auth | Manual | Manual | Built-in | Manual |
| LGPD | Dados no browser | Controle total | Depende | Controle total |
| Mobile | Sim | Via API | Sim | Via API |

---

## 4. Decisão adotada: SQL via Supabase

> **Decisão tomada em 2026-09-22: SQL via Supabase (Postgres).** O projeto foi criado e as Fases A–C estão no baseline. A integração de dados está implementada no worktree local, mas não deve ser promovida até validar Postgres/RLS, migrations `0005`/`0006` e smoke test remoto.
>
> **Motivo:** Auth + banco SQL + RLS com mínimo de código para MVP; o bypass 1/2/3 permanece somente por decisão do dono durante a prototipação.
>
> A escolha afeta: criação do projeto Supabase, `supabase.sql`/migrations, uso de `supabase-js`, Auth, RLS e deploy.

---

## 5. LGPD e RNFS-01

### Considerações de proteção de dados (LGPD — Lei Geral de Proteção de Dados)

- **Dados pessoais no sistema:** CPF, nome, e-mail, telefone, endereço, dados de pets associados.
- **CPF é dado sensível** (pode ser usado para identificação única) — deve ser armazenado com criptografia/hash.
- **Senhas:** nunca em plaintext; usar bcrypt ou argon2.
- **Consentimento:** Ao cadastrar tutor/usuário, registrar consentimento (termo de uso).
- **Retenção:** Definir política de retenção (ex: dados de agendamentos por 5 anos). **Nota:** laudos foram removidos do escopo (decisão clínica 2026-09-17) — não há documentos permanentes de obrigação profissional a manter neste sistema.
- **Acesso:** RBAC controla quem vê o quê; logs de acesso devem ser registrados.
- **Portabilidade:** Usuário pode solicitar exportação de seus dados (RF futuro).
- **Exclusão:** Tutor/pet podem ser "arquivados" (soft delete) mantendo integridade referencial.

### RNFS-01: "Os dados devem persistir em banco de dados"
- O worktree local usa Supabase em modo real; o carregamento e as operações persistentes estão implementados. A validação desta continuação passou nos testes estáticos, unitários, regressão e E2E com stubs; o teste DB foi pulado por falta de Docker e não houve smoke test real.
- O contrato efetivo é o das migrations e policies em `supabase/migrations/`, não os endpoints hipotéticos `/api/*` desta proposta antiga.

---

## 6. Próximos passos

> **Em andamento.** Próximas etapas para finalizar a validação antes de qualquer deploy:

1. Rodar `node tests/db.mjs` com Docker/Postgres 17 e corrigir qualquer falha nas migrations/RLS.
2. Confirmar/aplicar `0005_documentos_storage.sql` e `0006_configuracoes_horario.sql` na nuvem.
3. Confirmar o deploy da Edge Function `admin-criar-usuario`.
4. Fazer smoke test real com cada perfil: CRUD, persistência após reload, clínica, anexos e recuperação Auth.
5. Validar o URL de produção e fluxo de deploy somente depois do merge autorizado na `main`.
6. Planejar LGPD: consentimento, direitos do titular, retenção e resposta a incidentes.

> **Este documento é levantamento histórico.** A referência atual é o schema versionado em `supabase/migrations/`.
