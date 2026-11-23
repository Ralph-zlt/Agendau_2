// ==========================================================
// REGRESSÃO 05 — CPF de tutor deve ser válido e respeitar o formato do banco.
// O QUE: valida os dígitos e persiste com a máscara canônica.
// FALHA SEM O FIX / PASSA COM O FIX — nunca renumerar.
// ==========================================================
import fs from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..", "..");
const js = fs.readFileSync(path.join(raiz, "dayvet", "script.js"), "utf8");
const falhas = [];
const ok = [];
function check(nome, cond) {
    if (cond) ok.push(nome);
    else falhas.push(nome);
}

function corpoDaFuncao(nome) {
    const inicio = js.indexOf(`async function ${nome}(`);
    if (inicio < 0) return "";
    const fim = js.indexOf("\n}", inicio);
    return fim < 0 ? "" : js.slice(inicio, fim + 2);
}

const cadastro = corpoDaFuncao("salvarTutor");
const edicao = corpoDaFuncao("salvarEdicaoTutor");

check("cadastro valida os dígitos e formata CPF antes de persistir",
    /const cpfInformado = document\.getElementById\('tutor-cpf'\)\.value;[\s\S]*?if \(!validarCPF\(cpfInformado\)\) \{[\s\S]*?return;[\s\S]*?const cpf = RegrasLogin\.formatarCpf\(cpfInformado\);[\s\S]*?window\.DayVetPersistencia\.paraTutor\(novoTutor/.test(cadastro));
check("edição valida os dígitos e formata CPF antes de persistir",
    /const cpfInformado = document\.getElementById\('edit-tutor-cpf'\)\.value;[\s\S]*?if \(!validarCPF\(cpfInformado\)\) \{[\s\S]*?return;[\s\S]*?const cpfNovo = RegrasLogin\.formatarCpf\(cpfInformado\);[\s\S]*?cpf: cpfNovo[\s\S]*?window\.DayVetPersistencia\.paraTutor\(atualizado/.test(edicao));
check("duplicidade compara dígitos, independentemente da máscara",
    /RegrasLogin\.somenteDigitos\(t\.cpf\) === RegrasLogin\.somenteDigitos\(cpf\)/.test(cadastro)
    && /RegrasLogin\.somenteDigitos\(t\.cpf\) === RegrasLogin\.somenteDigitos\(cpfNovo\)/.test(edicao));

console.log(`\nRegressão 05 — CPF de tutor`);
for (const nome of ok) console.log(`  ✓ ${nome}`);
for (const nome of falhas) console.log(`  ✗ ${nome}`);
if (falhas.length) {
    console.error(`\nFALHOU: ${falhas.length} de ${ok.length + falhas.length} checagens.`);
    process.exit(1);
}
console.log(`\nOK: ${ok.length} checagens.\n`);
