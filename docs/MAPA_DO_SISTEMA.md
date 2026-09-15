# MAPA DO SISTEMA — DayVet-Gestão

> Referência para IAs e colaboradores editarem o código com contexto.
> Última revisão: 15/09/2026 · Base: merge `teste/auth-empresarial` → `main`
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
- **Login por CPF ou e-mail + senha** — campo aceita ambos; erro sempre genérico "Credenciais inválidas" (não revela existência de conta).
- **Usuários de teste**: CPF `1`/senha `1` = Admin · CPF `2`/senha `2` = Veterinário (mustChange=true) · CPF `3`/senha `3` = Funcionário (mustChange=true).
- **Primeiro acesso (mustChange=true)**: usuários 2 e 3 são obrigados a trocar a senha antes de entrar. Política: 8+ chars, 1 maiúscula, 1 número, 1 especial. Indicadores visuais em tempo real. Mock: flag reseta ao recarregar (sem banco).
- **Recovery demo**: "Esqueci a senha?" → informa CPF ou e-mail → toast "e-mail enviado" (sempre, exista ou não o usuário) → define nova senha com mesma política. Botão fora do `<form>` (evita bloqueio de validação nativa do browser).
- **Admin cria usuários**: aba Usuários → "+ Novo" → exige email obrigatório, valida CPF (dígito verificador), unicidade → gera senha temporária + mustChange=true.
- **Implantação (método do dono)**: sem rota de setup — admin cadastra CPF+e-mail do responsável; 1º acesso exige troca de senha para todos os perfis (admin/vet/func) via `mustChange`.
- **Cargos**: `admin` (acesso total), `veterinario` (módulo clínico/consultas), `funcionario` (operacional/agendamentos). O cargo `gestor` foi **removido**.
- Matriz de permissões: `script.js` **SEÇÃO 2** (~linha 64, `PERMISSOES`).
- **TODO [INTEGRAÇÃO BANCO DE DADOS FUTURA]**: tabela `users` com `role` vinculado ao CPF/email, bcrypt, JWT, `POST /api/login`, `GET /api/me`.

## 4. Mapa de seções (script.js)

| Seção | Linha | Conteúdo |
|---|---|---|
| 1 · DADOS MOCK | ~11 | Arrays simulando banco (agendamentos, pets, tutores, usuariosMock) |
| 2 · MATRIZ DE PERMISSÕES (RBAC) | ~64 | `PERMISSOES` por perfil |
| 3 · AUTENTICAÇÃO E LOGIN | ~99 | Login por CPF, sessão mock (`currentUser`/`currentRole`), logout |
| 4 · TOASTS | ~166 | Notificações `showToast` |
| 5 · NAVEGAÇÃO E TABS | ~194 | `switchTab`, guards RBAC, `atualizarPermissoesNavegacao` |
| 6 · AGENDAMENTOS | ~304 | CRUD/status de agendamentos (filtros por status + período: todos/hoje/futuros/passados, ordenado por data/hora); painel do vet (`renderizarPainelVet`, `atualizarDashboardPorPerfil`) |
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
| Config Tailwind (cores `brand-*`) | `<head>` | brand-dark #03001e · brand-lime #ccff00 · brand-pink #ff007f · brand-blue #0066ff · brand-purple #8b00ff · brand-yellow #ffcc00 |
| Script inline do tema | ~56-64 | Aplica `data-theme` no `<html>` antes do render (evita flash) |
| `#login-screen` | ~72 | Tela de login (neon no escuro; clara sem neon no modo claro — Fase 5, branch `teste`); `#login-cabecalho` = faixa azul→roxo no claro p/ contraste do nome |
| `#painel-vet-hoje` | dashboard | Agenda do dia do veterinário (contadores + lista hora/pet/tutor/serviço/status); `#painel-financeiro` fica oculto p/ vet — ver `atualizarDashboardPorPerfil()` |
| `#filtro-data-ag` | agendamentos | Select de período (todos/hoje/futuros/passados) → `filtrarAgendamentosData()` |
| `#btn-tema-login` | ~75 | Botão sol/lua no canto sup-dir do header do login (z-[61]) — alterna tema antes do login |
| `#btn-esqueci-senha` | ~120 | Fora do `<form>` (evita bloqueio por campos required); hover roxo via `setProperty` |
| `header` (topbar) | ~130 | Perfil do usuário, `#btn-tema`, logout |
| `nav` (tabs) | ~180 | Botões `#nav-<tab>` |
| Modais sobre login | ~1060+ | `#modal-recuperar-senha` e `#forcar-senha-etapa` com `z-[60]` (acima do login z-50 com backdrop-blur) |
| Demais modais | ~640+ | `#modal-*` com `z-50` (usados pós-login) |

## 6. Temas claro/escuro (importante)
- **Mecanismo**: atributo `data-theme` no `<html>`. Padrão = `prefers-color-scheme` do sistema; escolha manual salva em `localStorage` (chave `dayvet-tema`).
- **Botões de tema**: `#btn-tema` no header (pós-login) e `#btn-tema-login` no canto sup-dir do login (pré-login). Ambos chamam `alternarTema()` e são sincronizados por `atualizarIconeTema()`.
- **Método padrão com variáveis CSS**: edite **apenas os valores das variáveis** nos blocos `:root[data-theme='dark']` (seção 6) e `:root[data-theme='light']` (seção 7) de `styles.css`.
- **Tela de login**: segue o tema ativo (Fase 5, branch `teste`) — modo claro = card branco sem neon; modo escuro = neon original. Variáveis `--login-*` removidas.
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
- Comentários `// TODO [INTEGRAÇÃO BANCO DE DADOS FUTURA]:` marcam os pontos de plugar a API.
- Nomes de funções/variáveis em **pt-BR**; código organizado em **SEÇÕES numeradas**.
- Relatórios pessoais (metodologia/commit) ficam na pasta `local/` — **não versionar**, assim como `opencode.json`.
- Validação mínima antes de concluir: `node --check dayvet/script.js` + testar logins 1/2/3 e alternância de tema no navegador.