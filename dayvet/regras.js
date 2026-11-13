// ==========================================================
// REGRAS DE NEGÓCIO PURAS — Tutor (soft delete + exclusão)
// O QUE: funções sem DOM, sem estado global e sem rede.
// PORQUÊ: permitir teste real em node (tabela entrada → saída)
//         sem precisar de navegador — exigência de metodologia.
// USO: <script src="regras.js"></script> antes de script.js
//      e `require('./regras.js')` nos testes.
// DECISÃO (dono, 2026-11-13): admin e funcionário podem
// arquivar/restaurar e excluir definitivamente; exclusão só
// depois de arquivado e sem vínculos (pets/agenda/histórico).
// ==========================================================
(function (raiz) {
    "use strict";

    const STATUS_ATIVOS = ["pendente", "confirmado"];

    function tutorArquivado(tutor) {
        return !!(tutor && tutor.arquivado === true);
    }

    // Agendamentos que impedem o arquivamento (consulta ainda de pé).
    function agendamentosAtivosDoTutor(tutor, agendamentos) {
        if (!tutor) return [];
        return (agendamentos || []).filter(a =>
            a.tutorCpf === tutor.cpf && STATUS_ATIVOS.includes(a.status)
        );
    }

    // Pode arquivar? Tutor existe, não está arquivado e não tem agenda ativa.
    function podeArquivarTutor(tutor, agendamentos) {
        if (!tutor) return { ok: false, motivo: "Tutor não encontrado." };
        if (tutorArquivado(tutor)) return { ok: false, motivo: "Este tutor já está arquivado." };
        const ativos = agendamentosAtivosDoTutor(tutor, agendamentos);
        if (ativos.length > 0) {
            const datas = ativos.map(a => `${a.data} ${a.hora || ""}`.trim()).join(", ");
            return {
                ok: false,
                motivo: `Não é possível arquivar: ${ativos.length} agendamento(s) pendente(s)/confirmado(s) (${datas}). Conclua ou cancele antes.`
            };
        }
        return { ok: true, motivo: "" };
    }

    // Pode excluir definitivamente? Só arquivado e sem nenhum vínculo.
    function podeExcluirTutor(tutor, vinculos) {
        const { pets = [], agendamentos = [], historico = [] } = vinculos || {};
        if (!tutor) return { ok: false, motivo: "Tutor não encontrado." };
        if (!tutorArquivado(tutor)) {
            return { ok: false, motivo: "Arquive o tutor antes de excluir definitivamente." };
        }
        const petsDoTutor = pets.filter(p => p.tutorCpf === tutor.cpf);
        if (petsDoTutor.length > 0) {
            return { ok: false, motivo: `Exclusão bloqueada: ${petsDoTutor.length} pet(s) vinculado(s). Mantenha o tutor arquivado.` };
        }
        const agenda = agendamentos.filter(a => a.tutorCpf === tutor.cpf);
        if (agenda.length > 0) {
            return { ok: false, motivo: `Exclusão bloqueada: ${agenda.length} agendamento(s) no histórico. Mantenha o tutor arquivado.` };
        }
        const registros = historico.filter(h => h.tutorCpf === tutor.cpf);
        if (registros.length > 0) {
            return { ok: false, motivo: `Exclusão bloqueada: ${registros.length} registro(s) clínico(s) (imutáveis). Mantenha o tutor arquivado.` };
        }
        return { ok: true, motivo: "" };
    }

    // Tutores que podem aparecer em selects (novo pet, agendamento, clínico).
    function tutoresSelecionaveis(tutores) {
        return (tutores || []).filter(t => !tutorArquivado(t));
    }

    const api = { tutorArquivado, agendamentosAtivosDoTutor, podeArquivarTutor, podeExcluirTutor, tutoresSelecionaveis };

    if (typeof module !== "undefined" && module.exports) module.exports = api;
    raiz.RegrasTutor = api;
})(typeof window !== "undefined" ? window : globalThis);
