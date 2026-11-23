// ==========================================================
// REGRESSÃO 07 — KPIs por período e histórico mensal imediato.
// FALHA SEM O FIX / PASSA COM O FIX — nunca renumerar.
// ==========================================================
import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..", "..");
const html = fs.readFileSync(path.join(raiz, "dayvet", "index.html"), "utf8");
const js = fs.readFileSync(path.join(raiz, "dayvet", "script.js"), "utf8");
const falhas = [];
const ok = [];
function check(nome, cond) {
    if (cond) ok.push(nome);
    else falhas.push(nome);
}

check("contagem e taxa usam o mesmo intervalo do faturamento",
    /function atualizarKpisDashboard\(\)[\s\S]*?obterIntervaloFaturamento\(periodo\)[\s\S]*?const agendamentosPeriodo = agendamentos\.filter[\s\S]*?agendamentosPeriodo\.length/.test(js));
check("mudar o período atualiza também os KPIs de agendamentos",
    /function atualizarPeriodoFaturamento\(\)[\s\S]*?atualizarKpisDashboard\(\);/.test(js));
check("histórico inicia no mês atual e atualiza nos dois seletores",
    /selM\.value = mesAtual;[\s\S]*?selA\.value = String\(anoAtual\);[\s\S]*?pesquisaMesExpirados = `\$\{anoAtual\}-\$\{mesAtual\}`/.test(js)
    && (html.match(/onchange="pesquisarMesExpirados\(\)"/g) || []).length === 2);
check("limpar histórico remove o filtro e deixa explícitos todos os períodos",
    /function limparPesquisaMesExpirados\(\)[\s\S]*?pesquisaMesExpirados = '';[\s\S]*?selM\.value = '';[\s\S]*?selA\.value = ''/.test(js)
    && /option value="">Todos os meses/.test(js)
    && /option value="">Todos os anos/.test(js));
check("dashboard identifica cadastros como totais gerais",
    /Cadastros \(total geral\)/.test(html)
    && /Pets e tutores: totais gerais \(tutores ativos\)/.test(html)
    && /Pets e tutores: totais gerais \(tutores ativos\)/.test(js));

console.log("\nRegressão 07 — consistência do dashboard e histórico");
for (const nome of ok) console.log(`  ✓ ${nome}`);
for (const nome of falhas) console.error(`  ✗ ${nome}`);
if (falhas.length) {
    console.error(`\nFALHOU: ${falhas.length} de ${ok.length + falhas.length} checagens.`);
    process.exit(1);
}
console.log(`\nOK: ${ok.length} checagens.\n`);
