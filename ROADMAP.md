# ROADMAP — DayVet-Gestão

> Próximos passos do que vamos fazer. Não é documento de requisitos —
> fonte de RFs/RNFs: `docs/requisitos-funcionais-dayvet.docx`.
> Última atualização: 2026-11-13.
> Estado dos branches: `main` = `2186c34` (itens 1–6, 8–17 + LICENSE + SQL em `docs/sql/`); `teste` = `main` + itens 18–22 (vacinas admin/vet, guia removida, exclusão de tutor, harness de testes, docs), pronto para merge.

## 0. Links e deploy (espelho fixo da main)

- **Produção (espelho fixo da `main`): https://ralph-zlt.github.io/Agendau_2/dayvet/**
  - Workflow `.github/workflows/deploy-pages.yml` dispara **somente em `push` na `main`** (mais `workflow_dispatch` manual).
  - Artefato: `site/index.html` → `dist/index.html` (landing) + `dayvet/*` → `dist/dayvet/` (SPA).
  - **Regra: este link SEMPRE reflete a `main`. Nunca publicar a `teste` nele.**
- **Teste:** validar na branch `teste` em ambiente local (`dayvet/index.html`) ou preview temporário da `teste`. Só mergear na `main` após validação do dono.
- **Vercel: PAUSADO** por decisão do dono em 2026-11-13. A produção continua exclusivamente no GitHub Pages (§ links acima).

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
- [x] **18. Vacinas = admin/vet; funcionário fora do clínico (decisão 2026-09-25):** `vacina_tipos_criar/editar/excluir` p/ admin+veterinário (vet ganha total em vacinação); funcionário perde `clinica_*` + `vacina_tipos_*` (sem aba Módulo Clínico; mantém agendamentos só-leitura, tutor/pet e tipos de raça). Entregue na `teste` (`44326bc`, aguarda validação do dono p/ merge).
- [x] **19. Remover a guia de encaminhamento do produto (decisão do dono 2026-11-13):** atalho "Incluir Guia", opção do select, mock 403, branches de render/impressão, título da timeline e opção do relatório removidos; RF-10 marcado como **FORA DE ESCOPO** em `docs/requisitos-funcionais-dayvet.docx`. Justificativa: o dono não usa guia na operação da clínica; a emissão fica restrita a receita e registro de imunização.
- [x] **20. Exclusão de tutor (soft delete + definitiva):** `arquivado` no tutor; `tutor_editar`/`tutor_arquivar`/`tutor_excluir` p/ **admin e funcionário** (decisão 2026-11-13); arquivar bloqueado com agendamento pendente/confirmado; exclusão definitiva só após arquivar e bloqueada se houver pets, agendamentos ou histórico clínico; tutor arquivado some dos selects e ganha "Mostrar arquivados"/"Restaurar".
- [x] **21. Harness de testes do projeto:** `tests/estatico.mjs`, `tests/unit/regras.mjs`, `tests/e2e.mjs` (Playwright Chromium+Firefox, desktop e 390×844) + `tests/regressao/` numerada; screenshots em `/tmp/ai-evidence/`.
- [x] **22. Documentação do ciclo:** ROADMAP/MAPA/AGENTS/DB/CHANGELOG sincronizados com a pausa de banco/Vercel e com os itens 19–21; `PROJETOS.md` recriado na raiz de `~/Público/Projetos`.

**Aceite geral:** `node tests/estatico.mjs` + `node tests/unit/regras.mjs` + `node tests/e2e.mjs` verdes; teste manual na `teste` antes de qualquer novo merge; `docs/CHANGELOG.md` atualizado. Fluxo padrão: código na `teste` → validação do dono → merge na `main` (exceção desta vez: merge direto `teste`→`main` validado em teste manual).

---

## 2. Alta prioridade (próximos — lembrar ao mexer no sistema)

- [x] Refinamento modo claro/paleta + contrastes WCAG — parcial 2026-09-25 (`--texto-fraco` → AA; demais textos AA-OK). Refinamento amplo segue aberto.
- [x] **Login no modo claro (observação do dono, 2026-09-24):** entregue 2026-09-25 — `#login-cabecalho` com gradiente claro explícito; paw-print lima fixo `#ccff00` nos 2 temas.
- [x] RF-02 restante: tel 11 dígitos + máx 10 pets por tutor — entregue 2026-09-25.
- [x] RF-05: janela 07h–19h no agendamento — entregue 2026-09-25.
- [ ] **RF-08 real (pós-banco):** CRMV do veterinário logado + assinatura. Prep ilustrativo entregue (usa `currentUser.crm` com fallback mock).
- [x] **Corrigir: Admin não consegue excluir Tutor** — entregue no item 20 (13/11/2026): exclusão passou a existir no frontend (arquivar → excluir definitivo, sem depender de RLS porque não há banco ainda).
- [x] **Remover "Incluir Guia" do sistema** — entregue no item 19 (13/11/2026): removida de frontend, mocks e relatórios; RF-10 marcado FORA DE ESCOPO no docx.
- [ ] **Excluir Pet** — implementar exclusão de pet (soft delete via `deleted_at` na tabela `pets`), com confirmação e validação de dependências (agendamentos, vacinações, histórico clínico).
- [ ] **Adicionar barra de pesquisa de Tutores** — implementar campo de busca (por nome/CPF/telefone) na listagem de tutores, com debounce e filtro em tempo real.
- [ ] **Sanitizar `innerHTML` (XSS de protótipo):** nome/CPF/endereço de tutor, pet e detalhes clínicos entram em `innerHTML` sem escape em vários renders. Com dados mock o risco é local; ao ir para banco (pausado) vira XSS armazenado. Correção mínima: helper `escaparHtml()` aplicado nos renders e `onclick` com CPF via atributo `data-*`.

### 2.b Pausados por decisão do dono (2026-11-13) — NÃO executar agora

> Decisão do dono: o foco volta para o frontend. Banco, migração, hospedagem e
> LGPD ficam **parados** até nova ordem. Nada de criar projeto, aplicar SQL ou
> publicar fora do Pages.

- [ ] **Integração do banco de dados no Supabase** — schema, Auth + RLS, migração dos mocks atuais; remover bypass 1/2/3 (`perfisTestes`, `password_demo`, `mustChange:false`).
- [ ] **Importação de dados legados** — scripts de migração dos mocks (`localStorage`/`mockData.js`) para tabelas Supabase (tutores, pets, agendamentos, vacinas, anexos, usuários, clínica).
- [ ] **Escalar para multi-clinic (seguir "receita de bolo" em `docs/levantamento-bd.md`)** — ativar RLS, configurar middleware/JWT para filtrar por `clinica_id`, e ajustar APIs.
- [ ] **Hospedagem no Vercel** — configurar projeto, variáveis de ambiente (Supabase URL/anon key, flags de feature), build `npm run build` → `dist/`, preview automático em PRs, domínio customizado.
- [ ] **Conformidade total com a LGPD (Lei 13.709/2018)** — mapeamento de dados pessoais/sensíveis, base legal por tratamento, consentimento granular (tutor/pet/agendamento), direitos do titular (acesso, retificação, exclusão, portabilidade), DPO/encarregado, registro de operações (ROPA), política de retenção/exclusão automática, DPIA para dados de saúde animal, cláusulas contratuais com Subprocessadores (Supabase, Vercel), incidente de segurança (plano de notificação 48h ANPD).

### 2.c Baixa prioridade (para não esquecer — sem data)

- [ ] **Simplificar SQL para single-clinic real** — remover `clinica_id` de todas as tabelas, dropar tabela `clinicas`, ajustar índices, views e RLS. Hoje o schema (em `docs/sql/`, escrito mas **não aplicado**) tem estrutura multi-clinic; simplificar quando o banco voltar ao escopo.
- [ ] Banco Supabase (schema, Auth+RLS, migração dos mocks), LGPD, remover bypass 1/2/3 (`perfisTestes`, `password_demo`, `mustChange:false`) — ver §2.b.

## 4. Histórico (detalhe em `docs/CHANGELOG.md`)

- Auth empresarial (Fase 2) · Painel vet + login claro (Fase 5, refeito se preciso após reset da `teste`) · Implantação método do dono (sem `/setup`) · RF-09 laudo **cancelado** (fora de escopo, decisão clínica 2026-09-17) · **RF-10 guia cancelado** (fora de escopo, decisão do dono 2026-11-13).

## 5. Regras

- Validação (obrigatória antes de qualquer commit): `node tests/estatico.mjs` + `node tests/unit/regras.mjs` + `node tests/e2e.mjs` (Chromium; `node tests/e2e.mjs firefox` quando mexer em layout/tema). Screenshots em `/tmp/ai-evidence/`. Teste manual no navegador (logins 1/2/3, temas) continua obrigatório.
- Teste de regressão: bug corrigido gera `tests/regressao/NN-<slug>.mjs` que falha sem o fix e passa com ele (suíte só cresce).
- Docs: entrada no topo de `docs/CHANGELOG.md` a cada commit; `AGENTS.md` e `docs/MAPA_DO_SISTEMA.md` sincronizados.
- Git: `main` estável (só dono mergeia; IA nunca pusha direto); `teste` = única branch de trabalho, cópia da `main` para os itens da §1. Produção = §0.
- Código: pt-BR, seções numeradas, `TODO [INTEGRAÇÃO SUPABASE]` nos pontos de banco. Não versionar `local/` e `opencode.json`.
- Leitura antes de editar: `AGENTS.md` → `docs/MAPA_DO_SISTEMA.md` → `docs/CHANGELOG.md` → este roadmap.
