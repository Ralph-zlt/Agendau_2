# ROADMAP — DayVet-Gestão

> Próximos passos do que vamos fazer. Não é documento de requisitos —
> fonte de RFs/RNFs: `docs/requisitos-funcionais-dayvet.docx`.
> Última atualização: 2026-09-24.

## 0. Links e deploy (espelho fixo da main)

- **Produção (espelho fixo da `main`): https://ralph-zlt.github.io/Agendau_2/dayvet/**
  - Workflow `.github/workflows/deploy-pages.yml` dispara **somente em `push` na `main`** (mais `workflow_dispatch` manual).
  - Artefato: `site/index.html` → `dist/index.html` (landing) + `dayvet/*` → `dist/dayvet/` (SPA).
  - **Regra: este link SEMPRE reflete a `main`. Nunca publicar a `teste` nele.**
- **Teste:** validar na branch `teste` em ambiente local (`dayvet/index.html`) ou preview temporário da `teste`. Só mergear na `main` após validação do dono.

---

## 1. Próximas (fazer agora na `teste`, nesta ordem)

- [x] **1. Login autocomplete temporário** — entregue na `main` (merge `3c1f67e`).
- [x] **2. Clínico usa tutor por CPF (chave primária)** — entregue na `main` (merge `3c1f67e`).
- [x] **3. Área de upload de documentos** — entregue na `main` (merge `3c1f67e`).
- [x] **4. Vacinação informa o tipo (select)** — entregue na `main` (merge `3c1f67e`).
- [x] **5. Layout de impressão/PDF + RF-08 ilustrativo** — entregue na `main` (merge `3c1f67e`).
- [x] **6. Tooltip instantâneo no login** — entregue na `main` (merge teste→main 2026-09-24): `title=` nativo removido do `#btn-info-login`; tooltip customizado `#tooltip-info-login` imediato no hover/foco/toque com texto do bypass (clicar na barra de CPF/e-mail); botão em roxo claro chamativo (`#C084FC`).
- [ ] **7. "Módulo clínico" do funcionário (CRUD de tipos de vacina):** SUPERSEDED pelo item 18 (decisão 2026-09-25: tipos de vacina = admin/vet; funcionário sem modo clínico). Implementação original reaproveitada (mock `tiposVacina[]`, fim do `TIPOS_VACINA` fixo + `TODO SUPABASE`, RBAC `vacina_tipos_*`).
- [ ] **8. Card de anexos nos 2 temas:** converter `#anexos-card`/`#lista-anexos` (classes escuras fixas) para as variáveis CSS de tema (`styles.css` §6/§7), junto da revisão geral de estilização. Aceite: legível no claro e consistente no escuro.
- [ ] **9. Agendamentos do funcionário só-leitura:** remover `consulta/vacinacao: agendar+editar+cancelar` do funcionário (mantém ver + relatórios, tutor/pet incluir, `clinica_imprimir`). Aceite: nenhum botão Agendar/Editar/Cancelar/Confirmar visível nem acionável nesse perfil.
- [x] **10. Cadastro de pet com espécie/raça/sexo/peso:** espécie como select (Canino, Felino, Equino, Bovino, Suíno, Ovino, Outro), raça como select por espécie (`RACAS_POR_ESPECIE` + "Outra"), sexo (Macho/Fêmea), peso em kg opcional (>0). Entregue na `teste` (aguarda validação do dono p/ merge).
- [x] **11. CRUD de tipos de raça + paridade admin + fix filtro faturamento:** raças gerenciáveis por funcionário e admin (`racasPorEspecie[]`, `#modal-tipos-raca`, RBAC `raca_tipos_*`, card na aba Tutores & Pets); admin passa a alcançar tudo que o funcionário pode (tipos de vacina e raça via `temPermissao`, vet segue só-listando); `atualizarPeriodoFaturamento()` implementado (mensal/semanal/anual + KPI). Entregue na `teste` (aguarda validação do dono p/ merge).
- [x] **12. Vet agenda vacinação + quick-add "Outro":** `vacinacao_agendar` p/ veterinário (modal Agendar aceita Vacinação); se tipo "Outro" + novo nome, adiciona ao catálogo na hora (atalho opcional do vet — vazio mantém "Outro"); catálogo segue do funcionário/admin. Entregue na `teste` (aguarda validação do dono p/ merge).
- [x] **13. Tipos com modo criar/editar + aba Expirados:** modais de vacina/raça com "Adicionar" vs "Salvar alterações" (+Cancelar edição); agendamentos com vistas Ativos/Expirados (vencidos+cancelados+concluídos), botão Concluir (perm do Confirmar) e Remarcar (volta pendente), Editar permite remarcar. Entregue na `teste` (aguarda validação do dono p/ merge).
- [x] **14. Ativos × Expirados empilhados + ações por status:** duas tabelas uma abaixo da outra (Ativos crescentes; Expirados decrescentes agrupados "Últimos 7 dias"/"Mais antigos"); concluído → Nova consulta, cancelado → Remarcar, pendente vencido → Remarcar/Cancelar/Editar; mocks com datas relativas (exemplos sempre nos dois). Entregue na `teste` (aguarda validação do dono p/ merge).
- [x] **15. Expirados em 3 faixas:** Últimos 7 dias, Este mês, depois um grupo por mês ("Agosto de 2026"...). Entregue na `teste` (aguarda validação do dono p/ merge).
- [x] **16. Dashboard do vet sem financeiro:** `vetId` nos agendamentos; vet não vê Faturamento/Receita — vê Próxima Consulta + barras por hora (consultas × vacinações de hoje, só dele); admin intacto. Entregue na `teste` (aguarda validação do dono p/ merge).
- [x] **17. Expirados colapsado + pesquisa mês/ano:** abre só Últimos 7 dias + "Carregar mais antigas" (este mês/meses ao expandir); `<input type="month">` filtra o histórico (funcionário também pesquisa — só leitura). Entregue na `teste` (aguarda validação do dono p/ merge).
- [x] **18. Vacinas = admin/vet; funcionário fora do clínico (decisão 2026-09-25):** `vacina_tipos_criar/editar/excluir` p/ admin+veterinário (vet ganha total em vacinação); funcionário perde `clinica_*` + `vacina_tipos_*` (sem aba Módulo Clínico; mantém agendamentos só-leitura, tutor/pet e tipos de raça). Entregue na `teste` (aguarda validação do dono p/ merge).

**Aceite geral:** skill `testar-frontend` passa; teste manual na `teste` antes de qualquer novo merge; `docs/CHANGELOG.md` atualizado. Fluxo padrão: código na `teste` → validação do dono → merge na `main` (exceção desta vez: merge direto `teste`→`main` validado em teste manual).

---

## 2. Baixa prioridade (depois, sem data)

- Refinamento modo claro/paleta + contrastes WCAG (variáveis `styles.css` seção 7).
- **Login no modo claro (observação do dono, 2026-09-24):** o bloco do login aparece mais escuro que o tema claro — revisar para acompanhar o claro; o ícone do DayVet muda de cor entre os temas — fixar cor única padrão nos 2 temas (não deve mudar de cor).
- RF-02 restante: tel 11 dígitos + máx 10 pets por tutor.
- RF-05: janela 07h–19h no agendamento.
- RF-08 real (pós-banco): CRMV do veterinário logado + assinatura.

## 3. Futuras — até segunda ordem (NÃO fazer)

- Banco Supabase (schema, Auth+RLS, migração dos mocks), LGPD, remover bypass 1/2/3 (`perfisTestes`, `password_demo`, `mustChange:false`).

## 4. Histórico (detalhe em `docs/CHANGELOG.md`)

- Auth empresarial (Fase 2) · Painel vet + login claro (Fase 5, refeito se preciso após reset da `teste`) · Implantação método do dono (sem `/setup`) · RF-09 laudo **cancelado** (fora de escopo, decisão clínica 2026-09-17).

## 5. Regras

- Validação: skill `testar-frontend` (`../.github/skills/testar-frontend/SKILL.md`) + navegador (logins 1/2/3, temas).
- Docs: entrada no topo de `docs/CHANGELOG.md` a cada commit; `AGENTS.md` e `docs/MAPA_DO_SISTEMA.md` sincronizados.
- Git: `main` estável (só dono mergeia; IA nunca pusha direto); `teste` = única branch de trabalho, cópia da `main` para os itens da §1. Produção = §0.
- Código: pt-BR, seções numeradas, `TODO [INTEGRAÇÃO SUPABASE]` nos pontos de banco. Não versionar `local/` e `opencode.json`.
- Leitura antes de editar: `AGENTS.md` → `docs/MAPA_DO_SISTEMA.md` → `docs/CHANGELOG.md` → este roadmap.
