// ==========================================================
// REGRESSÃO 02 — Exclusão de tutor (soft delete) não some
// FEATURE/REQUISITO: decisão do dono 2026-11-13 (itens 20 do roadmap).
// O QUE: garante que o fluxo arquivar/restaurar/excluir continua ligado
//        no produto, nas permissões e no deploy do Pages.
// FALHA SEM O FIX / PASSA COM O FIX — nunca renumerar.
// ==========================================================
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const raiz = path.resolve(import.meta.dirname, "..", "..");
const ler = f => fs.readFileSync(path.join(raiz, f), "utf8");
const R = require(path.join(raiz, "dayvet", "regras.js"));

const falhas = [];
const ok = [];
function check(nome, cond, detalhe = "") {
    if (cond) ok.push(nome);
    else falhas.push(detalhe ? `${nome} — ${detalhe}` : nome);
}

// 1. Regras puras continuam corretas (amostra da tabela)
const tutor = { cpf: "111.222.333-44", nome: "T", arquivado: true };
check("arquivar bloqueia com agenda ativa", R.podeArquivarTutor(tutor, [{ tutorCpf: tutor.cpf, status: "pendente" }]).ok === false);
check("excluir exige arquivado", R.podeExcluirTutor({ cpf: tutor.cpf }, {}).ok === false);
check("excluir bloqueia com pets", R.podeExcluirTutor(tutor, { pets: [{ tutorCpf: tutor.cpf }] }).ok === false);
check("excluir bloqueia com histórico", R.podeExcluirTutor(tutor, { historico: [{ tutorCpf: tutor.cpf }] }).ok === false);
check("excluir libera sem vínculos", R.podeExcluirTutor(tutor, {}).ok === true);

// 2. Produto carrega as regras antes da lógica
const html = ler("dayvet/index.html");
const iRegras = html.indexOf('src="regras.js"');
const iScript = html.indexOf('src="script.js"');
check("regras.js carregado antes de script.js", iRegras > 0 && iScript > iRegras);

// 3. Permissões do funcionário (decisão 2026-11-13)
const js = ler("dayvet/script.js");
for (const p of ["tutor_editar", "tutor_arquivar", "tutor_excluir"]) {
    check(`funcionário tem '${p}'`, new RegExp(`'${p}'`).test(js));
}

// 4. Arquivo arquivado fica fora dos selects (3 pontos: agendamento, pet, clínico)
const usaFiltro = (js.match(/RegrasTutor\.tutoresSelecionaveis\(tutores\)/g) || []).length;
check("filtro de arquivados na lista padrão e no helper", usaFiltro === 2, String(usaFiltro));
const usaHelper = (js.match(/preencherSelectTutores\(/g) || []).length;
check("helper preenche os 3 selects", usaHelper === 4, String(usaHelper));

// 5. Ações existem e o botão de filtro também
for (const fn of ["arquivarTutor", "restaurarTutor", "excluirTutorDefinitivo", "alternarTutoresArquivados"]) {
    check(`função ${fn}() definida`, new RegExp(`function ${fn}\\(`).test(js));
}
check("botão 'Mostrar arquivados' no HTML", /id="btn-mostrar-arquivados"/.test(html));

// 6. Deploy do Pages copia regras.js
const wf = ler(".github/workflows/deploy-pages.yml");
check("workflow do Pages copia regras.js", /cp dayvet\/[^\n]*regras\.js/.test(wf));

console.log(`\nRegressão 02 — exclusão de tutor: ${ok.length} verificações`);
for (const o of ok) console.log("  ✓ " + o);
if (falhas.length) {
    console.error(`\nFALHAS (${falhas.length}):`);
    for (const f of falhas) console.error("  ✗ " + f);
    process.exit(1);
}
console.log("  → verde");
