# ROADMAP — DayVet-Gestão

> Próximos passos do que vamos fazer. Não é documento de requisitos —
> fonte de RFs/RNFs: `docs/requisitos-funcionais-dayvet.docx`.
> Última atualização: 2026-11-23.
> Estado após `git fetch origin` em 23/11/2026: `origin/main` = `0902ec5` (PR #3 mesclada); `origin/teste` = `96aeeb8`. A integração está publicada na Vercel; o teste de produção confirmou modo real, Auth/RBAC dos 3 perfis e persistência de tutor após reload. Migrations `0001..0006` estão aplicadas e `admin-criar-usuario` está implantada. Estático, unitários, regressões, E2E Chromium/Firefox, Postgres 17 e smoke publicado passaram. Ainda faltam smokes reais dos demais fluxos/perfis (pets, agenda, clínico, anexos e configuração).

## 0. Links e deploy (espelho fixo da main)

- **GitHub Pages (espelho fixo da `main`): https://ralph-zlt.github.io/Agendau_2/dayvet/**
  - Workflow `.github/workflows/deploy-pages.yml` dispara **somente em `push` na `main`** (mais `workflow_dispatch` manual).
  - Artefato: `site/index.html` → `dist/index.html` (landing) + `dayvet/*` → `dist/dayvet/` (SPA).
  - **Regra: este link SEMPRE reflete a `main`. Nunca publicar a `teste` nele.**
- **Teste:** validar na branch `teste` em ambiente local (`dayvet/index.html`) ou preview temporário da `teste`. Só mergear na `main` após validação do dono.
- **Vercel:** https://agendau-2.vercel.app — deploy da `main` `e3edffe` Ready; o alias existente serve o frontend em modo Supabase real. Assets respondem 200; `tests/publicado.mjs` confirmou Auth/RBAC e a gravação real de tutor foi validada no navegador. A integração Git continua bloqueada, então novas publicações usam `scripts/deploy-vercel.sh` depois do merge na `main`.

---

## 1. Próximas (fazer agora na `teste`, nesta ordem)

- [x] **1. Login autocomplete temporário** — entregue na `main` (merge `3c1f67e`).
- [x] **2. Clínico usa tutor por CPF (chave primária)** — entregue na `main` (merge `3c1f67e`).
- [x] **3. Área de upload de documentos** — entregue na `main` (merge `3c1f67e`).
- [x] **4. Vacinação informa o tipo (select)** — entregue na `main` (merge `3c1f67e`).
- [x] **5. Layout de impressão/PDF + RF-08 ilustrativo** — entregue na `main` (merge `3c1f67e`).
- [x] **6. Tooltip instantâneo no login** — entregue na `main` (merge teste→main 2026-09-24): `title=` nativo removido do `#btn-info-login`; tooltip customizado `#tooltip-info-login` imediato no hover/foco/toque com texto do bypass (clicar na barra de CPF/e-mail); botão em roxo claro chamativo (`#C084FC`).
- [ ] **7. "Módulo clínico" do funcionário (CRUD de tipos de vacina):** SUPERSEDED pelo item 18 (decisão 2026-09-25: tipos de vacina = admin/vet; funcionário sem modo clínico). Implementação original reaproveitada (mock `tiposVacina[]`, fim do `TIPOS_VACINA` fixo + `TODO SUPABASE`, RBAC `vacina_tipos_*`).
- [x] **8. Card de anexos nos 2 temas:** entregue na `main` (merge `fe9ba87`): `#anexos-card`/`#lista-anexos` nas variáveis de tema (`styles.css` §7 + §9 explícito) — legível no claro, consistente no escuro.
- [x] **9. Agendamentos do funcionário só-leitura:** entregue na `main` (merge `fe9ba87`): sem `consulta/vacinacao: agendar+editar+cancelar` p/ funcionário (mantém ver + relatórios, tutor/pet incluir; `clinica_imprimir` removido depois pelo item 18); guards em abrir/editar/status/salvar.
- [x] **10. Cadastro de pet com espécie/raça/sexo/peso:** espécie como select (Canino, Felino, Equino, Bovino, Suíno, Ovino, Outro), raça como select por espécie (`RACAS_POR_ESPECIE` + "Outra"), sexo (Macho/Fêmea), peso em kg opcional (>0). Entregue na `main` (merge `fe9ba87`).
- [x] **11. CRUD de tipos de raça + paridade admin + fix filtro faturamento:** raças gerenciáveis por funcionário e admin (`racasPorEspecie[]`, `#modal-tipos-raca`, RBAC `raca_tipos_*`, card na aba Tutores & Pets); `atualizarPeriodoFaturamento()` implementado (mensal/semanal/anual + KPI). Paridade vacina superada pelo item 18 (tipos de vacina = admin/vet). Entregue na `main` (merge `fe9ba87`).
- [x] **12. Vet agenda vacinação + quick-add "Outro":** `vacinacao_agendar` p/ veterinário (modal Agendar aceita Vacinação); se tipo "Outro" + novo nome, adiciona ao catálogo na hora (atalho opcional do vet — vazio mantém "Outro"); catálogo segue do admin/vet (item 18). Entregue na `main` (merge `fe9ba87`).
- [x] **13. Tipos com modo criar/editar + aba Expirados:** modais de vacina/raça com "Adicionar" vs "Salvar alterações" (+Cancelar edição); agendamentos com vistas Ativos/Expirados (vencidos+cancelados+concluídos), botão Concluir (perm do Confirmar) e Remarcar (volta pendente), Editar permite remarcar. Entregue na `main` (merge `fe9ba87`).
- [x] **14. Ativos × Expirados empilhados + ações por status:** duas tabelas uma abaixo da outra (Ativos crescentes; Expirados decrescentes agrupados "Últimos 7 dias"/"Mais antigos"); concluído → Nova consulta, cancelado → Remarcar, pendente vencido → Remarcar/Cancelar/Editar; mocks com datas relativas (exemplos sempre nos dois). Entregue na `main` (merge `fe9ba87`).
- [x] **15. Expirados em 3 faixas:** Últimos 7 dias, Este mês, depois um grupo por mês ("Agosto de 2026"...). Entregue na `main` (merge `fe9ba87`).
- [x] **16. Dashboard do vet sem financeiro:** `vetId` nos agendamentos; vet não vê Faturamento/Receita — vê Próxima Consulta + barras por hora (consultas × vacinações de hoje, só dele); admin intacto. Entregue na `main` (merge `fe9ba87`).
- [x] **17. Expirados colapsado + pesquisa mês/ano:** abre só Últimos 7 dias + "Carregar mais antigas" (este mês/meses ao expandir); selects mês/ano (`#pesquisa-mes-sel`, `#pesquisa-ano-sel`) filtram o histórico (funcionário também pesquisa — só leitura). Entregue na `main` (merge `fe9ba87`).
- [x] **18. Vacinas = admin/vet; funcionário fora do clínico (decisão 2026-09-25):** `vacina_tipos_criar/editar/excluir` p/ admin+veterinário (vet ganha total em vacinação); funcionário perde `clinica_*` + `vacina_tipos_*` (sem aba Módulo Clínico; mantém agendamentos só-leitura, tutor/pet e tipos de raça). Já está no baseline `origin/main` (`e5c2e16`).
- [x] **19. Remover a guia de encaminhamento do produto (decisão do dono 2026-11-13):** atalho "Incluir Guia", opção do select, mock 403, branches de render/impressão, título da timeline e opção do relatório removidos; RF-10 marcado como **FORA DE ESCOPO** em `docs/requisitos-funcionais-dayvet.docx`. Justificativa: o dono não usa guia na operação da clínica; a emissão fica restrita a receita e registro de imunização.
- [x] **20. Exclusão de tutor (soft delete + definitiva):** `arquivado` no tutor; `tutor_editar`/`tutor_arquivar`/`tutor_excluir` p/ **admin e funcionário** (decisão 2026-11-13); arquivar bloqueado com agendamento pendente/confirmado; exclusão definitiva só após arquivar e bloqueada se houver pets, agendamentos ou histórico clínico; tutor arquivado some dos selects e ganha "Mostrar arquivados"/"Restaurar".
- [x] **21. Harness de testes do projeto:** `tests/estatico.mjs`, `tests/unit/regras.mjs`, `tests/e2e.mjs` (Playwright Chromium+Firefox, desktop e 390×844) + `tests/regressao/` numerada; screenshots em `/tmp/ai-evidence/`.
- [x] **22. Documentação do ciclo:** ROADMAP/MAPA/AGENTS/DB/CHANGELOG sincronizados com a pausa de banco/Vercel e com os itens 19–21; `PROJETOS.md` recriado na raiz de `~/Público/Projetos`.

**Aceite geral:** `node tests/estatico.mjs` + `node tests/unit/regras.mjs` + `node tests/unit/persistencia.mjs` + `node tests/e2e.mjs` verdes; teste manual na `teste` antes de qualquer novo merge; `docs/CHANGELOG.md` atualizado. Fluxo padrão: código na `teste` → validação do dono → merge na `main` (exceção desta vez: merge direto `teste`→`main` validado em teste manual).

---

## 2. Alta prioridade (próximos — lembrar ao mexer no sistema)

- [ ] **Refinamento fino da paleta do modo claro** — contrastes já passam AA (2026-09-25, `--texto-fraco` → AA). A escolha estética da paleta fica **adiada por decisão do dono (2026-11-17)**: o projeto segue sem ela; retomar se o dono pedir.
- [x] **Login no modo claro (observação do dono, 2026-09-24):** entregue 2026-09-25 — `#login-cabecalho` com gradiente claro explícito; paw-print lima fixo `#ccff00` nos 2 temas.
- [x] RF-02 restante: tel 11 dígitos + máx 10 pets por tutor — entregue 2026-09-25.
- [x] RF-05: janela 07h–19h no agendamento — entregue 2026-09-25.
- [x] **RF-08 real:** CRMV e dados do veterinário autenticado vêm de `public.usuarios`; `currentUser.crm` alimenta a assinatura clínica.
- [x] **Corrigir: Admin não consegue excluir Tutor** — entregue no item 20 (13/11/2026): exclusão passou a existir no frontend (arquivar → excluir definitivo, sem depender de RLS porque não há banco ainda).
- [x] **Remover "Incluir Guia" do sistema** — entregue no item 19 (13/11/2026): removida de frontend, mocks e relatórios; RF-10 marcado FORA DE ESCOPO no docx.
- [ ] **Excluir Pet** — implementar exclusão de pet (soft delete via `deleted_at` na tabela `pets`), com confirmação e validação de dependências (agendamentos, vacinações, histórico clínico).
- [ ] **Adicionar barra de pesquisa de Tutores** — implementar campo de busca (por nome/CPF/telefone) na listagem de tutores, com debounce e filtro em tempo real.
- [ ] **Concluir auditoria de interpolação HTML:** `escaparHtml()` já protege conteúdo textual renderizado a partir dos dados; revisar todas as interpolações e argumentos de handlers inline para confirmar que os valores seguem escapados/limitados a IDs e CPFs válidos.

### 2.b Banco de dados — EM ANDAMENTO (autorizado pelo dono em 2026-11-13)

> O dono autorizou subir o Supabase. Plano de 5 fases (A–E) acordado:
> A = SQL v2 validado localmente · B = criar projeto e aplicar · C = ponte de
> auth · D = ponte de dados · E = testes integrados + docs.
> **Fase A concluída em 2026-11-13** (ver `docs/CHANGELOG.md`): migrations
> `0001_schema`, `0002_seed`, `0003_rls` + `tests/db.mjs` (73 casos de RLS verdes).
> **Fase B concluída em 2026-11-18** e **Fase C concluída no baseline `e5c2e16`**.
> A integração de tabelas e Storage foi mesclada na `main` e publicada na Vercel
> em 2026-11-23. Restam smokes autenticados reais dos demais fluxos/perfis.
> O banco foi validado em Postgres 17 na VPS; migrations `0001..0006` foram
> confirmadas no projeto remoto, e a Edge Function `admin-criar-usuario` foi
> implantada com JWT obrigatório. Smokes autenticados confirmaram CRUD e
> persistência após reload de tutor, pet, agendamento e documento clínico.
> Dados sintéticos de QA permanecem na produção por decisão do dono: 2 tutores,
> 3 pets, 4 agendamentos e 2 registros clínicos, todos marcados `TESTE`.

- [x] **Fase A — SQL v2 consolidado e validado localmente** — single-clinic (sem `clinicas`/`clinica_id`), sem `vacinacoes`/`forma_farmaceutica`, sem `guia` no enum, `usuarios.id = auth.users.id`, `pet_id` nullable, `historico` editável por admin/vet. Validado em Postgres 17 descartável com matriz de permissões idêntica ao RBAC do `script.js`.
- [x] **Fase B — Supabase no ar (concluída em 2026-11-18)** — org `dayvet-org` + projeto `agendau-2` em `sa-east-1`; migrations `0001..0003` e Auth/RLS foram aplicados/validados na nuvem conforme histórico do changelog.
- [x] **Incidente 2026-11-23 — projeto pausado por inatividade** — `status: INACTIVE` e DNS `NXDOMAIN` (plano free pausa em ~7 dias sem atividade e remove a resolução). Restaurado via `POST /v1/projects/{ref}/restore` → `ACTIVE_HEALTHY`; banco íntegro (7 tabelas, 29 policies, 3 usuários) e chave `anon` legada ainda válida. Mitigação: `.github/workflows/supabase-keepalive.yml` (login + leitura real diária, abre issue se falhar).
- [x] **Fase 0 — parar a falsa persistência (2026-11-23)** — `MODO_DADOS`/`confirmarEscrita()`: as 25 mensagens de escrita avisam "nada foi salvo no banco" e a faixa `#aviso-modo-demo` (app) + `#aviso-login-demo` (login) deixam o modo demonstração explícito. Regressão `04-aviso-modo-demo.mjs`.
- [x] **Vercel reflete a `main` (2026-11-23)** — decisão do dono. `scripts/deploy-vercel.sh` agora aborta se `HEAD != origin/main` ou se `dayvet/`/`site/` estiverem sujos; publicação só a partir da `main`. Regra escrita no `AGENTS.md` do projeto.
- [x] **Fase C — autenticação Supabase (baseline `e5c2e16`)** — login por usuário/CPF/e-mail via RPC `resolver_login` + `signInWithPassword`; perfil/RBAC em `public.usuarios`; recuperação de senha, sessão e troca obrigatória via Supabase Auth. O bypass de demonstração 1/2/3 permanece por decisão do dono.
- [x] **Banco remoto e Edge Function (2026-11-23)** — migrations `0001..0006` confirmadas no projeto `agendau-2`; `tests/db.mjs` passou em Postgres 17 na VPS; `admin-criar-usuario` implantada com verificação JWT habilitada e chamada sem autenticação recusada (401).
- [x] **Smoke real de dados QA (2026-11-23)** — login Auth real e gravação pela aplicação/RLS de 2 tutores, 3 pets, 4 agendamentos e 2 registros clínicos sintéticos, identificados com `TESTE`; persistência e vínculos confirmados após reload. Cadastro/edição com CPF canônico e rejeição de CPF inválido também foram verificados.
- [x] **Correções de login e dashboard (2026-11-23, PR #3 / main `0902ec5`)** — permite rolagem do login em janelas baixas; seleciona mês para consultar agendamentos confirmados/concluídos. Deploy Vercel Ready; smoke publicado 13/13, login Auth em 613×304 e R$ 330,00 no mês 12/2026 verificados na produção. Valores não representam pagamentos recebidos.
- [ ] **Fases D/E — completar validação funcional** — a integração está publicada em modo `MODO_DADOS='real'`; `persistencia.js` integra tutores, pets, agendamentos, catálogos, configuração, dados clínicos/anexos e usuários; Storage usa bucket privado. Smoke real do tutor passou em Vercel: cadastro/edição, reload, CPF inválido rejeitado e exclusão limpa. E2E Chromium passou com stubs; ainda faltam smokes autenticados reais dos demais fluxos/perfis. O teste de ouro continua: "desmarcar consulta → F5 → continua desmarcada".
- [ ] **Integração Git da Vercel (bloqueada — depende do dono)** — todo push na `main` falha com "commit author doesn't have permission to create deployments". Falta adicionar a **Login Connection** do GitHub na conta Vercel (`vercel.com/accounts`). Enquanto isso, publicar com `./scripts/deploy-vercel.sh` (artefato pré-construído).

- [ ] **Concluir validação das Fases D/E** — fazer smokes autenticados restantes por perfil/fluxo. E2E Chromium, migrations, banco Postgres 17, Edge Function e deploy Vercel já foram validados; rodar Firefox se houver mudança de layout/tema.
- [ ] **Importação de dados legados** — definir se há dados reais a importar. O caminho atual inicia sem pré-carregar os arrays de demonstração e lê os registros do Supabase.
- [ ] **Escalar para multi-clinic (seguir "receita de bolo" em `docs/levantamento-bd.md`)** — ativar RLS, configurar middleware/JWT para filtrar por `clinica_id`, e ajustar APIs.
- [x] **Hospedagem no Vercel (parcial, 2026-11-18)** — projeto `agendau-2` criado, produção em `https://agendau-2.vercel.app` (alias estável) e `node tests/publicado.mjs` 15/15. Feito **sem** flags de feature e sem preview por PR, porque a integração Git está bloqueada. Pendente quando a conexão existir: variáveis por ambiente, preview automático em PRs e domínio customizado.
- [ ] **Conformidade total com a LGPD (Lei 13.709/2018)** — mapeamento de dados pessoais/sensíveis, base legal por tratamento, consentimento granular (tutor/pet/agendamento), direitos do titular (acesso, retificação, exclusão, portabilidade), DPO/encarregado, registro de operações (ROPA), política de retenção/exclusão automática, DPIA para dados de saúde animal, cláusulas contratuais com Subprocessadores (Supabase, Vercel), incidente de segurança (plano de notificação 48h ANPD).

### 2.c Baixa prioridade (para não esquecer — sem data)

- [x] **Simplificar SQL para single-clinic real** — entregue na Fase A (2026-11-13): `supabase/migrations/0001_schema.sql` não tem `clinicas` nem `clinica_id`; `docs/sql/` fica só como histórico. Validado por `node tests/db.mjs`.
- [ ] Validar/publicar as Fases D/E, concluir auditoria de interpolações HTML, planejar LGPD e remover bypass 1/2/3 (`perfisTestes`, `password_demo`, `mustChange:false`) antes da implantação — ver §2.b.

## 4. Histórico (detalhe em `docs/CHANGELOG.md`)

- Auth empresarial (Fase 2) · Painel vet + login claro (Fase 5, refeito se preciso após reset da `teste`) · Implantação método do dono (sem `/setup`) · RF-09 laudo **cancelado** (fora de escopo, decisão clínica 2026-09-17) · **RF-10 guia cancelado** (fora de escopo, decisão do dono 2026-11-13).

## 5. Regras

- Validação (obrigatória antes de qualquer commit): `node tests/estatico.mjs` + `node tests/unit/regras.mjs` + `node tests/unit/persistencia.mjs` + `node tests/regressao/run.mjs` + `node tests/e2e.mjs` (Chromium; `node tests/e2e.mjs firefox` quando mexer em layout/tema). Screenshots em `/tmp/ai-evidence/`. Teste manual no navegador (logins 1/2/3, temas) continua obrigatório.
- Teste de regressão: bug corrigido gera `tests/regressao/NN-<slug>.mjs` que falha sem o fix e passa com ele (suíte só cresce).
- Docs: entrada no topo de `docs/CHANGELOG.md` a cada commit; `AGENTS.md` e `docs/MAPA_DO_SISTEMA.md` sincronizados.
- Git: `main` estável (só dono mergeia; IA nunca pusha direto); `teste` = única branch de trabalho, cópia da `main` para os itens da §1. Produção = §0.
- Código: pt-BR, seções numeradas, `TODO [INTEGRAÇÃO SUPABASE]` nos pontos de banco. Não versionar `local/` e `opencode.json`.
- Leitura antes de editar: `AGENTS.md` → `docs/MAPA_DO_SISTEMA.md` → `docs/CHANGELOG.md` → este roadmap.
