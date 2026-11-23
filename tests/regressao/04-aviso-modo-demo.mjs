// ==========================================================
// REGRESSÃO 04 — Escrita na tela não pode se passar por escrita no banco
// BUG: com o front 100% mock, ações de escrita (cancelar consulta, cadastrar
//      tutor, anexar documento...) exibiam "sucesso" e o F5 desfazia tudo.
//      Quem usa acredita que salvou; o banco nunca recebeu nada.
// O QUE: enquanto MODO_DADOS === 'mock', (a) a faixa #aviso-modo-demo e o
//        aviso do login ficam visíveis; (b) toda mensagem de escrita passa
//        por confirmarEscrita(), que diz que nada foi salvo no banco.
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

// (a) aviso visível nos dois pontos de entrada
check("faixa #aviso-modo-demo existe no HTML", html.includes('id="aviso-modo-demo"'));
check("aviso #aviso-login-demo existe no HTML", html.includes('id="aviso-login-demo"'));
check("faixa diz que nada é salvo", /nada é salvo/i.test(html));
check("CSS do aviso existe nos 2 temas",
    css.includes(".aviso-demo") && css.includes("[data-theme='light'] .aviso-demo"));

// (b) o modo é declarado e o aviso é aplicado no boot
check("MODO_DADOS declarado", /const MODO_DADOS\s*=\s*'[a-z]+'/.test(js));
check("aplicarAvisoModoDados() é chamada no onload", /window\.onload[\s\S]{0,400}aplicarAvisoModoDados\(\)/.test(js));

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

// (d) o helper realmente avisa quando está em mock
check("confirmarEscrita existe", /function confirmarEscrita\(/.test(js));
check("confirmarEscrita avisa que não salvou", /nada foi salvo no banco/.test(js));
check("confirmarEscrita usa o toast de aviso", /showToast\([^)]*'aviso'\)/.test(js));

// (e) toast de aviso tem estilo próprio (não é o verde de sucesso)
check("toast tipo 'aviso' tem cor âmbar", /tipo === 'aviso'[\s\S]{0,180}amber/.test(js));

console.log(`\nRegressão 04 — aviso de modo demonstração`);
for (const nome of ok) console.log(`  ✓ ${nome}`);
for (const nome of falhas) console.log(`  ✗ ${nome}`);
if (falhas.length) {
    console.error(`\nFALHOU: ${falhas.length} de ${ok.length + falhas.length} checagens.`);
    process.exit(1);
}
console.log(`\nOK: ${ok.length} checagens.\n`);
