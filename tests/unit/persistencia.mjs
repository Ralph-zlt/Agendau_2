import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const persistencia = require(path.resolve(import.meta.dirname, "..", "..", "dayvet", "persistencia.js"));

function clienteComDados(tabelas) {
    const consultadas = [];
    return {
        consultadas,
        from(tabela) {
            return {
                select() { return this; },
                order() { return this; },
                async range(inicio, fim) {
                    consultadas.push(tabela);
                    return { data: (tabelas[tabela] || []).slice(inicio, fim + 1), error: null };
                }
            };
        }
    };
}

const dados = {
    tutores: [{ cpf: "111.111.111-11", nome: "Tutor", telefone: "11999990000" }],
    pets: [{ id: "p1", tutor_cpf: "111.111.111-11", nome: "Pet", especie: "Canino", raca: "SRD", sexo: "Macho" }],
    agendamentos: [{ id: "a1", tutor_cpf: "111.111.111-11", pet_id: "p1", vet_id: "v1", servico: "Consulta", data: "2026-11-24", hora: "10:30:00", valor: "120.00", status: "confirmado" }],
    raca_tipos: [{ id: 1, especie: "Canino", nome: "SRD" }],
    configuracoes_clinica: [{ hora_abertura: "08:00:00", hora_fechamento: "18:00:00", modo_restricao: "comercial", funcionamento_fds: "sabado" }],
    historico_clinico: [{ id: "h1", tutor_cpf: "111.111.111-11", pet_id: "p1", tipo: "receita", data: "2026-11-24", detalhe: "Orientação" }],
    vacina_tipos: [{ id: 1, nome: "Antirrábica" }],
    documentos: [{ id: "d1", tutor_cpf: "111.111.111-11", pet_id: "p1", nome: "exame.pdf", mime_type: "application/pdf", tamanho_bytes: 1024, created_at: "2026-11-24T10:00:00Z", storage_path: "pasta/exame.pdf" }],
    usuarios: [{ id: "u1", usuario: "admin", nome: "Admin", cpf: "222.222.222-22", email: "admin@example.test", role: "admin", active: true }]
};

const funcionarioClient = clienteComDados(dados);
const funcionario = await persistencia.carregarDados(funcionarioClient, "funcionario");
assert.deepEqual(funcionarioClient.consultadas.sort(), [
    "agendamentos", "configuracoes_clinica", "pets", "raca_tipos", "tutores"
]);
assert.equal(funcionario.historico.length, 0);
assert.equal(funcionario.usuarios.length, 0);
assert.equal(funcionario.configuracao.horaAbertura, "08:00");
assert.equal(funcionario.agendamentos[0].hora, "10:30");

const adminClient = clienteComDados(dados);
const admin = await persistencia.carregarDados(adminClient, "admin");
assert.deepEqual(adminClient.consultadas.sort(), [
    "agendamentos", "configuracoes_clinica", "documentos", "historico_clinico",
    "pets", "raca_tipos", "tutores", "usuarios", "vacina_tipos"
]);
assert.equal(admin.historico[0].detalhe, "Orientação");
assert.equal(admin.documentos[0].storagePath, "pasta/exame.pdf");
assert.equal(admin.usuarios[0].role, "admin");

console.log("Persistência: 9 verificações OK.");
