# ROADMAP — DayVet-Gestão

> Próximos passos do que vamos fazer. Não é documento de requisitos —
> fonte de RFs/RNFs: `docs/requisitos-funcionais-dayvet.docx`.
> Última atualização: 2026-09-22.

## 0. Links e deploy (espelho fixo da main)

- **Produção (espelho fixo da `main`): https://ralph-zlt.github.io/Agendau_2/dayvet/**
  - Workflow `.github/workflows/deploy-pages.yml` dispara **somente em `push` na `main`** (mais `workflow_dispatch` manual).
  - Artefato: `site/index.html` → `dist/index.html` (landing) + `dayvet/*` → `dist/dayvet/` (SPA).
  - **Regra: este link SEMPRE reflete a `main`. Nunca publicar a `teste` nele.**
- **Teste:** validar na branch `teste` em ambiente local (`dayvet/index.html`) ou preview temporário da `teste`. Só mergear na `main` após validação do dono.

---

## 1. Próximas (fazer agora na `teste`, nesta ordem)

- [ ] **1. Login autocomplete temporário (substitui bypass 1/2/3 visível):** ao digitar no campo usuário (CPF ou e-mail), exibir abaixo `Administrador`, `Veterinário`, `Funcionário` (estilo login salvo); clicar preenche usuário+senha mock e acessa. Botão `info` com tooltip: "Quando implantado, CPF ou e-mail identifica se é admin/vet/fun; por enquanto use o acesso temporário". Onde: `dayvet/index.html` `#login-screen`, `dayvet/script.js` SEÇÃO 3. Aceite: digitar mostra 3 opções, clique entra no perfil certo, hint 1/2/3 some da UI.
- [ ] **2. Clínico usa tutor por CPF (chave primária):** além do pet, selecionar o tutor pelo CPF. Mock: `tutor.cpf` vira PK; `pet.tutorId` → `pet.tutorCpf`; `agendamento`/`historicoClinico` ganham `tutorCpf`. Form clínico ganha `select#clinica-tutor-select` que filtra o select de pets. Onde: `dayvet/script.js` SEÇÕES 1/6/7/8, `dayvet/index.html` form clínico. Aceite: escolher tutor por CPF lista só os pets dele; salvar/imprimir exibe tutor+pet.
- [ ] **3. Área de upload de documentos:** anexos no módulo clínico junto ao criar (Receita/Guia): `<input type="file" multiple accept=".pdf,.jpg,.png">` + lista `#lista-anexos` (excluir). Mock em memória, some no reload. Gate RBAC `clinica_criar`. `TODO [INTEGRAÇÃO SUPABASE]`: storage. Aceite: anexar lista, exclui, vinculado ao pet/tutor.
- [ ] **4. Vacinação informa o tipo (select):** `select#vacina-tipo` (`Antirrábica, V8, V10, V12, Tríplice/Quádrupla Felina, Giárdia, Tosse dos Canis, Leishmaniose, Outra`) visível só quando vacina (agendamento + clínico + relatórios). Novos campos `vacinaTipo`; impressão/timeline exibem `Vacinação — {tipo}`. Aceite: vacina sem tipo não salva; tipo aparece na timeline e impressão.
- [ ] **5. Layout de impressão/PDF + RF-08 ilustrativo:** layout dedicado de impressão dos documentos (base do PDF futuro) e, no mesmo modal, tela HTML mostrando **como vai ficar** a receita com nome+CRMV do vet e bloco de assinatura (selo `DEMONSTRAÇÃO`, dados mock via `TODO [INTEGRAÇÃO SUPABASE]` — sem validação, sem assinatura real). Onde: `dayvet/index.html` `#modal-impressao-documento`, `dayvet/script.js` `imprimirDocumentoGenerico()`. Aceite: receita imprime com layout dedicado + vet/CRMV mock + selo demo. A lógica real do RF-08 (CRMV do logado, assinatura) fica na §2/§3 (pós-banco).

**Aceite geral:** skill `testar-frontend` passa; teste manual (3 perfis, tutor+pet, upload, vacina, impressão, temas); `docs/CHANGELOG.md` atualizado; merge na `main` só após dono validar.

---

## 2. Baixa prioridade (depois, sem data)

- Refinamento modo claro/paleta + contrastes WCAG (variáveis `styles.css` seção 7).
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
