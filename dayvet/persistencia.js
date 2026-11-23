// Adaptadores de dados Supabase para o contrato usado pela interface.
(function (raiz, criarApi) {
    const api = criarApi();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (raiz) raiz.DayVetPersistencia = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const LIMITE_PAGINA = 1000;

    async function consultarTodos(cliente, tabela, ordenacao) {
        const linhas = [];
        let inicio = 0;
        while (true) {
            let consulta = cliente.from(tabela).select('*');
            (Array.isArray(ordenacao) ? ordenacao : [ordenacao]).forEach(coluna => {
                consulta = consulta.order(coluna, { ascending: true });
            });
            const { data, error } = await consulta.range(inicio, inicio + LIMITE_PAGINA - 1);
            if (error) throw new Error(`Falha ao carregar ${tabela}: ${error.message}`);
            if (!Array.isArray(data)) throw new Error(`Resposta inválida ao carregar ${tabela}.`);
            linhas.push(...data);
            if (data.length < LIMITE_PAGINA) return linhas;
            inicio += data.length;
        }
    }

    function mapearTutor(linha) {
        return {
            cpf: linha.cpf,
            nome: linha.nome,
            tel: linha.telefone,
            email: linha.email || '',
            endereco: linha.endereco || '',
            arquivado: Boolean(linha.arquivado)
        };
    }

    function mapearPet(linha) {
        return {
            id: linha.id,
            tutorCpf: linha.tutor_cpf,
            nome: linha.nome,
            especie: linha.especie,
            raca: linha.raca,
            sexo: linha.sexo,
            peso: linha.peso_kg == null ? '' : Number(linha.peso_kg),
            comportamento: linha.comportamento || '',
            alergias: linha.alergias || ''
        };
    }

    function mapearAgendamento(linha) {
        return {
            id: linha.id,
            tutorCpf: linha.tutor_cpf,
            petId: linha.pet_id || '',
            vetId: linha.vet_id,
            servico: linha.servico,
            vacinaTipo: linha.vacina_tipo || '',
            data: linha.data,
            hora: String(linha.hora || '').slice(0, 5),
            valor: Number(linha.valor),
            status: linha.status,
            infoComplementar: linha.info_complementar || ''
        };
    }

    function mapearHistorico(linha) {
        return {
            id: linha.id,
            tutorCpf: linha.tutor_cpf,
            petId: linha.pet_id,
            veterinarioId: linha.veterinario_id || '',
            crmv: linha.crmv || '',
            tipo: linha.tipo,
            vacinaTipo: linha.vacina_tipo || '',
            data: linha.data,
            detalhe: linha.detalhe
        };
    }

    function mapearDocumento(linha) {
        return {
            id: linha.id,
            tutorCpf: linha.tutor_cpf,
            petId: linha.pet_id,
            nome: linha.nome,
            tipo: linha.mime_type,
            tamanhoKb: Math.max(1, Math.round(Number(linha.tamanho_bytes) / 1024)),
            data: String(linha.created_at || '').slice(0, 10),
            storagePath: linha.storage_path
        };
    }

    function mapearUsuario(linha) {
        return {
            id: linha.id,
            usuario: linha.usuario || '',
            nome: linha.nome,
            cpf: linha.cpf,
            email: linha.email,
            role: linha.role,
            crm: linha.crm || '',
            crmValidade: linha.crm_validade || '',
            mustChange: Boolean(linha.must_change),
            active: Boolean(linha.active) && !linha.deleted_at,
            deletedAt: linha.deleted_at || null
        };
    }

    function mapearTipoVacina(linha) {
        return { id: String(linha.id), nome: linha.nome };
    }

    function mapearTipoRaca(linha) {
        return { id: String(linha.id), especie: linha.especie, nome: linha.nome };
    }

    function mapearConfiguracao(linha) {
        return {
            horaAbertura: String(linha.hora_abertura).slice(0, 5),
            horaFechamento: String(linha.hora_fechamento).slice(0, 5),
            modoRestricao: linha.modo_restricao,
            funcionamentoFds: linha.funcionamento_fds
        };
    }

    async function carregarDados(cliente, role) {
        const clinico = role === 'admin' || role === 'veterinario';
        const leituras = [
            consultarTodos(cliente, 'tutores', 'cpf'),
            consultarTodos(cliente, 'pets', 'id'),
            consultarTodos(cliente, 'agendamentos', 'id'),
            consultarTodos(cliente, 'raca_tipos', ['especie', 'nome']),
            consultarTodos(cliente, 'configuracoes_clinica', 'id')
        ];
        if (clinico) leituras.push(
            consultarTodos(cliente, 'historico_clinico', 'id'),
            consultarTodos(cliente, 'vacina_tipos', 'nome'),
            consultarTodos(cliente, 'documentos', 'id')
        );
        if (role === 'admin') leituras.push(consultarTodos(cliente, 'usuarios', 'nome'));

        const [tutores, pets, agendamentos, racas, configuracoes, historico = [], vacinas = [], documentos = [], usuarios = []] =
            await Promise.all(leituras);

        if (!configuracoes.length) throw new Error('Configuração da clínica não cadastrada.');
        return {
            tutores: tutores.map(mapearTutor),
            pets: pets.map(mapearPet),
            agendamentos: agendamentos.map(mapearAgendamento),
            racas: racas.map(mapearTipoRaca),
            configuracao: mapearConfiguracao(configuracoes[0]),
            historico: historico.map(mapearHistorico),
            vacinas: vacinas.map(mapearTipoVacina),
            documentos: documentos.map(mapearDocumento),
            usuarios: usuarios.map(mapearUsuario)
        };
    }

    function paraTutor(tutor, criadoPor) {
        const linha = {
            cpf: tutor.cpf,
            nome: tutor.nome,
            telefone: tutor.tel,
            email: tutor.email || null,
            endereco: tutor.endereco || null,
            arquivado: Boolean(tutor.arquivado)
        };
        if (criadoPor) linha.criado_por = criadoPor;
        return linha;
    }

    function paraPet(pet, criadoPor) {
        const linha = {
            tutor_cpf: pet.tutorCpf,
            nome: pet.nome,
            especie: pet.especie,
            raca: pet.raca,
            sexo: pet.sexo,
            peso_kg: pet.peso === '' ? null : pet.peso,
            comportamento: pet.comportamento || null,
            alergias: pet.alergias || null
        };
        if (criadoPor) linha.criado_por = criadoPor;
        return linha;
    }

    function paraAgendamento(agendamento, criadoPor) {
        const linha = {
            tutor_cpf: agendamento.tutorCpf,
            pet_id: agendamento.petId || null,
            vet_id: agendamento.vetId || criadoPor,
            servico: agendamento.servico,
            vacina_tipo: agendamento.vacinaTipo || null,
            data: agendamento.data,
            hora: agendamento.hora,
            valor: agendamento.valor,
            status: agendamento.status,
            info_complementar: agendamento.infoComplementar || null
        };
        if (criadoPor) linha.criado_por = criadoPor;
        return linha;
    }

    function paraHistorico(registro, usuario) {
        return {
            tutor_cpf: registro.tutorCpf,
            pet_id: registro.petId,
            tipo: registro.tipo,
            veterinario_id: usuario.id,
            crmv: usuario.crm || null,
            vacina_tipo: registro.vacinaTipo || null,
            data: registro.data,
            detalhe: registro.detalhe,
            criado_por: usuario.id
        };
    }

    return {
        carregarDados,
        mapearTutor,
        mapearPet,
        mapearAgendamento,
        mapearHistorico,
        mapearDocumento,
        mapearUsuario,
        mapearConfiguracao,
        paraTutor,
        paraPet,
        paraAgendamento,
        paraHistorico
    };
});
