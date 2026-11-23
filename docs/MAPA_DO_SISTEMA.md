# MAPA DO SISTEMA — DayVet-Gestão

> Referência para IAs e colaboradores editarem o código com contexto.
> Última revisão: 23/11/2026 · `origin/main`=`0902ec5`. A integração de dados está publicada na Vercel em modo Supabase real; migrations `0001..0006` estão aplicadas e `admin-criar-usuario` implantada.
> Smoke real confirmou Auth/RBAC, persistência após reload para tutor, pet, agendamento e documento clínico. Dados sintéticos de QA permanecem na produção (2 tutores, 3 pets, 4 agendamentos, 2 registros clínicos; identificados com `TESTE`, não remover). As correções de rolagem do login e filtro mensal foram mescladas e publicadas; validação completa inclui Postgres 17, E2E Chromium/Firefox e smoke publicado 13/13. Detalhes em `ROADMAP.md` §2.b e no topo do `CHANGELOG.md`.
> Atenção: números de linha são referências — confirme antes de editar.
> A correção de contagem/taxa por período e filtro imediato do histórico está validada na branch `teste`, mas ainda não publicada.

## 0. Links e deploy (espelho fixo da main)

- **Produção (espelho fixo da `main`): https://ralph-zlt.github.io/Agendau_2/dayvet/**
- Workflow `.github/workflows/deploy-pages.yml` dispara **somente em `push` na `main`**; publica `site/index.html` → `dist/index.html` + `dayvet/*` → `dist/dayvet/`.
- **Nunca publicar a branch `teste` neste link.** Teste roda local (`dayvet/index.html`); merge na `main` só após validação do dono.
- Itens 18–22 estão no baseline `origin/main` (`0902ec5`). A integração D/E e as correções de login/dashboard foram mescladas e publicadas em 23/11/2026.
- **Vercel:** https://agendau-2.vercel.app; deployment `DPPCbXRiVGjPjCs5nbQhF63XJCyJ` da `main` `0902ec5` Ready, assets retornam 200 e a SPA carrega dados reais do Supabase. A integração Git segue bloqueada; novas publicações usam a trava de `scripts/deploy-vercel.sh`.

## 1. Visão geral
- SPA (single-page application) de agenda para **pet shop / clínica veterinária**.
- **Backend: Supabase** — `script.js` usa `MODO_DADOS='real'` e `DayVetPersistencia` após autenticação. Migrations `0001..0006` estão aplicadas no projeto remoto; o banco foi validado em Postgres 17 na VPS e `admin-criar-usuario` foi implantada com JWT obrigatório. O smoke autenticado real cobriu cadastro/edição de tutor, reload e rejeição de CPF inválido; não indica, por si só, que os outros fluxos/perfis já foram validados.
- **Stack**: HTML + CSS + JS puros com CDNs externas — Tailwind CSS, Lucide, Chart.js, Google Fonts (Plus Jakarta Sans) e Supabase JS/Auth/Database/Storage.
- Produto em `dayvet/` com HTML, CSS, JS, configuração pública e adaptadores de persistência.

## 2. Estrutura de arquivos

| Arquivo | Papel | Observações |
|---|---|---|
| `dayvet/index.html` | Estrutura/marcação (SPA) | <head> com config Tailwind + cores de marca; tela de login; header; nav de tabs; seções `<section id="tab-...">`; modais `#modal-*`; CDNs |
| `dayvet/styles.css` | Estilo (seções) | Base, scrollbar, neon, glass, impressão, **sistemas de tema escuro/claro** |
| `dayvet/script.js` | Lógica (seções 0–13) | Seção 0: cliente Supabase, modo real, carregamento, sessão/Auth e escaping HTML; depois RBAC, renderização e CRUD de agenda, tutores/pets, clínica, relatórios, usuários, gráficos e tema. Histórico inicia no mês atual, reage aos selects e pode ser limpo para todos os períodos. CPF de tutor passa por `validarCPF()` e `RegrasLogin.formatarCpf()` antes da gravação |
| `dayvet/persistencia.js` | Adaptadores Supabase | Leitura paginada, mapeamento do schema v2, filtros de carregamento por perfil e serialização de tutores/pets/agendamentos/histórico |
| `dayvet/config.js` | Config pública do Supabase | `supabaseUrl` + chave `anon`/publishable; carregado pelo `index.html`. A `service_role` nunca entra aqui |
| `supabase/migrations/` | Schema, seed, RLS, Auth e expansões (6 migrations locais) | `0001..0006` confirmadas no projeto Supabase remoto |
| `scripts/deploy-vercel.sh` | Deploy de produção na Vercel | Monta o artefato em `/tmp` e publica; a integração Git da Vercel está bloqueada |
| `dayvet/regras.js` | Regras puras (sem DOM) | `RegrasTutor`: `podeArquivarTutor`, `podeExcluirTutor`, `tutoresSelecionaveis`; testável em node e usada pelo `script.js` |
| `tests/` | Testes do projeto | `estatico.mjs`, `unit/regras.mjs`, `e2e.mjs` (Playwright) e `regressao/NN-*.mjs` + `run.mjs` |
| `docs/requisitos-funcionais-dayvet.docx` | Requisitos (fonte de RFs/RNFRs/RNFS) | RF-01–RF-10 + RNFS; sincronizado com o código na v2; frontend/temas fora (só roadmap). RF-09 e RF-10 marcados FORA DE ESCOPO |
| `docs/DB_LEVANTAMENTO.md` | Levantamento conceitual do banco | Referência histórica; status operacional atualizado no cabeçalho, schema efetivo em `supabase/migrations/` |
| `docs/levantamento-bd.md` | Levantamento detalhado + receita de migração | Extraído do PDF de 2026-11-02; base do schema multi-clinic |
| `docs/sql/*.sql` | SQL legado, não usar para migrations atuais | Esboços de 2026-11-02; schema efetivo está em `supabase/migrations/` |

## 3. Autenticação e perfis (RBAC)

> ⚠️ **RISCO ALTO DE SEGURANÇA — SOMENTE PROTOTIPAÇÃO:** contas 1/2/3 entram sem senha válida e sem troca obrigatória. REMOVER `perfisTestes`, `password_demo` e qualquer bypass antes da implantação. Em produção: hash de senha, sem bypass, `mustChange=true` p/ todo primeiro acesso.
> **Decisão do dono (2026-11-13):** o bypass **fica durante os testes**. Ele foi tornado explícito: o card `#acessos-teste` na tela de login tem 3 botões (Admin / Veterinário / Funcionário) que **preenchem CPF + senha** e deixam o usuário confirmar em "Acessar o Painel" (`preencherAcessoTeste()` → `ACESSOS_TESTE`). O atalho digitado 1/2/3 continua funcionando.

- **Login por usuário, CPF ou e-mail + senha** — RPC `resolver_login(text)` resolve o e-mail; `signInWithPassword` valida a senha; o perfil é lido de `public.usuarios` com RLS. Erro de credenciais é genérico e contas inativas/excluídas não autenticam.
- **Usuários de teste** (decisão do dono 2026-11-17): o campo de login aceita **usuário, CPF (com/sem máscara) ou e-mail**, comparados pela regra pura `RegrasLogin` de `dayvet/regras.js`:

| Perfil | Usuário | Senha | CPF | CRM |
|---|---|---|---|---|
| Admin — Raphael Dias | `raphael_dias` | `Veterin@ria` | `111.111.111-11` | — |
| Veterinário — Dra. Laís | `lais_vet` | `Veterin@ria` | `222.222.222-22` | `CRMV-SP 00000` |
| Funcionário — Douglas | `douglas_funcionario` | `Veterin@ria` | `333.333.333-33` | — |

  Os botões de `#acessos-teste` preenchem **usuário + senha** e passam pelo Auth real; digitar `1`/`2`/`3` ainda usa o bypass `perfisTestes` (decisão do dono, somente enquanto durar a prototipação). As 3 contas de demonstração mantêm `must_change=false`; novos usuários devem trocar a senha no primeiro acesso.
- **Primeiro acesso (`mustChange=true`)**: novos usuários são obrigados a trocar a senha via Auth; política: 8+ chars, 1 maiúscula, 1 número, 1 especial. As 3 contas de demonstração são a exceção autorizada.
- **Recovery**: "Esqueci a senha?" resolve usuário/CPF/e-mail, solicita link via Supabase Auth e atualiza senha/flag de primeiro acesso; mensagens não revelam se o usuário existe. O botão fica fora do `<form>` para evitar bloqueio por validação nativa.
- **Admin cria usuários**: aba Usuários → "+ Novo" → valida email/CPF e chama Edge Function `admin-criar-usuario`, que cria Auth + perfil e define troca obrigatória. A função precisa ser validada no deploy junto às migrations.
- **Implantação (método do dono)**: sem rota de setup — admin cadastra CPF+e-mail do responsável; 1º acesso exige troca de senha para todos os perfis (admin/vet/func) via `mustChange`.
- **Cargos**: `admin` (acesso total), `veterinario` (módulo clínico + vacinação total `vacinacao_*` + CRUD tipos de vacina `vacina_tipos_*` + quick-add "Outro"), `funcionario` (SEM modo clínico: agendamentos só-leitura + tutor/pet + **editar/arquivar/excluir tutor** (decisão 2026-11-13) + CRUD tipos de raça `raca_tipos_*`). O cargo `gestor` foi **removido**.
- Matriz de permissões: `script.js` **SEÇÃO 2** (~linha 64, `PERMISSOES`).
- **Fase C (Auth) concluída no baseline:** login, recovery, restauração de sessão e atualização de senha usam Supabase Auth.
- **Fases D/E no worktree:** tabelas operacionais, clínico, catálogos, usuários e Storage têm integração no frontend. Banco e migrations foram validados; o smoke real de tutor passou e os dados de teste foram removidos. Ainda é necessário validar os demais fluxos/perfis, rodar a suíte E2E e só então preparar deploy pela `main`.

## 4. Mapa de seções (script.js)

| Seção | Linha | Conteúdo |
|---|---|---|
| 1 · DADOS INICIAIS | ~41 | Estruturas iniciais para catálogo/estado; após Auth os dados autorizados são carregados do Supabase. Os exemplos de demonstração não são fonte de persistência |
| 2 · MATRIZ DE PERMISSÕES (RBAC) | ~140 | `PERMISSOES` por perfil (ver §3: funcionário SEM clínico; vet com vacinação total) |
| 3 · AUTENTICAÇÃO E LOGIN | ~178 | Login por usuário/CPF/e-mail, sessão Supabase, recuperação/troca de senha e logout |
| 4 · TOASTS | ~380 | Notificações `showToast` |
| 5 · NAVEGAÇÃO E TABS | ~423 | `switchTab` (guards RBAC, incl. clínica↔funcionário), `atualizarPermissoesNavegacao`, `atualizarDashboardPorPerfil` |
| 6 · AGENDAMENTOS | ~541 | CRUD/status + `vetId` (dono do atendimento); seções Ativos/Expirados e filtros por mês/ano; Concluir, Remarcar, Nova consulta e Editar; validação horária conforme configuração persistida; funcionário só-leitura |
| 7 · TUTORES & PETS | ~991 | CRUD de tutores e pets (tutor com `arquivado`: arquivar/restaurar/excluir definitivo; exclusão bloqueada com pets/agenda/histórico; arquivado some dos dropdowns e da lista padrão), dropdowns; RF-02: tel 11 dígitos (`telefoneTem11Digitos`) + máx 10 pets por tutor (`salvarPet`); pet com espécie/raça/sexo em selects (`ESPECIES_PET`, `RACAS_POR_ESPECIE` + `popularRacasPet`, `SEXOS_PET`) + peso kg opcional; card `#racas-card-gerenciar` + `#modal-tipos-raca` |
| 8 · MÓDULO CLÍNICO | ~1219 | Histórico clínico: **receita e vacina** + impressão (**laudo FORA DE ESCOPO** 2026-09-17; **guia FORA DE ESCOPO** 2026-11-13); CRUD de tipos de vacina admin/vet (`tiposVacina[]`, `#modal-tipos-vacina`, `vacina_tipos_*`, item 18); anexos (`renderizarAnexos`, `#anexos-card`); RF-08 ilustrativo — assinatura por `RegrasTutor.assinaturaDocumento`: **nome e CRMV sempre da mesma pessoa**; admin/funcionário (sem CRMV) não assina, assina o vet de referência (regressão 03) |
| 9 · RELATÓRIOS | ~1672 | Relatórios de serviços, tutor e período |
| 10 · USUÁRIOS & PERMISSÕES | ~1870 | Gestão de usuários com Supabase Auth/Edge Function; permissões por RBAC |
| 11 · GRÁFICOS (Chart.js) | ~2232 | `financeChart` (receita, admin) + `consultasChart` (barras/hora hoje do vet) + `DADOS_FATURAMENTO`/`atualizarPeriodoFaturamento` |
| 12 · TEMA CLARO/ESCURO | ~2396 | `aplicarTema`, `temaSistema`, `inicializarTema`, `alternarTema`, `atualizarIconeTema` |
| 13 · INICIALIZAÇÃO | ~2480 | `window.onload` (tema, tooltip, permissões, renders, `inicializarPesquisaMes`, gráficos) |

## 5. Pontos-chave em index.html

| Item | Linha (aprox.) | Nota |
|---|---|---|
| Config Tailwind (cores `brand-*`) | `<head>` | brand-dark #03001e · brand-lime #ccff00 · brand-pink #ff007f · brand-blue #0066ff · brand-purple #8b00ff · brand-yellow #ffcc00 |
| Script inline do tema | ~56-64 | Aplica `data-theme` no `<html>` antes do render (evita flash) |
| `#login-screen` | ~72 | Tela de login (neon no escuro; clara sem neon no modo claro — Fase 5 + follow-up §2 2026-09-25: card branco, `#login-cabecalho` com gradiente claro explícito e título de alto contraste, paw-print lima fixo `#ccff00` nos 2 temas, contorno `var(--borda)` + sombra); permite rolagem vertical se o cartão exceder a janela |
| `#modal-tipos-vacina` | clínico (admin/vet) | CRUD de tipos de vacina via card `#tipos-vacina-card-func` na `tab-clinica`; form com modo Adicionar vs Salvar alterações (`modoFormTipoVacina`); selects `#agend-vacina-tipo`/`#clinica-vacina-tipo` dinâmicos (itens 7/18: funcionário sem acesso) |
| `#racas-card-gerenciar` / `#modal-tipos-raca` | clientes (admin/func) | CRUD de tipos de raça por espécie (`racasPorEspecie`, RBAC `raca_tipos_*`, modo Adicionar vs Salvar alterações); selects `#pet-raca`/`#edit-pet-raca` dinâmicos (item 11) |
| `#periodo-faturamento` / `#mes-faturamento` | dashboard | Filtro semanal/anual e mensal por mês escolhido; faturamento, contagem e taxa usam o mesmo intervalo; pets/tutores são totais gerais (tutores ativos); valores são de agendamentos confirmados/concluídos, não pagamentos |
| `#bloco-vet` | dashboard | Só veterinário: Próxima Consulta (`renderizarProximaConsulta`, filtro `vetId`) + `#consultasChart` (barras/hora hoje); financeiro oculto (`atualizarDashboardPorPerfil`, item 16) |
| `#anexos-card` / `#lista-anexos` | clínico | Upload de documentos; temas via vars (`styles.css` §7 + §9 explícito) — legível no claro (ROADMAP §1 item 8) |
| `#btn-mostrar-arquivados` | Tutores & Pets | Alterna tutores arquivados na lista (`alternarTutoresArquivados`); card arquivado ganha selo e ações Restaurar/Excluir definitivo |
| `#doc-print-card` | impressão | Preview acompanha o tema na tela (escuro no modo escuro, §9.2); no papel sai branco (`@media print` §5) |
| `#btn-tema-login` | ~75 | Botão sol/lua no canto sup-dir do header do login (z-[61]) — alterna tema antes do login |
| `#acessos-teste` + `preencherAcessoTeste(role)` | login | Card "Acesso rápido de teste" com 3 botões (Admin/Veterinário/Funcionário); preenchem `#login-cpf` e `#login-password` a partir de `ACESSOS_TESTE` e escrevem o status em `#acessos-teste-status` (decisão 2026-11-13) |
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
- Comentários `// TODO [INTEGRAÇÃO SUPABASE]:` marcam pendências localizadas; não significam que toda a persistência ainda esteja ausente.
- Nomes de funções/variáveis em **pt-BR**; código organizado em **SEÇÕES numeradas**.
- Relatórios pessoais (metodologia/commit) ficam na pasta `local/` — **não versionar**, assim como `opencode.json`.
- Validação mínima antes de concluir: `node tests/estatico.mjs` + `node tests/unit/regras.mjs` + `node tests/unit/persistencia.mjs` + `node tests/regressao/run.mjs` + `node tests/e2e.mjs` (Chromium e, quando aplicável, `firefox`) + testar logins 1/2/3 e alternância de tema. Regras puras de negócio ficam em `dayvet/regras.js` (testáveis em node); persistência e autorização por perfil em `dayvet/persistencia.js`.