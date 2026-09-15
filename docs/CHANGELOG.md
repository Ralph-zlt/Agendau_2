# CHANGELOG — DayVet-Gestão

> Histórico das alterações **desde o código original**, com o que mudou, por quê e onde.
> Última entrada no topo. Mantenha atualizado a cada commit.
> Fonte histórica: `git log` do repositório (Agendau_2 / Proj_Integrador_DAY_VET_1.0).

## Como manter
A cada commit, adicione no topo: **data · hash · resumo (o que / por quê / onde mexer)**. Mantenha entradas compactas.

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