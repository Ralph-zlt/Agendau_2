# CHANGELOG — DayVet-Gestão

> Histórico das alterações **desde o código original**, com o que mudou, por quê e onde.
> Última entrada no topo. Mantenha atualizado a cada commit.
> Fonte histórica: `git log` do repositório (Agendau_2 / Proj_Integrador_DAY_VET_1.0).

## Como manter
A cada commit, adicione no topo: **data · hash · resumo (o que / por quê / onde mexer)**. Mantenha entradas compactas.

---

## 2026-11-23 · (main `293ac5e`; Vercel Ready `7X2vV8x3jzQ2hrw3cHrLSVJckvRD`) — Conclusões visíveis fora do mês atual
**Causa confirmada:** leitura autenticada somente de consulta encontrou 3 agendamentos `concluido` em dezembro/2026 e 1 cancelado em novembro. O histórico e o dashboard iniciavam em novembro; o painel estava correto ao agrupar valores pela data agendada, mas o filtro inicial do histórico ocultava os concluídos de dezembro. Dois ciclos de login/logout/login na produção também funcionaram; nenhum dado real foi alterado.
**O que:** histórico inicia em "Todos os meses/anos", mantém concluídos de qualquer data visíveis no estado recolhido e identifica datas futuras sem chamá-las de últimos 7 dias. O dashboard explica que valores seguem a data agendada; selecionar dezembro exibe os valores concluídos daquele mês.
**Onde:** `dayvet/index.html`, `dayvet/script.js`, `tests/e2e.mjs`, `tests/regressao/07-consistencia-dashboard-historico.mjs`, `tests/regressao/09-conclusao-persiste-no-historico-e-dashboard.mjs`, `tests/regressao/10-login-retorno-apos-logout.mjs`, `docs/MAPA_DO_SISTEMA.md`, `AGENTS.md`.
**Validação:** estático 12/12, regras 42/42, persistência 9/9, regressões 10/10, E2E Chromium completo, Firefox (admin/funcionário) e Postgres 17 (migrations, 21 casos de login e 73 casos de RLS) passaram no worktree isolado da VPS. Smoke publicado 16/16; leitura real confirmou os 3 concluídos visíveis, R$ 0,00 em novembro e R$ 330,00 em dezembro; logout/login novamente passou.
**Follow-up do smoke:** a tela atualizava o texto do dashboard após login e substituía a explicação nova pelo texto antigo; correção dessa última referência e teste E2E seguem em commit de acompanhamento.
**Publicação:** commit publicado na Vercel sem editar/remover registros QA; nenhum dado real foi alterado.

## 2026-11-23 · (main `dc0e35b`; Vercel Ready `Bx2KqLPtTGv2yvBu1jimjFP7n8VK`) — Login só entra após confirmação explícita
**O que:** a sessão Supabase salva não autentica a interface automaticamente ao abrir/recarregar; sugestões de acesso preenchem usuário e senha, sem enviar o formulário. O login manual e o atalho 1/2/3 continuam operando pelo botão "Acessar o Painel".
**Por quê:** impedir entrada inesperada e garantir que os cliques de acesso levem a um envio explícito.
**Onde:** `dayvet/script.js`, `tests/e2e.mjs`, `tests/regressao/08-login-exige-confirmacao.mjs`, `docs/MAPA_DO_SISTEMA.md`.
**Validação:** `node --check`, estático 12/12, regras 42/42, persistência 9/9, regressões 8/8, E2E Chromium completo, Firefox (admin/funcionário) e DB em Postgres 17 (73 casos de RLS) passaram. `scripts/deploy-vercel.sh` publicou a `main`; 7 rotas responderam HTTP 200 e `tests/publicado.mjs` passou 16/16, incluindo sessão salva, sugestão e envio manual.

## 2026-11-23 · (main `cceb6af`; Vercel Ready `FAPWsv6YUDr6v7B9HWQo9hxH5Bbo`) — Alinhando KPIs e histórico ao período
**O que:** contagem e taxa de agendamentos usam o mesmo intervalo mensal/semanal/anual do faturamento; pets e tutores ficam identificados como totais gerais. O histórico abre filtrado no mês atual e reage às mudanças de mês/ano; "Limpar" deixa ambos os seletores em "Todos".
**Por quê:** evitar divergência entre valor, quantidade e histórico quando o usuário seleciona um período.
**Onde:** `dayvet/index.html`, `dayvet/script.js`, `tests/e2e.mjs`, `tests/regressao/06-login-curto-dashboard-mes.mjs`, `tests/regressao/07-consistencia-dashboard-historico.mjs`.
**Decisões mantidas:** percentual continua excluindo cancelados do denominador; status concluído em data futura não é bloqueado; registros QA existentes não foram alterados.
**Validação:** estático 12/12, regras 42/42, persistência 9/9, regressões 7/7, E2E Chromium completo, Firefox (admin/funcionário) e `tests/db.mjs` em Postgres 17 passaram. Smoke local conferiu KPIs mensal/semanal/anual e o filtro/limpeza do histórico. Commit `cceb6af` publicado na `main`; `scripts/deploy-vercel.sh` gerou o deployment `FAPWsv6YUDr6v7B9HWQo9hxH5Bbo`, Ready, com 7 rotas HTTP 200; `tests/publicado.mjs` passou 13/13 em https://agendau-2.vercel.app/dayvet/. Nenhuma migration, configuração ou dado QA do Supabase foi alterado.

## 2026-11-23 · (produção `main` 0902ec5; Vercel Ready) — Login rolável e faturamento por mês selecionado
**O que:** a tela de login permite rolagem vertical quando o cartão ultrapassa a altura da janela. O dashboard mensal ganhou seletor de mês/ano para consultar valores de agendamentos futuros; semanal/anual permanecem. A regra continua somando somente agendamentos confirmados/concluídos, não pagamentos recebidos.
**Por quê:** em uma janela de 613×304 o botão de acesso ficava fora da área visível sem rolagem; o Auth funcionou com altura normal. No dashboard, o mês atual mostrava R$ 0,00 porque os agendamentos QA confirmados são de dezembro; a seleção anual mostrava R$ 330,00.
**Onde:** `dayvet/index.html` (rolagem do login e controle mensal), `dayvet/script.js` (cálculo e visibilidade do filtro), `tests/e2e.mjs` (catálogo de raça de teste e diagnósticos de formulário), `tests/regressao/06-login-curto-dashboard-mes.mjs`, `AGENTS.md`, `ROADMAP.md`, `docs/MAPA_DO_SISTEMA.md`.
**Validação:** estático 12/12, regras 42/42, persistência 9/9, regressões 6/6, E2E Chromium completo, E2E Firefox (admin/funcionário) e `tests/db.mjs` em Postgres 17 na VPS passaram. O E2E financeiro usa a raça `SRD` no fixture. PR #3 mesclada pelo dono na `main` `0902ec5`; `scripts/deploy-vercel.sh` publicou o deployment `DPPCbXRiVGjPjCs5nbQhF63XJCyJ`, Ready, com os 7 caminhos principais respondendo HTTP 200. `tests/publicado.mjs` passou 13/13. Smoke real após deploy: login Auth em viewport 613×304 e KPI de dezembro/2026 em R$ 330,00; sem overflow horizontal no mobile. Valores são de agendamentos, não pagamentos.

## 2026-11-23 · (produção) — Dados sintéticos persistentes para QA
**O que:** mantidos no Supabase real 2 tutores, 3 pets, 4 agendamentos e 2 registros clínicos, todos identificados como `TESTE`; sem anexos. Um agendamento está cancelado no histórico e três estão confirmados em dezembro. Os detalhes clínicos deixam explícito que são registros de QA e não representam prescrição ou vacina aplicada.
**Validação:** gravação pela aplicação autenticada/RLS, reload e confirmação de vínculos tutor/pet; sessão administrativa encerrada ao terminar. Os dados devem permanecer até ordem explícita de remoção.

## 2026-11-23 · (main `e3edffe`) — Integração real publicada na Vercel
**O que:** PR #2 (`bb4f532`) foi mesclado pelo dono; `scripts/deploy-vercel.sh` publicou o artefato da `main` no projeto existente. `https://agendau-2.vercel.app/dayvet/` agora serve `MODO_DADOS='real'`; a Vercel marcou o deployment Ready e os assets principais retornaram HTTP 200.
**Validação de produção:** `tests/publicado.mjs` confirmou `RegrasLogin`, `RegrasTutor`, `DayVetPersistencia`, modo real, Auth/RBAC de admin/veterinário/funcionário, senha incorreta rejeitada, sem erros de console/HTTP e mobile sem overflow (13 verificações). Cadastro de tutor no site real com CPF sem máscara persistiu após reload; edição para outro CPF sem máscara persistiu após novo reload; CPF inválido foi rejeitado; o tutor sintético foi arquivado/excluído e confirmado ausente após reload.
**Correção do verificador:** o primeiro smoke falhou porque reutilizava contexto/sessão do Supabase entre perfis. `tests/publicado.mjs` agora isola contextos por login; a nova execução passou 13/13. Essa correção e a sincronização final desta documentação estão no commit de acompanhamento da branch `teste`, aguardando PR próprio.
**Pendente/risco:** smokes autenticados reais de configurações e fluxos restantes por perfil ainda faltam; E2E Chromium usa stubs. Dados sintéticos de QA persistentes estão documentados na entrada seguinte. A integração Git da Vercel segue bloqueada; publicar mudanças futuras só depois de merge na `main` via `scripts/deploy-vercel.sh`.

## 2026-11-23 · (teste) — CPF canônico de tutor e smoke real de persistência
**O que:** cadastro e edição de tutor agora validam os dígitos do CPF e persistem sempre no formato `000.000.000-00`; a comparação de duplicidade considera os dígitos, com ou sem máscara. A regressão 05 cobre os dois caminhos e o E2E foi ampliado para criar e editar um tutor com CPFs sem máscara.
**Por quê:** o banco exige o CPF pontuado (`chk_tutores_cpf`); a tela antes enviava os dígitos sem máscara, fazendo o Supabase rejeitar o cadastro. Também é melhor rejeitar CPF com dígitos verificadores inválidos antes da escrita.
**Onde:** `dayvet/script.js` (`salvarTutor`/`salvarEdicaoTutor`), `tests/regressao/05-cpf-tutor-persistencia.mjs`, `tests/e2e.mjs`, `ROADMAP.md`, `docs/MAPA_DO_SISTEMA.md`, `docs/DB_LEVANTAMENTO.md`, `AGENTS.md`.
**Validação:** estático 12/12; regras 42/42; adaptadores de persistência 9/9; regressões 5/5; E2E Chromium completo passou (CPF inválido bloqueado, cadastro/edição sem máscara); `node --check` passou. Smoke com Auth/Supabase real: cadastro sem máscara, persistência após reload, edição para outro CPF sem máscara, novo reload e rejeição de CPF inválido. Os registros sintéticos foram arquivados/excluídos e conferidos ausentes após reload. Postgres 17, migrations `0001..0006` e Edge Function também foram validados na VPS.
**Acesso remoto:** Supabase CLI autenticada; a lista remota confirma `0001..0006` no projeto `agendau-2`. A comparação foi feita a partir do checkout `main` da VPS, que só tem arquivos locais `0001..0004`; `0005`/`0006` aparecem corretamente apenas no remoto. Vercel CLI autenticada; `vercel inspect` mostrou deploy de produção Ready e `/dayvet/` respondeu 200, mas a página ainda informa que usa dados fictícios e nada é salvo.
**Pendente/risco:** E2E usa stubs; smokes autenticados dos demais fluxos/perfis continuam pendentes. Firefox não foi reexecutado porque não houve mudança de layout/tema. Commit `ac8e0c6` publicado em `teste`; PR #2 está aberto para revisão/merge do dono. `main` continua em `e5c2e16` e a Vercel segue na versão de demonstração até o merge autorizado e o deploy pelo script.

## 2026-11-23 · (teste) — Integração Supabase D/E no worktree e handoff de validação
**O que:** persistência real passa a ser o modo do app (`MODO_DADOS='real'`); `persistencia.js` carrega dados paginados e mapeia dados por perfil; `script.js` integra recuperação/restauração de sessão, CRUD operacional, catálogos, anexos em Storage privado, configuração de expediente e métricas sem valores demonstrativos. Adicionadas migrations `0005_documentos_storage.sql` e `0006_configuracoes_horario.sql`, Edge Function administrativa e testes dos adaptadores. Documentação foi sincronizada para separar código local de produção.
**Por quê:** eliminar dados transitórios apresentados como persistentes e deixar explícito o estado necessário para outra pessoa continuar sem este contexto.
**Onde:** `dayvet/script.js`, `dayvet/persistencia.js`, `dayvet/config.js`, `dayvet/index.html`, `supabase/migrations/0005*`, `supabase/migrations/0006*`, `supabase/functions/`, `supabase/tests/`, `tests/unit/persistencia.mjs`, testes de DB/E2E/publicação, `ROADMAP.md`, `docs/MAPA_DO_SISTEMA.md`, `docs/DB_LEVANTAMENTO.md`, `AGENTS.md`.
**Validação:** sintaxe JS/shell OK; estático 12/12; regras 42/42; persistência 9 verificações; regressões 4/4; E2E Chromium completo e Firefox (admin/funcionário) verdes. `tests/db.mjs` foi **pulado** (Docker indisponível). E2E usa stubs, não é smoke real. Migrations 0005/0006 não foram executadas nesta continuação; URL de produção não revalidada. Sem commit, push ou deploy.
**Handoff:** `origin/main` e `origin/teste` = `e5c2e16`; branch local `teste`, worktree já estava amplamente alterado e permanece sujo. Próximos passos: revisar diffs, validar DB com Postgres 17/Docker, confirmar/aplicar migrations 0005/0006 e Edge Function na nuvem, fazer smoke autenticado e só então solicitar validação/merge do dono. A IA não deve publicar direto na `main`.

## 2026-11-23 · (teste) — Fase C: login e troca de senha pelo Supabase Auth
**O que:** `index.html` carrega `config.js` e o UMD do Supabase JS pelo jsDelivr (o endereço anterior redirecionava para 404); `script.js` resolve usuário/CPF/e-mail pela RPC `resolver_login`, valida senha via `signInWithPassword`, carrega perfil/RBAC/CRMV com RLS e aplica `must_change` por `auth.updateUser` + `marcar_senha_alterada`. Dados operacionais continuam mock e avisados. Bypass 1/2/3 foi preservado; botões de teste usam Auth real.
**Por quê:** concluir a ponte de autenticação sem simular persistência dos dados nem remover o bypass autorizado para a fase de prototipação.
**Onde:** `dayvet/index.html`, `dayvet/config.js`, `dayvet/script.js`, `tests/e2e.mjs`, `AGENTS.md`, `ROADMAP.md`, `docs/MAPA_DO_SISTEMA.md`.
**Validação:** `node --check`, estático, unitários (42/42), regressões (4/4), E2E Chromium (incl. usuário/CPF/e-mail, must_change e mobile) e banco (21 casos de RPC + 73 de RLS) verdes. Smoke com Auth real: os 3 botões autenticaram as contas de teste e aplicaram a navegação/RBAC esperadas.

---

## 2026-11-23 · (main) — Merge na `main`, Pages automático e Vercel travada na `main`
**O que:** `teste` (`1e6d052`) foi para a `main` por fast-forward — autorizado pelo dono ("pode mandar na branch main"). Isso levou para produção: a restauração do Supabase, a Fase 0 (avisos de demonstração), o workflow de keep-alive e a correção do `tests/publicado.mjs`. Depois entrou `44b04b9` com a **trava de deploy**: `scripts/deploy-vercel.sh` aborta se `HEAD != origin/main` ou se `dayvet/`/`site/` estiverem com alteração não commitada, garantindo que a Vercel sempre reflita a `main` (decisão do dono no mesmo dia).
**Por quê:** a Vercel não tem integração Git ativa (deploy só por script); sem trava, o que está no ar poderia ser trabalho de branch não auditável.
**Onde:** `scripts/deploy-vercel.sh` (trava + mensagem de fluxo), `AGENTS.md` (nova seção "Deploy (Vercel) — reflete a `main`, sempre"), `ROADMAP.md`, este CHANGELOG.
**Validações:** Pages publicou sozinho nos dois pushes (`45162337058` = `1e6d052`, `45162452063` = `44b04b9`, ambos success) e `tests/publicado.mjs` 15/15 na URL do Pages (com a faixa de demonstração no ar); Vercel publicada pela trava com 6 rotas 200 e 15/15 funcional; `supabase-keepalive` disparado por `workflow_dispatch` (`45162494962`) — login e leitura real verdes, passo de issue `skipped`.
**Efeito colateral bom:** com o workflow na `main`, o keep-alive passou a valer de fato (agendado diário às 06:00 UTC).

---

## 2026-11-23 · (teste) — Incidente: projeto pausado + Fase 0 (parar a falsa persistência)
**Sintoma relatado:** no site da Vercel, desmarcar uma consulta e recarregar mostrava a consulta marcada de novo — "ou é falso, ou o Supabase caiu".
**Diagnóstico (duas causas independentes):** (1) **o projeto Supabase estava PAUSADO** — `supabase projects list` mostrava `status: INACTIVE` e o host `dkdvhstjnverofgzwzne.supabase.co` respondia **NXDOMAIN** em local, `1.1.1.1` e `8.8.8.8` (outros domínios resolviam normalmente, então não era o resolver da VPS). Plano free pausa após ~7 dias de pouca atividade e, ao pausar, **remove a resolução DNS** — daí a impressão de "fora do ar". Nenhum dado foi perdido. (2) **o front nunca falou com o banco**: `index.html` não carrega `config.js`, `script.js` não tem `supabase`, `fetch` nem `/rest/v1` (zero chamadas de rede), e `alterarStatusAgendamento()` só faz `item.status = status` em memória; o único dado persistido era o tema em `localStorage`. Ou seja: "volta ao recarregar" era o comportamento esperado dos mocks — e a UI **afirmava sucesso** sem salvar, que é o defeito real.
**O que foi feito:** (a) projeto restaurado via Management API (`POST /v1/projects/dkdvhstjnverofgzwzne/restore` → `COMING_UP` → `RESTORING` → `ACTIVE_HEALTHY` em ~5 min) e conferido: 7 tabelas, RLS nas 7, 29 policies, 10 vacinas/31 raças, 3 usuários, migrations `0001..0003`, `anon` com 0 GRANT e 401; a **chave legada `anon` continuou válida** (não foi preciso migrar para `sb_publishable_*`); (b) **Fase 0**: faixa `#aviso-modo-demo` (topo do app) e `#aviso-login-demo` (tela de login), constantes `MODO_DADOS = 'mock'` e `confirmarEscrita()`, e **25 mensagens de escrita** convertidas de `showToast(...)` para `confirmarEscrita(...)`, que acrescenta "apenas nesta tela: nada foi salvo no banco" com toast âmbar; (c) **keep-alive**: `.github/workflows/supabase-keepalive.yml` faz login com a conta de teste e uma leitura real diária (conta como atividade), falha alto e abre issue — segredos `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SMOKE_EMAIL`, `SMOKE_PASSWORD` já cadastrados no repositório.
**Onde:** `dayvet/script.js` (seção 0, toast `aviso`, 25 escritas), `dayvet/index.html` (2 avisos), `dayvet/styles.css` (§10 `.aviso-demo`, 2 temas), `.github/workflows/supabase-keepalive.yml` (novo), `tests/regressao/04-aviso-modo-demo.mjs` (novo, 11 checagens).
**Decisões embutidas:** não existe fallback silencioso para mock — quando o banco entrar, erro de rede aparece como erro; o aviso some sozinho quando `MODO_DADOS === 'real'`; keep-alive é mitigação, não garantia (a doc da Supabase só promete não pausar em plano pago).
**Validações:** `tests/estatico.mjs` verde; `tests/unit/regras.mjs` 42/42; `tests/regressao` **4/4** (o 04 novo); `tests/e2e.mjs todos` verde, incluindo mobile 390 px sem overflow (altura do header igual com e sem a faixa: 175 px); `tests/publicado.mjs` **15/15** na Vercel e no Pages.
**Correção de teste (mesmo dia):** o `tests/publicado.mjs` acusou 3 falhas de "globais não publicados" nas **duas** URLs — inclusive no Pages com código antigo, o que descartou regressão do produto. Causa: com o Chromium 156 o `waitUntil: "networkidle"` resolve com o documento ainda em `readyState: "loading"`, antes do parser chegar em `regras.js`/`script.js`; as checagens rodavam com `handleAuthSubmit` ainda indefinido. Trocado para `waitUntil: "load"` + espera explícita por `window.handleAuthSubmit`. Nenhuma mudança no produto.
**Pendências:** Fases C/D/E (ponte de Auth, ponte de dados e testes integrados) aprovadas em escopo — núcleo + histórico + anexos, com migration `0004` para `documentos` + bucket privado; integração Git da Vercel continua bloqueada; workflow de keep-alive só dispara depois de estar na `main`.

---

## 2026-11-18 · (teste) — Fase B: Supabase no ar + Vercel publicada
**O que:** (1) organização dedicada **`dayvet-org`** (`xgtbjxhdtjnohiurbqzu`) e projeto **`agendau-2`** (`dkdvhstjnverofgzwzne`) em `sa-east-1`, plano free; (2) migrations `0001_schema`, `0002_seed` e `0003_rls` aplicadas na nuvem (`supabase db push --remote`); (3) os 3 perfis criados via **Auth Admin** com claims `authenticated` e perfil em `public.usuarios`; (4) RLS **validada na nuvem com tokens reais**, não só no Postgres local; (5) `dayvet/config.js` com URL + chave `anon` (pública por design) e `service_role` fora do repositório; (6) projeto Vercel **`agendau-2`** em produção (`https://agendau-2.vercel.app`, alias estável); (7) `scripts/deploy-vercel.sh` para repetir o deploy; (8) `.gitignore` passou a ignorar `.vercel` e `.env*`.
**Por quê:** autorização do dono em 2026-11-18 ("suba no supabase, verifique a coerência do banco de dados e suba no vercel"). Fase B estava parada desde 17/11.
**Onde:** `supabase/migrations/*`, `dayvet/config.js` (novo), `vercel.json` (novo), `scripts/deploy-vercel.sh` (novo), `.github/workflows/deploy-pages.yml` (passou a copiar `config.js`), `.gitignore`, `docs/CHANGELOG.md`, `ROADMAP.md`, `PROJETOS.md`, `local/AMBIENTE.md` e `local/ACESSOS_TESTE.md` (fora do Git).
**Decisões embutidas:** (a) os 3 usuários do Auth usam a senha `Veterin@ria` **por decisão do dono**, mesmo estando publicada no `script.js` — o mock e o banco compartilham credencial, com risco aceito e registrado; (b) a `service_role` e a senha do Postgres ficam em `~/.supabase/` (modo 600), fora de `~/Público`; (c) o `config.js` é versionado porque só contém material público, e o front **ainda não o carrega** — a ponte é a Fase C; (d) o deploy na Vercel é feito por artefato pré-construído (`scripts/deploy-vercel.sh`), porque a integração Git está bloqueada.
**Validações (banco, na nuvem):** 7 tabelas com RLS habilitado nas 7, **29 policies**, `anon` com **zero GRANT**; seeds idempotentes (10 vacinas, 31 raças); `anon` sem login recebe **401** em `tutores`, os 3 perfis recebem **200**; `usuarios` visível = 3 linhas p/ admin e 1 p/ vet e funcionário (`usuarios_select_self`); funcionário e veterinário recebem **403** ao tentar criar usuário; funcionário cria/deleta tutor (201/204 com linha removida); **veterinário não deleta tutor** (204 enganoso, mas a linha **sobreviveu** — conferido por SELECT).
**Validações (front e deploy):** `tests/estatico.mjs` verde, `tests/unit/regras.mjs` **42/42**, `tests/regressao` **3/3**, `node tests/publicado.mjs https://agendau-2.vercel.app/dayvet/` **15/15** (login pelos 3 identificadores, receita assinada por Dra. Laís/CRMV-SP 00000, zero erro de console/HTTP, mobile 390 px sem overflow); todas as rotas servidas com 200 (`/`, `/dayvet/`, `config.js`, `script.js`, `regras.js`, `styles.css`).
**Pendências registradas:** (1) integração Git da Vercel **bloqueada** — "commit author doesn't have permission to create deployments"; falta a Login Connection entre a conta Vercel e o GitHub, então todo push na `main` **não** publica sozinho (usar `./scripts/deploy-vercel.sh`); (2) `vercel link` criou `.env.local` com `VERCEL_OIDC_TOKEN` **dentro de `~/Público`** (pasta sincronizada) — arquivo movido para `~/.vercel-backup/` (600); (3) fases C–E (ponte de Auth, migração dos mocks, suíte integrada) seguem dependentes de autorização; (4) LGPD ainda espera os 2 prazos de retenção e o canal do titular.

---

## 2026-11-17 · (teste) — F0/F0.6: identidade dos 3 perfis + login por usuário/CPF/e-mail
**O que:** (1) os três perfis de demonstração passaram a ser **Raphael Dias** (`raphael_dias`, admin, CPF `111.111.111-11`), **Dra. Laís** (`lais_vet`, veterinário, CPF `222.222.222-22`, `CRMV-SP 00000`) e **Douglas** (`douglas_funcionario`, funcionário, CPF `333.333.333-33`), todos com senha `Veterin@ria`; (2) o campo de login/recuperação passou a aceitar **usuário, CPF (com ou sem máscara) ou e-mail**, comparados por regras puras novas em `dayvet/regras.js` (`RegrasLogin`: `somenteDigitos`, `pareceCpf`, `chaveLogin`, `encontraUsuario`, `formatarCpf`); (3) os botões de `#acessos-teste` preenchem **usuário + senha** e mostram o CPF no status; (4) header e receita deixaram de exibir o mock antigo "Dr. Douglas Ferreira / CRMV-SP 45678"; (5) **bug corrigido na revisão**: ao imprimir documento clínico logado como admin/funcionário (sem CRMV), o nome saía do usuário logado e o registro do veterinário de referência — assinatura de duas pessoas diferentes. Agora nome e CRMV andam juntos (`RegrasTutor.assinaturaDocumento`): quem não tem CRMV não assina, assina o vet de referência.
**Por quê:** decisão do dono em 2026-11-17 — por ora a página roda **100% com dados mockados** (Fase B parada), e a demonstração precisa refletir as três pessoas reais do projeto. O login por um único identificador rígido (CPF exato com máscara) causava "digitei certo e não entrou".
**Onde:** `dayvet/regras.js` (namespaces `RegrasLogin` e `assinaturaDocumento`), `dayvet/script.js` (`usuariosMock`, `perfisTestes`, `ACESSOS_TESTE`, `currentUser`, array `administradores` da receita, `realizarLogin` via `RegrasLogin.encontraUsuario`, recuperação de senha), `dayvet/index.html` (rótulos/placeholders do login e da recuperação, header e rodapé da receita), `tests/unit/regras.mjs` (+25 casos: normalização de identificador e assinatura), `tests/regressao/03-assinatura-documento.mjs` (novo), `tests/publicado.mjs` (novo — verificação da URL publicada), `tests/e2e.mjs` (cenário `acessos` ajustado, cenário novo `identificadores` e checagem de assinatura no `admin`), `local/ACESSOS_TESTE.md` (credenciais, fora do Git), `docs/MAPA_DO_SISTEMA.md` §3, `ROADMAP.md` (Fase B parada, org `dayvet-org`, single-clinic e paleta registrados como decididos/adiados).
**Decisões embutidas:** a comparação de CPF é por **dígitos** (não por texto), então `11111111111`, `111.111.111-11` e `111 111 111 11` são equivalentes; usuário/e-mail comparam em minúsculas e com `trim`. CPF de dígito repetido continua **válido para login** mas **inválido no cadastro** (`validarCPF`), o que é aceitável porque são contas de demonstração.
**Validações:** `node --check dayvet/script.js` e `regras.js`; `tests/estatico.mjs` verde; `tests/unit/regras.mjs` **42/42**; `tests/regressao` **3/3** (o 03 falha sem o fix — confirmado numa cópia revertida); `tests/e2e.mjs todos` verde, incluindo `acessos` (3 botões preenchem usuário/senha + nome no header), `identificadores` **16/16** (usuário, maiúsculas, CPF sem máscara, CPF mascarado e e-mail para os 3 perfis, + senha errada não entra) e `admin` (documento assinado por "Dra. Laís — CRMV-SP 00000", nome e registro coerentes).
**Publicação:** `teste` (`6edaef6`) mesclada na `main` (`a57b7c7`, merge `--no-ff`) em 2026-11-17; workflow `deploy-pages` run `44134023647` concluído com sucesso. Verificado **na URL real** com `node tests/publicado.mjs`: 15 checagens verdes (assets novos no ar, login por usuário/CPF mascarado/CPF sem máscara dos 3 perfis, senha errada bloqueada, receita assinada por Dra. Laís com CRMV-SP 00000, zero erro de console/HTTP, mobile 390 px sem overflow). Print: `/tmp/ai-evidence/publicado-receita.png`.

---

## 2026-11-13 · (teste) — Fase A: SQL v2 (single-clinic) validado localmente
**O que:** três migrations novas em `supabase/migrations/` substituem o SQL antigo de `docs/sql/` (que fica só como histórico): `0001_schema.sql` (7 tabelas, IDs/enums/índices/checks/triggers), `0002_seed.sql` (catálogos `vacina_tipos` e `raca_tipos`, idempotente) e `0003_rls.sql` (policies + grants + helpers). Junto entrou `supabase/tests/` (stub de `auth` + matriz de permissões) e o runner `tests/db.mjs`.
**Por quê:** o SQL de 2026-11-02 não executava (typo `OG.created_at`, `END IF` sem `;`, `INSERT` sem `;`, enum `guia`) e, se executasse, negava todo acesso (`current_setting('request.jwt.claims.cpf')` não existe) e recursava o RLS (`is_admin()` consultando a própria tabela protegida). Decisões do dono: single-clinic, Auth por CPF, projeto novo `agendau-2`, demo continua mock.
**Onde:** `supabase/migrations/0001_schema.sql`, `0002_seed.sql`, `0003_rls.sql`; `supabase/tests/00_auth_stub.sql`, `10_matriz_rls.sql`; `tests/db.mjs`; docs (`ROADMAP.md` §2.b, `AGENTS.md`, `docs/DB_LEVANTAMENTO.md`).
**Decisões embutidas:** sem `clinicas`/`clinica_id`; `usuarios.id = auth.users.id` (senha fica no Auth); enum de histórico só `receita`/`vacina`; sem `vacinacoes`/`forma_farmaceutica`; `agendamentos.pet_id` nullable; `historico_clinico` editável/excluível por admin e vet (RLS, sem trigger de imutabilidade); papel lido de `usuarios.role` (não do JWT) por função `SECURITY DEFINER` — sem recursão de policy e sem claim forjável.
**Validações:** `node tests/db.mjs` em Postgres 17 (`postgres:17-alpine`) — 0001→0003 aplicam com `ON_ERROR_STOP`, seed rodado 2× sem duplicar (10 vacinas / 31 raças), **73 casos de matriz de RLS verdes** (admin/vet/func × SELECT/INSERT/UPDATE/DELETE, anon negado por GRANT, usuário inativo/excluído sem acesso, funcionário não consegue se promover a admin). Suíte do front segue verde (estático, unit 17/17, regressão 2/2, E2E 5 cenários).

---

## 2026-11-13 · (teste) — Botões de acesso rápido de teste no login
**O que:** card `#acessos-teste` na tela de login com 3 botões (Admin / Veterinário / Funcionário). Cada um preenche `#login-cpf` e `#login-password` com as credenciais do perfil (`ACESSOS_TESTE` em `script.js`) e escreve o status em `#acessos-teste-status`; o usuário confirma em "Acessar o Painel". O atalho digitado 1/2/3 (`perfisTestes`) continua funcionando.
**Por quê:** decisão do dono em 2026-11-13 — o bypass **fica durante os testes**, mas precisa ser explícito e de um clique, em vez de exigir adivinhar que digitar `1` loga. Diferente do atalho, os botões passam pelo caminho de login real (`usuariosMock`), então ao ligar o Supabase basta apontar as contas de teste.
**Onde:** `dayvet/index.html` (bloco após o campo de senha), `dayvet/script.js` (`ACESSOS_TESTE` + `preencherAcessoTeste()`), `tests/e2e.mjs` (novo cenário `acessos`, incluído na lista padrão), `docs/MAPA_DO_SISTEMA.md`, `AGENTS.md` e `ROADMAP.md` (registram que o bypass permanece por decisão do dono).
**Validações:** `node --check dayvet/script.js`; `tests/estatico.mjs` verde; `tests/unit/regras.mjs` 17/17; `tests/regressao/run.mjs` 2/2; `tests/e2e.mjs` com 5 cenários (admin, vet, func, acessos, mobile) verde — o cenário novo prova CPF/senha preenchidos e login dos 3 perfis, com `#nav-clinica` oculto para o funcionário. Prints em `/tmp/ai-evidence/login-dark.png`, `login-light.png` e `login-mobile.png` (3 botões cabem em 390 px).

---

## 2026-11-13 · (main publicada) — itens 18–22 na produção do GitHub Pages
**O que:** `teste` (`e7a57b6`) mesclada na `main` (`9b6abd6`, merge `--no-ff`) e publicada. Workflow `deploy-pages` rodou com sucesso (`run 43451618568`) e a demo passou a servir `regras.js` em `dist/dayvet/`.
**Por quê:** autorização do dono ("pode ir pra main, garanta que esteja na demo").
**Onde:** `main` e `teste` no `origin` (`Ralph-zlt/Agendau_2`); produção em https://ralph-zlt.github.io/Agendau_2/dayvet/.
**Validações na URL publicada:** `/` 200, `/dayvet/` 200, `/dayvet/regras.js` 200 (3,7 KB); Playwright em produção — login admin OK, "Incluir Guia" ausente do clínico, `window.RegrasTutor` carregado, "Mostrar arquivados"/"Arquivar" presentes, zero erro de console ou HTTP ≥400.
**Observação:** push exigiu o escopo `workflow` no token do `gh` (ver `LICOES.md` 2026-11-13).

---

## 2026-11-13 · (merge de `origin/main` para a `teste`) — SQL documentado + itens da main antiga
**O que:** merge de `origin/main` (`2186c34`, 11 commits) na `teste`, resolvendo conflito só em `ROADMAP.md`. A main trazia `LICENSE` (MIT), `docs/sql/*` (schema/seeds/RLS gerados em 2026-11-02), `docs/levantamento-bd.md` e itens de roadmap (multi-clinic, excluir pet, pesquisa de tutores, excluir tutor, remover guia). Dois desses itens já estavam entregues por nós e foram marcados: **excluir tutor** (item 20) e **remover guia** (item 19). Banco/Vercel/LGPD continuam pausados; os `.sql` entram como **escritos, não aplicados**.
**Por quê:** a `teste` havia nascido antes de a `main` avançar; sem isso o merge para a `main` seria conflituoso e o roadmap voltaria a pedir coisas já feitas.
**Onde:** `ROADMAP.md` (§2 reorganizada: alta prioridade de frontend, §2.b pausados, §2.c baixa prioridade), `docs/DB_LEVANTAMENTO.md` e `docs/MAPA_DO_SISTEMA.md` (registram `docs/sql/` como escrito e não aplicado), `.gitignore` (novo: `.vscode/`, `local/`, `opencode.json`).
**Validações:** árvore limpa após o merge; `node tests/estatico.mjs`, `tests/unit/regras.mjs` 17/17, `tests/regressao/run.mjs` 2/2 e `tests/e2e.mjs` (4 cenários) verdes no código mergeado.

---

## 2026-11-13 · (teste) — Item 20: exclusão de tutor (arquivar → restaurar → excluir definitivo)
**O que:** tutor ganhou `arquivado` (soft delete) com ações "Arquivar", "Restaurar" e "Excluir definitivo" e selo "Arquivado"; botão "Mostrar arquivados" na aba Tutores & Pets; arquivado sai da lista padrão e dos 3 selects (agendamento, novo pet, módulo clínico). Regras puras em `dayvet/regras.js` (`podeArquivarTutor`, `podeExcluirTutor`): arquivar bloqueado com agendamento pendente/confirmado; excluir só depois de arquivado e sem pets/agendamentos/histórico clínico, com confirmação digitando o CPF. RBAC: `tutor_editar`/`tutor_arquivar`/`tutor_excluir` para admin e funcionário (decisão do dono 2026-11-13).
**Por quê:** pedido do dono — permitir tirar tutores inativos da operação sem perder histórico (LGPD/retenção) e evitar exclusão acidental.
**Onde:** `dayvet/index.html` (botão do filtro + `<script src="regras.js">`), `dayvet/regras.js` (novo), `dayvet/script.js` (RBAC, `renderizarTutores`, ações, filtros dos selects), `.github/workflows/deploy-pages.yml` (copia `regras.js`), `tests/unit/regras.mjs`, `tests/regressao/02-tutor-arquivar.mjs`, `tests/e2e.mjs`, docs.
**Validações:** `node tests/estatico.mjs` ✓; `node tests/unit/regras.mjs` 17/17 ✓; `node tests/regressao/run.mjs` 2/2 ✓; `node tests/e2e.mjs` (Chromium) e `firefox` ✓ com prints em `/tmp/ai-evidence/`.

---

## 2026-11-13 · (teste) — Item 19: guia de encaminhamento removida (RF-10 cancelado)
**O que:** removidos o atalho "Incluir Guia", a opção "Guia de Encaminhamento / Exame" do select de tipo, o mock 403, os branches `tipo === 'guia'` (render/impressão/label), a entrada nos títulos de impressão, o título "Receitas e Guias Emitidos" e a opção "Relatório de Receitas e Guias Emitidas" (agora "Receitas Emitidas"). `docs/requisitos-funcionais-dayvet.docx`: RF-10 marcado como FORA DE ESCOPO / REQUISITO CANCELADO.
**Por quê:** decisão do dono em 2026-11-13 — a clínica não emite guia; emissão fica restrita a receita e registro de imunização.
**Onde:** `dayvet/index.html`, `dayvet/script.js`, `docs/requisitos-funcionais-dayvet.docx`, `docs/DB_LEVANTAMENTO.md` (enum), `docs/MAPA_DO_SISTEMA.md`, `ROADMAP.md` (item 19 + histórico).
**Validações:** `grep -i guia dayvet/` = zero; `node tests/estatico.mjs` ✓; `tests/regressao/01-guia-removida.mjs` ✓ (inclui leitura do docx); E2E admin ✓ (atalho ausente, select só com receita/vacina); docx reaberto (`unzip -t` OK).

---

## 2026-11-13 · (teste) — Escopo: banco/Vercel/LGPD pausados + harness de testes + PROJETOS.md
**O que:** Supabase, importação de dados, Vercel e LGPD marcados como **pausados** em ROADMAP §2.b, no MAPA, no AGENTS e no DB_LEVANTAMENTO (sem alterar a arquitetura decidida); `~/Público/Projetos/PROJETOS.md` recriado com o índice real de projetos; criada a suíte `tests/` (estático, unitário, E2E Playwright e regressão numerada) e registrada a reinstalação dos navegadores em `TOOLS.md`.
**Por quê:** decisão do dono — foco no frontend; documentação não podia continuar dizendo que banco/hospedagem eram o próximo passo.
**Onde:** `ROADMAP.md`, `AGENTS.md`, `docs/MAPA_DO_SISTEMA.md`, `docs/DB_LEVANTAMENTO.md`, `docs/CHANGELOG.md`, `tests/*`, `~/Público/Projetos/PROJETOS.md`, `~/workspace/agents/TOOLS.md`.
**Validações:** baseline e pós-mudança do `tests/estatico.mjs` e `tests/e2e.mjs` (Chromium/Firefox) ✓; Chromium+Firefox reinstalados e verificados (`~/.cache/ms-playwright` com symlink).

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