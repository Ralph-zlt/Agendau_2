# AGENTS.md — DayVet-Gestão

> ⚠️ **RISCO ALTO DE SEGURANÇA — SOMENTE PROTOTIPAÇÃO:** contas 1/2/3 entram sem senha válida e sem troca obrigatória. REMOVER `perfisTestes`, `password_demo` e qualquer bypass antes da implantação. Em produção: hash de senha, sem bypass, `mustChange=true` p/ todo primeiro acesso.
> **Exceção vigente (decisão do dono, 2026-11-13):** o bypass **fica** enquanto durar a fase de testes. Ele é exposto por botões visíveis no login (`#acessos-teste` → `preencherAcessoTeste()`), que preenchem CPF + senha dos 3 perfis. Não remover sem ordem explícita; ao ligar o Supabase, os botões passam a apontar para as contas de teste reais.

Instruções para **IAs e colaboradores** que forem editar este código.

## Antes de editar (obrigatório)
- Leia **`docs/MAPA_DO_SISTEMA.md`** — estrutura, RBAC, temas e onde vive cada funcionalidade.
- Leia **`docs/CHANGELOG.md`** — histórico do que foi feito e por quê.
- Consulte **`docs/requisitos-funcionais-dayvet.docx`** — fonte de RFs/RNFRs/RNFS (funcionalidades e casos de uso; frontend/temas ficam só no roadmap).
- Consulte `../PROJETOS.md` para o estado geral e os documentos da metodologia.
- Só altere o que a tarefa pede; mantenha as convenções do projeto (pt-BR, seções comentadas).

## Metodologia e fases

Este é um produto de mercado e segue o nível profissional da programação
automatizada. Antes de implementar, enriquecer o pedido, registrar requisitos,
decisões e critérios de aceitação e dividir o trabalho em fases. Ao encerrar
cada fase, relatar resultado, documentos alterados, validações, riscos,
pendências e próximo agente. As exigências acadêmicas do arquivo de requisitos
ou da professora têm prioridade sobre convenções genéricas.

## Branches (obrigatório)
- `main` = estável, só o dono valida e mergeia. IA NUNCA commita/pusha direto na `main`.
- `teste` = única branch de trabalho da IA. Todo código novo vai para `teste`.
- PROIBIDO criar `teste/*`, `test/*`, `feature/*` ou qualquer outra branch sem autorização explícita do dono.
- Antes de codar: `git fetch origin` + conferir `git branch -r` — se já existe `teste`, usar ela.

## Onde está o código
- O produto fica em **`dayvet/`**: `index.html` (estrutura), `styles.css` (estilos), `script.js` (lógica). Nada fora dessa pasta é o produto.
- SPA + Supabase SQL **pausado** (decisão do dono 2026-11-13; decisão original 2026-09-22): hoje e por tempo indeterminado os dados são mock em memória; pontos de migração em `TODO [INTEGRAÇÃO SUPABASE]:` (antes `TODO [INTEGRAÇÃO BANCO DE DADOS FUTURA]:`). Nada de criar projeto, aplicar SQL ou publicar fora do GitHub Pages.

## Não versionar
- `local/` (relatórios pessoais de metodologia/commit) e `opencode.json` (config local da ferramenta).

## Stack
- HTML/CSS/JS puros + CDNs externas: Tailwind CSS, Lucide (ícones), Chart.js (gráficos), Google Fonts. Sem build e sem servidor; backend SQL via Supabase planejado, **não criado e pausado**. Regras puras de negócio testáveis ficam em `dayvet/regras.js`.

## RBAC vigente (resumo — detalhe em `docs/MAPA_DO_SISTEMA.md` §3 e `script.js` SEÇÃO 2)
- `admin` = `*` (tudo, incl. tipos de vacina/raça). `veterinario` = clínico + vacinação total + CRUD tipos de vacina + dashboard sem financeiro. `funcionario` = SEM modo clínico (sem `clinica_*`/`vacina_tipos_*`); agendamentos só-leitura + tutor/pet (inclui `tutor_editar`/`tutor_arquivar`/`tutor_excluir`, decisão 2026-11-13) + tipos de raça. Item 18 (só na `teste`, a mergear) consolidou a parte de vacinas — `main` ainda tem vacina=funcionário.

## Validação de mudanças

**Antes de qualquer commit ou entrega, rode a suíte do projeto (obrigatório):**

```bash
node tests/estatico.mjs      # sintaxe, IDs/handlers, blocos, z-index
node tests/unit/regras.mjs   # regras puras (tabela entrada → saída)
node tests/e2e.mjs           # Chromium: login 1/2/3, abas, clínico, tutores, mobile
node tests/e2e.mjs firefox   # quando mexer em layout/tema
```

Correção de bug exige `tests/regressao/NN-<slug>.mjs` (falha sem o fix, passa com ele).
A skill `testar-frontend` continua como referência em `~/Público/Projetos/.github/skills/testar-frontend/SKILL.md`
(fora deste repo) e documenta o mesmo conjunto de checagens. Teste manual no navegador
(logins 1/2/3 e os 2 temas) segue obrigatório antes do merge.

A skill cobre 4 verificações obrigatórias via `node` (sem browser):
1. `node --check dayvet/script.js` — sintaxe JS sem erros.
2. IDs referenciados no JS existem no HTML (nenhum getElementById quebrado).
3. Z-index de modais que operam sobre o login — devem ser `z-[60]` ou superior quando `login-screen` usa `backdrop-blur` (que cria stacking context).
4. Funções `onclick="fn()"` no HTML definidas no JS.

Adicionalmente, teste no navegador abrindo `dayvet/index.html`:
- Logins de teste: botões de acesso rápido (Admin/Veterinário/Funcionário) preenchem CPF + senha; digitar `1`, `2`, `3` no CPF continua funcionando como bypass. Alternância de tema claro/escuro.
- Fluxo "Esqueci a senha?" deve abrir o modal por cima da tela de login.
- Ao remover funcionalidade: conferir com busca (grep) que não sobraram referências em `index.html` e `script.js`.

## Cores / Temas
- **Método padrão com variáveis CSS**: para mudar a cor de um tema, edite **apenas os valores das variáveis** no bloco `:root[data-theme='light'] { ... }` (seção **"7. TEMA CLARO"**) ou `:root[data-theme='dark'] { ... }` (seção "6. TEMA ESCURO") de `dayvet/styles.css`. Cada variável tem comentário em pt-BR (fundos, textos, bordas, marca, status). Não é preciso mexer nas regras de aplicação — elas apenas espelham as variáveis nas classes Tailwind.
- **Tela de login**: segue o tema ativo — claro = card branco sem neon (`#login-cabecalho` com gradiente claro explícito); escuro = neon original. Ícone paw-print em lima `#ccff00` fixo nos 2 temas. (As vars `--login-*` ainda existem em `styles.css` mas sem uso ativo — candidatas a remoção futura.)
- **Pendente:** ainda falta refinar a escolha de cores da paleta do modo claro (nomes das variáveis estão em `styles.css` seção 7 e no `docs/MAPA_DO_SISTEMA.md` §6).

## A cada commit (manutenção do doc)
- Adicione uma entrada no topo de `docs/CHANGELOG.md` (data + o que mudou + por quê + onde).