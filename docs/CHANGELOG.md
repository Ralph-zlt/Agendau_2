# CHANGELOG — DayVet-Gestão

> Histórico das alterações **desde o código original**, com o que mudou, por quê e onde.
> Última entrada no topo. Mantenha atualizado a cada commit.
> Fonte histórica: `git log` do repositório (Agendau_2 / Proj_Integrador_DAY_VET_1.0).

## Como manter
A cada commit, adicione no topo: **data · hash · resumo (o que / por quê / onde mexer)**. Mantenha entradas compactas.

---

## 2026-09-15 · (pending) — Roadmap, levantamento DB, fluxo Git e pausa de styling
**O que:** adição de `ROADMAP.md` (Fase 2 EM TESTE, Fase 3 BLOQUEADA stakeholders), `docs/DB_LEVANTAMENTO.md` (mapeamento de tabelas para o BD) e estruturação do fluxo Git (`main` estável vs branches de teste) neste CHANGELOG. Fluxo de testes de "Recuperar Senha" (mock) em branch `teste/recuperar-senha` — modal funcional sem backend.
**Por quê:** organizar o desenvolvimento com separação clara entre código estável (main) e experimentos (branches teste), documentar dependências de banco de dados antes de implementar, e pausar refinamento de temas até que o fluxo funcional esteja validado.
**Onde:** `ROADMAP.md`, `docs/DB_LEVANTAMENTO.md`, `docs/CHANGELOG.md`, `dayvet/index.html` (modal recuperar senha — mantido só em branch teste). O `dayvet/styles.css` **não foi alterado** neste conjunto; styling continua pausado.
**⚠ PENDENTE:** `dayvet/styles.css` (temas) aguarda revisão; `docs/MAPA_DO_SISTEMA.md` deve ser atualizado quando o fluxo de testes for mergeado em main.

---

## 2026-09-14 · (próximo commit) — Artefato compilado para demonstração pública
**O que:** criado o workflow de GitHub Pages que monta `dist/` com uma página de entrega e a SPA funcional em `dist/demo/`.
**Por quê:** manter o repositório privado como fonte e publicar apenas o artefato estático necessário para a demonstração.
**Onde:** `.github/workflows/deploy-pages.yml` e `site/index.html`.

---

## 2026-09-14 · (próximo commit) — Entrada para demonstração no GitHub Pages
**O que:** adicionada uma página de entrada na raiz que encaminha para a SPA em `dayvet/`, além de `.nojekyll` para publicação estática direta.
**Por quê:** permitir uma URL única de entrega e demonstração sem duplicar os arquivos do produto.
**Onde:** `index.html` e `.nojekyll` na raiz do repositório.

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