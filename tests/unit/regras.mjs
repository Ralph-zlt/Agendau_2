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

console.log(`\nUnit regras: ${total - falhas}/${total} casos OK.`);
if (falhas) process.exit(1);
