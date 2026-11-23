// ==========================================================
// REGRESSÃO 04 — O frontend não pode fingir que uma escrita foi salva.
// O QUE: no modo real, avisos de demonstração ficam ocultos; mutações só
//        anunciam sucesso após a operação do Supabase retornar sem erro.
// FALHA SEM O FIX / PASSA COM O FIX — nunca renumerar.
// ==========================================================
import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..", "..");
const html = fs.readFileSync(path.join(raiz, "dayvet", "index.html"), "utf8");
const js = fs.readFileSync(path.join(raiz, "dayvet", "script.js"), "utf8");
const css = fs.readFileSync(path.join(raiz, "dayvet", "styles.css"), "utf8");

const falhas = [];
const ok = [];
function check(nome, cond, detalhe = "") {
    if (cond) ok.push(nome);
    else falhas.push(detalhe ? `${nome} — ${detalhe}` : nome);
}

// (a) avisos de demonstração permanecem disponíveis caso o modo mock volte
check("faixa #aviso-modo-demo existe no HTML", html.includes('id="aviso-modo-demo"'));
check("aviso #aviso-login-demo existe no HTML", html.includes('id="aviso-login-demo"'));
check("faixa diz que nada é salvo", /nada é salvo/i.test(html));
check("CSS do aviso existe nos 2 temas",
    css.includes(".aviso-demo") && css.includes("[data-theme='light'] .aviso-demo"));

// (b) o modo real oculta os avisos durante a inicialização
check("MODO_DADOS está em modo real", /const MODO_DADOS\s*=\s*'real'/.test(js));
check("aplicarAvisoModoDados() é chamada no onload", /window\.onload[\s\S]{0,400}aplicarAvisoModoDados\(\)/.test(js));
check("avisos só aparecem no modo mock", /const emMock = MODO_DADOS !== 'real'/.test(js));

// (c) nenhuma escrita anuncia sucesso por showToast direto
const mensagensDeEscrita = [
    "Valor do agendamento registrado/atualizado!",
    "Agendamento atualizado com sucesso!",
    "Agendamento criado!",
    "Tutor cadastrado!",
    "Tutor excluído definitivamente.",
    "Pet cadastrado com sucesso!",
    "Novo usuário criado com sucesso!",
    "Permissão de login alterada!",
    "Tipo de vacina cadastrado!",
    "Raça cadastrada!",
    "Novo documento registrado!",
];
const vazando = mensagensDeEscrita.filter(m => js.includes(`showToast("${m}")`));
check("nenhuma escrita usa showToast direto", vazando.length === 0, vazando.join(" | "));

// (d) sucesso e erro têm semântica explícita
check("confirmarEscrita existe", /function confirmarEscrita\(/.test(js));
check("falha de persistência não declara sucesso", /A alteração não foi confirmada/.test(js));
check("mutação checa erro antes do retorno de sucesso", /if \(resultado\?\.error\)[\s\S]*?return \{ ok: false, data: null \};[\s\S]*?return \{ ok: true, data: resultado/.test(js));

console.log(`\nRegressão 04 — aviso de modo demonstração`);
for (const nome of ok) console.log(`  ✓ ${nome}`);
for (const nome of falhas) console.log(`  ✗ ${nome}`);
if (falhas.length) {
    console.error(`\nFALHOU: ${falhas.length} de ${ok.length + falhas.length} checagens.`);
    process.exit(1);
}
console.log(`\nOK: ${ok.length} checagens.\n`);
