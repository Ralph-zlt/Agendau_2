# CHANGELOG — DayVet-Gestão

> Histórico das alterações **desde o código original**, com o que mudou, por quê e onde.
> Última entrada no topo. Mantenha atualizado a cada commit.
> Fonte histórica: `git log` do repositório (Agendau_2 / Proj_Integrador_DAY_VET_1.0).

## Como manter
A cada commit, adicione no topo: **data · hash · resumo (o que / por quê / onde mexer)**. Mantenha entradas compactas.

---

## 2026-10-16 · (teste) — Botão "Agendar Vacinação" p/ admin + veterinário
**O que:** rótulo `Solicitar Vacinação` → "Agendar Vacinação" (id/onclick mantidos); visibilidade `currentRole === 'admin'` → `temPermissao('vacinacao_agendar')`, liberando o botão ao veterinário; funcionário segue sem ver (só-leitura).
**Por quê:** pedido do dono — padronizar nome com o título do modal e dar a opção ao veterinário.
**Onde:** `dayvet/index.html` (`btn-solicitar-vacinacao`), `dayvet/script.js` (regra de visibilidade + comentário).
**Validações:** node --check OK; IDs/handlers OK; manual pendente (login 1 e 2 veem o botão, login 3 não).

---

## 2026-10-16 · (teste) — Título dinâmico do modal de agendamento
**O que:** `Solicitar Vacinação` abre o modal como "Agendar Vacinação"; `Agendar Consulta` mantém "Agendar Consulta"; `marcarNovaConsulta` herda o título do serviço de origem; edição/remarcação inalteradas.
**Por quê:** pedido do dono — ambos os botões abriam com o mesmo título "Agendar Consulta".
**Onde:** `dayvet/script.js` (`abrirModalSolicitarAgendamento`, `marcarNovaConsulta`).
**Validações:** node --check OK; IDs/handlers OK; chaves balanceadas; lógica /vacin/i testada (Vacinação→Vacinação, Consulta→Consulta).

---

## 2026-09-25 · (teste) — Auditoria de contexto p/ outra IA (só docs)
**O que:** ROADMAP (data, estado branches, itens 8–17 → main, 18 → teste, textos 11/12/17, Baixa baixada); MAPA (revisão, fila, linhas SEÇÃO 2–13, RBAC item 18, vetId/dashboard, remove linhas mortas `painel-vet-hoje`/`filtro-data-ag`, bypass mustChange); AGENTS (RBAC vigente, fallback skill inexistente, `--login-*`); DB (`vacina_tipos`/`raca_tipos` futuras, regra confirmar); CHANGELOG (item 18 no topo).
**Por quê:** pedido do dono — deixar contexto completo p/ outra IA sem esta sessão.
**Onde:** `ROADMAP.md`, `AGENTS.md`, `docs/MAPA_DO_SISTEMA.md`, `docs/DB_LEVANTAMENTO.md`, `docs/CHANGELOG.md` (zero código).

---

## 2026-09-25 · (teste) — Item 18: vacinas admin/vet, funcionário fora do clínico
**O que:** `vacina_tipos_criar/editar/excluir` p/ veterinário (total em vacinação); funcionário perde `clinica_*` + `vacina_tipos_*` (aba Módulo Clínico oculta + guard em `switchTab`; mantém só-leitura em agendamentos, tutor/pet e raças); card/modal de vacina agora admin+vet.
**Por quê:** decisão do dono — toda interação com vacina é do admin/veterinário.
**Onde:** `dayvet/script.js` (SEÇÃO 2 RBAC, `podeClinica`, guard `switchTab`), `dayvet/index.html` (textos), `ROADMAP.md` (item 7 superseded + item 18), `docs/MAPA_DO_SISTEMA.md`.
**Validações:** python: IDs/handlers OK, blocos balanceados; manual pendente (login 3 sem aba Clínica; login 2 gerencia vacinas).

---

## 2026-09-25 · (teste) — Follow-up: vet sem ações em vacinação + histórico maior
**O que:** veterinário ganha `vacinacao_editar/cancelar/confirmar` (linhas de Vacinação mostravam "Sem ações disponíveis"); mocks 207–209 (concluído mês passado, concluído/cancelado em março/2026) p/ popular os grupos por mês.
**Por quê:** follow-ups do dono (paridade vet em vacinação; exemplo de histórico maior).
**Onde:** `dayvet/script.js` (SEÇÃO 2 RBAC, SEÇÃO 1 mocks), `docs/MAPA_DO_SISTEMA.md`.
**Validações:** python: IDs/handlers OK, blocos balanceados; manual pendente (login 2 age em vacinações; grupos mensais).

---

## 2026-09-25 · (teste) — Fix pesquisa: selects mês/ano (sem digitar)
**O que:** `<input type=month>` trocado por selects `#pesquisa-mes-sel`/`#pesquisa-ano-sel` (populados via `inicializarPesquisaMes`, padrão = mês atual); Buscar filtra, Limpar restaura.
**Por quê:** follow-up do dono — o campo nativo não abria seleção; pesquisa é só por escolha, nada digitado.
**Onde:** `dayvet/index.html`, `dayvet/script.js`, `docs/MAPA_DO_SISTEMA.md`.
**Validações:** python: IDs/handlers OK; manual pendente.

---

## 2026-09-25 · (teste) — Item 17: Expirados colapsado + pesquisa mês/ano
**O que:** histórico abre só com Últimos 7 dias + "Carregar mais antigas" (expande este mês/meses, vira "Mostrar menos"); `<input type="month">` filtra por `AAAA-MM` com botão Limpar; counter contextual; funcionário pesquisa sem ações (só leitura).
**Por quê:** pedido do dono (colapsado progressivo + pesquisa, todos os perfis).
**Onde:** `dayvet/script.js` (SEÇÃO 6 estado+filtros), `dayvet/index.html` (input, botões), `ROADMAP.md` (item 17), `docs/MAPA_DO_SISTEMA.md`.
**Validações:** python: IDs/handlers OK, blocos balanceados; manual pendente (colapsado, expandir, pesquisar 2026-08/2026-03, login 3, 2 temas).

---

## 2026-09-25 · (teste) — Item 16: dashboard do vet sem financeiro
**O que:** `vetId` nos agendamentos (mocks → u2; novo registro grava `currentUser.id`); `atualizarDashboardPorPerfil()` — vet não vê Faturamento/Receita, vê Próxima Consulta (`renderizarProximaConsulta`, filtro vetId, empty state) + barras/hora consultas × vacinações de hoje (`inicializarConsultasChart`); admin intacto.
**Por quê:** pedido do dono — dashboard operacional p/ veterinário.
**Onde:** `dayvet/script.js` (SEÇÃO 1 `vetId`, SEÇÃO 11 dashboard), `dayvet/index.html` (`#bloco-vet`, `#consultasChart`, `#dash-titulo/subtitulo`), `ROADMAP.md` (item 16), `docs/MAPA_DO_SISTEMA.md`, `docs/DB_LEVANTAMENTO.md` (§1.5).
**Validações:** python: IDs/handlers OK, blocos balanceados; manual pendente (login 2 sem financeiro + próxima/chart; login 1 intacto; 2 temas).

---

## 2026-09-25 · (teste) — Item 15: Expirados em 3 faixas
**O que:** grupos "Últimos 7 dias" / "Este mês" / um por mês (`grupoExpirado` + `nomeMesAno`, `MESES_PT`).
**Por quê:** refinamento do dono sobre o item 14.
**Onde:** `dayvet/script.js` (SEÇÃO 6), `ROADMAP.md` (item 15).
**Validações:** python OK; manual pendente (grupos por data).

---

## 2026-09-25 · (teste) — Item 14: Ativos × Expirados empilhados
**O que:** duas tabelas uma abaixo da outra (Ativos crescentes; Expirados decrescentes com grupos "Últimos 7 dias"/"Mais antigos"); ações por status (concluído→Nova consulta, cancelado→Remarcar, pendente vencido→Remarcar/Cancelar/Editar); mocks com datas relativas (`isoDeslocado`: 4 ativos + cancelado/concluído de exemplo).
**Por quê:** pedido do dono (seções empilhadas, ações por status, histórico dividido por data, exemplos ativos).
**Onde:** `dayvet/script.js` (SEÇÃO 1 mocks, SEÇÃO 6 `linhaAgendamento`/`marcarNovaConsulta`), `dayvet/index.html` (2 tabelas, `#expirados-counter`), `ROADMAP.md` (item 14), `docs/MAPA_DO_SISTEMA.md`.
**Validações:** python: IDs/handlers OK, blocos balanceados; manual pendente (fluxos por status, grupos 7 dias, 2 temas).

---

## 2026-09-25 · (teste) — Item 13: tipos criar/editar + aba Expirados
**O que:** (1) modais vacina/raça com modo Adicionar ("Adicionar vacina/raça") vs edição ("Salvar alterações" + Cancelar edição); (2) vistas Ativos/Expirados (`#vista-ag-*`, `agExpirado`: vencidos+cancelados+concluídos), badge Concluído, botão Concluir (perm do Confirmar), Remarcar (volta pendente, exige data futura), Editar permite remarcar, filtro Concluídos.
**Por quê:** pedido do dono (intuitividade dos gerenciadores; expirados separados com remarcar/concluir).
**Onde:** `dayvet/script.js` (SEÇÃO 6 vistas/status/remarcar, modos de form), `dayvet/index.html` (segmented, filtro, botões dos modais), `ROADMAP.md` (item 13), `docs/MAPA_DO_SISTEMA.md` (status `concluido` já no `DB_LEVANTAMENTO.md`).
**Validações:** python: IDs/handlers OK, blocos balanceados; manual pendente (vencer, concluir, cancelar→expirados, remarcar→sobe, funcionário sem ações, 2 temas).

---

## 2026-09-25 · (teste) — Item 12: vet agenda vacinação + quick-add "Outro"
**O que:** `vacinacao_agendar` p/ veterinário; `#agend-vacina-novo-bloco` no modal (aparece se tipo "Outro") — novo nome informado entra no catálogo na hora, vazio mantém "Outro"; catálogo segue do funcionário/admin.
**Por quê:** pedido do dono — vet agendava vacinação antes; atalho opcional sem tirar a gerência do funcionário.
**Onde:** `dayvet/script.js` (SEÇÃO 2 RBAC, `atualizarVisibilidadeVacinaAg`, `salvarAgendamento`), `dayvet/index.html` (`#agend-vacina-novo-nome`), `ROADMAP.md` (item 12), `docs/MAPA_DO_SISTEMA.md`.
**Validações:** python: IDs/handlers OK, blocos balanceados; manual pendente (login 2 agenda Vacinação, testa Outro com/sem novo nome, login 3 segue sem agendar).

---

## 2026-09-25 · (teste) — Item 11: CRUD raças + paridade admin + fix faturamento
**O que:** (1) raças mutáveis (`racasPorEspecie[]`, `#modal-tipos-raca` com filtro por espécie, RBAC `raca_tipos_*`, card `#racas-card-gerenciar` na aba Tutores & Pets); (2) paridade admin — toggles por `temPermissao` (admin alcança tipos de vacina e raça; vet segue só-listando); (3) `atualizarPeriodoFaturamento()` implementado (`DADOS_FATURAMENTO` mensal/semanal/anual + KPI `#kpi-faturamento-nota`; antes a função não existia).
**Por quê:** pedido do dono (funcionário gerencia raças como vacinas; tudo do funcionário o admin também pode) + bug do filtro de faturamento.
**Onde:** `dayvet/script.js` (SEÇÃO 2 RBAC, SEÇÃO 7 raças, SEÇÃO 11 gráficos), `dayvet/index.html` (card, modal, `id="kpi-faturamento-nota"`), `ROADMAP.md` (item 11), `docs/MAPA_DO_SISTEMA.md`, `docs/DB_LEVANTAMENTO.md`, `docs/CHANGELOG.md`.
**Validações:** python: IDs/handlers OK, blocos balanceados; manual pendente (CRUD raças como 1 e 3, vet sem cards, filtro mensal/semanal/anual, 2 temas).

---

## 2026-09-25 · (teste) — ROADMAP §1 item 10: pet com espécie/raça/sexo/peso
**O que:** espécie vira select (Canino, Felino, Equino, Bovino, Suíno, Ovino, Outro), raça vira select por espécie (`RACAS_POR_ESPECIE` + "Outra", `popularRacasPet()`), sexo (Macho/Fêmea), peso kg opcional (>0); mocks migrados (Rex Canino/Macho/32.5kg, Mingau Felino/Fêmea/4.2kg — fim de "Cachorro"/"Gato"); cards exibem raça · sexo · peso.
**Por quê:** próximo passo pedido pelo dono (cadastro de pet completo).
**Onde:** `dayvet/script.js` (SEÇÃO 1 catálogos+mocks, SEÇÃO 7 CRUD), `dayvet/index.html` (`#modal-pet`, `#modal-editar-pet`), `ROADMAP.md` (item 10), `docs/MAPA_DO_SISTEMA.md`, `docs/DB_LEVANTAMENTO.md` (§1.4).
**Validações:** python: IDs/handlers OK, blocos balanceados, zero "Cachorro"/"Gato"/"Ave"; manual pendente (criar pet por espécie, peso vazio/negativo, edição, 2 temas).

---

## 2026-09-25 · (teste) — Preview de impressão acompanha o tema
**O que:** `#doc-print-card` (só tela, `@media screen`): no modo escuro o documento abre em card escuro (`#0a0029`, textos/botões adaptados) em vez do estouro branco; no papel continua branco (`@media print` §5 intacto).
**Por quê:** follow-up do dono — ao clicar em imprimir no modo escuro, a tela ficava toda clara.
**Onde:** `dayvet/index.html` (`id="doc-print-card"`), `dayvet/styles.css` (§9.2).
**Validações:** python: 130 IDs OK, 47 handlers OK; manual pendente (imprimir nos 2 temas + conferência do papel).

---

## 2026-09-25 · (teste) — Fix item 7 (acesso funcionário) + header login todo claro
**O que:** (A) novo card `#tipos-vacina-card-func` na `tab-clinica` (estética clínica, visível só p/ funcionário via `!podeCriarClinico && temPermissao('vacina_tipos_criar')`); removidos os 2 botões antigos inalcançáveis (form clínico oculto + modal bloqueado p/ funcionário); count do card sincronizado em `renderizarTiposVacina()`. (B) `#login-cabecalho` com gradiente claro explícito (`#D9E6F2→#FFFFFF→#EDE9FE`, sem roxo forte), título `#0f172a`/`--lime-texto`, subtítulo `--pink-texto`, `#btn-tema-login` visível no claro, contorno do card `var(--borda)` + `var(--sombra-2xl)`; escuro intocado.
**Por quê:** follow-ups do dono — funcionário não alcançava o CRUD de tipos (bug) e "DayVet-Gestão" se confundia com o fundo no claro + contorno.
**Onde:** `dayvet/index.html` (card func, `id="login-cabecalho"`, remoção botões), `dayvet/script.js` (toggle + count), `dayvet/styles.css` (§9.1), `docs/MAPA_DO_SISTEMA.md`.
**Validações:** python: 130 IDs OK, 47 handlers OK, blocos balanceados; manual pendente (login 3 vê card e faz CRUD; login claro com hard refresh).

---

## 2026-09-25 · (teste) — ROADMAP §1 itens 7–9 + §2 Baixa completa
**O que:** (7) CRUD de tipos de vacina restrito ao funcionário (`tiposVacina[]` mutável no lugar do `TIPOS_VACINA` fixo, modal `#modal-tipos-vacina`, RBAC `vacina_tipos_*`, vet/admin só listam); (8) card de anexos nos 2 temas (bloco explícito `styles.css` §9 com vars + mapeamentos §7, legível no claro); (9) funcionário só-leitura em agendamentos (removidos `consulta/vacinacao agendar+editar+cancelar`, guards em abrir/editar/status/salvar). Baixa: login claro acompanha o tema (card branco, ícone paw lima fixo `#ccff00` nos 2 temas, tooltip claro), `--texto-fraco` escurecido p/ contraste AA (4.64), RF-02 (tel 11 dígitos + máx 10 pets), RF-05 (janela 07h–19h com `min/max` + validação JS), RF-08 prep (CRMV do logado com fallback mock, selo DEMONSTRAÇÃO mantido).
**Por quê:** ROADMAP §1 (7, 8, 9) + §2 Baixa (pedido do dono: tudo exceto §3 Futuras — Supabase/LGPD/bypass intocados).
**Onde:** `dayvet/script.js` (SEÇÃO 2 RBAC, SEÇÃO 6 guards+janela, SEÇÃO 7 RF-02, SEÇÃO 8 tiposVacina/anexos/RF-08), `dayvet/index.html` (botões gerenciar tipos, modal tipos, `maxlength`/placeholders tel, `min/max` hora), `dayvet/styles.css` (§7 `--texto-fraco`, §9 anexos, login claro + ícone fixo), `docs/MAPA_DO_SISTEMA.md`.
**Validações:** sem node no ambiente — python: 129 IDs OK, 47 handlers OK, `{}/()/[]` balanceados, modais login em `z-[60]` OK; teste de navegador pendente (perfis 1/2/3, temas, CRUD tipos como funcionário, funcionário sem botões de agendamento, login claro, tel/hora).

---

## 2026-09-24 · (docs) — Merge teste→main (item 6) + follow-ups de estilização do login claro
**O que:** merge fast-forward `teste`→`main` (item 6, validado pelo dono). ROADMAP §1: item 6 marcado entregue; §2 com 2 follow-ups novos (bloco do login mais escuro no modo claro — revisar p/ acompanhar o claro; ícone do DayVet muda de cor entre temas — fixar cor única padrão).
**Por quê:** pedido do dono — subir o commit validado + registrar pendências de estilização para continuar o projeto depois.
**Onde:** `main` (merge da `teste`), `ROADMAP.md`, `docs/CHANGELOG.md`.

---

## 2026-09-24 · (teste) — ROADMAP §1 item 6: tooltip instantâneo do login + botão info roxo claro
**O que:** `#btn-info-login` sem `title=` nativo + `span#tooltip-info-login[role=tooltip]` com exibição imediata no hover/foco (CSS `duration-75`, sem delay) e toque/Esc via `inicializarTooltipInfoLogin()`; texto concatenado (identificação por CPF/e-mail + bypass: clicar na barra de CPF/e-mail e escolher acesso temporário); botão em roxo claro (`#C084FC` sobre `purple-500/15`, hover `#E9D5FF`) com anel de foco; estilos em `styles.css` §8 com vars `--login-*` no claro.
**Por quê:** ROADMAP §1 item 6 (pedido do dono: tooltip instantâneo explicando o bypass + botão chamativo roxo-claro).
**Onde:** `dayvet/index.html` (`#btn-info-login`, `#tooltip-info-login`), `dayvet/styles.css` (§8), `dayvet/script.js` (`inicializarTooltipInfoLogin`), `docs/MAPA_DO_SISTEMA.md` (§5).
**Validações:** sem node no ambiente — python: 123 IDs OK, 33 onclick OK, `title=` removido, modais login em `z-[60]` OK; teste de navegador pendente (hover <100ms, Tab/Esc, toque mobile, temas claro/escuro, logins 1/2/3).

---

## 2026-09-22 · (docs) — Merge teste→main + ressalvas 6–9 em Próximas
**O que:** merge fast-forward `teste`→`main` (itens 1–5, validado em teste manual pelo dono — exceção ao fluxo padrão). ROADMAP §1: itens 1–5 marcados entregues + itens 6–9 novos (tooltip instantâneo; "Módulo clínico" do funcionário p/ CRUD de vacinas; anexos nos 2 temas; funcionário só-leitura em agendamentos).
**Por quê:** publicar itens validados no Pages + registrar ressalvas; fluxo padrão volta a valer (teste → valida → merge).
**Onde:** `main`, `ROADMAP.md`, `docs/CHANGELOG.md`.

---

## 2026-09-22 · (teste) — ROADMAP §1 implementado (itens 1–5)
**O que:** (1) login autocomplete temporário admin/vet/fun (`#login-sugestoes`, `preencherLoginTemporario`, botão info, hint 1/2/3 removida); (2) tutor por CPF como PK (`tutorCpf` em tutores/pets/agendamentos/historicoClinico, `select#clinica-tutor-select` filtra pets, cascata ao editar CPF); (3) upload de anexos no clínico (`#input-upload-anexo`, `#lista-anexos`, mock em memória); (4) tipo de vacina via select (`TIPOS_VACINA`, `#agend-vacina-tipo`/`#clinica-vacina-tipo`, timeline/impressão/relatórios exibem); (5) impressão com selo DEMONSTRAÇÃO + RF-08 ilustrativo (nome+CRMV mock, `TODO SUPABASE`).
**Por quê:** ROADMAP §1 (branch `teste` = cópia da `main`; `Pages /dayvet/` intacto).
**Onde:** `dayvet/index.html`, `dayvet/script.js`.
**Validações:** sem node — python: 121 IDs OK, 33 onclick OK, `{}/()/[]` balanceados, zero `tutorId`; teste de navegador pendente.

---

## 2026-09-22 · (docs) — ROADMAP reescrito enxuto (próximos passos) + RF-08 ilustrativo
**O que:** `ROADMAP.md` reescrito (~80 linhas): removidas tabela RF×Status e Fases 0–5 (fonte de requisitos = `.docx`); §1 Próximas com 5 itens (login autocomplete, tutor por CPF, upload, vacina select, impressão/PDF + RF-08 ilustrativo agrupado); §2 baixa prioridade; §3 futuras até 2ª ordem (Supabase/LGPD/bypass). `docs/MAPA_DO_SISTEMA.md` §0 com links + referência. Descarta rascunho Fase 6 verbosa não commitado.
**Por quê:** pedido do dono — roadmap deixa de ser documento extenso de requisitos e passa a servir aos próximos passos de fato.
**Onde:** `ROADMAP.md`, `docs/MAPA_DO_SISTEMA.md`, `docs/CHANGELOG.md`.

---

## 2026-09-22 · (docs) — Metodologia geral em DOCX versionado
**O que:** novo `docs/METODOLOGIA_GERAL_AGENDAU_2.docx` (método dev HTML/CSS/JS, método GitHub, método IA com OpenCode + modelos gratuitos + Copilot CLI).
**Por quê:** pedido do dono — só este documento de `local/` vai para o repo; resto de `local/` segue privado.
**Onde:** `docs/METODOLOGIA_GERAL_AGENDAU_2.docx`, `docs/CHANGELOG.md`.

## 2026-09-22 · (docs) — Decisão banco: SQL via Supabase (projeto ainda não criado)
**O que:** ROADMAP Fase 4, DB_LEVANTAMENTO (§4, §3.3, §6), MAPA_DO_SISTEMA e AGENTS passam a declarar decisão tomada: SQL via Supabase (Postgres + Auth + RLS). Projeto ainda NÃO criado; código segue 100% mock com `TODO [INTEGRAÇÃO SUPABASE]`. Bypass 1/2/3 no Pages confirmado como intencional para teste do usuário final (protótipo sem dados reais).
**Por quê:** alinhar docs com decisão do dono antes de sincronizar GitHub/Pages.
**Onde:** `ROADMAP.md`, `docs/DB_LEVANTAMENTO.md`, `docs/MAPA_DO_SISTEMA.md`, `AGENTS.md`, `docs/CHANGELOG.md`.

## 2026-09-17 · (código + docs) — Bypass 1/2/3: mustChange:false + alertas de segurança
**O que:** contas teste u2/u3 agora têm `mustChange:false` em `usuariosMock` para login direto (CPF 1/2/3) nos 3 roles. Comentários `CONTAS TESTE: bypass troca` e `TODO [SECURITY]` adicionados em `perfisTestes` e `usuariosMock`. Alertas RISCO ALTO inseridos em `AGENTS.md`, `ROADMAP.md` (Fase 2 + checkbox pendente), `MAPA_DO_SISTEMA.md` §3 e `DB_LEVANTAMENTO.md` §1/LGPD.
**Por quê:** prototipação permite login rápido sem troca de senha; em produção, `mustChange:true` + hash obrigatório para todos os primeiro-acesso.
**Onde:** `dayvet/script.js` (linhas 54–62 e 125), `AGENTS.md`, `ROADMAP.md`, `docs/MAPA_DO_SISTEMA.md`, `docs/DB_LEVANTAMENTO.md`.
**Validações:** `node --check dayvet/script.js` ✓, grep `perfisTestes` existe, login demo (1/2/3) bypassa mustChange, novos usuários via admin continuam mustChange:true.

## 2026-09-17 · (código) — Remoção de laudos do código (dayvet/)
**O que:** removida toda a funcionalidade de laudos do produto: mock de laudo no `historicoClinico` (SEÇÃO 1), branches condicionais `if (tipo==='laudo')` e `if (h.tipo==='laudo')` (SEÇÃO 8), mapeamento `laudo` no `titulos` de impressão, botão "Incluir Laudo", option "Laudo Diagnóstico" no select de tipo, option "Laudos e Receituários" no relatório, textos de referência a laudo em labels e comentários HTML. Valores: guia/receita/vacina mantidos intactos.
**Por quê:** decisão clínica 2026-09-17 — laudos FORA DE ESCOPO (documentada em ROADMAP RF-09 CANCELADO, MAPA_DO_SISTEMA §8, DB_LEVANTAMENTO). O código não deve mais expor funcionalidade descontinuada.
**Onde:** `dayvet/script.js` (4 edições), `dayvet/index.html` (6 edições).
**Validações:** `node --check dayvet/script.js` ✓, grep por `laudo` em `dayvet/` e `site/` = zero ocorrências, guia/receita/vacina intactos.

## 2026-09-17 · (docs) — Decisão clínica: laudos FORA DE ESCOPO
**O que:** remoção de laudos do escopo do sistema por decisão da clínica (2026-09-17). Atualização de documentação: ROADMAP (RF-09 cancelado, removido de pendências), MAPA_DO_SISTEMA (módulo clínico sem laudo), DB_LEVANTAMENTO (entidade/tipo laudo fora de escopo, retenção LGPD ajustada), CHANGELOG (esta entrada).
**Por quê:** a clínica decidiu que não haverá laudos emitidos pelo sistema. O fluxo de laudo continua existindo apenas no protótipo histórico (`dayvet/`), mas não será implementado em produção.
**Onde:** `ROADMAP.md` · `docs/MAPA_DO_SISTEMA.md` · `docs/DB_LEVANTAMENTO.md` · `docs/CHANGELOG.md`.
**Decisão registrada:** "não haverá mais laudos por parte da clínica" — data 2026-09-17. Mantidas menções históricas sinalizadas como descontinuadas.

---

## 2026-09-15 · (teste) — Requisitos funcionais versionados no repo
**O que:** `docs/requisitos-funcionais-dayvet.docx` (v2) agora versionado; referências em `AGENTS.md`, `ROADMAP.md` §2 e `MAPA_DO_SISTEMA.md` §2.
**Por quê:** documento de requisitos passa a morar no GitHub como fonte de RFs/RNFRs/RNFS.
**Onde:** `docs/requisitos-funcionais-dayvet.docx`, `AGENTS.md`, `ROADMAP.md`, `docs/MAPA_DO_SISTEMA.md`, `docs/CHANGELOG.md`.

---

## 2026-09-15 · (teste) — Método de implantação (substitui /setup)
**O que:** descartada a rota `/setup` virgem (F1 futuro); método definido: admin cadastra CPF+e-mail do responsável, 1º acesso exige troca de senha para todos os perfis (`mustChange`, já implementado em `salvarNovoUsuario()`).
**Por quê:** decisão do dono — implantação por cadastro direto, sem setup single-use.
**Onde:** `ROADMAP.md` (F1 → Implantação), `docs/MAPA_DO_SISTEMA.md` §3, `docs/CHANGELOG.md`.

---

## 2026-09-15 · (teste) — Login claro: contraste do cabeçalho + follow-ups no roadmap
**O que:** faixa do cabeçalho do login (`#login-cabecalho`) em gradiente de marca azul→roxo no modo claro — nome do sistema voltou a branco/lima legível em vez de preto sobre o card branco. Registrados follow-ups (paleta fora do padrão de mercado, revisão de contrastes) e a divisão documental: requisitos/casos de uso → doc de requisitos do dono; frontend/temas → só roadmap.
**Por quê:** feedback de validação do preview — contraste do nome do sistema reprovado no login claro.
**Onde:** `dayvet/index.html` (`#login-cabecalho`), `dayvet/styles.css` (regras light do cabeçalho), `ROADMAP.md` (Fase 5 + follow-ups + §4 divisão documental), `docs/MAPA_DO_SISTEMA.md`.

---

## 2026-09-15 · (teste) — Fase 5: login claro + painel do vet + filtro por período
**O que:** (1) login segue o tema — removido bloco neon-forçado e vars `--login-*` de `styles.css`; (2) `#painel-vet-hoje` no dashboard (contadores + lista do dia) com `#painel-financeiro` oculto p/ veterinário (`atualizarDashboardPorPerfil`, chamada em `realizarLogin` e `switchTab`); (3) `#filtro-data-ag` na aba Agendamentos (todos/hoje/futuros/passados + ordenação) + 3 mocks (205-207) com data atual p/ demo.
**Por quê:** Fase 5 do ROADMAP (UX do veterinário, login claro, agendamentos todos os dias).
**Onde:** `dayvet/index.html` (`#painel-vet-hoje`, `#painel-financeiro`, `#filtro-data-ag`), `dayvet/script.js` (SEÇÃO 1 mocks hoje, SEÇÃO 6 filtro+ordenação, painel vet), `dayvet/styles.css` (login claro), `ROADMAP.md` (Fase 5 concluída em teste), `docs/MAPA_DO_SISTEMA.md`, `AGENTS.md`.
**Validações:** sem node no ambiente — IDs 170/refs 113 (4 prefixos dinâmicos `nav-`/`tab-`/`rel-*` OK), 33 onclick todas definidas; teste de navegador pendente (logins 1/2/3 + temas).

---

## 2026-09-15 · (teste) — Consolidação em branch `teste` única + blindagem de branches
**O que:** criada a branch única `teste` a partir de `origin/main` (`ea16f37`, a versão mais recente). Verificado que `teste/auth-empresarial` (`5b03074`) e `teste/recuperar-senha` (`59be1ec`) já eram ancestrais de `main` (merge `ec22d55`) — `merge --no-commit` retornou "Already up to date", nada a portar. Blindagem: seção `## Branches` em `AGENTS.md` e fluxo Git em `ROADMAP.md` proibindo `teste/*` e determinando `main` estável / `teste` única.
**Por quê:** impedir que IAs criem múltiplas branches de teste e fragmentem o trabalho; dono validou `main` como estável.
**Onde:** `AGENTS.md`, `ROADMAP.md`, `docs/CHANGELOG.md`, branch `teste`.
**Validações:** sem node no ambiente (só python3) — validação JS feita via checagem de IDs/onclick por script python (ver commit da Fase 5).

---

## 2026-09-15 · (merge main) — Merge teste/auth-empresarial → main (Fase 2 concluída)
**O que:** merge da branch `teste/auth-empresarial` na `main`. Atualização de docs: ROADMAP (Fase 2 concluída, Fase 5 planejada), MAPA_DO_SISTEMA (auth empresarial, nova paleta claro, botão tema login), CHANGELOG.
**Por quê:** Fase 2 validada — auth empresarial, tema claro refinado, mustChange u2/u3, botão tema no login, bugfixes do modal "Esqueci a senha" (z-index + fora do form).
**Onde:** `main` branch · `ROADMAP.md` · `docs/MAPA_DO_SISTEMA.md` · `docs/CHANGELOG.md`.
**Próximo ciclo (Fase 5):** login claro, dashboard veterinário com agendamentos do dia, aba agendamentos completa (todos os dias).

## 2026-09-15 · (auth-empresarial teste) — Bugfix real "Esqueci a senha": botão fora do form + hover roxo
**O que:** movido o botão "Esqueci a senha?" para fora do `<form id="auth-form">`. Adicionado `hover:text-brand-purple` (era `hover:text-brand-lime`).
**Por quê:** o botão tinha `type="button"` mas estava dentro do form com campos `required`. Alguns browsers bloqueiam o clique em qualquer botão dentro de um form inválido (campos não preenchidos), mesmo com `type="button"`. Mover para fora do form resolve definitivamente.
**Onde:** `dayvet/index.html` (botão movido para depois do `</form>`).
**Validações:** node --check ✓, 108 IDs ✓, z-[60] ✓, 33 funções inline ✓.

## 2026-09-15 · (auth-empresarial teste) — Bugfix modal "Esqueci a senha" (z-index)
**O que:** corrigido `z-50` → `z-[60]` nos modais `#modal-recuperar-senha` e `#forcar-senha-etapa` em `dayvet/index.html`. Criada skill `.github/skills/testar-frontend/SKILL.md` com 4 verificações automáticas via `node`. Atualizado `AGENTS.md` do projeto e do `/Projetos/` com instrução de usar a skill antes de qualquer commit.
**Por quê:** o modal "Esqueci a senha?" ficava invisível/inacessível porque `#login-screen` usa `backdrop-blur-xl` (que cria stacking context CSS isolado); modais com mesmo `z-50` ficavam presos nesse contexto em alguns browsers. Solução: z-index superior (`z-[60]`).
**Onde:** `dayvet/index.html` (z-index dos 2 modais de login), `AGENTS.md`, `../AGENTS.md`, `.github/skills/testar-frontend/SKILL.md`.
**Validações:** `node --check` ✓, 108 IDs verificados ✓, z-[60] confirmado ✓, 33 funções inline ✓.

## 2026-09-15 · (auth-empresarial teste) — Atualização de docs para auth empresarial
**O que:** atualização de `ROADMAP.md` com RNF-05 Auth empresarial (subitens 05.1-05.5), Fase 2 EM TESTE, Fase 3 BLOQUEADA, F1 futuro; `docs/DB_LEVANTAMENTO.md` §1.1 users com campos de auth empresarial e LGPD; `docs/CHANGELOG.md` com esta entrada; criação de `local/RELATORIO_METODOLOGIA_AUTH.md` (não versionado).
**Por quê:** preparar terreno para implementação de autenticação empresarial com requisitos específicos, seguindo metodologia do projeto.
**Onde:** `ROADMAP.md`, `docs/DB_LEVANTAMENTO.md`, `docs/CHANGELOG.md`, `local/RELATORIO_METODOLOGIA_AUTH.md`.
**⚠ PENDENTE:** implementação do código de auth na branch `teste/auth-empresarial`.

## 2026-09-15 · (pending) — Roadmap, levantamento DB, fluxo Git e pausa de styling
**O que:** adição de `ROADMAP.md` (Fase 2 EM TESTE, Fase 3 BLOQUEADA stakeholders), `docs/DB_LEVANTAMENTO.md` (mapeamento de tabelas para o BD) e estruturação do fluxo Git (`main` estável vs branches de teste) neste CHANGELOG. Fluxo de testes de "Recuperar Senha" (mock) em branch `teste/recuperar-senha` — modal funcional sem backend.
**Por quê:** organizar o desenvolvimento com separação clara entre código estável (main) e experimentos (branches teste), documentar dependências de banco de dados antes de implementar, e pausar refinamento de temas até que o fluxo funcional esteja validado.
**Onde:** `ROADMAP.md`, `docs/DB_LEVANTAMENTO.md`, `docs/CHANGELOG.md`, `dayvet/index.html` (modal recuperar senha — mantido só em branch teste). O `dayvet/styles.css` **não foi alterado** neste conjunto; styling continua pausado.
**⚠ PENDENTE:** `dayvet/styles.css` (temas) aguarda revisão; `docs/MAPA_DO_SISTEMA.md` deve ser atualizado quando o fluxo de testes for mergeado em main.

---

## 2026-09-01 · (próximo commit) — Temas refatorados para **variáveis CSS** (facilidade de edição)
**O que:** os blocos de tema de `dayvet/styles.css` (seções "6. TEMA ESCURO" e "7. TEMA CLARO") passaram a usar o **método padrão com variáveis CSS**: cada tema agora declara sua paleta em `:root[data-theme='...'] { --variavel: valor }` e as regras de aplicação apenas espelham essas variáveis nas classes Tailwind.
**Por quê:** permitir que a parceira (ou qualquer IA/colaborador) **escolha as cores de um tema editando só o bloco de variáveis**, sem caçar classes utilitárias — nomes em pt-BR, comentados e agrupados (fundos, textos, bordas, marca, status, sombras, login).
**Onde:** `dayvet/styles.css` (blocos de paleta + regras com `var(--...)`); docs atualizados: `AGENTS.md` (`## Cores / Temas`), `docs/MAPA_DO_SISTEMA.md` §6 (tabela com os nomes das variáveis), este CHANGELOG.
**Nota:** zero mudança visual — os mesmos valores foram convertidos 1:1 em variáveis (validação por auditoria de estilos computados).

---

## 2026-09-01 · `3ea1cdd` — Remoção da seção "Produtos & Insumos" + temas claro/escuro
**O que:** removida a aba "Estoque & Produtos" de todas as telas (botão de nav, seção `tab-produtos`, tabela, modal de cadastro/edição, KPI "Estoque Alerta", gráfico "Serviços & Produtos Mais Vendidos" e opção "Relatório de Giro de Estoque").
**Por quê:** produto/insumo deixou de fazer parte do escopo do sistema.
**Onde:** `dayvet/index.html` e `dayvet/script.js` (remoções + renumeração de seções). Verificado zero referências restantes por grep.
**Temas:** novo sistema claro/escuro — botão `#btn-tema` no header; padrão = `prefers-color-scheme`; escolha salva em localStorage (`dayvet-tema`); contraste dos textos acinzentados reforçado no escuro; modo claro com paleta neutra de mercado e login mantendo o neon escuro.
**⚠ PENDENTE:** as **cores do modo claro devem ser revisadas/refinadas** (como e onde: ver `docs/MAPA_DO_SISTEMA.md` §6 e a seção "7. TEMA CLARO" de `dayvet/styles.css`).

## 2026-09-01 · `5fd3134` — Remover `.gitignore`
**O que:** removido o `.gitignore` da raiz do repo.
**Por quê:** a proteção contra publicação passou a ser o próprio comentário da pasta `local/` ("PASTA LOCAL — NÃO PUBLICAR"), a cargo de quem commitar.

## 2026-09-01 · `90f7f41` — Limpeza: repositório mantém apenas `dayvet/`
**O que:** excluídos `prototipo.html`, `script.js`/`styles.css` da raiz, `README.md`, `README.ptbr` e `dayvet/.gitignore`.
**Por quê:** a ideia era o DayVet (modular) substituir o código antigo; o repo passou a conter só o produto.
**Onde:** reestruturação da raiz; conflito de rebase com `8936755` resolvido mantendo a exclusão.

## 2026-09-01 · `8936755` — (colaborador) revisão de `.gitignore`
Remoção de entradas de arquivos de relatório do `dayvet/.gitignore`.

## 2026-09-01 · `680dc9e` — **MODULARIZAÇÃO** + login neon + RBAC
**O que:** o `index.html` monolítico (~2.288 linhas) foi dividido em `index.html` (estrutura), `styles.css` (estilos) e `script.js` (lógica, 13 seções comentadas).
**Onde:** repositório antes tinha um único `index.html` com CSS/JS inline.
**Login:** tela neon (CPF+senha) integrada do protótipo; teste CPF 1/111=Admin, 2/222=Vet, 3/333=Func.
**RBAC:** cargo `gestor` removido → admin assumiu as funções; perfis finais admin/veterinario/funcionario.
**BD futuro:** TODOs para tabela `users` (role↔CPF), `POST /api/login`, `GET /api/me`.

## 2026-08/09 · `99bcaea`, `200d0d5`, `f57ec1e` — ajustes pré-modularização
- `99bcaea` Update `prototipo.html` (botões de nav reorganizados com flex).
- `200d0d5` funcionalidades do gestor; `f57ec1e` upgrade geral.

## 2026 precedentes · fase protótipo monolítico (`7754df7` → `da15687`)
Histórico inicial do protótipo único (`index.html`) no repo Agendau_2:
- Criação inicial; ajustes de UI e "Upgrade" de gerenciamento de contas.
- Gestão de usuários simulada (os `usuariosMock`/renderUsuarios e modais) com comentários de integração de banco.
- Várias tentativas de controlar a aba "Produtos" por perfil (show/hide admin/gestor) e mudanças de navegação por cargo.
- Fluxo de "emitir laudo"; correções de conflito/merge; pequenos ajustes de texto (ex.: print "Hello"→"Goodbye").

> Não-versionado: relatórios pessoais de metodologia e de commit ficam na pasta `local/` (fora do Git).