# MAPA DO SISTEMA — DayVet-Gestão

> Referência para IAs e colaboradores editarem o código com contexto.
> Última revisão: 01/09/2026 · Base: commit `3ea1cdd`
> Atenção: números de linha são referências — confirme antes de editar.

## 1. Visão geral
- SPA (single-page application) de agenda para **pet shop / clínica veterinária**.
- **Sem backend**: dados mock em memória (arrays), que serão trocados por API/banco nas integrações futuras.
- **Stack**: HTML + CSS + JS puros com CDNs externas — Tailwind CSS (utilitários), Lucide (ícones), Chart.js (gráficos), Google Fonts (Plus Jakarta Sans).
- Estrutura em **3 arquivos na pasta `dayvet/`**.

## 2. Estrutura de arquivos

| Arquivo | Papel | Observações |
|---|---|---|
| `dayvet/index.html` | Estrutura/marcação (SPA) | <head> com config Tailwind + cores de marca; tela de login; header; nav de tabs; seções `<section id="tab-...">`; modais `#modal-*`; CDNs |
| `dayvet/styles.css` | Estilo (seções) | Base, scrollbar, neon, glass, impressão, **sistemas de tema escuro/claro** |
| `dayvet/script.js` | Lógica (13 seções) | Mock data, RBAC, login, toasts, navegação, agendamentos, tutores & pets, clínico, relatórios, usuários, gráficos, tema, inicialização |

## 3. Autenticação e perfis (RBAC)
- **Login por CPF + senha** (senha aceita qualquer valor até o backend existir).
- **Usuários de teste**: CPF `1`/`111` = Admin · CPF `2`/`222` = Veterinário · CPF `3`/`333` = Funcionário. CPF não cadastrado não loga (toast de erro).
- **Cargos**: `admin` (acesso total), `veterinario` (módulo clínico/consultas), `funcionario` (operacional/agendamentos). O cargo `gestor` foi **removido** — o admin assumiu as funções.
- Matriz de permissões: `script.js` **SEÇÃO 2** (~linha 64, `PERMISSOES`). Navegação filtrada por perfil e guards de tab em `switchTab`.
- **TODO [INTEGRAÇÃO BANCO DE DADOS FUTURA]**: tabela `users` com `role` vinculado ao CPF, `POST /api/login`, `GET /api/me`, validação de autorização no servidor.

## 4. Mapa de seções (script.js)

| Seção | Linha | Conteúdo |
|---|---|---|
| 1 · DADOS MOCK | ~11 | Arrays simulando banco (agendamentos, pets, tutores, usuariosMock) |
| 2 · MATRIZ DE PERMISSÕES (RBAC) | ~64 | `PERMISSOES` por perfil |
| 3 · AUTENTICAÇÃO E LOGIN | ~99 | Login por CPF, sessão mock (`currentUser`/`currentRole`), logout |
| 4 · TOASTS | ~166 | Notificações `showToast` |
| 5 · NAVEGAÇÃO E TABS | ~194 | `switchTab`, guards RBAC, `atualizarPermissoesNavegacao` |
| 6 · AGENDAMENTOS | ~304 | CRUD/status de agendamentos (filtros por status/data) |
| 7 · TUTORES & PETS | ~485 | CRUD de tutores e pets, dropdowns |
| 8 · MÓDULO CLÍNICO | ~643 | Histórico clínico: laudo/guia/receita/vacina + impressão |
| 9 · RELATÓRIOS | ~778 | Relatórios de serviços, tutor e período |
| 10 · USUÁRIOS & PERMISSÕES | ~975 | Gestão de logins mock (CRUD simulado) |
| 11 · GRÁFICOS (Chart.js) | ~1066 | `financeChart` (gráfico de receita) |
| 12 · TEMA CLARO/ESCURO | ~1101 | `aplicarTema`, `temaSistema`, `inicializarTema`, `alternarTema`, `atualizarIconeTema` |
| 13 · INICIALIZAÇÃO | ~1148 | `window.onload` (chama renders + `inicializarTema`) |

## 5. Pontos-chave em index.html

| Item | Linha (aprox.) | Nota |
|---|---|---|
| Config Tailwind (cores `brand-*`) | `<head>` | brand-dark #03001e · brand-card #0a0029 · brand-lime #ccff00 · brand-pink #ff007f · brand-blue #0066ff · brand-purple #8b00ff · brand-yellow #ffcc00 |
| Script inline do tema | ~56-64 | Aplica `data-theme` no `<html>` antes do render (evita flash) |
| `#login-screen` | ~72 | Tela de login neon (mantém aparência escura nos dois temas) |
| `header` (topbar) | ~120 | Perfil do usuário, `#btn-tema` (~162), logout |
| `nav` (tabs) | ~172 | Botões `#nav-<tab>` |
| Modais | ~636+ | `#modal-*` (editar pet, tutor, agendamento, valores, permissões, usuários, relatórios etc.) |

## 6. Temas claro/escuro (importante)
- **Mecanismo**: atributo `data-theme` no `<html>`. Padrão = `prefers-color-scheme` do sistema (com acompanhamento ao vivo); escolha manual salva em `localStorage` (chave `dayvet-tema`).
- **Botão**: `#btn-tema` no header (ícone lua/sol). Lógica: `script.js` SEÇÃO 12.
- **Onde editar cores do modo claro**: `styles.css`, seção **"7. TEMA CLARO"** — regras `:root[data-theme='light'] .<classe> { ... }` sobrescrevem cada classe utilitária do Tailwind usada no HTML.
  - Fluxo: (1) localize a classe no elemento em `index.html`; (2) adicione/edite `:root[data-theme='light'] .<classe>`.
- **Exceção login**: bloco `:root[data-theme='light'] #login-screen ...` mantém o neon escuro — **não** alterar se a intenção for clarear o app todo.
- **Modo escuro**: bloco **"6. TEMA ESCURO"** reforça o contraste dos textos acinzentados (`text-slate-300/400/500...`).
- **PENDENTE**: as **cores do modo claro devem ser refinadas** numa próxima iteração.

## 7. Convenções
- Comentários `// TODO [INTEGRAÇÃO BANCO DE DADOS FUTURA]:` marcam os pontos de plugar a API.
- Nomes de funções/variáveis em **pt-BR**; código organizado em **SEÇÕES numeradas**.
- Relatórios pessoais (metodologia/commit) ficam na pasta `local/` — **não versionar**, assim como `opencode.json`.
- Validação mínima antes de concluir: `node --check dayvet/script.js` + testar logins 1/2/3 e alternância de tema no navegador.