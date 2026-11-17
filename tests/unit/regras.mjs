// ==========================================================
// TESTES UNITÁRIOS — Regras de tutor (tabela entrada → saída)
// O QUE: valida dayvet/regras.js sem DOM, sem rede e sem relógio.
// USO: node tests/unit/regras.mjs
// ==========================================================
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const R = require(path.resolve(import.meta.dirname, "..", "..", "dayvet", "regras.js"));

let falhas = 0;
let total = 0;
function caso(descricao, obtido, esperado) {
    total++;
    const ok = JSON.stringify(obtido) === JSON.stringify(esperado);
    if (!ok) { falhas++; console.error(`  ✗ ${descricao}\n      obtido:   ${JSON.stringify(obtido)}\n      esperado: ${JSON.stringify(esperado)}`); }
    else console.log(`  ✓ ${descricao}`);
}

const tutor = (over = {}) => ({ cpf: "111.222.333-44", nome: "Douglas", ...over });
const ag = (over = {}) => ({ tutorCpf: "111.222.333-44", status: "pendente", data: "2026-11-20", hora: "09:00", ...over });

console.log("\n[arquivar]");
caso("tutor inexistente", R.podeArquivarTutor(null, []), { ok: false, motivo: "Tutor não encontrado." });
caso("já arquivado", R.podeArquivarTutor(tutor({ arquivado: true }), []), { ok: false, motivo: "Este tutor já está arquivado." });
caso("com agendamento pendente", R.podeArquivarTutor(tutor(), [ag()]), {
    ok: false,
    motivo: "Não é possível arquivar: 1 agendamento(s) pendente(s)/confirmado(s) (2026-11-20 09:00). Conclua ou cancele antes."
});
caso("com agendamento confirmado", R.podeArquivarTutor(tutor(), [ag({ status: "confirmado" })]).ok, false);
caso("com agendamento concluído (não bloqueia)", R.podeArquivarTutor(tutor(), [ag({ status: "concluido" })]), { ok: true, motivo: "" });
caso("com agendamento cancelado (não bloqueia)", R.podeArquivarTutor(tutor(), [ag({ status: "cancelado" })]), { ok: true, motivo: "" });
caso("agendamento de outro tutor não bloqueia", R.podeArquivarTutor(tutor(), [ag({ tutorCpf: "222.333.444-55" })]), { ok: true, motivo: "" });
caso("tutor limpo", R.podeArquivarTutor(tutor(), []), { ok: true, motivo: "" });

console.log("\n[excluir]");
caso("não arquivado", R.podeExcluirTutor(tutor(), {}), { ok: false, motivo: "Arquive o tutor antes de excluir definitivamente." });
caso("inexistente", R.podeExcluirTutor(null, {}), { ok: false, motivo: "Tutor não encontrado." });
caso("com pet", R.podeExcluirTutor(tutor({ arquivado: true }), { pets: [{ tutorCpf: "111.222.333-44" }] }), {
    ok: false, motivo: "Exclusão bloqueada: 1 pet(s) vinculado(s). Mantenha o tutor arquivado."
});
caso("com agendamento (qualquer status)", R.podeExcluirTutor(tutor({ arquivado: true }), { agendamentos: [{ tutorCpf: "111.222.333-44", status: "concluido" }] }), {
    ok: false, motivo: "Exclusão bloqueada: 1 agendamento(s) no histórico. Mantenha o tutor arquivado."
});
caso("com histórico clínico", R.podeExcluirTutor(tutor({ arquivado: true }), { historico: [{ tutorCpf: "111.222.333-44" }] }), {
    ok: false, motivo: "Exclusão bloqueada: 1 registro(s) clínico(s) (imutáveis). Mantenha o tutor arquivado."
});
caso("arquivado e sem vínculos", R.podeExcluirTutor(tutor({ arquivado: true }), {}), { ok: true, motivo: "" });

console.log("\n[selects]");
caso("esconde arquivados", R.tutoresSelecionaveis([tutor(), tutor({ cpf: "x", arquivado: true })]).map(t => t.cpf), ["111.222.333-44"]);
caso("lista vazia", R.tutoresSelecionaveis(undefined), []);
caso("tutorArquivado estrito", [R.tutorArquivado({ arquivado: 1 }), R.tutorArquivado({}), R.tutorArquivado(null)], [false, false, false]);

console.log("\n[login — normalização do identificador]");
const contas = [
    { username: "raphael_dias", nome: "Raphael Dias", cpf: "111.111.111-11", email: "raphael.dias@dayvet.com" },
    { username: "lais_vet", nome: "Dra. Laís", cpf: "222.222.222-22", email: "lais.vet@dayvet.com" },
    { username: "douglas_funcionario", nome: "Douglas", cpf: "333.333.333-33", email: "douglas.funcionario@dayvet.com" }
];
const nomeAchado = entrada => (R.encontraUsuario(contas, entrada) || {}).nome || null;

caso("usuário exato", nomeAchado("raphael_dias"), "Raphael Dias");
caso("usuário com maiúsculas", nomeAchado("Raphael_Dias"), "Raphael Dias");
caso("usuário com espaços em volta", nomeAchado("  lais_vet  "), "Dra. Laís");
caso("CPF só dígitos", nomeAchado("22222222222"), "Dra. Laís");
caso("CPF mascarado", nomeAchado("222.222.222-22"), "Dra. Laís");
caso("CPF com espaços", nomeAchado("222 222 222 22"), "Dra. Laís");
caso("e-mail", nomeAchado("douglas.funcionario@dayvet.com"), "Douglas");
caso("e-mail com maiúsculas", nomeAchado("RAPHAEL.DIAS@DAYVET.COM"), "Raphael Dias");
caso("inexistente", nomeAchado("ninguem"), null);
caso("vazio", nomeAchado("   "), null);
caso("CPF com 10 dígitos não casa", nomeAchado("2222222222"), null);
caso("lista indefinida", R.encontraUsuario(undefined, "raphael_dias"), null);

console.log("\n[login — chave e formatação]");
caso("chave de CPF mascarado", R.chaveLogin("111.111.111-11"), "11111111111");
caso("chave de usuário", R.chaveLogin("  Laís_Vet "), "laís_vet");
caso("chave vazia", R.chaveLogin(null), "");
caso("pareceCpf com letra", R.pareceCpf("1111111111a"), false);
caso("formata CPF", R.formatarCpf("11111111111"), "111.111.111-11");
caso("formata mantém usuário", R.formatarCpf("raphael_dias"), "raphael_dias");
caso("formata mantém CPF já mascarado", R.formatarCpf("222.222.222-22"), "222.222.222-22");

console.log("\n[assinatura de documento — nome e CRMV juntos]");
const vetRef = { nome: "Dra. Laís", crm: "CRMV-SP 00000" };
caso("admin sem CRMV não assina", R.assinaturaDocumento({ nome: "Raphael Dias", role: "admin" }, vetRef), { nome: "Dra. Laís", crm: "CRMV-SP 00000" });
caso("funcionário sem CRMV não assina", R.assinaturaDocumento({ nome: "Douglas", role: "funcionario" }, vetRef), { nome: "Dra. Laís", crm: "CRMV-SP 00000" });
caso("veterinário assina com o próprio registro", R.assinaturaDocumento({ nome: "Dra. Laís", crm: "CRMV-SP 00000" }, { nome: "Outro", crm: "CRMV-RJ 1" }), { nome: "Dra. Laís", crm: "CRMV-SP 00000" });
caso("CRMV só com espaços não vale", R.assinaturaDocumento({ nome: "X", crm: "  " }, vetRef), { nome: "Dra. Laís", crm: "CRMV-SP 00000" });
caso("segundo vet logado usa o próprio CRMV", R.assinaturaDocumento({ nome: "Dr. Bruno", crm: "CRMV-SP 99999" }, vetRef), { nome: "Dr. Bruno", crm: "CRMV-SP 99999" });
caso("sem entradas devolve marcador", R.assinaturaDocumento(null, null), { nome: "—", crm: "—" });

console.log(`\nUnit regras: ${total - falhas}/${total} casos OK.`);
if (falhas) process.exit(1);
