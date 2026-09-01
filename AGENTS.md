# AGENTS.md — DayVet-Gestão

Instruções para **IAs e colaboradores** que forem editar este código.

## Antes de editar (obrigatório)
- Leia **`docs/MAPA_DO_SISTEMA.md`** — estrutura, RBAC, temas e onde vive cada funcionalidade.
- Leia **`docs/CHANGELOG.md`** — histórico do que foi feito e por quê.
- Só altere o que a tarefa pede; mantenha as convenções do projeto (pt-BR, seções comentadas).

## Onde está o código
- O produto fica em **`dayvet/`**: `index.html` (estrutura), `styles.css` (estilos), `script.js` (lógica). Nada fora dessa pasta é o produto.
- SPA sem backend: dados mock em memória; integração futura com banco (comentários `TODO [INTEGRAÇÃO BANCO DE DADOS FUTURA]:`).

## Não versionar
- `local/` (relatórios pessoais de metodologia/commit) e `opencode.json` (config local da ferramenta).

## Stack
- HTML/CSS/JS puros + CDNs externas: Tailwind CSS, Lucide (ícones), Chart.js (gráficos), Google Fonts. Sem build e sem servidor.

## Validação de mudanças
- `node --check dayvet/script.js` (sintaxe sem erros).
- Testar no navegador abrindo `dayvet/index.html`: logins de teste CPF `1` (Admin), `2` (Veterinário), `3` (Funcionário); alternância de tema claro/escuro.
- Ao remover funcionalidade: conferir com busca (grep) que não sobraram referências em `index.html` e `script.js`.

## Cores / Temas
- **Método padrão com variáveis CSS**: para mudar a cor de um tema, edite **apenas os valores das variáveis** no bloco `:root[data-theme='light'] { ... }` (seção **"7. TEMA CLARO"**) ou `:root[data-theme='dark'] { ... }` (seção "6. TEMA ESCURO") de `dayvet/styles.css`. Cada variável tem comentário em pt-BR (fundos, textos, bordas, marca, status, login). Não é preciso mexer nas regras de aplicação — elas apenas espelham as variáveis nas classes Tailwind.
- Exceção: a tela de login mantém o neon escuro nos dois temas (variáveis `--login-*` no fim do bloco claro; bloco `:root[data-theme='light'] #login-screen ...`).
- **Pendente:** ainda falta refinar a escolha de cores da paleta do modo claro (nomes das variáveis estão em `styles.css` seção 7 e no `docs/MAPA_DO_SISTEMA.md` §6).

## A cada commit (manutenção do doc)
- Adicione uma entrada no topo de `docs/CHANGELOG.md` (data + o que mudou + por quê + onde).