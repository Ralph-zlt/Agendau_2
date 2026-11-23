// ==========================================================
// REGRESSÃO 08 — Login exige confirmação explícita.
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

const inicializacao = js.match(/window\.onload\s*=\s*async function\(\)\s*\{[\s\S]*?\n\};/)?.[0] || "";
const sugestao = js.match(/function preencherLoginTemporario\(role\)\s*\{[\s\S]*?\n\}/)?.[0] || "";
const logout = js.match(/async function handleLogout\(\)\s*\{[\s\S]*?\n\}/)?.[0] || "";

check("sessão persistida não abre o painel durante a inicialização",
    !/restaurarSessaoSupabase/.test(inicializacao));
check("sugestão de perfil apenas preenche o acesso",
    /preencherAcessoTeste\(role\)/.test(sugestao) && !/handleAuthSubmit/.test(sugestao));
check("formulário mantém envio explícito no botão de acesso",
    /<form id="auth-form" onsubmit="handleAuthSubmit\(event\)"/.test(html)
    && /<button type="submit"[^>]*>[\s\S]*?Acessar o Painel/.test(html));
check("logout limpa os campos para evitar credenciais antigas no formulário",
    /getElementById\('login-cpf'\)\.value = ''/.test(logout)
    && /getElementById\('login-password'\)\.value = ''/.test(logout));

console.log("\nRegressão 08 — login exige confirmação explícita");
for (const nome of ok) console.log(`  ✓ ${nome}`);
for (const nome of falhas) console.error(`  ✗ ${nome}`);
if (falhas.length) {
    console.error(`\nFALHOU: ${falhas.length} de ${ok.length + falhas.length} checagens.`);
    process.exit(1);
}
console.log(`\nOK: ${ok.length} checagens.\n`);
