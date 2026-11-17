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

    // ======================================================
    // LOGIN — identificação por usuário, CPF ou e-mail
    // DECISÃO (dono, 2026-11-17): aceitar usuário (`raphael_dias`),
    // CPF (com ou sem máscara) e e-mail no mesmo campo. A comparação
    // é normalizada: CPF vira só dígitos; o resto vira minúsculas.
    // ======================================================

    function somenteDigitos(valor) {
        return String(valor == null ? "" : valor).replace(/\D/g, "");
    }

    // Parece CPF? 11 dígitos e nada além de dígito, ponto, hífen ou espaço.
    function pareceCpf(entrada) {
        const bruto = String(entrada == null ? "" : entrada).trim();
        if (!bruto) return false;
        if (!/^[\d.\-\s]+$/.test(bruto)) return false;
        return somenteDigitos(bruto).length === 11;
    }

    // Chave de comparação do que foi digitado.
    function chaveLogin(entrada) {
        const bruto = String(entrada == null ? "" : entrada).trim();
        if (!bruto) return "";
        return pareceCpf(bruto) ? somenteDigitos(bruto) : bruto.toLowerCase();
    }

    // Acha o usuário pelo identificador digitado (usuário, CPF ou e-mail).
    function encontraUsuario(usuarios, entrada) {
        const chave = chaveLogin(entrada);
        if (!chave) return null;
        return (usuarios || []).find(u => {
            if (!u) return false;
            const usuario = String(u.username || "").toLowerCase();
            const email = String(u.email || "").toLowerCase();
            return usuario === chave || email === chave || somenteDigitos(u.cpf) === chave;
        }) || null;
    }

    // Formata CPF para exibição (11 dígitos → 000.000.000-00); devolve o
    // original quando não for CPF, para não estragar usuário/e-mail.
    function formatarCpf(entrada) {
        if (!pareceCpf(entrada)) return String(entrada == null ? "" : entrada);
        const d = somenteDigitos(entrada);
        return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
    }

    const apiLogin = { somenteDigitos, pareceCpf, chaveLogin, encontraUsuario, formatarCpf };

    // ======================================================
    // ASSINATURA DE DOCUMENTO CLÍNICO
    // Nome e CRMV andam JUNTOS: quem assina é o veterinário.
    // Admin/funcionário (sem CRMV) não pode assinar documento
    // clínico — nesse caso usa-se o vet de referência da clínica.
    // ======================================================
    function assinaturaDocumento(usuarioLogado, vetReferencia) {
        const ref = vetReferencia || { nome: "—", crm: "—" };
        const logado = usuarioLogado || {};
        const temRegistro = String(logado.crm || "").trim() !== "";
        return {
            nome: temRegistro ? logado.nome : ref.nome,
            crm: temRegistro ? logado.crm : ref.crm
        };
    }

    const api = {
        tutorArquivado, agendamentosAtivosDoTutor, podeArquivarTutor, podeExcluirTutor, tutoresSelecionaveis,
        ...apiLogin, assinaturaDocumento
    };

    if (typeof module !== "undefined" && module.exports) module.exports = api;
    raiz.RegrasTutor = api;
    raiz.RegrasLogin = apiLogin;
})(typeof window !== "undefined" ? window : globalThis);
