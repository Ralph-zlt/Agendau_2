// ==========================================================
// RUNNER DA REGRESSÃO — executa todos os testes numerados
// USO: node tests/regressao/run.mjs
// REGRA: a suíte só cresce; nunca renumerar.
// ==========================================================
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const dir = import.meta.dirname;
const arquivos = fs.readdirSync(dir)
    .filter(f => /^\d{2}-.+\.mjs$/.test(f))
    .sort();

if (arquivos.length === 0) {
    console.log("Nenhum teste de regressão encontrado.");
    process.exit(0);
}

let falhas = 0;
for (const arquivo of arquivos) {
    try {
        execFileSync(process.execPath, [path.join(dir, arquivo)], { stdio: "inherit" });
    } catch {
        falhas++;
        console.error(`\n✗ falhou: ${arquivo}`);
    }
}

console.log(`\nRegressão: ${arquivos.length - falhas}/${arquivos.length} arquivo(s) verde(s).`);
if (falhas) process.exit(1);
