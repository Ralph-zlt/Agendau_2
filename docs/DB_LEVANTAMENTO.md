# LEVANTAMENTO — Banco de Dados (DayVet-Gestão)

> Documento de levantamento **sem código**. Define entidades, mapeia TODOs existentes e lista opções de persistência.
> Última atualização: 2026-09-15.
> Status: **Decisão pendente** — requer aprovação antes de implementar.

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

### 1.2 Administrador (tabela `administradores`)
- **id** (PK, FK → users.id)
- **crm** (string, ex: "CRM-SP 45678")
- **crmValidade** (date)
- **profissao** (string)

**Relacionamento:** 1:1 com `Usuario`.

### 1.3 Tutor (tabela `tutores`)
- **id** (PK, string/UUID)
- **nome** (string)
- **cpf** (único)
- **email** (string)
- **tel** (string, 11 dígitos)
- **endereco** (string)
- **senha** (string — observação: tutores possuem senha no mock; definir se terão acesso ao sistema)

**Regra de negócio:** Máximo 10 pets por tutor (RNF via RF-02).

### 1.4 Pet (tabela `pets`)
- **id** (PK, string/UUID)
- **tutorId** (FK → tutores.id)
- **nome** (string)
- **especie** (string)
- **raca** (string)
- **comportamento** (text)
- **alergias** (text)
- **arquivado** (boolean, default false) — soft delete

**Relacionamento:** N:1 com `Tutor`.

### 1.5 Agendamento (tabela `agendamentos`)
- **id** (PK, string/UUID)
- **petId** (FK → pets.id)
- **tutorId** (FK → tutores.id)
- **servico** (string)
- **data** (date)
- **hora** (time)
- **valor** (decimal)
- **status** (enum: `pendente`, `confirmado`, `cancelado`, `concluido`)

**Regra de negócio:** Janela 07h–19h; apenas `admin` confirma (RF-05).

### 1.6 HistoricoClinico (tabela `historico_clinico`)
- **id** (PK, string/UUID)
- **petId** (FK → pets.id)
- **tipo** (enum: `laudo`, `receita`, `guia`, `vacina`)
- **data** (date)
- **detalhe** (text)

**Regra de negócio:** Registros são **imutáveis** após criação (auditoria).

### 1.7 Receita / Laudo (subtipos de `historico_clinico`)

**Receita** (campos adicionais):
- **veterinarioId** (FK → users.id) — assinatura do vet
- **crmv** (string) — CRMV do veterinário responsável

**Laudo** (campos adicionais):
- **veterinarioId** (FK → users.id)
- **crmv** (string)
- **diagnostico** (text)

### 1.8 Vacina (pode ser tabela separada ou subtipo de `historico_clinico`)
- **id** (PK)
- **petId** (FK → pets.id)
- **nome** (string)
- **dataAplicacao** (date)
- **doses** (integer)
- **doseAtual** (integer)
- **proximaDose** (date, opcional)

---

## 2. Mapeamento dos TODOs existentes em `dayvet/script.js`

Todos os pontos marcados com `// TODO [INTEGRAÇÃO BANCO DE DADOS FUTURA]:`:

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

### 3.3 Supabase / Firebase
| Aspecto | Detalhe |
|---|---|
| **Prós** | Auth built-in, real-time, hospedado, escala, LGPD (Supabase tem EUA/PARLEI compliance) |
| **Contras** | Lock-in de fornecedor,学习曲线, limites de plano gratuito, dados nos EUA (Firebase) |
| **Adequação** | **Recomendado para produção** se o time aceitar a plataforma |

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

## 4. Decisão pendente

> **NÃO foi tomada nenhuma decisão.** O usuário deve escolher a opção de persistência antes de qualquer implementação.
>
> **Recomendação técnica (sem viés):** Para um MVP rápido, **Supabase** oferece auth + banco + real-time com mínimo de código. Para controle total, **API própria com Node + SQLite/PostgreSQL**.
>
> A escolha afeta: estrutura de pastas, dependências, deploy, e esforço estimado.

---

## 5. LGPD e RNFS-01

### Considerações de proteção de dados (LGPD — Lei Geral de Proteção de Dados)

- **Dados pessoais no sistema:** CPF, nome, e-mail, telefone, endereço, dados de pets associados.
- **CPF é dado sensível** (pode ser usado para identificação única) — deve ser armazenado com criptografia/hash.
- **Senhas:** nunca em plaintext; usar bcrypt ou argon2.
- **Consentimento:** Ao cadastrar tutor/usuário, registrar consentimento (termo de uso).
- **Retenção:** Definir política de retenção (ex: dados de agendamentos por 5 anos, laudos permanentes por obrigação profissional).
- **Acesso:** RBAC controla quem vê o quê; logs de acesso devem ser registrados.
- **Portabilidade:** Usuário pode solicitar exportação de seus dados (RF futuro).
- **Exclusão:** Tutor/pet podem ser "arquivados" (soft delete) mantendo integridade referencial.

### RNFS-01: "Os dados devem persistir em banco de dados"
- Atualmente 100% mock — todos os TODOs apontam para integração futura.
- Qualquer opção escolhida (§3) deve suportar: tabelas definidas em §1, endpoints em §2, autenticação JWT/session.

---

## 6. Próximos passos

1. **Usuário decide:** opção de persistência (§3) + infraestrutura de deploy.
2. **Criar migrations/schema:** mapear entidades (§1) para a opção escolhida.
3. **Implementar auth:** POST /api/login + JWT/session (substituir `perfisTestes`).
4. **Substituir TODOs:** um a um, trocar mock por chamadas à API/banco.
5. **Testes:** cobrir CRUD de cada entidade + RBAC server-side.
6. **LGPD:** implementar consentimento, criptografia e política de retenção.

> **Este documento é levantamento. Nenhum código de banco foi implementado.**
