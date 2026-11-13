// ==========================================================
// REGRESSÃO 01 — Guia de encaminhamento removida do produto
// BUG/REQUISITO: RF-10 foi cancelado pelo dono em 2026-11-13.
// O QUE: impede o retorno acidental da guia (atalho, tipo, mock,
//        impressão, relatório) e garante o docx marcado.
// FALHA SEM O FIX / PASSA COM O FIX — nunca renumerar.
// ==========================================================
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const raiz = path.resolve(import.meta.dirname, "..", "..");
const ler = f => fs.readFileSync(path.join(raiz, f), "utf8");
const falhas = [];
const ok = [];
function check(nome, cond, detalhe = "") {
    if (cond) ok.push(nome);
    else falhas.push(detalhe ? `${nome} — ${detalhe}` : nome);
}

// 1. Nenhuma referência à guia no produto
for (const arquivo of ["dayvet/index.html", "dayvet/script.js", "dayvet/styles.css"]) {
    const texto = ler(arquivo);
    const achados = texto.split("\n").map((l, i) => [i + 1, l]).filter(([, l]) => /guia/i.test(l));
    check(`${arquivo} sem "guia"`, achados.length === 0, achados.map(([n, l]) => `linha ${n}`).join(", "));
}

// 2. Select de tipo do documento clínico só com receita e vacina
const html = ler("dayvet/index.html");
const select = html.match(/<select id="clinica-tipo"[\s\S]*?<\/select>/);
const valores = select ? [...select[0].matchAll(/value="([^"]+)"/g)].map(m => m[1]) : [];
check("select #clinica-tipo = [receita, vacina]", valores.join(",") === "receita,vacina", valores.join(","));

// 3. Títulos de impressão só com receita e vacina (sem chave órfã)
const js = ler("dayvet/script.js");
const titulos = js.match(/let titulos = \{[\s\S]*?\};/);
check("mapa de impressão sem guia", !!titulos && !/guia/i.test(titulos[0]));

// 4. Mock do histórico clínico sem registro de guia
check("mocks sem tipo guia", !/tipo: "guia"/.test(js));

// 5. Documento de requisitos marcado (extrai word/document.xml do docx)
const docx = path.join(raiz, "docs", "requisitos-funcionais-dayvet.docx");
let textoDocx = "";
try {
    textoDocx = execFileSync("unzip", ["-p", docx, "word/document.xml"], { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
} catch (e) {
    textoDocx = "";
}
check("docx marca RF-10 FORA DE ESCOPO", /FORA DE ESCOPO[\s\S]{0,80}13\/11\/2026|REQUISITO CANCELADO/.test(textoDocx));

console.log(`\nRegressão 01 — guia removida: ${ok.length} verificações`);
for (const o of ok) console.log("  ✓ " + o);
if (falhas.length) {
    console.error(`\nFALHAS (${falhas.length}):`);
    for (const f of falhas) console.error("  ✗ " + f);
    process.exit(1);
}
console.log("  → verde");
