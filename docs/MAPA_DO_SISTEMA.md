# MAPA DO SISTEMA — DayVet-Gestão

> Referência para IAs e colaboradores editarem o código com contexto.
> Última revisão: 13/11/2026 · Base: `main`=`fe9ba87` (itens 1–6, 8–17) + `teste` = item 18 (`44326bc`) + ciclo de correções 2026-11-13 (itens 19–21), a mergear.
> Estado: `teste` tem item 18 (vacinas admin/vet) + remoção da guia + exclusão de tutor + harness de testes. `main` ainda tem vacina=funcionário e guia. Ver `ROADMAP.md` §1.
> Atenção: números de linha são referências — confirme antes de editar.

## 0. Links e deploy (espelho fixo da main)

- **Produção (espelho fixo da `main`): https://ralph-zlt.github.io/Agendau_2/dayvet/**
- Workflow `.github/workflows/deploy-pages.yml` dispara **somente em `push` na `main`**; publica `site/index.html` → `dist/index.html` + `dayvet/*` → `dist/dayvet/`.
- **Nunca publicar a branch `teste` neste link.** Teste roda local (`dayvet/index.html`); merge na `main` só após validação do dono.
- Fila de trabalho: `ROADMAP.md` §1 — itens 1–6, 8–17 na `main`; itens 18–22 (vacinas admin/vet, remoção da guia, exclusão de tutor, harness de testes, docs) na `teste`, a validar/mergear.
- **Vercel: pausado (13/11/2026)** — produção continua só no GitHub Pages.

## 1. Visão geral
- SPA (single-page application) de agenda para **pet shop / clínica veterinária**.
- **Backend: PAUSADO por decisão do dono em 2026-11-13** (decisão original de 2026-09-22: SQL via Supabase/Postgres + Auth + RLS). Projeto não criado; hoje, e por tempo indeterminado, os dados são mocks em memória (arrays).
- **Stack**: HTML + CSS + JS puros com CDNs externas — Tailwind CSS (utilitários), Lucide (ícones), Chart.js (gráficos), Google Fonts (Plus Jakarta Sans) + Supabase SQL planejado.
- Estrutura em **3 arquivos na pasta `dayvet/`**.

## 2. Estrutura de arquivos

| Arquivo | Papel | Observações |
|---|---|---|
| `dayvet/index.html` | Estrutura/marcação (SPA) | <head> com config Tailwind + cores de marca; tela de login; header; nav de tabs; seções `<section id="tab-...">`; modais `#modal-*`; CDNs |
| `dayvet/styles.css` | Estilo (seções) | Base, scrollbar, neon, glass, impressão, **sistemas de tema escuro/claro** |
| `dayvet/script.js` | Lógica (13 seções) | Mock data, RBAC, login, toasts, navegação, agendamentos, tutores & pets, clínico, relatórios, usuários, gráficos, tema, inicialização |
| `dayvet/regras.js` | Regras puras (sem DOM) | `RegrasTutor`: `podeArquivarTutor`, `podeExcluirTutor`, `tutoresSelecionaveis`; testável em node e usada pelo `script.js` |
| `tests/` | Testes do projeto | `estatico.mjs`, `unit/regras.mjs`, `e2e.mjs` (Playwright) e `regressao/NN-*.mjs` + `run.mjs` |
| `docs/requisitos-funcionais-dayvet.docx` | Requisitos (fonte de RFs/RNFRs/RNFS) | RF-01–RF-10 + RNFS; sincronizado com o código na v2; frontend/temas fora (só roadmap). RF-09 e RF-10 marcados FORA DE ESCOPO |
| `docs/DB_LEVANTAMENTO.md` | Levantamento conceitual do banco | Entidades, vínculos, opções de persistência; decisão Supabase **pausada** |
| `docs/levantamento-bd.md` | Levantamento detalhado + receita de migração | Extraído do PDF de 2026-11-02; base do schema multi-clinic |
| `docs/sql/*.sql` | SQL **escrito, não aplicado** | `schema.sql`, `seeds.sql`, `rls-policies.sql`, `dayvet-completo.sql` (2026-11-02). Nenhum projeto Supabase existe; nada rodou |

## 3. Autenticação e perfis (RBAC)

> ⚠️ **RISCO ALTO DE SEGURANÇA — SOMENTE PROTOTIPAÇÃO:** contas 1/2/3 entram sem senha válida e sem troca obrigatória. REMOVER `perfisTestes`, `password_demo` e qualquer bypass antes da implantação. Em produção: hash de senha, sem bypass, `mustChange=true` p/ todo primeiro acesso.

- **Login por CPF ou e-mail + senha** — campo aceita ambos; erro sempre genérico "Credenciais inválidas" (não revela existência de conta).
- **Usuários de teste**: CPF `1`/senha `1` = Admin · CPF `2`/senha `2` = Veterinário · CPF `3`/senha `3` = Funcionário. Bypass ativo (prototipação): `mustChange:false` p/ 1/2/3 — ver alerta em `AGENTS.md`; em produção `mustChange=true`.
- **Primeiro acesso (mustChange=true)**: usuários 2 e 3 são obrigados a trocar a senha antes de entrar. Política: 8+ chars, 1 maiúscula, 1 número, 1 especial. Indicadores visuais em tempo real. Mock: flag reseta ao recarregar (sem banco).
- **Recovery demo**: "Esqueci a senha?" → informa CPF ou e-mail → toast "e-mail enviado" (sempre, exista ou não o usuário) → define nova senha com mesma política. Botão fora do `<form>` (evita bloqueio de validação nativa do browser).
- **Admin cria usuários**: aba Usuários → "+ Novo" → exige email obrigatório, valida CPF (dígito verificador), unicidade → gera senha temporária + mustChange=true.
- **Implantação (método do dono)**: sem rota de setup — admin cadastra CPF+e-mail do responsável; 1º acesso exige troca de senha para todos os perfis (admin/vet/func) via `mustChange`.
- **Cargos**: `admin` (acesso total), `veterinario` (módulo clínico + vacinação total `vacinacao_*` + CRUD tipos de vacina `vacina_tipos_*` + quick-add "Outro"), `funcionario` (SEM modo clínico: agendamentos só-leitura + tutor/pet + **editar/arquivar/excluir tutor** (decisão 2026-11-13) + CRUD tipos de raça `raca_tipos_*`). O cargo `gestor` foi **removido**.
- Matriz de permissões: `script.js` **SEÇÃO 2** (~linha 64, `PERMISSOES`).
- **TODO [INTEGRAÇÃO SUPABASE]** (SQL via Supabase, projeto ainda não criado): tabela `users` com `role` vinculado ao CPF/email, Auth Supabase + RLS, `POST /api/login`, `GET /api/me` (ou `supabase.auth.signInWithPassword` + `supabase.from('users')`).

## 4. Mapa de seções (script.js)

| Seção | Linha | Conteúdo |
|---|---|---|
| 1 · DADOS MOCK | ~41 | Arrays simulando banco (agendamentos com `vetId` + datas relativas `isoDeslocado`, pets com espécie/raça/sexo/peso, tutores, `tiposVacina[]`, `racasPorEspecie`, `usuariosMock`) |
| 2 · MATRIZ DE PERMISSÕES (RBAC) | ~140 | `PERMISSOES` por perfil (ver §3: funcionário SEM clínico; vet com vacinação total) |
| 3 · AUTENTICAÇÃO E LOGIN | ~178 | Login por CPF/e-mail, sessão mock (`currentUser`/`currentRole`), logout |
| 4 · TOASTS | ~380 | Notificações `showToast` |
| 5 · NAVEGAÇÃO E TABS | ~423 | `switchTab` (guards RBAC, incl. clínica↔funcionário), `atualizarPermissoesNavegacao`, `atualizarDashboardPorPerfil` |
| 6 · AGENDAMENTOS | ~541 | CRUD/status + `vetId` (dono do atendimento); seções empilhadas Ativos (crescente) + Expirados (`#expirados-table-body`, decrescente, grupos "Últimos 7 dias"/"Este mês"/por mês via `grupoExpirado`); Expirados colapsado (`expiradosExpandido`, `#btn-expandir-expirados`) + pesquisa por selects mês/ano (`#pesquisa-mes-sel`, `#pesquisa-ano-sel`, só leitura p/ todos); mocks com datas relativas (`isoDeslocado`); Concluir, Remarcar (volta pendente), Nova consulta (de concluído), Editar troca data/hora; janela 07h–19h (RF-05); funcionário só-leitura |
| 7 · TUTORES & PETS | ~991 | CRUD de tutores e pets (tutor com `arquivado`: arquivar/restaurar/excluir definitivo; exclusão bloqueada com pets/agenda/histórico; arquivado some dos dropdowns e da lista padrão), dropdowns; RF-02: tel 11 dígitos (`telefoneTem11Digitos`) + máx 10 pets por tutor (`salvarPet`); pet com espécie/raça/sexo em selects (`ESPECIES_PET`, `RACAS_POR_ESPECIE` + `popularRacasPet`, `SEXOS_PET`) + peso kg opcional; card `#racas-card-gerenciar` + `#modal-tipos-raca` |
| 8 · MÓDULO CLÍNICO | ~1219 | Histórico clínico: **receita e vacina** + impressão (**laudo FORA DE ESCOPO** 2026-09-17; **guia FORA DE ESCOPO** 2026-11-13); CRUD de tipos de vacina admin/vet (`tiposVacina[]`, `#modal-tipos-vacina`, `vacina_tipos_*`, item 18); anexos (`renderizarAnexos`, `#anexos-card`); RF-08 ilustrativo (CRMV do logado com fallback mock) |
| 9 · RELATÓRIOS | ~1672 | Relatórios de serviços, tutor e período |
| 10 · USUÁRIOS & PERMISSÕES | ~1870 | Gestão de logins mock (CRUD simulado) |
| 11 · GRÁFICOS (Chart.js) | ~2232 | `financeChart` (receita, admin) + `consultasChart` (barras/hora hoje do vet) + `DADOS_FATURAMENTO`/`atualizarPeriodoFaturamento` |
| 12 · TEMA CLARO/ESCURO | ~2396 | `aplicarTema`, `temaSistema`, `inicializarTema`, `alternarTema`, `atualizarIconeTema` |
| 13 · INICIALIZAÇÃO | ~2480 | `window.onload` (tema, tooltip, permissões, renders, `inicializarPesquisaMes`, gráficos) |

## 5. Pontos-chave em index.html

| Item | Linha (aprox.) | Nota |
|---|---|---|
| Config Tailwind (cores `brand-*`) | `<head>` | brand-dark #03001e · brand-lime #ccff00 · brand-pink #ff007f · brand-blue #0066ff · brand-purple #8b00ff · brand-yellow #ffcc00 |
| Script inline do tema | ~56-64 | Aplica `data-theme` no `<html>` antes do render (evita flash) |
| `#login-screen` | ~72 | Tela de login (neon no escuro; clara sem neon no modo claro — Fase 5 + follow-up §2 2026-09-25: card branco, `#login-cabecalho` com gradiente claro explícito e título de alto contraste, paw-print lima fixo `#ccff00` nos 2 temas, contorno `var(--borda)` + sombra); tooltip claro no modo claro |
| `#modal-tipos-vacina` | clínico (admin/vet) | CRUD de tipos de vacina via card `#tipos-vacina-card-func` na `tab-clinica`; form com modo Adicionar vs Salvar alterações (`modoFormTipoVacina`); selects `#agend-vacina-tipo`/`#clinica-vacina-tipo` dinâmicos (itens 7/18: funcionário sem acesso) |
| `#racas-card-gerenciar` / `#modal-tipos-raca` | clientes (admin/func) | CRUD de tipos de raça por espécie (`racasPorEspecie`, RBAC `raca_tipos_*`, modo Adicionar vs Salvar alterações); selects `#pet-raca`/`#edit-pet-raca` dinâmicos (item 11) |
| `#periodo-faturamento` | dashboard | Filtro mensal/semanal/anual do gráfico + KPI (`atualizarPeriodoFaturamento`, `DADOS_FATURAMENTO`; oculto p/ vet) |
| `#bloco-vet` | dashboard | Só veterinário: Próxima Consulta (`renderizarProximaConsulta`, filtro `vetId`) + `#consultasChart` (barras/hora hoje); financeiro oculto (`atualizarDashboardPorPerfil`, item 16) |
| `#anexos-card` / `#lista-anexos` | clínico | Upload de documentos; temas via vars (`styles.css` §7 + §9 explícito) — legível no claro (ROADMAP §1 item 8) |
| `#btn-mostrar-arquivados` | Tutores & Pets | Alterna tutores arquivados na lista (`alternarTutoresArquivados`); card arquivado ganha selo e ações Restaurar/Excluir definitivo |
| `#doc-print-card` | impressão | Preview acompanha o tema na tela (escuro no modo escuro, §9.2); no papel sai branco (`@media print` §5) |
| `#btn-tema-login` | ~75 | Botão sol/lua no canto sup-dir do header do login (z-[61]) — alterna tema antes do login |
| `#btn-info-login` / `#tooltip-info-login` | login | Botão info roxo-claro + tooltip customizado instantâneo (sem `title=`); texto explica bypass (clicar na barra de CPF/e-mail); toque/Esc via `inicializarTooltipInfoLogin()` (ROADMAP §1 item 6) |
| `#btn-esqueci-senha` | ~120 | Fora do `<form>` (evita bloqueio por campos required); hover roxo via `setProperty` |
| `header` (topbar) | ~130 | Perfil do usuário, `#btn-tema`, logout |
| `nav` (tabs) | ~180 | Botões `#nav-<tab>` |
| Modais sobre login | ~1060+ | `#modal-recuperar-senha` e `#forcar-senha-etapa` com `z-[60]` (acima do login z-50 com backdrop-blur) |
| Demais modais | ~640+ | `#modal-*` com `z-50` (usados pós-login) |

## 6. Temas claro/escuro (importante)
- **Mecanismo**: atributo `data-theme` no `<html>`. Padrão = `prefers-color-scheme` do sistema; escolha manual salva em `localStorage` (chave `dayvet-tema`).
- **Botões de tema**: `#btn-tema` no header (pós-login) e `#btn-tema-login` no canto sup-dir do login (pré-login). Ambos chamam `alternarTema()` e são sincronizados por `atualizarIconeTema()`.
- **Método padrão com variáveis CSS**: edite **apenas os valores das variáveis** nos blocos `:root[data-theme='dark']` (seção 6) e `:root[data-theme='light']` (seção 7) de `styles.css`.
- **Tela de login**: segue o tema ativo — modo claro = card branco sem neon (follow-up §2 entregue 2026-09-25, `styles.css` bloco login claro); modo escuro = neon original. Ícone paw-print em lima padrão `#ccff00` fixo nos 2 temas.
- **`--texto-fraco` refinado** (2026-09-25): `#6b8a9a` → `#5f7887` para contraste AA ≥4.5 sobre branco; demais textos de marca já AA-OK.
- **Paleta atual do modo claro** (aplicada em 2026-09-15):

| Grupo | Variáveis principais | Cores |
|---|---|---|
| Fundos | `--pagina` · `--card` · `--nav-fundo` | #F8FAFC · #FFFFFF · #D9E6F2 |
| Textos | `--texto-primario` · `--texto-suave` | #111827 · #497285 |
| Marca (azul) | `--azul-cheio` | #2F80ED |
| Marca (verde) | `--lime-cheio` | #10B981 |
| Destaque | `--ambar-texto` | #F97316 (laranja/pendente) |
| Bordas | `--borda` · `--elemento` | #DFEBED · #DFEBED |
| Scrollbar | `--trilha` · `--polegar` | #D9E6F2 · #8ecae6 |

## 7. Convenções
- Comentários `// TODO [INTEGRAÇÃO SUPABASE]:` (antes `TODO [INTEGRAÇÃO BANCO DE DADOS FUTURA]`) marcam os pontos de plugar o Supabase SQL.
- Nomes de funções/variáveis em **pt-BR**; código organizado em **SEÇÕES numeradas**.
- Relatórios pessoais (metodologia/commit) ficam na pasta `local/` — **não versionar**, assim como `opencode.json`.
- Validação mínima antes de concluir: `node tests/estatico.mjs` + `node tests/unit/regras.mjs` + `node tests/regressao/run.mjs` + `node tests/e2e.mjs` (Chromium e, quando aplicável, `firefox`) + testar logins 1/2/3 e alternância de tema. Regras puras de negócio ficam em `dayvet/regras.js` (testáveis em node); toda correção gera `tests/regressao/NN-*.mjs`.