// ==========================================================
// TESTES ESTÁTICOS — DayVet-Gestão (sem browser)
// O QUE: valida o mínimo antes de qualquer entrega/commit.
// PORQUÊ: a skill oficial (testar-frontend) também roda estes
//         checks; aqui ficam versionados e executáveis por node.
// USO: node tests/estatico.mjs   (sai != 0 se algo falhar)
// ==========================================================
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const raiz = path.resolve(import.meta.dirname, "..");
const dir = path.join(raiz, "dayvet");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const js = fs.readFileSync(path.join(dir, "script.js"), "utf8");

const falhas = [];
const ok = [];
function check(nome, cond, detalhe = "") {
    if (cond) ok.push(nome);
    else falhas.push(detalhe ? `${nome} — ${detalhe}` : nome);
}

// 1. Sintaxe do JS
try {
    execFileSync(process.execPath, ["--check", path.join(dir, "script.js")], { stdio: "pipe" });
    check("sintaxe de dayvet/script.js (node --check)", true);
} catch (e) {
    check("sintaxe de dayvet/script.js (node --check)", false, String(e.stderr || e));
}

// 2. IDs referenciados no JS existem no HTML
const idsHtml = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const idsJs = new Set([...js.matchAll(/getElementById\(\s*['"`]([^'"`]+)['"`]\s*\)/g)].map(m => m[1]));
const idsFaltando = [...idsJs].filter(id => !idsHtml.has(id));
check("todo getElementById() existe no HTML", idsFaltando.length === 0, idsFaltando.join(", "));

// 2b. IDs duplicados no HTML quebram getElementById silenciosamente
const contagemIds = {};
for (const m of html.matchAll(/\bid="([^"]+)"/g)) contagemIds[m[1]] = (contagemIds[m[1]] || 0) + 1;
const idsDuplicados = Object.entries(contagemIds).filter(([, n]) => n > 1).map(([id]) => id);
check("nenhum id duplicado no HTML", idsDuplicados.length === 0, idsDuplicados.join(", "));

// 3. Handlers inline do HTML existem no JS
const handlers = new Set(
    [...html.matchAll(/\bon(?:click|submit|change|input|keyup|keydown|blur|focus)="([a-zA-Z_$][\w$]*)\(/g)].map(m => m[1])
);
const handlersFaltando = [...handlers].filter(fn => {
    const padrao = new RegExp(`(?:function\\s+${fn}\\b|\\b${fn}\\s*=\\s*(?:async\\s*)?(?:function|\\())`);
    return !padrao.test(js);
});
check("todo handler inline existe no JS", handlersFaltando.length === 0, handlersFaltando.join(", "));

// 4. Blocos balanceados (sanidade; strings/templates também contam)
function contar(texto, abre, fecha) {
    return [...texto].reduce((acc, c) => acc + (c === abre ? 1 : c === fecha ? -1 : 0), 0);
}
check("chaves {} balanceadas", contar(js, "{", "}") === 0, String(contar(js, "{", "}")));
check("parênteses () balanceados", contar(js, "(", ")") === 0, String(contar(js, "(", ")")));
check("colchetes [] balanceados", contar(js, "[", "]") === 0, String(contar(js, "[", "]")));

// 5. Modais que abrem sobre o login precisam de z-[60]+ (login usa backdrop-blur)
for (const id of ["modal-recuperar-senha", "forcar-senha-etapa"]) {
    const re = new RegExp(`id="${id}"[^>]*class="([^"]*)"`);
    const m = html.match(re);
    const classes = m ? m[1] : "";
    const z = classes.match(/z-\[(\d+)\]/);
    check(`#${id} acima do login (z-[60]+)`, !!z && Number(z[1]) >= 60, classes);
}

// 6. Páginas de entrada existem
check("index.html raiz existe", fs.existsSync(path.join(raiz, "index.html")));
check("site/index.html (artifact do Pages) existe", fs.existsSync(path.join(raiz, "site", "index.html")));

// 7. Todo <script src="..."> local existe na pasta dayvet/
const scriptsLocais = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
    .map(m => m[1])
    .filter(src => !/^https?:|^\/\//.test(src));
const scriptsFaltando = scriptsLocais.filter(src => !fs.existsSync(path.join(dir, src)));
check("todo <script src> local existe", scriptsFaltando.length === 0, scriptsFaltando.join(", "));

// Relatório
console.log(`\nOK (${ok.length}):`);
for (const o of ok) console.log("  ✓ " + o);
if (falhas.length) {
    console.error(`\nFALHAS (${falhas.length}):`);
    for (const f of falhas) console.error("  ✗ " + f);
    process.exit(1);
}
console.log("\nEstático: tudo verde.");
