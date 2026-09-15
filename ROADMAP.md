# ROADMAP — DayVet-Gestão

> Visão geral, fases de evolução e critérios de aceite.
> Última atualização: 2026-09-15.

---

## 1. Visão geral do DayVet

**DayVet-Gestão** é uma SPA (single-page application) de agenda para pet shop / clínica veterinária, construída com HTML + CSS + JS puros e CDNs externas (Tailwind, Lucide, Chart.js, Google Fonts). O produto morre em `dayvet/` (index.html, styles.css, script.js) — 2640 linhas, 13 seções, 100% mock sem backend.

**Stack atual:** HTML/CSS/JS puros · Tailwind CSS · Lucide · Chart.js · Google Fonts.
**Estado:** protótipo funcional com RBAC (admin / veterinário / funcionário), login neon por CPF+senha, 7 módulos (Agendamentos, Tutores & Pets, Clínico, Relatórios, Usuários, Gráficos, Tema), modo claro/escuro com variáveis CSS.

---

## 2. Congruência RF × Status

| RF | Descrição | Status | Gap |
|---|---|---|---|
| RF-01 | Cadastro de usuário (nome, CPF, e-mail, senha) | **Parcial** | Validação de CPF único e regras de senha (8+ caracteres) não implementadas; só existe mock |
| RF-02 | Cadastro de tutor (nome, CPF, endereço, tel 11 dígitos, e-mail, pets ≤ 10) | **Parcial** | Validação tel 11 dígitos e max 10 pets por tutor não implementadas |
| RF-03 | Login com CPF + senha (≥ 8 caracteres) | **Ausente** | Senha aceita qualquer valor; não há validação de 8 caracteres |
| RF-04 | Cadastro de pet (nome, espécie, raça, comportamento, alergias, vínculo tutor) | **Conforme** | Funcional com mock |
| RF-05 | Agenda 07h–19h (só admin confirma) | **Parcial** | Janela 07–19h pode não estar validada no frontend; confirmação por admin existe na RBAC |
| RF-06 | Cadastro de vacina (nome, data, doses, pet) | **Conforme** | Funcional com mock |
| RF-07 | Relatório em PDF (por tutor, período, serviço) | **Parcial** | Relatórios existem mas exportação PDF não implementada (usa print) |
| RF-08 | Receita veterinária (assinatura vet + CRMV) | **Parcial** | Receita criada mas CRMV vem do mock fixo; sem assinatura digital |
| RF-09 | Laudo veterinário | **Conforme** | Funcional com mock |

**RNFs:**

| RNF | Descrição | Status | Gap |
|---|---|---|---|
| RNF-01 | Dados devem persistir (banco de dados) | **Ausente** | 100% mock, TODOs marcados para integração futura |
| RNF-02 | LGPD — dados pessoais protegidos | **Ausente** | Sem criptografia, sem consentimento, sem política de retenção |
| RNF-03 | Modo claro/escuro acessível | **Parcial** | Funcional mas cores do modo claro precisam de refinamento de contraste |
| RNF-04 | Responsividade (mobile-first) | **Parcial** | Tailwind helper classes presentes; testes mobile não documentados |
| RNF-05 | Auth empresarial | **Ausente** | Não existe fluxo de autenticação empresarial com requisitos específicos |

---

## 3. Fases de evolução

### Fase 0 — Documentação e alinhamento
**Objetivo:** Garantir que toda a documentação-base esteita consistente.

- [x] `AGENTS.md` com convenções, stack, validação
- [x] `docs/MAPA_DO_SISTEMA.md` com estrutura e RBAC
- [x] `docs/CHANGELOG.md` com histórico desde a modularização
- [ ] `ROADMAP.md` (este arquivo)
- [ ] `docs/DB_LEVANTAMENTO.md` (levantamento sem código)

**Critérios de aceite:** Todos os docs da pasta `docs/` existem e são consistentes com o código atual. `AGENTS.md` referencia os docs corretos.

---

### Fase 1 — Conformidade com requisitos (sem backend)
**Objetivo:** Fechar gaps de validação frontend nos RFs já parciais.

- [ ] RF-01: Validar CPF único no cadastro de usuário (mock)
- [ ] RF-02: Validar telefone 11 dígitos e max 10 pets por tutor
- [ ] RF-03: Exigir senha ≥ 8 caracteres no login e no cadastro
- [ ] RF-05: Validar janela 07h–19h no frontend ao criar agendamento
- [ ] RF-07: Melhorar exportação PDF (layout dedicado para impressão)
- [ ] RF-08: Exibir CRMV do veterinário logado na receita
- [ ] RF-09: Garantir laudo completo com campos obrigatórios

**Critérios de aceite:** `node --check dayvet/script.js` passa; validações frontend impedem cadastro/login com dados inválidos; testes manuais CPF 1/2/3 continuam funcionando; CHANGELOG atualizado.

---

### Fase 2 — Auth empresarial
**Objetivo:** Implementar autenticação empresarial com requisitos específicos (RNF-05).
**Status:** `EM TESTE` — branch `teste/auth-empresarial`

- [ ] RNFR-05.1: Email obrigatório e único
- [ ] RNFR-05.2: Login CPF ou e-mail com erro genérico
- [ ] RNFR-05.3: Primeiro acesso força senha 8+1Maiusc+1Num+1Especial
- [ ] RNFR-05.4: Recovery demo mesma mensagem exista ou não
- [ ] RNFR-05.5: Só admin cria 3 roles (admin/vet/func)

**Critérios de aceite:** Fluxo de auth empresarial implementado e testado; `node --check` passa; CHANGELOG atualizado.

---

### Fase 3 — Modo claro (refinamento de contraste)
**Objetivo:** Resolver o gap de acessibilidade do modo claro (RNF-03).
**Status:** `BLOQUEADA` — aguardando aprovação dos stakeholders sobre paleta de cores antes de implementar.

- [ ] Revisar variáveis CSS na seção "7. TEMA CLARO" de `styles.css`
- [ ] Ajustar contraste de textos secundários e bordas
- [ ] Validar com ferramenta de contraste (WCAG AA mínimo 4.5:1)
- [ ] Manter tela de login neon intacta

**Critérios de aceite:** Todas as variáveis do modo claro passam em contraste WCAG AA; alternância tema continua funcionando; `node --check` passa; CHANGELOG atualizado.

---

### Fase 4 — Levantamento para banco de dados (futuro)
**Objetivo:** Documentar opções e definir estratégia de persistência (RNF-01).

- [ ] Criar `docs/DB_LEVANTAMENTO.md` (este documento)
- [ ] Mapear todas as entidades e TODOs existentes
- [ ] Avaliar opções (localStorage, SQLite, Supabase/Firebase, API própria)
- [ ] Definir decisão pendente (requer aprovação do usuário)
- [ ] **NÃO implementar código de banco nesta fase**

**Critérios de aceite:** `docs/DB_LEVANTAMENTO.md` existe e contém: entidades, endpoints mapeados, opções com prós/contras, decisão pendente, considerações LGPD. Nenhuma linha de código de banco é escrita.

---

### F1 Futuro — Setup virgem /setup single-use
**Objetivo:** Implementar rota `/setup` para configuração inicial do sistema (setup virgem, uso único).
**Status:** `FUTURO` — aguardando definição de requisitos e priorização.

- [ ] Definir requisitos do setup (criação de admin inicial, configurações gerais)
- [ ] Implementar rota `/setup` com validação de uso único
- [ ] Garantir que após execução, a rota seja desativada ou bloqueada
- [ ] Integrar com fluxo de auth empresarial (criação do primeiro admin)

**Critérios de aceite:** Setup permite configuração inicial; após execução, não pode ser refeito; documentação atualizada.

---

## 4. Regras da metodologia

### Validação obrigatória
- `node --check dayvet/script.js` — sintaxe sem erros antes de qualquer commit.
- Testar no navegador: logins CPF `1` (Admin), `2` (Veterinário), `3` (Funcionário).
- Alternância de tema claro/escuro funcional.

### Documentação
- Entrada no topo de `docs/CHANGELOG.md` a cada commit (data + o que mudou + por quê + onde).
- `AGENTS.md` e `docs/MAPA_DO_SISTEMA.md` mantidos sincronizados com o código.

### Não versionar
- `local/` (relatórios pessoais de metodologia/commit).
- `opencode.json` (config local da ferramenta).

### Convenções
- Código em pt-BR, seções numeradas e comentadas.
- Comentários `// TODO [INTEGRAÇÃO BANCO DE DADOS FUTURA]:` para pontos de integração.
- Sem `as any`, `@ts-ignore` ou `@ts-expect-error`.
- Mudanças mínimas: só alterar o que a tarefa pede.

### Ordem de leitura antes de editar
1. `AGENTS.md` → convenções e validação
2. `docs/MAPA_DO_SISTEMA.md` → estrutura e RBAC
3. `docs/CHANGELOG.md` → histórico recente
4. `ROADMAP.md` (este) → fase atual e critérios

### Fluxo Git
- **`main`** — branch estável, sempre deployável. Produção em https://ralph-zlt.github.io/Agendau_2/dayvet/
- **`teste/*`** — branches de teste para código novo antes de merge em main
- **`docs/`** — sincronizadas ao push; CHANGELOG e ROADMAP atualizados antes de merge
