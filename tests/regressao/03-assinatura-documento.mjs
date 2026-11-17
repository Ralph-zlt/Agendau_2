// ==========================================================
// REGRESSÃO 03 — Documento clínico assinado por quem tem CRMV
// BUG: ao imprimir um documento logado como ADMIN (sem CRMV), o
//      nome saía "Raphael Dias" (usuário logado) e o registro saía
//      "CRMV-SP 00000" (do veterinário de referência) — assinatura
//      inválida, nome e CRMV de pessoas diferentes.
// O QUE: nome e CRMV andam juntos. Quem não tem CRMV não assina
//        documento clínico; assina o veterinário de referência.
// FALHA SEM O FIX / PASSA COM O FIX — nunca renumerar.
// ==========================================================
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const raiz = path.resolve(import.meta.dirname, "..", "..");
const require = createRequire(import.meta.url);
const R = require(path.join(raiz, "dayvet", "regras.js"));

const falhas = [];
const ok = [];
function check(nome, cond, detalhe = "") {
    if (cond) ok.push(nome);
    else falhas.push(detalhe ? `${nome} — ${detalhe}` : nome);
}

const vetRef = { nome: "Dra. Laís", crm: "CRMV-SP 00000" };
const admin = { nome: "Raphael Dias", role: "admin" };
const funcionario = { nome: "Douglas", role: "funcionario" };
const veterinaria = { nome: "Dra. Laís", crm: "CRMV-SP 00000" };

// 1. Admin sem CRMV NÃO assina: usa o vet de referência
const a = R.assinaturaDocumento(admin, vetRef);
check("admin assina como o vet de referência", a.nome === "Dra. Laís" && a.crm === "CRMV-SP 00000", JSON.stringify(a));

// 2. Funcionário sem CRMV NÃO assina
const f = R.assinaturaDocumento(funcionario, vetRef);
check("funcionário assina como o vet de referência", f.nome === "Dra. Laís" && f.crm === "CRMV-SP 00000", JSON.stringify(f));

// 3. Veterinário com CRMV assina com os próprios dados
const v = R.assinaturaDocumento(veterinaria, vetRef);
check("veterinário assina com o próprio CRMV", v.nome === "Dra. Laís" && v.crm === "CRMV-SP 00000", JSON.stringify(v));

// 4. CRMV em branco/espaços não conta como registro
const branco = R.assinaturaDocumento({ nome: "X", crm: "   " }, vetRef);
check("CRMV em branco cai no vet de referência", branco.nome === "Dra. Laís", JSON.stringify(branco));

// 5. Sem nada informado não inventa assinatura
const vazio = R.assinaturaDocumento(null, null);
check("sem dados devolve marcador, não nome de terceiro", vazio.nome === "—" && vazio.crm === "—", JSON.stringify(vazio));

// 6. O código usa a regra (não voltou a montar nome e CRMV separados)
const js = fs.readFileSync(path.join(raiz, "dayvet", "script.js"), "utf8");
check("script.js usa RegrasTutor.assinaturaDocumento", /RegrasTutor\.assinaturaDocumento\(/.test(js));
check(
    "script.js não pega nome do logado e CRMV do mock separadamente",
    !/vetNome\s*=\s*\(currentUser\s*&&\s*currentUser\.nome\)/.test(js)
);

if (falhas.length) {
    console.log("✗ regressão 03 — assinatura de documento");
    falhas.forEach(x => console.log("   ✗ " + x));
    process.exit(1);
}
console.log(`✓ regressão 03 — assinatura de documento (${ok.length} verificações)`);
