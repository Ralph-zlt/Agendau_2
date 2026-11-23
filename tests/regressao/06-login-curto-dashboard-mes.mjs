// ==========================================================
// REGRESSÃO 06 — Login rolável e valores do mês selecionado.
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

check("login tem rolagem vertical e alinhamento seguro do cartão",
    /id="login-screen"[^>]*overflow-y-auto/.test(html)
    && /<div class="my-auto bg-slate-900/.test(html));
check("dashboard oferece mês de referência acessível",
    /<option value="mensal">Período: Mês selecionado<\/option>/.test(html)
    && /<input type="month" id="mes-faturamento" aria-label="Mês de referência dos atendimentos"/.test(html));
check("cálculo mensal usa o ano e mês escolhidos",
    /function obterDadosFaturamento\(periodo\)[\s\S]*?const campoMes = document\.getElementById\('mes-faturamento'\);[\s\S]*?inicioPeriodo = new Date\(anoSelecionado, numeroMes - 1, 1\)[\s\S]*?fimPeriodo = new Date\(anoSelecionado, numeroMes, 1\)/.test(js));
check("filtro mensal acompanha mudanças e fica oculto para veterinário",
    /function atualizarPeriodoFaturamento\(\)[\s\S]*?campoMes\.classList\.toggle\('hidden', periodo !== 'mensal'\)/.test(js)
    && /function atualizarDashboardPorPerfil\(\)[\s\S]*?toggleEl\('mes-faturamento', !ehVet/.test(js));

console.log("\nRegressão 06 — login e dashboard mensal");
for (const nome of ok) console.log(`  ✓ ${nome}`);
for (const nome of falhas) console.error(`  ✗ ${nome}`);
if (falhas.length) {
    console.error(`\nFALHOU: ${falhas.length} de ${ok.length + falhas.length} checagens.`);
    process.exit(1);
}
console.log(`\nOK: ${ok.length} checagens.\n`);
