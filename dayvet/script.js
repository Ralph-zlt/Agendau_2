// ==========================================================
// DAYVET-GESTÃO — script.js
// Autenticação e persistência integradas ao Supabase.
// Mapa de seções: [1] Mock DB · [2] Permissões RBAC ·
// [3] Autenticação/Login · [4] Toasts · [5] Navegação/Tabs ·
// [6] Agendamentos · [7] Tutores & Pets · [8] Clínico ·
// [9] Relatórios · [10] Usuários · [11] Gráficos ·
// [12] Tema · [13] Inicialização
// ==========================================================

// ==========================================================
// SEÇÃO 0: SUPABASE E PERSISTÊNCIA
// ==========================================================
const MODO_DADOS = 'real';
const MODO_AUTENTICACAO = 'supabase';
let clienteSupabaseAuth = null;
let idsVacinaPorNome = {};
let idsRacaPorChave = {};

function obterClienteSupabaseAuth() {
    if (clienteSupabaseAuth) return clienteSupabaseAuth;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        throw new Error('Biblioteca Supabase indisponível.');
    }
    if (!window.DAYVET_CONFIG?.supabaseUrl || !window.DAYVET_CONFIG?.supabaseAnonKey) {
        throw new Error('Configuração pública do Supabase indisponível.');
    }
    clienteSupabaseAuth = window.supabase.createClient(
        window.DAYVET_CONFIG.supabaseUrl,
        window.DAYVET_CONFIG.supabaseAnonKey
    );
    clienteSupabaseAuth.auth.onAuthStateChange(evento => {
        if (evento === 'PASSWORD_RECOVERY') abrirEtapaRedefinirSenha();
    });
    return clienteSupabaseAuth;
}

function substituirArray(estado, novos) {
    estado.splice(0, estado.length, ...novos);
}

function escaparHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

function aplicarDadosSupabase(dados, usuarioAtual) {
    tutores = dados.tutores;
    pets = dados.pets;
    agendamentos = dados.agendamentos;
    historicoClinico = dados.historico;
    anexosClinicos = dados.documentos;
    usuarios = dados.usuarios;

    substituirArray(tiposVacina, dados.vacinas.map(tipo => tipo.nome));
    idsVacinaPorNome = Object.fromEntries(dados.vacinas.map(tipo => [tipo.nome, tipo.id]));

    Object.keys(racasPorEspecie).forEach(especie => { racasPorEspecie[especie] = []; });
    idsRacaPorChave = {};
    dados.racas.forEach(tipo => {
        racasPorEspecie[tipo.especie] ||= [];
        racasPorEspecie[tipo.especie].push(tipo.nome);
        idsRacaPorChave[`${tipo.especie}|${tipo.nome}`] = tipo.id;
    });

    const veterinariosAtivos = usuarios
        .filter(usuario => usuario.role === 'veterinario' && usuario.active)
        .map(usuario => ({ ...usuario, profissao: usuario.role }));
    if (usuarioAtual?.role === 'veterinario' &&
        !veterinariosAtivos.some(usuario => usuario.id === usuarioAtual.id)) {
        veterinariosAtivos.push({ ...usuarioAtual, profissao: usuarioAtual.role });
    }
    substituirArray(administradores, veterinariosAtivos);

    configuracaoClinica = dados.configuracao;
    configRestricao = configuracaoClinica.modoRestricao;
    aplicarConfiguracaoHoraria();
    renderizarAgendamentos();
    renderizarTutores();
    renderizarHistoricoClinico();
    renderizarAnexos();
    renderizarUsuarios();
    popularPetsDropdowns();
    renderizarTiposVacina();
    renderizarTiposRaca();
}

async function carregarDadosAutenticados(usuario) {
    const cliente = obterClienteSupabaseAuth();
    if (!window.DayVetPersistencia) throw new Error('Adaptadores de persistência não foram carregados.');
    const dados = await window.DayVetPersistencia.carregarDados(cliente, usuario.role);
    aplicarDadosSupabase(dados, usuario);
}

function limparDadosAutenticados() {
    tutores = [];
    pets = [];
    agendamentos = [];
    historicoClinico = [];
    anexosClinicos = [];
    usuarios = [];
    configuracaoClinica = {
        horaAbertura: '08:00',
        horaFechamento: '18:00',
        modoRestricao: 'comercial',
        funcionamentoFds: 'sabado'
    };
    configRestricao = configuracaoClinica.modoRestricao;
    aplicarConfiguracaoHoraria();
    substituirArray(tiposVacina, []);
    substituirArray(administradores, []);
    idsVacinaPorNome = {};
    idsRacaPorChave = {};
    Object.keys(racasPorEspecie).forEach(especie => { racasPorEspecie[especie] = []; });
    renderizarAgendamentos();
    renderizarTutores();
    renderizarHistoricoClinico();
    renderizarAnexos();
    renderizarUsuarios();
}

function confirmarEscrita(mensagem) {
    showToast(mensagem);
}

function notificarFalhaPersistencia(acao, erro) {
    console.error(`Falha ao ${acao} no Supabase.`, erro);
    showToast(`Não foi possível ${acao}. A alteração não foi confirmada.`, 'error');
}

async function executarMutacaoSupabase(acao, operacao) {
    try {
        const resultado = await operacao();
        if (resultado?.error) {
            notificarFalhaPersistencia(acao, resultado.error);
            return { ok: false, data: null };
        }
        return { ok: true, data: resultado?.data ?? null };
    } catch (erro) {
        notificarFalhaPersistencia(acao, erro);
        return { ok: false, data: null };
    }
}

function aplicarAvisoModoDados() {
    const emMock = MODO_DADOS !== 'real';
    ['aviso-modo-demo', 'aviso-login-demo'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = emMock ? '' : 'none';
    });
}

// ==========================================================
// SEÇÃO 1: ESTADO CARREGADO DO SUPABASE (sem registros de demonstração)
// ==========================================================

let administradores = [];
let tutores = [];
let pets = [];

const ESPECIES_PET = ["Canino", "Felino", "Equino", "Bovino", "Suíno", "Ovino", "Outro"];
const SEXOS_PET = ["Macho", "Fêmea"];
let racasPorEspecie = Object.fromEntries(ESPECIES_PET.map(especie => [especie, []]));
const RACAS_POR_ESPECIE = racasPorEspecie;

function isoDeslocado(dias) {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return d.toISOString().slice(0, 10);
}

let agendamentos = [];

let tiposVacina = [];
const TIPOS_VACINA = tiposVacina;

let historicoClinico = [];
let anexosClinicos = [];

let usuarios = [];
let currentUser = null;
let currentRole = '';
let configRestricao = "comercial";
let configuracaoClinica = {
    horaAbertura: '08:00',
    horaFechamento: '18:00',
    modoRestricao: 'comercial',
    funcionamentoFds: 'sabado'
};
let filtroAgendamentosStatus = "todos";
// O QUE: Flag de remarcação (volta como pendente) + estado do histórico de Expirados.
// PORQUÊ: Expirados abre colapsado (só Últimos 7 dias); pesquisa por mês/ano filtra o histórico.
let remarcandoAgendamento = false;
let expiradosExpandido = false;
let pesquisaMesExpirados = '';

let financeChartRef = null;
let consultasChartRef = null;

// ==========================================================
// SEÇÃO 2: MATRIZ DE PERMISSÕES POR PERFIL (RBAC)
// ==========================================================
// O cargo 'gestor' foi removido. Todas as funções que antes
// pertenciam ao gestor (valores_registrar, usuarios_criar,
// usuarios_editar, usuarios_excluir, horario_alterar) agora
// são cobertas pelo admin via acesso irrestrito ('*').
//
// Perfis válidos: admin, veterinario, funcionario.
//
// TODO [INTEGRAÇÃO SUPABASE]:
// A tabela `users` armazena o campo `role` do usuário.
// Na autenticação, o backend valida o CPF e retorna o role.
// O frontend apenas consulta PERMISSOES[currentRole] para
// habilitar/desabilitar botões e abas na interface.
const PERMISSOES = {
    admin: ['*'],
    veterinario: [
        'clinica_criar', 'clinica_editar', 'clinica_excluir', 'clinica_imprimir',
        'consulta_agendar', 'consulta_editar', 'consulta_cancelar', 'consulta_confirmar',
        'vacinacao_agendar', 'vacinacao_editar', 'vacinacao_cancelar', 'vacinacao_confirmar',
        'vacina_tipos_criar', 'vacina_tipos_editar', 'vacina_tipos_excluir', 'vacina_tipos_listar',
        'raca_tipos_listar',
        'relatorios_gerar'
    ],
    funcionario: [
        // Sem modo clínico (decisão 2026-09-25): sem clinica_* e sem vacina_tipos_*.
        // Agendamentos só-leitura; mantém ver + relatórios, tutor/pet e tipos de raça.
        // Tutor: incluir/editar/arquivar/excluir (decisão do dono 2026-11-13).
        'raca_tipos_criar', 'raca_tipos_editar', 'raca_tipos_excluir', 'raca_tipos_listar',
        'relatorios_gerar', 'tutor_incluir', 'tutor_editar', 'tutor_arquivar', 'tutor_excluir',
        'pet_incluir'
    ]
};

function temPermissao(acao) {
    const perms = PERMISSOES[currentRole] || [];
    return perms.includes('*') || perms.includes(acao);
}

// ==========================================================
// SEÇÃO 3: AUTENTICAÇÃO E LOGIN (usuário, CPF ou e-mail)
// ==========================================================

// Auth Supabase: RPC resolve usuário/CPF/e-mail; perfil e RBAC vêm de public.usuarios.

// O QUE: Mapa de atalhos de demonstração (identificador curto → perfil).
// PORQUÊ: Permite login rápido digitando 1, 2 ou 3 (atalho de teste).
// Atalho autorizado para testes: usa a credencial real da respectiva conta de teste.
const perfisTestes = {
    "1":   { id: "u1", username: "raphael_dias", nome: "Raphael Dias", role: "admin", profissao: "admin", password_demo: "Veterin@ria" },
    "111": { id: "u1", username: "raphael_dias", nome: "Raphael Dias", role: "admin", profissao: "admin", password_demo: "Veterin@ria" },
    "2":   { id: "u2", username: "lais_vet", nome: "Dra. Laís", role: "veterinario", profissao: "veterinario", crm: "CRMV-SP 00000", password_demo: "Veterin@ria" },
    "222": { id: "u2", username: "lais_vet", nome: "Dra. Laís", role: "veterinario", profissao: "veterinario", crm: "CRMV-SP 00000", password_demo: "Veterin@ria" },
    "3":   { id: "u3", username: "douglas_funcionario", nome: "Douglas", role: "funcionario", profissao: "funcionario", password_demo: "Veterin@ria" },
    "333": { id: "u3", username: "douglas_funcionario", nome: "Douglas", role: "funcionario", profissao: "funcionario", password_demo: "Veterin@ria" }
};

// O QUE: Autentica identificador pela RPC, carrega perfil e dados via RLS.
let autenticacaoEmAndamento = false;

function mostrarErroCredenciais() {
    showToast("Credenciais inválidas", "error");
}

async function autenticarUsuarioSupabase(identificador, senha) {
    const cliente = obterClienteSupabaseAuth();
    const { data: email, error: erroResolver } = await cliente.rpc('resolver_login', {
        p_identificador: identificador
    });
    if (erroResolver) {
        console.error("Falha ao resolver identificador de login.", erroResolver);
        showToast("Não foi possível validar o login. Tente novamente.", "error");
        return;
    }
    if (typeof email !== 'string' || !email) {
        mostrarErroCredenciais();
        return;
    }

    const { data: authData, error: erroAuth } = await cliente.auth.signInWithPassword({ email, password: senha });
    if (erroAuth || !authData?.user) {
        mostrarErroCredenciais();
        return;
    }

    const { data: perfil, error: erroPerfil } = await cliente
        .from('usuarios')
        .select('id, usuario, nome, role, crm, must_change, active, deleted_at')
        .eq('id', authData.user.id)
        .maybeSingle();

    if (erroPerfil || !perfil) {
        const { error: erroSaida } = await cliente.auth.signOut();
        if (erroSaida) {
            console.error("Falha ao encerrar sessão sem perfil autorizado.", erroSaida);
        }
        console.error("Falha ao carregar o perfil autenticado.", erroPerfil);
        showToast("Não foi possível carregar o perfil do usuário.", "error");
        return;
    }
    if (!perfil.active || perfil.deleted_at || !Object.prototype.hasOwnProperty.call(PERMISSOES, perfil.role)) {
        const { error: erroSaida } = await cliente.auth.signOut();
        if (erroSaida) {
            console.error("Falha ao encerrar sessão de conta sem acesso.", erroSaida);
        }
        mostrarErroCredenciais();
        return;
    }

    const userObj = {
        id: authData.user.id,
        username: perfil.usuario || '',
        nome: perfil.nome,
        role: perfil.role,
        profissao: perfil.role,
        crm: perfil.crm || ''
    };
    if (perfil.must_change) {
        abrirModalForcarTrocaSenha(userObj);
        return;
    }
    try {
        await carregarDadosAutenticados(userObj);
    } catch (erro) {
        const { error: erroSaida } = await cliente.auth.signOut();
        if (erroSaida) console.error("Falha ao encerrar sessão sem dados carregados.", erroSaida);
        console.error("Falha ao carregar os dados da clínica.", erro);
        showToast("Não foi possível carregar os dados do sistema. A sessão foi encerrada.", "error");
        return;
    }
    realizarLogin(userObj, perfil.role);
}

async function handleAuthSubmit(e) {
    if (e) e.preventDefault();
    let input = document.getElementById('login-cpf').value.trim();
    let senha = document.getElementById('login-password').value;

    // O atalho numérico continua disponível, mas autentica a conta real no Supabase.
    const demoUser = perfisTestes[input];
    if (demoUser) {
        input = ACESSOS_TESTE[demoUser.role].usuario;
        senha = demoUser.password_demo;
    }

    if (MODO_AUTENTICACAO !== 'supabase' || autenticacaoEmAndamento) return;
    autenticacaoEmAndamento = true;
    const botao = document.querySelector('#auth-form button[type="submit"]');
    if (botao) botao.disabled = true;
    try {
        await autenticarUsuarioSupabase(input, senha);
    } catch (erro) {
        console.error("Falha de comunicação com o Supabase Auth.", erro);
        showToast("Não foi possível conectar ao serviço de autenticação.", "error");
    } finally {
        autenticacaoEmAndamento = false;
        if (botao) botao.disabled = false;
    }
}

async function restaurarSessaoSupabase() {
    let cliente;
    try {
        cliente = obterClienteSupabaseAuth();
        const { data: sessaoData, error: erroSessao } = await cliente.auth.getSession();
        if (erroSessao) throw erroSessao;
        const usuarioAuth = sessaoData?.session?.user;
        if (!usuarioAuth) return;

        const { data: perfil, error: erroPerfil } = await cliente
            .from('usuarios')
            .select('id, usuario, nome, role, crm, must_change, active, deleted_at')
            .eq('id', usuarioAuth.id)
            .maybeSingle();
        if (erroPerfil) throw erroPerfil;
        if (!perfil || !perfil.active || perfil.deleted_at ||
            !Object.prototype.hasOwnProperty.call(PERMISSOES, perfil.role)) {
            await cliente.auth.signOut();
            mostrarErroCredenciais();
            return;
        }

        const userObj = {
            id: usuarioAuth.id,
            username: perfil.usuario || '',
            nome: perfil.nome,
            role: perfil.role,
            profissao: perfil.role,
            crm: perfil.crm || ''
        };
        if (perfil.must_change) {
            abrirModalForcarTrocaSenha(userObj);
            return;
        }
        await carregarDadosAutenticados(userObj);
        realizarLogin(userObj, perfil.role);
    } catch (erro) {
        console.error("Falha ao restaurar sessão Supabase.", erro);
        showToast("Não foi possível restaurar a sessão e carregar os dados.", "error");
    }
}

function formatarCargo(role) {
    const mapa = {
        admin: 'Administrador',
        veterinario: 'Veterinário',
        funcionario: 'Funcionário'
    };
    return mapa[role] || role;
}

// O QUE: Acessos temporários do protótipo (estilo "login salvo").
// PORQUÊ: Facilita o teste pelo usuário final sem decorar CPFs 1/2/3:
//   digitar qualquer coisa no campo usuário exibe Administrador,
//   Veterinário e Funcionário; clicar preenche usuário+senha e acessa.
// DEMO (mock): Atalhos por apelido (admin/vet/fun) + CPFs curtos 1/2/3.
// TODO [INTEGRAÇÃO SUPABASE - DB SQL]: remover todo este bloco —
//   o login real identifica o perfil pelo CPF/e-mail na tabela `users`.
// TODO [SECURITY]: remover acessos temporários antes da produção
const ACESSOS_TEMPORARIOS = [
    { role: 'admin', rotulo: 'Administrador', icone: 'shield-check', apelidos: ['admin', 'administrador', '1', '111'] },
    { role: 'veterinario', rotulo: 'Veterinário', icone: 'stethoscope', apelidos: ['vet', 'veterinario', 'veterinário', '2', '222'] },
    { role: 'funcionario', rotulo: 'Funcionário', icone: 'clipboard-list', apelidos: ['fun', 'func', 'funcionario', 'funcionário', '3', '333'] }
];

const CPF_DEMO_POR_ROLE = { admin: '1', veterinario: '2', funcionario: '3' };

// O QUE: Identificadores e senhas das 3 contas de teste, usados pelos botões.
// PORQUÊ: Pedido do dono (2026-11-13): manter o bypass para testes, mas por botão
//   visível que preenche usuário + senha; o envio passa pelo Supabase Auth.
// TODO [SECURITY]: remover o bloco de acesso rápido antes da produção.
const ACESSOS_TESTE = {
    admin:       { rotulo: 'Admin',       usuario: 'raphael_dias',        cpf: '111.111.111-11', senha: 'Veterin@ria' },
    veterinario: { rotulo: 'Veterinário', usuario: 'lais_vet',            cpf: '222.222.222-22', senha: 'Veterin@ria' },
    funcionario: { rotulo: 'Funcionário', usuario: 'douglas_funcionario', cpf: '333.333.333-33', senha: 'Veterin@ria' }
};

// O QUE: Preenche usuário + senha do perfil clicado (não envia o formulário).
// PORQUÊ: Teste rápido e transparente — o usuário vê as credenciais usadas e
//   confirma em "Acessar o Painel". Diferente do atalho 1/2/3, autentica
//   as contas de teste reais pelo Supabase Auth.
function preencherAcessoTeste(role) {
    const acesso = ACESSOS_TESTE[role];
    if (!acesso) return;
    const campoCpf = document.getElementById('login-cpf');
    const campoSenha = document.getElementById('login-password');
    if (!campoCpf || !campoSenha) return;

    campoCpf.value = acesso.usuario;
    campoSenha.value = acesso.senha;

    // Fecha a lista de sugestões para não cobrir o botão de acesso.
    const box = document.getElementById('login-sugestoes');
    if (box) { box.classList.add('hidden'); box.innerHTML = ''; }

    const status = document.getElementById('acessos-teste-status');
    if (status) status.textContent = `Preenchido: ${acesso.rotulo} — usuário ${acesso.usuario} (CPF ${acesso.cpf}). Clique em "Acessar o Painel".`;

    document.getElementById('auth-form')?.querySelector('button[type=submit]')?.focus();
}

// O QUE: Filtra e exibe as sugestões de acesso temporário conforme o digitado.
// PORQUÊ: Experiência próxima ao login salvo do navegador.
// DEMO (mock): Filtro por substring nos apelidos/rótulos; sem backend.
function filtrarSugestoesLogin() {
    const box = document.getElementById('login-sugestoes');
    if (!box) return;
    const termo = document.getElementById('login-cpf').value.trim().toLowerCase();
    const visiveis = ACESSOS_TEMPORARIOS.filter(a =>
        !termo || a.rotulo.toLowerCase().includes(termo) ||
        a.apelidos.some(ap => ap.includes(termo))
    );
    if (!visiveis.length) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    box.innerHTML = visiveis.map(a =>
        `<button type="button" onclick="preencherLoginTemporario('${a.role}')" ` +
        `class="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 ` +
        `hover:border-brand-lime text-left transition-all group">` +
        `<i data-lucide="${a.icone}" class="w-4 h-4 text-slate-500 group-hover:text-brand-lime"></i>` +
        `<span><span class="block text-xs font-bold text-slate-200">${a.rotulo}</span>` +
        `<span class="block text-[10px] text-slate-500">acesso temporário — toque para entrar</span></span>` +
        `</button>`
    ).join('');
    box.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

// O QUE: Preenche usuário+senha do acesso temporário e acessa automaticamente.
// PORQUÊ: Um toque equivale ao "login salvo" do navegador no protótipo.
// DEMO (mock): Usa os CPFs curtos 1/2/3 via perfisTestes; sem backend.
function preencherLoginTemporario(role) {
    const cpf = CPF_DEMO_POR_ROLE[role];
    if (!cpf) return;
    const demoUser = perfisTestes[cpf];
    if (!demoUser) return;
    document.getElementById('login-cpf').value = cpf;
    document.getElementById('login-password').value = demoUser.password_demo || '';
    const box = document.getElementById('login-sugestoes');
    if (box) { box.classList.add('hidden'); box.innerHTML = ''; }
    handleAuthSubmit(null);
}

// O QUE: Valida CPF brasileiro (dígito verificador x10 e x11).
// PORQUÊ: Impede cadastro de CPFs inventados no formulário de criação de usuário.
// DEMO (mock): Algoritmo padrão da Receita Federal; sem consulta externa.
// TODO [INTEGRAÇÃO SUPABASE - DB SQL] (tabela users + endpoint + bcrypt/LGPD):
//   Validação pode ocorrer no backend via endpoint dedicado ou biblioteca server-side.
//   LGPD: CPF é dado sensível — validação sem armazenar em logs.
function validarCPF(cpf) {
    const limpo = cpf.replace(/\D/g, '');
    if (limpo.length !== 11 || /^(\d)\1{10}$/.test(limpo)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) soma += parseInt(limpo[i]) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== parseInt(limpo[9])) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) soma += parseInt(limpo[i]) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    return resto === parseInt(limpo[10]);
}

// O QUE: Valida formato de e-mail com regex (nivel mais basico).
// PORQUÊ: Evita cadastro de emails invalidos no formulario de criacao de usuario.
// DEMO (mock): Apenas verifica presenca de @ e dominio; sem validacao DNS.
// TODO [INTEGRAÇÃO SUPABASE - DB SQL] (tabela users + endpoint + bcrypt/LGPD):
//   Validacao server-side com biblioteca (ex: validator.js) + envio de email
//   de confirmacao para verificar titularidade.
function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// O QUE: Valida politica de senha forte (8+ chars, 1 maiuscula, 1 numero, 1 especial).
// PORQUÊ: Garante seguranca minima para contas empresariais.
// DEMO (mock): Regex local; no backend usaria mesma regra antes de bcrypt.hash().
// TODO [INTEGRAÇÃO SUPABASE - DB SQL] (tabela users + endpoint + bcrypt/LGPD):
//   Aplicar mesma regra no backend antes de armazenar com bcrypt.
//   Historico de ultimas N senhas para evitar reutilizacao.
//   LGPD: senha nunca aparece em logs ou mensagens de erro.
function validarSenhaForte(senha) {
    const tem8Chars = senha.length >= 8;
    const temMaiuscula = /[A-Z]/.test(senha);
    const temNumero = /[0-9]/.test(senha);
    const temEspecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha);
    return tem8Chars && temMaiuscula && temNumero && temEspecial;
}

function realizarLogin(userObj, role) {
    currentUser = userObj;
    currentRole = role;
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('header-user-name').innerText = userObj.nome;
    document.getElementById('header-user-role').innerText = 'Profissão: ' + formatarCargo(userObj.profissao || userObj.role);
    document.getElementById('current-user-role-label').innerText = formatarCargo(role);

    atualizarPermissoesNavegacao();

    showToast("Sessão iniciada como " + userObj.nome);
    switchTab(role === 'funcionario' ? 'agendamentos' : 'dashboard');
}

async function handleLogout() {
    if (MODO_AUTENTICACAO === 'supabase') {
        try {
            const { error } = await obterClienteSupabaseAuth().auth.signOut();
            if (error) {
                console.error("Falha ao encerrar sessão no Supabase Auth.", error);
                showToast("Não foi possível encerrar a sessão. Tente novamente.", "error");
                return;
            }
        } catch (erro) {
            console.error("Falha de comunicação ao encerrar a sessão.", erro);
            showToast("Não foi possível encerrar a sessão. Tente novamente.", "error");
            return;
        }
    }
    currentUser = null;
    currentRole = '';
    limparDadosAutenticados();
    document.getElementById('login-screen').classList.remove('hidden');
    showToast("Você saiu do sistema.");
}

// ==========================================================
// SEÇÃO 4: TOASTS (notificações)
// ==========================================================

function showToast(mensagem, tipo) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');

    let bgClass = "bg-slate-900 border-brand-lime/40 text-slate-100";
    let icon = "<i data-lucide='check-circle-2' class='w-4 h-4 text-brand-lime shrink-0'></i>";
    if (tipo === 'error') {
        bgClass = "bg-slate-900 border-rose-500/40 text-slate-100";
        icon = "<i data-lucide='alert-triangle' class='w-4 h-4 text-rose-400 shrink-0'></i>";
    }
    if (tipo === 'aviso') {
        bgClass = "bg-slate-900 border-amber-400/60 text-slate-100";
        icon = "<i data-lucide='alert-triangle' class='w-4 h-4 text-amber-400 shrink-0'></i>";
    }

    toast.className = "flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl pointer-events-auto transition-all duration-300 transform translate-y-5 opacity-0 " + bgClass;
    toast.innerHTML = icon + " <span class='text-xs font-semibold'>" + escaparHtml(mensagem) + "</span>";
    container.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => toast.classList.remove('translate-y-5', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('translate-y-5', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ==========================================================
// SEÇÃO 5: NAVEGAÇÃO E TABS
// ==========================================================

function atualizarPermissoesNavegacao() {
    // Admin assume todas as funções que eram do gestor (acesso irrestrito via '*')
    const podeUsuarios = (currentRole === 'admin');
    const podeRelatorios = (currentRole === 'admin');
    const podeClinica = (currentRole === 'admin' || currentRole === 'veterinario'); // Funcionário sem modo clínico (decisão 2026-09-25)
    const podeClientes = (currentRole === 'admin' || currentRole === 'funcionario');
    const podeDashboard = (currentRole === 'admin' || currentRole === 'veterinario');

    // Abas de navegação
    toggleEl('nav-usuarios', podeUsuarios);
    toggleEl('nav-relatorios', podeRelatorios);
    toggleEl('nav-clinica', podeClinica);
    toggleEl('nav-clientes', podeClientes);
    toggleEl('nav-dashboard', podeDashboard);

    // Header: Alterar horário de funcionamento (Admin)
    toggleEl('horario-restricao-control', temPermissao('horario_alterar'));

    // Dashboard: Gerar Relatórios (Veterinário, Funcionário, Admin)
    toggleEl('btn-gerar-relatorios-dashboard', temPermissao('relatorios_gerar'));

    // Agendamentos: "Agendar Vacinação" p/ quem tem vacinacao_agendar (admin via '*', veterinário); "Agendar" exige consulta_agendar
    toggleEl('btn-solicitar-vacinacao', temPermissao('vacinacao_agendar'));
    toggleEl('btn-agendar-consulta', temPermissao('consulta_agendar'));

    // Tutores & Pets: Novo Tutor (Funcionário/Admin) e Novo Pet (só Admin)
    toggleEl('btn-novo-tutor', temPermissao('tutor_incluir'));
    toggleEl('btn-novo-pet', temPermissao('pet_incluir'));

    // Módulo Clínico: só quem cria/edita documentos vê o formulário e os botões de "Incluir"
    const podeCriarClinico = temPermissao('clinica_criar');
    toggleEl('clinica-form-coluna', podeCriarClinico);
    document.querySelectorAll('.btn-incluir-doc-clinico').forEach(btn => {
        btn.classList.toggle('hidden', !podeCriarClinico);
    });
    // Visões restritas de catálogos: tipos de vacina = admin/vet; tipos de raça = admin/funcionário.
    // (Admin cobre via '*' — paridade: tudo que os demais podem, o admin também pode.)
    toggleEl('tipos-vacina-card-func', temPermissao('vacina_tipos_criar'));
    toggleEl('racas-card-gerenciar', temPermissao('raca_tipos_criar'));
    const colunaTimeline = document.getElementById('clinica-timeline-coluna');
    if (colunaTimeline) {
        colunaTimeline.classList.toggle('lg:col-span-2', podeCriarClinico);
        colunaTimeline.classList.toggle('lg:col-span-3', !podeCriarClinico);
    }

    // Reaplica as regras em conteúdos já renderizados dinamicamente
    renderizarAgendamentos();
    renderizarTutores();
    renderizarHistoricoClinico();
}

function toggleEl(id, mostrar) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !mostrar);
}

function switchTab(tabId) {
    if (tabId === 'usuarios' && currentRole !== 'admin') {
        showToast("Acesso restrito: perfil sem permissão para gerenciar usuários.", "error");
        return;
    }
    if (tabId === 'clientes' && currentRole === 'veterinario') {
        showToast("Acesso restrito: perfil sem permissão para Tutores & Pets.", "error");
        return;
    }
    if (tabId === 'clinica' && currentRole === 'funcionario') {
        showToast("Acesso restrito: perfil sem permissão para o Módulo Clínico.", "error");
        return;
    }
    if (tabId === 'dashboard' && currentRole === 'funcionario') {
        showToast("Acesso restrito: perfil sem permissão para o Dashboard.", "error");
        return;
    }
    if (tabId === 'relatorios' && currentRole !== 'admin') {
        showToast("Acesso restrito: perfil sem permissão para a Central de Relatórios.", "error");
        return;
    }

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-slate-900', 'text-white');
        btn.classList.add('text-slate-400');
    });

    const targetTab = document.getElementById("tab-" + tabId);
    if (targetTab) targetTab.classList.remove('hidden');

    const activeBtn = document.getElementById("nav-" + tabId);
    if (activeBtn) {
        activeBtn.classList.add('bg-slate-900', 'text-white');
        activeBtn.classList.remove('text-slate-400');
    }

    if (tabId === 'dashboard') {
        atualizarDashboardPorPerfil();
    } else if (tabId === 'agendamentos') {
        renderizarAgendamentos();
    } else if (tabId === 'clientes') {
        renderizarTutores();
    } else if (tabId === 'clinica') {
        renderizarHistoricoClinico();
        popularPetsDropdowns();
    } else if (tabId === 'relatorios') {
        switchRelatorioTab('servicos');
    } else if (tabId === 'usuarios') {
        renderizarUsuarios();
    }
}

function alterarRestricaoHoraria() {
    const modo = document.getElementById('config-horario').value;
    atualizarConfiguracaoClinica({ modo_restricao: modo }, "atualizar a restrição horária").then(ok => {
        if (ok) confirmarEscrita("Restrição horária atualizada");
    });
}

// ==========================================================
// SEÇÃO 6: AGENDAMENTOS
// ==========================================================

function renderizarAgendamentos() {
    const bodyA = document.getElementById('agendamentos-table-body');
    const bodyE = document.getElementById('expirados-table-body');
    if (!bodyA || !bodyE) return;
    bodyA.innerHTML = '';
    bodyE.innerHTML = '';

    // Ativos em cima (ordem crescente), Expirados abaixo (mais recentes primeiro, agrupados).
    const porStatus = (a) => filtroAgendamentosStatus === 'todos' || a.status === filtroAgendamentosStatus;
    const ord = (x, y) => String(x.data + x.hora).localeCompare(String(y.data + y.hora));
    const ativos = agendamentos.filter(a => !agExpirado(a) && porStatus(a)).sort(ord);
    const expirados = agendamentos.filter(a => agExpirado(a) && porStatus(a)).sort((x, y) => ord(y, x));

    ativos.forEach(a => { bodyA.innerHTML += linhaAgendamento(a, false); });

    const limite7d = isoDeslocado(-7);
    const mesAtual = hojeISO().slice(0, 7);
    let grupoAtual = '';
    let listaExpirados = expirados;
    // Pesquisa por mês/ano mostra resultados direto (colapsado ou não).
    if (pesquisaMesExpirados) {
        listaExpirados = expirados.filter(a => (a.data || '').slice(0, 7) === pesquisaMesExpirados);
    } else if (!expiradosExpandido) {
        // Colapsado: só Últimos 7 dias.
        listaExpirados = expirados.filter(a => (a.data || '') >= limite7d);
    }
    listaExpirados.forEach(a => {
        const grupo = grupoExpirado(a.data, limite7d, mesAtual);
        if (grupo !== grupoAtual) {
            grupoAtual = grupo;
            bodyE.innerHTML += `<tr class='bg-slate-900/60'><td colspan='6' class='py-2 px-6 text-[11px] font-black uppercase tracking-wider text-slate-400'>${grupo}</td></tr>`;
        }
        bodyE.innerHTML += linhaAgendamento(a, true);
    });

    document.getElementById('agendamento-counter').innerText = "Exibindo " + ativos.length + " compromissos";
    const totalExp = expirados.length;
    document.getElementById('expirados-counter').innerText = pesquisaMesExpirados
        ? `Exibindo ${listaExpirados.length} de ${totalExp} (${pesquisaMesExpirados.slice(5, 7)}/${pesquisaMesExpirados.slice(0, 4)})`
        : (!expiradosExpandido && totalExp > listaExpirados.length
            ? `Últimos 7 dias (${listaExpirados.length} de ${totalExp}) — carregue mais antigas`
            : `Exibindo ${listaExpirados.length} no histórico`);
    const btnExp = document.getElementById('btn-expandir-expirados');
    if (btnExp) {
        btnExp.classList.toggle('hidden', !!pesquisaMesExpirados);
        btnExp.innerHTML = expiradosExpandido ? 'Mostrar menos' : 'Carregar mais antigas';
    }
    const btnLimpar = document.getElementById('btn-limpar-pesquisa-mes');
    if (btnLimpar) btnLimpar.classList.toggle('hidden', !pesquisaMesExpirados);
    lucide.createIcons();
    atualizarKpisDashboard();
    if (financeChartRef) atualizarPeriodoFaturamento();
    if (consultasChartRef && currentRole === 'veterinario') inicializarConsultasChart();
}

// O QUE: Expande/recolhe o histórico de Expirados.
function alternarExpiradosExpandido() {
    expiradosExpandido = !expiradosExpandido;
    renderizarAgendamentos();
}

// O QUE: Pesquisa Expirados por mês/ano via seleção (só leitura — funcionário também pesquisa).
// PORQUÊ: <input type=month> não abre seleção em todos os navegadores — selects funcionam sempre.
function inicializarPesquisaMes() {
    const selM = document.getElementById('pesquisa-mes-sel');
    const selA = document.getElementById('pesquisa-ano-sel');
    if (!selM || !selA || selM.options.length) return;
    MESES_PT.forEach((m, i) => {
        selM.innerHTML += `<option value="${String(i + 1).padStart(2, '0')}">${m}</option>`;
    });
    const anoAtual = new Date().getFullYear();
    for (let a = anoAtual - 3; a <= anoAtual + 1; a++) {
        selA.innerHTML += `<option value="${a}">${a}</option>`;
    }
    selM.value = String(new Date().getMonth() + 1).padStart(2, '0');
    selA.value = String(anoAtual);
}
function pesquisarMesExpirados() {
    const mes = document.getElementById('pesquisa-mes-sel')?.value || '';
    const ano = document.getElementById('pesquisa-ano-sel')?.value || '';
    pesquisaMesExpirados = (/^\d{2}$/.test(mes) && /^\d{4}$/.test(ano)) ? `${ano}-${mes}` : '';
    renderizarAgendamentos();
}
function limparPesquisaMesExpirados() {
    pesquisaMesExpirados = '';
    inicializarPesquisaMesReset();
    renderizarAgendamentos();
}
function inicializarPesquisaMesReset() {
    const selM = document.getElementById('pesquisa-mes-sel');
    const selA = document.getElementById('pesquisa-ano-sel');
    if (!selM || !selA) return;
    selM.value = String(new Date().getMonth() + 1).padStart(2, '0');
    selA.value = String(new Date().getFullYear());
}

// O QUE: Linha da tabela de agendamentos (usada nas duas seções: Ativos e Expirados).
function linhaAgendamento(a, expirado) {
    const pet = pets.find(p => p.id === a.petId);
    const tutor = tutores.find(t => t.cpf === a.tutorCpf);

    let badge = "";
    if (a.status === 'confirmado') {
        badge = "<span class='bg-brand-lime/10 text-brand-lime border border-brand-lime/20 text-xs font-bold px-2.5 py-1 rounded-full'>Confirmado</span>";
    } else if (a.status === 'cancelado') {
        badge = "<span class='bg-red-950/40 text-rose-400 border border-rose-800/40 text-xs font-bold px-2.5 py-1 rounded-full'>Cancelado</span>";
    } else if (a.status === 'concluido') {
        badge = "<span class='bg-brand-blue/10 text-brand-blue border border-brand-blue/20 text-xs font-bold px-2.5 py-1 rounded-full'>Concluído</span>";
    } else {
        badge = "<span class='bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20 text-xs font-bold px-2.5 py-1 rounded-full'>Pendente</span>";
    }

    const ehVacinacao = /vacin/i.test(a.servico);
    const permAgendar = ehVacinacao ? 'vacinacao_agendar' : 'consulta_agendar';
    const permEditar = ehVacinacao ? 'vacinacao_editar' : 'consulta_editar';
    const permCancelar = ehVacinacao ? 'vacinacao_cancelar' : 'consulta_cancelar';
    const permConfirmar = ehVacinacao ? 'vacinacao_confirmar' : 'consulta_confirmar';

    const btnRegistrarValor = temPermissao('valores_registrar')
        ? `<button onclick="abrirModalRegistrarValor('${a.id}', ${a.valor})" class='ml-2 text-[10px] text-brand-lime hover:underline'>[Registrar Valor]</button>`
        : '';
    const btnEditar = temPermissao(permEditar)
        ? `<button onclick="editarAgendamentoPrompt('${a.id}')" class='text-brand-blue hover:opacity-80 font-bold text-xs bg-brand-blue/10 px-2 py-1 rounded-lg'>Editar</button>` : '';
    let acoes = '';
    if (expirado) {
        if (a.status === 'concluido') {
            // Concluído: marcar nova consulta (novo agendamento com mesmos dados).
            acoes = temPermissao(permAgendar)
                ? `<button onclick="marcarNovaConsulta('${a.id}')" class='text-brand-lime hover:opacity-80 font-bold text-xs bg-brand-lime/10 px-2 py-1 rounded-lg'>Nova consulta</button>` : '';
        } else if (a.status === 'cancelado') {
            acoes = temPermissao(permEditar)
                ? `<button onclick="remarcarAgendamento('${a.id}')" class='text-brand-lime hover:opacity-80 font-bold text-xs bg-brand-lime/10 px-2 py-1 rounded-lg'>Remarcar</button>` : '';
        } else {
            // Pendente/confirmado vencido: pode cancelar ou remarcar (Editar também permite).
            const btnRemarcar = temPermissao(permEditar)
                ? `<button onclick="remarcarAgendamento('${a.id}')" class='text-brand-lime hover:opacity-80 font-bold text-xs bg-brand-lime/10 px-2 py-1 rounded-lg'>Remarcar</button>` : '';
            const btnCancelar = temPermissao(permCancelar)
                ? `<button onclick="alterarStatusAgendamento('${a.id}', 'cancelado')" class='text-rose-400 hover:opacity-80 font-bold text-xs bg-rose-500/10 px-2 py-1 rounded-lg'>Cancelar</button>` : '';
            acoes = btnRemarcar + btnEditar + btnCancelar;
        }
    } else {
        const btnConfirmar = (a.status !== 'confirmado' && a.status !== 'concluido' && temPermissao(permConfirmar))
            ? `<button onclick="alterarStatusAgendamento('${a.id}', 'confirmado')" class='text-brand-lime hover:opacity-80 font-bold text-xs bg-brand-lime/10 px-2 py-1 rounded-lg'>Confirmar</button>` : '';
        const btnConcluir = (a.status !== 'concluido' && temPermissao(permConfirmar))
            ? `<button onclick="alterarStatusAgendamento('${a.id}', 'concluido')" class='text-brand-blue hover:opacity-80 font-bold text-xs bg-brand-blue/10 px-2 py-1 rounded-lg'>Concluir</button>` : '';
        const btnCancelar = (a.status !== 'cancelado' && a.status !== 'concluido' && temPermissao(permCancelar))
            ? `<button onclick="alterarStatusAgendamento('${a.id}', 'cancelado')" class='text-rose-400 hover:opacity-80 font-bold text-xs bg-rose-500/10 px-2 py-1 rounded-lg'>Cancelar</button>` : '';
        acoes = btnConfirmar + btnConcluir + btnEditar + btnCancelar;
    }

    return `
        <tr class='hover:bg-slate-900/60 transition-all border-b border-slate-800/50'>
            <td class='py-4 px-6'>
                <div class='font-bold text-slate-200'>${escaparHtml(pet ? pet.nome : 'N/A')}</div>
                <div class='text-xs text-slate-500'>${escaparHtml(tutor ? tutor.nome : 'N/A')}</div>
            </td>
            <td class='py-4 px-6 text-slate-300 font-semibold'>${escaparHtml(a.servico)}${/vacin/i.test(a.servico) && a.vacinaTipo ? ' — ' + escaparHtml(a.vacinaTipo) : ''}</td>
            <td class='py-4 px-6 text-slate-300'>
                <div>${escaparHtml(a.data)}</div>
                <div class='text-xs text-brand-pink font-bold'>${escaparHtml(a.hora)}</div>
            </td>
            <td class='py-4 px-6 font-bold text-slate-200'>
                <span>R$ ${a.valor.toFixed(2)}</span>
                ${btnRegistrarValor}
            </td>
            <td class='py-4 px-6'>${badge}</td>
            <td class='py-4 px-6 text-right space-x-1.5'>
                ${acoes}
                ${!acoes ? `<span class='text-slate-600 text-[11px] italic'>Sem ações disponíveis</span>` : ''}
            </td>
        </tr>
    `;
}

// O QUE: Novo agendamento a partir de um concluído (mesmos pet/tutor/serviço, data em aberto).
function marcarNovaConsulta(id) {
    const ag = agendamentos.find(a => a.id === id);
    if (!ag) return;
    const permAgendar = /vacin/i.test(ag.servico) ? 'vacinacao_agendar' : 'consulta_agendar';
    if (!temPermissao(permAgendar)) {
        showToast("Acesso restrito: perfil somente leitura em agendamentos.", "error");
        return;
    }
    abrirModalAgendamento();
    // Título acompanha o serviço de origem: vacinação → "Agendar Vacinação".
    document.getElementById('modal-agendamento-titulo').innerText = /vacin/i.test(ag.servico || '') ? "Agendar Vacinação" : "Agendar Consulta";
    document.getElementById('agend-tutor-select').value = ag.tutorCpf;
    popularPetsDoTutor();
    document.getElementById('agend-pet-select').value = ag.petId;
    document.getElementById('agend-tipo').value = ag.servico;
    popularVacinaTiposAg(ag.vacinaTipo || '');
    document.getElementById('agend-vacina-novo-nome').value = '';
    atualizarVisibilidadeVacinaAg();
    document.getElementById('agend-valor').value = ag.valor;
    document.getElementById('agend-data').value = '';
    document.getElementById('agend-hora').value = '';
}

function abrirModalSolicitarAgendamento(tipoServico) {
    if (!temPermissao('consulta_agendar') && !temPermissao('vacinacao_agendar')) {
        showToast("Acesso restrito: perfil somente leitura em agendamentos.", "error");
        return;
    }
    abrirModalAgendamento();
    // Título dinâmico: vacinação abre como "Agendar Vacinação", não "Agendar Consulta".
    document.getElementById('modal-agendamento-titulo').innerText = "Agendar Vacinação";
    document.getElementById('agend-tipo').value = tipoServico;
    atualizarVisibilidadeVacinaAg();
}

// O QUE: Preenche o select de tipos de vacina do agendamento.
// PORQUÊ: Vacinação exige informar o tipo (lê tiposVacina mutável — CRUD do funcionário).
function popularVacinaTiposAg(selecionado) {
    const select = document.getElementById('agend-vacina-tipo');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione o tipo...</option>';
    tiposVacina.forEach(t => {
        select.innerHTML += `<option value="${escaparHtml(t)}"${t === selecionado ? ' selected' : ''}>${escaparHtml(t)}</option>`;
    });
}

// O QUE: Exibe o campo de tipo de vacina só quando o serviço é vacinação (+ campo novo-tipo se "Outro").
function atualizarVisibilidadeVacinaAg() {
    const servico = document.getElementById('agend-tipo').value || '';
    const bloco = document.getElementById('agend-vacina-bloco');
    if (!bloco) return;
    bloco.classList.toggle('hidden', !/vacin/i.test(servico));
    const novo = document.getElementById('agend-vacina-novo-bloco');
    if (novo) {
        const tipo = document.getElementById('agend-vacina-tipo')?.value || '';
        novo.classList.toggle('hidden', tipo !== 'Outro');
    }
}

function editarAgendamentoPrompt(id) {
    const ag = agendamentos.find(a => a.id === id);
    if (!ag) return;
    const permEditar = /vacin/i.test(ag.servico) ? 'vacinacao_editar' : 'consulta_editar';
    if (!temPermissao(permEditar)) {
        showToast("Acesso restrito: perfil somente leitura em agendamentos.", "error");
        return;
    }
    abrirModalAgendamento();
    document.getElementById('edit-agend-id').value = ag.id;
    document.getElementById('modal-agendamento-titulo').innerText = "Editar Agendamento";
    document.getElementById('agend-tutor-select').value = ag.tutorCpf;
    popularPetsDoTutor();
    document.getElementById('agend-pet-select').value = ag.petId;
    document.getElementById('agend-tipo').value = ag.servico;
    popularVacinaTiposAg(ag.vacinaTipo || '');
    document.getElementById('agend-vacina-novo-nome').value = '';
    atualizarVisibilidadeVacinaAg();
    document.getElementById('agend-valor').value = ag.valor;
    document.getElementById('agend-data').value = ag.data;
    document.getElementById('agend-hora').value = ag.hora;
}

function abrirModalRegistrarValor(id, valorAtual) {
    document.getElementById('valor-agend-id').value = id;
    document.getElementById('valor-agend-input').value = valorAtual;
    document.getElementById('modal-registrar-valor').classList.remove('hidden');
}
function fecharModalRegistrarValor() { document.getElementById('modal-registrar-valor').classList.add('hidden'); }

async function salvarRegistroValor(e) {
    e.preventDefault();
    const id = document.getElementById('valor-agend-id').value;
    const novoValor = parseFloat(document.getElementById('valor-agend-input').value);
    const ag = agendamentos.find(a => a.id === id);
    if (!ag || !Number.isFinite(novoValor) || novoValor < 0) {
        showToast("Informe um valor válido para o agendamento.", "error");
        return;
    }
    const resultado = await executarMutacaoSupabase("registrar o valor", () =>
        obterClienteSupabaseAuth().from('agendamentos')
            .update({ valor: novoValor }).eq('id', id).select('id, valor').single()
    );
    if (!resultado.ok) return;
    ag.valor = Number(resultado.data.valor);
    renderizarAgendamentos();
    fecharModalRegistrarValor();
    confirmarEscrita("Valor do agendamento registrado/atualizado");
}

async function alterarStatusAgendamento(id, status) {
    const item = agendamentos.find(a => a.id === id);
    if (!item) return;
    const ehVacinacao = /vacin/i.test(item.servico || '');
    const perm = (status === 'confirmado' || status === 'concluido')
        ? (ehVacinacao ? 'vacinacao_confirmar' : 'consulta_confirmar')
        : (ehVacinacao ? 'vacinacao_cancelar' : 'consulta_cancelar');
    if (!temPermissao(perm)) {
        showToast("Acesso restrito: perfil somente leitura em agendamentos.", "error");
        return;
    }
    const resultado = await executarMutacaoSupabase("atualizar o agendamento", () =>
        obterClienteSupabaseAuth().from('agendamentos')
            .update({ status }).eq('id', id).select('id, status').single()
    );
    if (!resultado.ok) return;
    item.status = resultado.data.status;
    renderizarAgendamentos();
    confirmarEscrita("Agendamento atualizado");
}

function filtrarAgendamentos(status) {
    filtroAgendamentosStatus = status;
    renderizarAgendamentos();
}

// O QUE: Seções Ativos × Expirados da aba Agendamentos (uma abaixo da outra).
// PORQUÊ: Vencidos/cancelados/concluídos ficam no histórico abaixo; remarcar volta como pendente.
// TODO [INTEGRAÇÃO SUPABASE]: filtrar por `data` + `status` no backend.
function hojeISO() { return new Date().toISOString().slice(0, 10); }
function agVencido(a) { return (a.data || '') < hojeISO() && (a.status === 'pendente' || a.status === 'confirmado'); }
function agExpirado(a) { return agVencido(a) || a.status === 'cancelado' || a.status === 'concluido'; }

// O QUE: Faixa do histórico de Expirados — Últimos 7 dias, Este mês, depois um grupo por mês.
const MESES_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
function nomeMesAno(dataISO) {
    const ano = dataISO.slice(0, 4);
    const mes = parseInt(dataISO.slice(5, 7), 10);
    return (MESES_PT[mes - 1] || 'Mês') + ' de ' + ano;
}
function grupoExpirado(data, limite7d, mesAtual) {
    if ((data || '') >= limite7d) return 'Últimos 7 dias';
    if ((data || '').slice(0, 7) === mesAtual) return 'Este mês';
    return nomeMesAno(data || '');
}

// O QUE: Reabre o agendamento expirado para nova data (volta como pendente → "sobe").
function remarcarAgendamento(id) {
    const ag = agendamentos.find(a => a.id === id);
    if (!ag) return;
    const permEditar = /vacin/i.test(ag.servico) ? 'vacinacao_editar' : 'consulta_editar';
    if (!temPermissao(permEditar)) {
        showToast("Acesso restrito: perfil somente leitura em agendamentos.", "error");
        return;
    }
    abrirModalAgendamento();
    document.getElementById('edit-agend-id').value = ag.id;
    document.getElementById('modal-agendamento-titulo').innerText = "Remarcar Agendamento";
    document.getElementById('agend-tutor-select').value = ag.tutorCpf;
    popularPetsDoTutor();
    document.getElementById('agend-pet-select').value = ag.petId;
    document.getElementById('agend-tipo').value = ag.servico;
    popularVacinaTiposAg(ag.vacinaTipo || '');
    document.getElementById('agend-vacina-novo-nome').value = '';
    atualizarVisibilidadeVacinaAg();
    document.getElementById('agend-valor').value = ag.valor;
    document.getElementById('agend-data').value = '';
    document.getElementById('agend-hora').value = '';
    remarcandoAgendamento = true;
}

// O QUE: Preenche um select de tutores apenas com tutores ativos.
// PORQUÊ: centraliza o filtro de arquivados (agendamento, pet e clínico)
//         e avisa quando todos estão arquivados, em vez de deixar select vazio.
// Retorna a lista de tutores ativos (vazia = nenhum disponível).
function preencherSelectTutores(select, placeholder) {
    const ativos = RegrasTutor.tutoresSelecionaveis(tutores);
    if (ativos.length === 0) {
        select.innerHTML = '<option value="">Nenhum tutor ativo — cadastre ou restaure um tutor</option>';
        return ativos;
    }
    select.innerHTML = placeholder ? `<option value="">${placeholder}</option>` : '';
    ativos.forEach(t => select.innerHTML += `<option value="${escaparHtml(t.cpf)}">${escaparHtml(t.nome)} (CPF ${escaparHtml(t.cpf)})</option>`);
    return ativos;
}

function abrirModalAgendamento() {
    if (!temPermissao('consulta_agendar') && !temPermissao('vacinacao_agendar')) {
        showToast("Acesso restrito: perfil somente leitura em agendamentos.", "error");
        return;
    }
    const selectT = document.getElementById('agend-tutor-select');
    const tutoresAtivos = preencherSelectTutores(selectT, '');
    if (tutoresAtivos.length === 0) showToast("Nenhum tutor ativo: cadastre ou restaure um tutor.", "error");
    popularPetsDoTutor();

    // Reseta o formulário para modo "novo agendamento"
    document.getElementById('edit-agend-id').value = '';
    remarcandoAgendamento = false;
    document.getElementById('modal-agendamento-titulo').innerText = 'Agendar Consulta';
    document.getElementById('agend-tipo').value = '';
    popularVacinaTiposAg('');
    document.getElementById('agend-vacina-novo-nome').value = '';
    atualizarVisibilidadeVacinaAg();
    document.getElementById('agend-valor').value = '';
    document.getElementById('agend-data').value = '';
    document.getElementById('agend-hora').value = '';

    document.getElementById('modal-agendamento').classList.remove('hidden');
}
function fecharModalAgendamento() { document.getElementById('modal-agendamento').classList.add('hidden'); }

function popularPetsDoTutor() {
    const tutorCpf = document.getElementById('agend-tutor-select').value;
    const selectP = document.getElementById('agend-pet-select');
    selectP.innerHTML = '';
    pets.filter(p => p.tutorCpf === tutorCpf).forEach(p => {
        selectP.innerHTML += `<option value="${escaparHtml(p.id)}">${escaparHtml(p.nome)}</option>`;
    });
}

async function salvarAgendamento(e) {
    e.preventDefault();
    const editId = document.getElementById('edit-agend-id').value;
    const tutorCpf = document.getElementById('agend-tutor-select').value;
    const petId = document.getElementById('agend-pet-select').value;
    const servico = document.getElementById('agend-tipo').value;
    const ehVacinacao = /vacin/i.test(servico);
    const permNecessaria = editId
        ? (ehVacinacao ? 'vacinacao_editar' : 'consulta_editar')
        : (ehVacinacao ? 'vacinacao_agendar' : 'consulta_agendar');
    if (!temPermissao(permNecessaria)) {
        showToast("Acesso restrito: perfil somente leitura em agendamentos.", "error");
        return;
    }
    const valor = parseFloat(document.getElementById('agend-valor').value);
    const data = document.getElementById('agend-data').value;
    const hora = document.getElementById('agend-hora').value;
    if (!horarioAgendamentoPermitido(data, hora)) {
        showToast("O horário selecionado está fora do funcionamento configurado da clínica.", "error");
        return;
    }
    let vacinaTipo = document.getElementById('agend-vacina-tipo').value || '';
    if (ehVacinacao && !vacinaTipo) {
        showToast("Informe o tipo de vacinação.", "error");
        return;
    }
    // Quick-add: cria o tipo no catálogo antes de salvar a vacinação.
    if (ehVacinacao && vacinaTipo === 'Outro') {
        const novo = (document.getElementById('agend-vacina-novo-nome').value || '').trim();
        if (novo) {
            if (temPermissao('vacina_tipos_criar') || currentRole === 'veterinario') {
                if (!tiposVacina.some(t => t.toLowerCase() === novo.toLowerCase())) {
                    const cadastroTipo = await executarMutacaoSupabase("adicionar o tipo de vacina", () =>
                        obterClienteSupabaseAuth().from('vacina_tipos')
                            .insert({ nome: novo }).select('id, nome').single()
                    );
                    if (!cadastroTipo.ok) return;
                    tiposVacina.push(cadastroTipo.data.nome);
                    idsVacinaPorNome[cadastroTipo.data.nome] = String(cadastroTipo.data.id);
                }
                vacinaTipo = novo;
            }
        }
    }

    if (!tutorCpf || !Number.isFinite(valor) || valor < 0) {
        showToast("Informe um tutor e um valor válido.", "error");
        return;
    }
    if (petId && !pets.some(p => p.id === petId && p.tutorCpf === tutorCpf)) {
        showToast("O pet selecionado não pertence ao tutor informado.", "error");
        return;
    }

    if (editId) {
        const ag = agendamentos.find(a => a.id === editId);
        if (!ag) {
            showToast("O agendamento não foi encontrado. Atualize a tela e tente novamente.", "error");
            return;
        }
        if (remarcandoAgendamento && data < hojeISO()) {
            showToast("Escolha uma data futura para remarcar.", "error");
            return;
        }
        const atualizado = {
            ...ag,
            tutorCpf,
            petId,
            servico,
            vacinaTipo: ehVacinacao ? vacinaTipo : '',
            valor,
            data,
            hora,
            status: remarcandoAgendamento ? 'pendente' : ag.status
        };
        const resultado = await executarMutacaoSupabase("atualizar o agendamento", () =>
            obterClienteSupabaseAuth().from('agendamentos')
                .update(window.DayVetPersistencia.paraAgendamento(atualizado))
                .eq('id', editId).select('*').single()
        );
        if (!resultado.ok) return;
        Object.assign(ag, window.DayVetPersistencia.mapearAgendamento(resultado.data));
        confirmarEscrita(remarcandoAgendamento ? "Agendamento remarcado" : "Agendamento atualizado");
    } else {
        const novoAgendamento = {
            tutorCpf,
            petId,
            servico,
            vacinaTipo: ehVacinacao ? vacinaTipo : '',
            valor,
            data,
            hora,
            status: "confirmado",
            vetId: currentUser.id
        };
        const resultado = await executarMutacaoSupabase("criar o agendamento", () =>
            obterClienteSupabaseAuth().from('agendamentos')
                .insert(window.DayVetPersistencia.paraAgendamento(novoAgendamento, currentUser.id))
                .select('*').single()
        );
        if (!resultado.ok) return;
        agendamentos.unshift(window.DayVetPersistencia.mapearAgendamento(resultado.data));
        confirmarEscrita("Agendamento criado");
    }
    remarcandoAgendamento = false;
    fecharModalAgendamento();
    renderizarAgendamentos();
}

// ==========================================================
// SEÇÃO 7: TUTORES & PETS
// ==========================================================

// O QUE: Estado da lista de tutores (mostrar ou ocultar arquivados).
let mostrarTutoresArquivados = false;

function renderizarTutores() {
    const grid = document.getElementById('tutores-grid');
    if (!grid) return;
    atualizarKpisDashboard();
    grid.innerHTML = '';

    const arquivados = tutores.filter(t => RegrasTutor.tutorArquivado(t)).length;
    const visiveis = mostrarTutoresArquivados ? tutores : RegrasTutor.tutoresSelecionaveis(tutores);

    const btnAlternar = document.getElementById('btn-mostrar-arquivados');
    if (btnAlternar) {
        const rotulo = btnAlternar.querySelector('span');
        if (rotulo) rotulo.innerText = (mostrarTutoresArquivados ? 'Ocultar' : 'Mostrar') + ' arquivados' + (arquivados ? ` (${arquivados})` : '');
    }

    if (visiveis.length === 0) {
        grid.innerHTML = `<p class="text-xs text-slate-500 italic">${arquivados ? 'Nenhum tutor ativo — use "Mostrar arquivados".' : 'Nenhum tutor cadastrado.'}</p>`;
        lucide.createIcons();
        return;
    }

    visiveis.forEach(t => {
        const petsDoTutor = pets.filter(p => p.tutorCpf === t.cpf);
        const arquivado = RegrasTutor.tutorArquivado(t);
        let petsHTML = '';

        const btnEditarTutor = temPermissao('tutor_editar')
            ? `<button onclick="abrirModalEditarTutor('${t.cpf}')" class='text-[10px] text-brand-blue font-bold hover:underline flex items-center gap-1'>
                        <i data-lucide='edit-3' class='w-3 h-3'></i> Editar Tutor
                    </button>` : '';
        const btnArquivar = (!arquivado && temPermissao('tutor_arquivar'))
            ? `<button onclick="arquivarTutor('${t.cpf}')" class='text-[10px] text-amber-400 font-bold hover:underline'>Arquivar</button>` : '';
        const btnRestaurar = (arquivado && temPermissao('tutor_arquivar'))
            ? `<button onclick="restaurarTutor('${t.cpf}')" class='text-[10px] text-brand-lime font-bold hover:underline'>Restaurar</button>` : '';
        const btnExcluirTutor = (arquivado && temPermissao('tutor_excluir'))
            ? `<button onclick="excluirTutorDefinitivo('${t.cpf}')" class='text-[10px] text-rose-400 font-bold hover:underline'>Excluir definitivo</button>` : '';
        const seloArquivado = arquivado
            ? `<span class='text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30'>Arquivado</span>` : '';

        petsDoTutor.forEach(p => {
            const btnEditarPet = temPermissao('pet_editar')
                ? `<button onclick="abrirModalEditarPet('${p.id}')" class='text-[10px] text-brand-blue font-bold hover:underline flex items-center gap-1'>
                            <i data-lucide='edit-3' class='w-3 h-3'></i> Editar Pet
                        </button>` : '';
            petsHTML += `
                <div class='bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2'>
                    <div class='flex justify-between items-center'>
                        <span class='text-[10px] font-black uppercase text-brand-lime'>${escaparHtml(p.especie)}</span>
                        ${btnEditarPet}
                    </div>
                    <h5 class='font-bold text-slate-100 text-sm flex items-center gap-1.5'>
                        <i data-lucide='paw-print' class='w-4 h-4 text-brand-lime'></i> ${escaparHtml(p.nome)}
                    </h5>
                    <p class='text-xs text-slate-400 font-semibold'>${escaparHtml(p.raca)}${p.sexo ? ' · ' + escaparHtml(p.sexo) : ''}${p.peso ? ' · ' + escaparHtml(p.peso) + ' kg' : ''}</p>
                </div>
            `;
        });

        grid.innerHTML += `
            <div class='bg-slate-950 rounded-2xl border ${arquivado ? 'border-amber-500/30 opacity-80' : 'border-slate-850'} p-5 flex flex-col md:flex-row gap-4'>
                <div class='md:w-1/3 space-y-2 border-b md:border-b-0 md:border-r border-slate-800 pb-4 md:pb-0 md:pr-4'>
                    <div class='flex items-center justify-between gap-2'>
                        <h4 class='font-bold text-slate-100 text-base flex items-center gap-2'>${escaparHtml(t.nome)} ${seloArquivado}</h4>
                    </div>
                    <p class='text-xs text-slate-400'>CPF: ${escaparHtml(t.cpf)}</p>
                    <p class='text-xs text-slate-400'>Tel: ${escaparHtml(t.tel)}</p>
                    <p class='text-xs text-slate-400'>${escaparHtml(t.endereco)}</p>
                    <div class='flex flex-wrap items-center gap-3 pt-1'>${btnEditarTutor}${btnArquivar}${btnRestaurar}${btnExcluirTutor}</div>
                </div>
                <div class='md:w-2/3 space-y-2'>
                    <span class='text-xs font-bold text-slate-400 uppercase'>Pets Vinculados (${petsDoTutor.length})</span>
                    <div class='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                        ${petsHTML || '<p class="text-xs text-slate-500 italic">Nenhum pet cadastrado.</p>'}
                    </div>
                </div>
            </div>
        `;
    });
    lucide.createIcons();
}

// O QUE: Alterna a exibição de tutores arquivados (soft delete).
function alternarTutoresArquivados() {
    mostrarTutoresArquivados = !mostrarTutoresArquivados;
    renderizarTutores();
}

// O QUE: Arquiva o tutor — sai de agendamentos e novos vínculos, mantém histórico.
// PORQUÊ: exclusão definitiva perderia pets/agenda/prontuário (LGPD/retenção).
// REGRAS: RegrasTutor.podeArquivarTutor (sem agendamento pendente/confirmado).
async function arquivarTutor(cpf) {
    if (!temPermissao('tutor_arquivar')) { showToast("Acesso restrito.", "error"); return; }
    const tutor = tutores.find(t => t.cpf === cpf);
    const regra = RegrasTutor.podeArquivarTutor(tutor, agendamentos);
    if (!regra.ok) { showToast(regra.motivo, "error"); return; }
    if (!confirm(`Arquivar ${tutor.nome}?\n\nO tutor deixa de aparecer em novos agendamentos e vínculos; o histórico é mantido.`)) return;
    const resultado = await executarMutacaoSupabase("arquivar o tutor", () =>
        obterClienteSupabaseAuth().from('tutores')
            .update({ arquivado: true }).eq('cpf', cpf).select('*').single()
    );
    if (!resultado.ok) return;
    Object.assign(tutor, window.DayVetPersistencia.mapearTutor(resultado.data));
    renderizarTutores();
    confirmarEscrita("Tutor arquivado");
}

async function restaurarTutor(cpf) {
    if (!temPermissao('tutor_arquivar')) { showToast("Acesso restrito.", "error"); return; }
    const tutor = tutores.find(t => t.cpf === cpf);
    if (!tutor) return;
    const resultado = await executarMutacaoSupabase("restaurar o tutor", () =>
        obterClienteSupabaseAuth().from('tutores')
            .update({ arquivado: false }).eq('cpf', cpf).select('*').single()
    );
    if (!resultado.ok) return;
    Object.assign(tutor, window.DayVetPersistencia.mapearTutor(resultado.data));
    renderizarTutores();
    confirmarEscrita("Tutor restaurado");
}

// O QUE: Exclusão definitiva (irreversível) — arquivado e sem vínculos.
// SEGURANÇA: confirmação digitando o CPF, além do confirm().
async function excluirTutorDefinitivo(cpf) {
    if (!temPermissao('tutor_excluir')) { showToast("Acesso restrito.", "error"); return; }
    const tutor = tutores.find(t => t.cpf === cpf);
    const regra = RegrasTutor.podeExcluirTutor(tutor, { pets, agendamentos, historico: historicoClinico });
    if (!regra.ok) { showToast(regra.motivo, "error"); return; }
    if (!confirm(`EXCLUIR DEFINITIVAMENTE ${tutor.nome}?\n\nEsta ação não pode ser desfeita.`)) return;
    const digitado = prompt(`Para confirmar, digite o CPF do tutor:\n${tutor.cpf}`);
    if ((digitado || "").trim() !== tutor.cpf) { showToast("Exclusão cancelada: CPF não confere.", "error"); return; }
    const resultado = await executarMutacaoSupabase("excluir o tutor", () =>
        obterClienteSupabaseAuth().from('tutores')
            .delete().eq('cpf', tutor.cpf).select('cpf').single()
    );
    if (!resultado.ok) return;
    tutores = tutores.filter(t => t.cpf !== tutor.cpf);
    renderizarTutores();
    confirmarEscrita("Tutor excluído definitivamente");
}

function abrirModalTutor() { document.getElementById('modal-tutor').classList.remove('hidden'); }
function fecharModalTutor() { document.getElementById('modal-tutor').classList.add('hidden'); }

// O QUE: Valida telefone com 11 dígitos (RF-02: DDD + 9 dígitos do celular).
// PORQUÊ: RF-02 restante — garante cadastro com celular válido (só dígitos contam).
function telefoneTem11Digitos(tel) {
    return (String(tel || '').replace(/\D/g, '')).length === 11;
}

async function salvarTutor(e) {
    e.preventDefault();
    const nome = document.getElementById('tutor-nome').value;
    const cpfInformado = document.getElementById('tutor-cpf').value;
    const tel = document.getElementById('tutor-tel').value;
    const email = document.getElementById('tutor-email').value;
    const endereco = document.getElementById('tutor-endereco').value;

    if (!validarCPF(cpfInformado)) {
        showToast("CPF inválido. Verifique os dígitos informados.", "error");
        return;
    }
    const cpf = RegrasLogin.formatarCpf(cpfInformado);
    if (tutores.some(t => RegrasLogin.somenteDigitos(t.cpf) === RegrasLogin.somenteDigitos(cpf))) {
        showToast("CPF já cadastrado para outro tutor.", "error");
        return;
    }
    if (!telefoneTem11Digitos(tel)) {
        showToast("Telefone deve ter 11 dígitos (DDD + número do celular).", "error");
        return;
    }

    const novoTutor = { nome, cpf, tel, email, endereco, arquivado: false };
    const resultado = await executarMutacaoSupabase("cadastrar o tutor", () =>
        obterClienteSupabaseAuth().from('tutores')
            .insert(window.DayVetPersistencia.paraTutor(novoTutor, currentUser.id))
            .select('*').single()
    );
    if (!resultado.ok) return;
    tutores.push(window.DayVetPersistencia.mapearTutor(resultado.data));
    fecharModalTutor();
    renderizarTutores();
    confirmarEscrita("Tutor cadastrado");
}

function abrirModalEditarTutor(tutorCpf) {
    const tutor = tutores.find(t => t.cpf === tutorCpf);
    if (!tutor) return;
    document.getElementById('edit-tutor-id').value = tutor.cpf;
    document.getElementById('edit-tutor-nome').value = tutor.nome;
    document.getElementById('edit-tutor-cpf').value = tutor.cpf;
    document.getElementById('edit-tutor-tel').value = tutor.tel;
    document.getElementById('edit-tutor-email').value = tutor.email || '';
    document.getElementById('edit-tutor-endereco').value = tutor.endereco || '';
    document.getElementById('modal-editar-tutor').classList.remove('hidden');
}
function fecharModalEditarTutor() { document.getElementById('modal-editar-tutor').classList.add('hidden'); }

async function salvarEdicaoTutor(e) {
    e.preventDefault();
    const cpfAntigo = document.getElementById('edit-tutor-id').value;
    const tutor = tutores.find(t => t.cpf === cpfAntigo);
    if (tutor) {
        const cpfInformado = document.getElementById('edit-tutor-cpf').value;
        const telNovo = document.getElementById('edit-tutor-tel').value;
        if (!validarCPF(cpfInformado)) {
            showToast("CPF inválido. Verifique os dígitos informados.", "error");
            return;
        }
        const cpfNovo = RegrasLogin.formatarCpf(cpfInformado);
        if (!telefoneTem11Digitos(telNovo)) {
            showToast("Telefone deve ter 11 dígitos (DDD + número do celular).", "error");
            return;
        }
        if (cpfNovo !== cpfAntigo) {
            if (tutores.some(t => t.cpf !== cpfAntigo
                && RegrasLogin.somenteDigitos(t.cpf) === RegrasLogin.somenteDigitos(cpfNovo))) {
                showToast("CPF já cadastrado para outro tutor.", "error");
                return;
            }
        }
        const atualizado = {
            ...tutor,
            nome: document.getElementById('edit-tutor-nome').value,
            cpf: cpfNovo,
            tel: telNovo,
            email: document.getElementById('edit-tutor-email').value,
            endereco: document.getElementById('edit-tutor-endereco').value
        };
        const resultado = await executarMutacaoSupabase("atualizar o tutor", () =>
            obterClienteSupabaseAuth().from('tutores')
                .update(window.DayVetPersistencia.paraTutor(atualizado))
                .eq('cpf', cpfAntigo).select('*').single()
        );
        if (!resultado.ok) return;
        Object.assign(tutor, window.DayVetPersistencia.mapearTutor(resultado.data));
        if (cpfNovo !== cpfAntigo) {
            pets.forEach(p => { if (p.tutorCpf === cpfAntigo) p.tutorCpf = cpfNovo; });
            agendamentos.forEach(a => { if (a.tutorCpf === cpfAntigo) a.tutorCpf = cpfNovo; });
            historicoClinico.forEach(h => { if (h.tutorCpf === cpfAntigo) h.tutorCpf = cpfNovo; });
            anexosClinicos.forEach(a => { if (a.tutorCpf === cpfAntigo) a.tutorCpf = cpfNovo; });
        }
        renderizarTutores();
        renderizarAgendamentos();
        renderizarHistoricoClinico();
        renderizarAnexos();
        confirmarEscrita("Cadastro do tutor alterado");
    }
    fecharModalEditarTutor();
}

function abrirModalPet() {
    const select = document.getElementById('pet-tutor-select');
    const ativos = preencherSelectTutores(select, '');
    if (ativos.length === 0) showToast("Nenhum tutor ativo: restaure ou cadastre um tutor para vincular pets.", "error");
    popularRacasPet('');
    document.getElementById('modal-pet').classList.remove('hidden');
}
function fecharModalPet() { document.getElementById('modal-pet').classList.add('hidden'); }

// O QUE: Preenche raça conforme a espécie (selects do cadastro/edição de pet).
function popularRacasPet(prefixo, selecionada) {
    const selEsp = document.getElementById(prefixo + 'pet-especie');
    const selRaca = document.getElementById(prefixo + 'pet-raca');
    if (!selEsp || !selRaca) return;
    const racas = racasPorEspecie[selEsp.value] || ["Outra"];
    selRaca.innerHTML = '';
    racas.forEach(r => {
        selRaca.innerHTML += `<option value="${escaparHtml(r)}"${r === selecionada ? ' selected' : ''}>${escaparHtml(r)}</option>`;
    });
}

async function salvarPet(e) {
    e.preventDefault();
    const tutorCpf = document.getElementById('pet-tutor-select').value;
    const nome = document.getElementById('pet-nome').value;
    const especie = document.getElementById('pet-especie').value;
    const raca = document.getElementById('pet-raca').value;
    const sexo = document.getElementById('pet-sexo').value;
    const pesoRaw = (document.getElementById('pet-peso').value || '').trim();
    const comportamento = document.getElementById('pet-comportamento').value;
    const alergias = document.getElementById('pet-alergias').value;

    // RF: peso opcional, mas se informado deve ser > 0.
    let peso = '';
    if (pesoRaw !== '') {
        peso = parseFloat(pesoRaw.replace(',', '.'));
        if (!(peso > 0)) { showToast("Peso deve ser maior que zero.", "error"); return; }
    }

    // O trigger do banco também aplica o limite para escritas concorrentes.
    if (pets.filter(p => p.tutorCpf === tutorCpf).length >= 10) {
        showToast("Limite de 10 pets por tutor atingido.", "error");
        return;
    }
    const novoPet = { tutorCpf, nome, especie, raca, sexo, peso, comportamento, alergias };
    const resultado = await executarMutacaoSupabase("cadastrar o pet", () =>
        obterClienteSupabaseAuth().from('pets')
            .insert(window.DayVetPersistencia.paraPet(novoPet, currentUser.id))
            .select('*').single()
    );
    if (!resultado.ok) return;
    pets.push(window.DayVetPersistencia.mapearPet(resultado.data));
    fecharModalPet();
    renderizarTutores();
    confirmarEscrita("Pet cadastrado");
}

function abrirModalEditarPet(petId) {
    const pet = pets.find(p => p.id === petId);
    if (!pet) return;
    document.getElementById('edit-pet-id').value = pet.id;
    document.getElementById('edit-pet-nome').value = pet.nome;
    document.getElementById('edit-pet-especie').value = pet.especie;
    popularRacasPet('edit-', pet.raca);
    document.getElementById('edit-pet-sexo').value = pet.sexo || '';
    document.getElementById('edit-pet-peso').value = (pet.peso === '' || pet.peso == null) ? '' : pet.peso;
    document.getElementById('edit-pet-comportamento').value = pet.comportamento || '';
    document.getElementById('edit-pet-alergias').value = pet.alergias || '';
    document.getElementById('modal-editar-pet').classList.remove('hidden');
}
function fecharModalEditarPet() { document.getElementById('modal-editar-pet').classList.add('hidden'); }

async function salvarEdicaoPet(e) {
    e.preventDefault();
    const petId = document.getElementById('edit-pet-id').value;
    const pet = pets.find(p => p.id === petId);
    if (pet) {
        const atualizado = { ...pet };
        atualizado.nome = document.getElementById('edit-pet-nome').value;
        atualizado.especie = document.getElementById('edit-pet-especie').value;
        atualizado.raca = document.getElementById('edit-pet-raca').value;
        atualizado.sexo = document.getElementById('edit-pet-sexo').value;
        const pesoRaw = (document.getElementById('edit-pet-peso').value || '').trim();
        if (pesoRaw === '') { atualizado.peso = ''; }
        else {
            const peso = parseFloat(pesoRaw.replace(',', '.'));
            if (!(peso > 0)) { showToast("Peso deve ser maior que zero.", "error"); return; }
            atualizado.peso = peso;
        }
        atualizado.comportamento = document.getElementById('edit-pet-comportamento').value;
        atualizado.alergias = document.getElementById('edit-pet-alergias').value;
        const resultado = await executarMutacaoSupabase("atualizar o pet", () =>
            obterClienteSupabaseAuth().from('pets')
                .update(window.DayVetPersistencia.paraPet(atualizado))
                .eq('id', petId).select('*').single()
        );
        if (!resultado.ok) return;
        Object.assign(pet, window.DayVetPersistencia.mapearPet(resultado.data));
        renderizarTutores();
        popularPetsDropdowns();
        confirmarEscrita("Cadastro do pet alterado");
    }
    fecharModalEditarPet();
}

// ==========================================================
// SEÇÃO 8: MÓDULO CLÍNICO
// ==========================================================

function renderizarHistoricoClinico() {
    const container = document.getElementById('clinica-timeline');
    if (!container) return;
    container.innerHTML = '';
    document.getElementById('prontuario-count').innerText = historicoClinico.length + " registros";

    historicoClinico.forEach(h => {
        const pet = pets.find(p => p.id === h.petId);
        const tutor = tutores.find(t => t.cpf === (h.tutorCpf || (pet ? pet.tutorCpf : null)));
        let tipoTagColor = "text-brand-lime";
        let docLabel = "RECEITA";
        if (h.tipo === 'vacina') { tipoTagColor = "text-brand-blue"; docLabel = "VACINA" + (h.vacinaTipo ? " — " + h.vacinaTipo.toUpperCase() : ""); }

        const btnImprimir = temPermissao('clinica_imprimir')
            ? `<button onclick="imprimirDocumentoGenerico('${h.id}')" class='text-[11px] text-brand-blue font-bold flex items-center gap-1 hover:underline'>
                        <i data-lucide='printer' class='w-3 h-3'></i> Imprimir ${escaparHtml(docLabel)}
                    </button>` : `<span></span>`;
        const btnEditar = temPermissao('clinica_editar')
            ? `<button onclick="editarDocumentoClinico('${h.id}')" class='text-[11px] text-brand-lime font-bold hover:underline'>Editar</button>` : '';
        const btnExcluir = temPermissao('clinica_excluir')
            ? `<button onclick="excluirDocumentoClinico('${h.id}')" class='text-[11px] text-rose-400 font-bold hover:underline'>Excluir</button>` : '';

        container.innerHTML += `
            <div class='bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2'>
                <div class='flex items-center justify-between'>
                    <span class='text-xs font-bold ${tipoTagColor} uppercase'>${escaparHtml(docLabel)} - ${escaparHtml(pet ? pet.nome : 'N/A')}${tutor ? ' · ' + escaparHtml(tutor.nome) : ''}</span>
                    <span class='text-xs text-slate-400'>${escaparHtml(h.data)}</span>
                </div>
                <p class='text-xs text-slate-200 leading-relaxed whitespace-pre-line'>${escaparHtml(h.detalhe)}</p>
                <div class='flex items-center justify-between pt-1 border-t border-slate-800/60'>
                    ${btnImprimir}
                    <div class='flex items-center gap-2'>
                        ${btnEditar}${btnExcluir}
                    </div>
                </div>
            </div>
        `;
    });
    lucide.createIcons();
}

function prepararNovoDocumentoClinico(tipoDoc) {
    resetarFormClinico();
    document.getElementById('clinica-tipo').value = tipoDoc;
    atualizarLabelDocumento();
    switchTab('clinica');
}

function atualizarLabelDocumento() {
    const tipo = document.getElementById('clinica-tipo').value;
    const label = document.getElementById('clinica-detalhe-label');
    if (tipo === 'receita') label.innerText = "Prescrição e Posologia de Medicamentos";
    else label.innerText = "Detalhamento / Vacina";
    // Tipo de vacina só aparece no Registro de Imunização
    const bloco = document.getElementById('clinica-vacina-bloco');
    if (bloco) {
        bloco.classList.toggle('hidden', tipo !== 'vacina');
        if (tipo === 'vacina') popularVacinaTiposClinica(document.getElementById('clinica-vacina-tipo').value || '');
    }
}

// O QUE: Preenche o select de tipos de vacina do form clínico (lê tiposVacina mutável).
function popularVacinaTiposClinica(selecionado) {
    const select = document.getElementById('clinica-vacina-tipo');
    if (!select) return;
    select.innerHTML = '<option value="">Selecione o tipo...</option>';
    tiposVacina.forEach(t => {
        select.innerHTML += `<option value="${escaparHtml(t)}"${t === selecionado ? ' selected' : ''}>${escaparHtml(t)}</option>`;
    });
}

// O QUE: CRUD de tipos de vacina — admin e veterinário.
// PORQUÊ: Reaproveita nome/estética do "Módulo clínico" em visão restrita (funcionário sem acesso).
// Catálogo persistido em `vacina_tipos`.
function renderizarTiposVacina() {
    const lista = document.getElementById('lista-tipos-vacina');
    if (!lista) return;
    const rotulo = tiposVacina.length + (tiposVacina.length === 1 ? " tipo" : " tipos");
    document.getElementById('tipos-vacina-count').innerText = rotulo;
    const countCard = document.getElementById('tipos-vacina-count-card');
    if (countCard) countCard.innerText = rotulo;
    lista.innerHTML = '';
    tiposVacina.forEach((t, idx) => {
        lista.innerHTML += `
            <div class='flex items-center justify-between gap-2 bg-slate-900/80 px-3.5 py-2.5 rounded-xl border border-slate-800'>
                <span class='text-xs font-bold text-slate-200'>${escaparHtml(t)}</span>
                <div class='flex items-center gap-2 shrink-0'>
                    ${temPermissao('vacina_tipos_editar') ? `<button onclick="editarTipoVacinaPrompt(${idx})" class='text-[11px] text-brand-blue font-bold hover:underline'>Editar</button>` : ''}
                    ${temPermissao('vacina_tipos_excluir') ? `<button onclick="excluirTipoVacina(${idx})" class='text-[11px] text-rose-400 font-bold hover:underline'>Excluir</button>` : ''}
                </div>
            </div>
        `;
    });
    lucide.createIcons();
}

function abrirModalTiposVacina() {
    if (!temPermissao('vacina_tipos_listar')) {
        showToast("Acesso restrito: perfil sem permissão para tipos de vacina.", "error");
        return;
    }
    document.getElementById('edit-tipo-vacina-idx').value = '';
    document.getElementById('input-tipo-vacina-nome').value = '';
    modoFormTipoVacina(false);
    renderizarTiposVacina();
    document.getElementById('modal-tipos-vacina').classList.remove('hidden');
}
function fecharModalTiposVacina() { document.getElementById('modal-tipos-vacina').classList.add('hidden'); }

// O QUE: Alterna o form entre "Adicionar" e "Salvar alterações" (modo edição).
function modoFormTipoVacina(edicao) {
    document.getElementById('modal-tipos-vacina-titulo').innerText = edicao ? "Editar Tipo de Vacina" : "Gerenciar Tipos de Vacina";
    document.getElementById('btn-salvar-tipo-vacina').innerText = edicao ? "Salvar alterações" : "Adicionar vacina";
    document.getElementById('btn-cancelar-edit-tipo-vacina').classList.toggle('hidden', !edicao);
}
function cancelarEdicaoTipoVacina() {
    document.getElementById('edit-tipo-vacina-idx').value = '';
    document.getElementById('input-tipo-vacina-nome').value = '';
    modoFormTipoVacina(false);
}

async function salvarTipoVacina(e) {
    e.preventDefault();
    if (!temPermissao('vacina_tipos_criar') && !temPermissao('vacina_tipos_editar')) {
        showToast("Acesso restrito: perfil sem permissão para salvar tipos.", "error");
        return;
    }
    const idxRaw = document.getElementById('edit-tipo-vacina-idx').value;
    const nome = (document.getElementById('input-tipo-vacina-nome').value || '').trim();
    if (!nome) { showToast("Informe o nome do tipo de vacina.", "error"); return; }
    if (idxRaw === '') {
        if (!temPermissao('vacina_tipos_criar')) { showToast("Acesso restrito: sem permissão para criar.", "error"); return; }
        if (tiposVacina.some(t => t.toLowerCase() === nome.toLowerCase())) { showToast("Tipo já cadastrado.", "error"); return; }
        const resultado = await executarMutacaoSupabase("cadastrar o tipo de vacina", () =>
            obterClienteSupabaseAuth().from('vacina_tipos')
                .insert({ nome }).select('id, nome').single()
        );
        if (!resultado.ok) return;
        tiposVacina.push(resultado.data.nome);
        idsVacinaPorNome[resultado.data.nome] = String(resultado.data.id);
        confirmarEscrita("Tipo de vacina cadastrado");
    } else {
        if (!temPermissao('vacina_tipos_editar')) { showToast("Acesso restrito: sem permissão para editar.", "error"); return; }
        const idx = parseInt(idxRaw, 10);
        if (tiposVacina.some((t, i) => i !== idx && t.toLowerCase() === nome.toLowerCase())) { showToast("Tipo já cadastrado.", "error"); return; }
        const nomeAnterior = tiposVacina[idx];
        const id = idsVacinaPorNome[nomeAnterior];
        if (!id) { showToast("Tipo não encontrado no banco. Recarregue a tela.", "error"); return; }
        const resultado = await executarMutacaoSupabase("atualizar o tipo de vacina", () =>
            obterClienteSupabaseAuth().from('vacina_tipos')
                .update({ nome }).eq('id', id).select('id, nome').single()
        );
        if (!resultado.ok) return;
        tiposVacina[idx] = resultado.data.nome;
        delete idsVacinaPorNome[nomeAnterior];
        idsVacinaPorNome[resultado.data.nome] = String(resultado.data.id);
        confirmarEscrita("Tipo de vacina atualizado");
    }
    document.getElementById('edit-tipo-vacina-idx').value = '';
    document.getElementById('input-tipo-vacina-nome').value = '';
    modoFormTipoVacina(false);
    renderizarTiposVacina();
    popularVacinaTiposAg(document.getElementById('agend-vacina-tipo')?.value || '');
    popularVacinaTiposClinica(document.getElementById('clinica-vacina-tipo')?.value || '');
}

function editarTipoVacinaPrompt(idx) {
    if (!temPermissao('vacina_tipos_editar')) { showToast("Acesso restrito.", "error"); return; }
    document.getElementById('edit-tipo-vacina-idx').value = String(idx);
    document.getElementById('input-tipo-vacina-nome').value = tiposVacina[idx] || '';
    modoFormTipoVacina(true);
    document.getElementById('input-tipo-vacina-nome').focus();
}

async function excluirTipoVacina(idx) {
    if (!temPermissao('vacina_tipos_excluir')) { showToast("Acesso restrito.", "error"); return; }
    const nome = tiposVacina[idx];
    const id = idsVacinaPorNome[nome];
    if (!id) { showToast("Tipo não encontrado no banco. Recarregue a tela.", "error"); return; }
    const resultado = await executarMutacaoSupabase("excluir o tipo de vacina", () =>
        obterClienteSupabaseAuth().from('vacina_tipos')
            .delete().eq('id', id).select('id').single()
    );
    if (!resultado.ok) return;
    tiposVacina.splice(idx, 1);
    delete idsVacinaPorNome[nome];
    renderizarTiposVacina();
    popularVacinaTiposAg('');
    popularVacinaTiposClinica('');
    confirmarEscrita("Tipo de vacina excluído");
}

// O QUE: CRUD de tipos de raça por espécie — funcionário e admin (como tipos de vacina).
// PORQUÊ: Raça como lista de seleção precisa de catálogo gerenciável; vet só lista nos selects.
// Catálogo persistido em `raca_tipos`.
function renderizarTiposRaca() {
    const esp = document.getElementById('filtro-tipo-raca-especie')?.value || ESPECIES_PET[0];
    const lista = document.getElementById('lista-tipos-raca');
    if (!lista) return;
    const racas = racasPorEspecie[esp] || [];
    document.getElementById('tipos-raca-count').innerText = racas.length + (racas.length === 1 ? " raça" : " raças");
    const countCard = document.getElementById('tipos-raca-count-card');
    if (countCard) countCard.innerText = racas.length + (racas.length === 1 ? " raça" : " raças");
    lista.innerHTML = '';
    racas.forEach((r, idx) => {
        lista.innerHTML += `
            <div class='flex items-center justify-between gap-2 bg-slate-900/80 px-3.5 py-2.5 rounded-xl border border-slate-800'>
                <span class='text-xs font-bold text-slate-200'>${escaparHtml(r)}</span>
                <div class='flex items-center gap-2 shrink-0'>
                    ${temPermissao('raca_tipos_editar') ? `<button onclick="editarTipoRacaPrompt(${idx})" class='text-[11px] text-brand-blue font-bold hover:underline'>Editar</button>` : ''}
                    ${temPermissao('raca_tipos_excluir') ? `<button onclick="excluirTipoRaca(${idx})" class='text-[11px] text-rose-400 font-bold hover:underline'>Excluir</button>` : ''}
                </div>
            </div>
        `;
    });
    lucide.createIcons();
}

function abrirModalTiposRaca() {
    if (!temPermissao('raca_tipos_listar')) {
        showToast("Acesso restrito: perfil sem permissão para tipos de raça.", "error");
        return;
    }
    const selFiltro = document.getElementById('filtro-tipo-raca-especie');
    if (selFiltro && !selFiltro.options.length) {
        ESPECIES_PET.forEach(e => { selFiltro.innerHTML += `<option value="${e}">${e}</option>`; });
    }
    const selForm = document.getElementById('select-tipo-raca-especie');
    if (selForm && !selForm.options.length) {
        ESPECIES_PET.forEach(e => { selForm.innerHTML += `<option value="${e}">${e}</option>`; });
    }
    document.getElementById('edit-tipo-raca-idx').value = '';
    document.getElementById('input-tipo-raca-nome').value = '';
    modoFormTipoRaca(false);
    renderizarTiposRaca();
    document.getElementById('modal-tipos-raca').classList.remove('hidden');
}
function fecharModalTiposRaca() { document.getElementById('modal-tipos-raca').classList.add('hidden'); }

// O QUE: Alterna o form entre "Adicionar" e "Salvar alterações" (modo edição).
function modoFormTipoRaca(edicao) {
    document.getElementById('modal-tipos-raca-titulo').innerText = edicao ? "Editar Tipo de Raça" : "Gerenciar Tipos de Raça";
    document.getElementById('btn-salvar-tipo-raca').innerText = edicao ? "Salvar alterações" : "Adicionar raça";
    document.getElementById('btn-cancelar-edit-tipo-raca').classList.toggle('hidden', !edicao);
}
function cancelarEdicaoTipoRaca() {
    document.getElementById('edit-tipo-raca-idx').value = '';
    document.getElementById('input-tipo-raca-nome').value = '';
    modoFormTipoRaca(false);
}

function filtrarTiposRaca() {
    const esp = document.getElementById('filtro-tipo-raca-especie').value;
    document.getElementById('select-tipo-raca-especie').value = esp;
    renderizarTiposRaca();
}

async function salvarTipoRaca(e) {
    e.preventDefault();
    if (!temPermissao('raca_tipos_criar') && !temPermissao('raca_tipos_editar')) {
        showToast("Acesso restrito: perfil sem permissão para salvar raças.", "error");
        return;
    }
    const esp = document.getElementById('select-tipo-raca-especie').value;
    const idxRaw = document.getElementById('edit-tipo-raca-idx').value;
    const nome = (document.getElementById('input-tipo-raca-nome').value || '').trim();
    if (!nome) { showToast("Informe o nome da raça.", "error"); return; }
    if (!racasPorEspecie[esp]) racasPorEspecie[esp] = [];
    if (idxRaw === '') {
        if (!temPermissao('raca_tipos_criar')) { showToast("Acesso restrito: sem permissão para criar.", "error"); return; }
        if (racasPorEspecie[esp].some(r => r.toLowerCase() === nome.toLowerCase())) { showToast("Raça já cadastrada.", "error"); return; }
        const resultado = await executarMutacaoSupabase("cadastrar a raça", () =>
            obterClienteSupabaseAuth().from('raca_tipos')
                .insert({ especie: esp, nome }).select('id, especie, nome').single()
        );
        if (!resultado.ok) return;
        racasPorEspecie[resultado.data.especie].push(resultado.data.nome);
        idsRacaPorChave[`${resultado.data.especie}|${resultado.data.nome}`] = String(resultado.data.id);
        confirmarEscrita("Raça cadastrada");
    } else {
        if (!temPermissao('raca_tipos_editar')) { showToast("Acesso restrito: sem permissão para editar.", "error"); return; }
        const idx = parseInt(idxRaw, 10);
        if (racasPorEspecie[esp].some((r, i) => i !== idx && r.toLowerCase() === nome.toLowerCase())) { showToast("Raça já cadastrada.", "error"); return; }
        const nomeAnterior = racasPorEspecie[esp][idx];
        const chaveAnterior = `${esp}|${nomeAnterior}`;
        const id = idsRacaPorChave[chaveAnterior];
        if (!id) { showToast("Raça não encontrada no banco. Recarregue a tela.", "error"); return; }
        const resultado = await executarMutacaoSupabase("atualizar a raça", () =>
            obterClienteSupabaseAuth().from('raca_tipos')
                .update({ especie: esp, nome }).eq('id', id).select('id, especie, nome').single()
        );
        if (!resultado.ok) return;
        racasPorEspecie[esp][idx] = resultado.data.nome;
        delete idsRacaPorChave[chaveAnterior];
        idsRacaPorChave[`${resultado.data.especie}|${resultado.data.nome}`] = String(resultado.data.id);
        confirmarEscrita("Raça atualizada");
    }
    document.getElementById('edit-tipo-raca-idx').value = '';
    document.getElementById('input-tipo-raca-nome').value = '';
    modoFormTipoRaca(false);
    renderizarTiposRaca();
    popularRacasPet('');
    popularRacasPet('edit-');
}

function editarTipoRacaPrompt(idx) {
    if (!temPermissao('raca_tipos_editar')) { showToast("Acesso restrito.", "error"); return; }
    const esp = document.getElementById('filtro-tipo-raca-especie').value;
    document.getElementById('select-tipo-raca-especie').value = esp;
    document.getElementById('edit-tipo-raca-idx').value = String(idx);
    document.getElementById('input-tipo-raca-nome').value = (racasPorEspecie[esp] || [])[idx] || '';
    modoFormTipoRaca(true);
    document.getElementById('input-tipo-raca-nome').focus();
}

async function excluirTipoRaca(idx) {
    if (!temPermissao('raca_tipos_excluir')) { showToast("Acesso restrito.", "error"); return; }
    const esp = document.getElementById('filtro-tipo-raca-especie').value;
    const nome = (racasPorEspecie[esp] || [])[idx];
    const chave = `${esp}|${nome}`;
    const id = idsRacaPorChave[chave];
    if (!id) { showToast("Raça não encontrada no banco. Recarregue a tela.", "error"); return; }
    const resultado = await executarMutacaoSupabase("excluir a raça", () =>
        obterClienteSupabaseAuth().from('raca_tipos')
            .delete().eq('id', id).select('id').single()
    );
    if (!resultado.ok) return;
    (racasPorEspecie[esp] || []).splice(idx, 1);
    delete idsRacaPorChave[chave];
    renderizarTiposRaca();
    popularRacasPet('');
    popularRacasPet('edit-');
    confirmarEscrita("Raça excluída");
}

function editarDocumentoClinico(id) {
    const doc = historicoClinico.find(h => h.id === id);
    if (!doc) return;
    document.getElementById('clinica-edit-id').value = doc.id;
    const pet = pets.find(p => p.id === doc.petId);
    const tutorCpf = doc.tutorCpf || (pet ? pet.tutorCpf : '');
    document.getElementById('clinica-tutor-select').value = tutorCpf;
    filtrarPetsClinicaPorTutor();
    document.getElementById('clinica-pet-select').value = doc.petId;
    document.getElementById('clinica-tipo').value = doc.tipo;
    popularVacinaTiposClinica(doc.vacinaTipo || '');
    document.getElementById('clinica-data').value = doc.data;
    document.getElementById('clinica-detalhe').value = doc.detalhe;
    document.getElementById('clinica-form-title').innerText = "Editar Documento";
    document.getElementById('btn-cancelar-edit-clinico').classList.remove('hidden');
    atualizarLabelDocumento();
}

async function excluirDocumentoClinico(id) {
    const resultado = await executarMutacaoSupabase("excluir o documento clínico", () =>
        obterClienteSupabaseAuth().from('historico_clinico')
            .delete().eq('id', id).select('id').single()
    );
    if (!resultado.ok) return;
    historicoClinico = historicoClinico.filter(h => h.id !== id);
    renderizarHistoricoClinico();
    confirmarEscrita("Documento excluído");
}

function nomeArquivoSeguro(nome) {
    return nome.normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/^\.+/, '')
        .slice(0, 120) || 'arquivo';
}

async function lidarUploadAnexos(e) {
    if (!temPermissao('clinica_criar')) {
        showToast("Acesso restrito: perfil sem permissão para anexar.", "error");
        e.target.value = '';
        return;
    }
    const arquivos = Array.from(e.target.files || []);
    if (!arquivos.length) return;
    e.target.value = '';
    const tutorCpf = document.getElementById('clinica-tutor-select').value || '';
    const petId = document.getElementById('clinica-pet-select').value || '';
    if (!tutorCpf || !petId || !pets.some(p => p.id === petId && p.tutorCpf === tutorCpf)) {
        showToast("Selecione um tutor e um pet válido antes de anexar arquivos.", "error");
        return;
    }

    let enviados = 0;
    let falhas = 0;
    for (const arquivo of arquivos) {
        const tiposAceitos = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'];
        if (!tiposAceitos.includes(arquivo.type) || arquivo.size < 1 || arquivo.size > 10485760) {
            showToast(`${arquivo.name}: tipo não permitido ou arquivo acima de 10 MB.`, "error");
            falhas++;
            continue;
        }
        const caminho = `${petId}/${crypto.randomUUID()}-${nomeArquivoSeguro(arquivo.name)}`;
        const storage = obterClienteSupabaseAuth().storage.from('dayvet-documentos');
        const upload = await executarMutacaoSupabase("enviar o anexo", () =>
            storage.upload(caminho, arquivo, { contentType: arquivo.type, upsert: false })
        );
        if (!upload.ok) {
            falhas++;
            continue;
        }

        const metadados = await executarMutacaoSupabase("registrar o anexo", () =>
            obterClienteSupabaseAuth().from('documentos').insert({
                tutor_cpf: tutorCpf,
                pet_id: petId,
                nome: arquivo.name.slice(0, 255),
                mime_type: arquivo.type,
                tamanho_bytes: arquivo.size,
                storage_path: caminho,
                criado_por: currentUser.id
            }).select('*').single()
        );
        if (!metadados.ok) {
            const remocao = await storage.remove([caminho]);
            if (remocao.error) {
                console.error("Arquivo enviado sem metadados e não removido do Storage.", remocao.error);
                showToast("Um arquivo não foi registrado nem pôde ser removido do armazenamento. Avise o administrador.", "error");
            }
            falhas++;
            continue;
        }
        anexosClinicos.unshift(window.DayVetPersistencia.mapearDocumento(metadados.data));
        enviados++;
    }

    renderizarAnexos();
    if (enviados) confirmarEscrita(`${enviados} documento(s) anexado(s) e salvo(s)`);
    if (falhas) showToast(`${falhas} arquivo(s) não foram anexados.`, "error");
}

function renderizarAnexos() {
    const lista = document.getElementById('lista-anexos');
    if (!lista) return;
    document.getElementById('anexos-count').innerText = anexosClinicos.length + (anexosClinicos.length === 1 ? " arquivo" : " arquivos");
    if (!anexosClinicos.length) {
        lista.innerHTML = '<p class="text-xs text-slate-500 italic">Nenhum documento anexado.</p>';
        return;
    }
    lista.innerHTML = '';
    anexosClinicos.forEach(a => {
        const pet = pets.find(p => p.id === a.petId);
        const tutor = tutores.find(t => t.cpf === a.tutorCpf);
        lista.innerHTML += `
            <div class='flex items-center justify-between gap-2 bg-slate-900/80 px-3.5 py-2.5 rounded-xl border border-slate-800'>
                <div class='flex items-center gap-2.5 min-w-0'>
                    <i data-lucide='paperclip' class='w-4 h-4 text-brand-blue shrink-0'></i>
                    <div class='min-w-0'>
                        <p class='text-xs font-bold text-slate-200 truncate'>${escaparHtml(a.nome)}</p>
                        <p class='text-[10px] text-slate-500'>${a.tamanhoKb} KB · ${escaparHtml(a.data)}${pet ? ' · ' + escaparHtml(pet.nome) : ''}${tutor ? ' · ' + escaparHtml(tutor.nome) : ''}</p>
                    </div>
                </div>
                <div class='flex items-center gap-3 shrink-0'>
                    <button onclick="abrirAnexo('${a.id}')" class='text-[11px] text-brand-blue font-bold hover:underline'>Abrir</button>
                    ${temPermissao('clinica_excluir') ? `<button onclick="excluirAnexo('${a.id}')" class='text-[11px] text-rose-400 font-bold hover:underline'>Excluir</button>` : ''}
                </div>
            </div>
        `;
    });
    lucide.createIcons();
}

async function abrirAnexo(id) {
    const anexo = anexosClinicos.find(a => a.id === id);
    if (!anexo) return;
    const janela = window.open('about:blank', '_blank');
    if (!janela) {
        showToast("Permita a abertura de uma nova aba para acessar o anexo.", "error");
        return;
    }
    janela.opener = null;
    const resultado = await executarMutacaoSupabase("gerar o link seguro do anexo", () =>
        obterClienteSupabaseAuth().storage.from('dayvet-documentos')
            .createSignedUrl(anexo.storagePath, 60)
    );
    if (!resultado.ok) {
        janela.close();
        return;
    }
    janela.location = resultado.data.signedUrl;
}

async function excluirAnexo(id) {
    const anexo = anexosClinicos.find(a => a.id === id);
    if (!anexo) return;
    const removido = await executarMutacaoSupabase("excluir o registro do anexo", () =>
        obterClienteSupabaseAuth().from('documentos')
            .delete().eq('id', id).select('*').single()
    );
    if (!removido.ok) return;
    const storage = obterClienteSupabaseAuth().storage.from('dayvet-documentos');
    const arquivoRemovido = await storage.remove([anexo.storagePath]);
    if (arquivoRemovido.error) {
        console.error("Falha ao remover o arquivo do Storage; restaurando os metadados.", arquivoRemovido.error);
        const restaurado = await executarMutacaoSupabase("restaurar os metadados do anexo", () =>
            obterClienteSupabaseAuth().from('documentos').insert(removido.data).select('id').single()
        );
        if (!restaurado.ok) {
            showToast("Falha ao remover o arquivo e ao restaurar seu registro. Avise o administrador.", "error");
        } else {
            showToast("Não foi possível remover o arquivo. O registro foi mantido.", "error");
        }
        return;
    }
    anexosClinicos = anexosClinicos.filter(a => a.id !== id);
    renderizarAnexos();
    confirmarEscrita("Anexo excluído");
}

function resetarFormClinico() {
    document.getElementById('clinica-edit-id').value = '';
    document.getElementById('clinica-tutor-select').value = '';
    filtrarPetsClinicaPorTutor();
    document.getElementById('clinica-detalhe').value = '';
    document.getElementById('clinica-form-title').innerText = "Novo Documento Clínico";
    document.getElementById('btn-cancelar-edit-clinico').classList.add('hidden');
}

async function salvarRegistroClinico(e) {
    e.preventDefault();
    const editId = document.getElementById('clinica-edit-id').value;
    const tutorCpf = document.getElementById('clinica-tutor-select').value;
    const petId = document.getElementById('clinica-pet-select').value;
    const tipo = document.getElementById('clinica-tipo').value;
    const data = document.getElementById('clinica-data').value;
    const detalhe = document.getElementById('clinica-detalhe').value;
    const vacinaTipo = tipo === 'vacina' ? (document.getElementById('clinica-vacina-tipo').value || '') : '';
    if (tipo === 'vacina' && !vacinaTipo) {
        showToast("Informe o tipo de vacinação.", "error");
        return;
    }
    if (!tutorCpf || !petId || !pets.some(p => p.id === petId && p.tutorCpf === tutorCpf)) {
        showToast("Selecione um tutor e um pet válido para o registro clínico.", "error");
        return;
    }

    if (editId) {
        const doc = historicoClinico.find(h => h.id === editId);
        if (!doc) { showToast("O documento não foi encontrado. Atualize a tela e tente novamente.", "error"); return; }
        const atualizado = { ...doc, tutorCpf, petId, tipo, vacinaTipo, data, detalhe };
        const payload = window.DayVetPersistencia.paraHistorico(atualizado, currentUser);
        delete payload.veterinario_id;
        delete payload.crmv;
        delete payload.criado_por;
        const resultado = await executarMutacaoSupabase("atualizar o documento clínico", () =>
            obterClienteSupabaseAuth().from('historico_clinico')
                .update(payload).eq('id', editId).select('*').single()
        );
        if (!resultado.ok) return;
        Object.assign(doc, window.DayVetPersistencia.mapearHistorico(resultado.data));
        confirmarEscrita("Documento atualizado");
    } else {
        const novoRegistro = { tutorCpf, petId, tipo, vacinaTipo, data, detalhe };
        const resultado = await executarMutacaoSupabase("registrar o documento clínico", () =>
            obterClienteSupabaseAuth().from('historico_clinico')
                .insert(window.DayVetPersistencia.paraHistorico(novoRegistro, currentUser))
                .select('*').single()
        );
        if (!resultado.ok) return;
        historicoClinico.unshift(window.DayVetPersistencia.mapearHistorico(resultado.data));
        confirmarEscrita("Novo documento registrado");
    }

    resetarFormClinico();
    renderizarHistoricoClinico();
}

function imprimirDocumentoGenerico(id) {
    const doc = historicoClinico.find(h => h.id === id);
    if (!doc) return;
    const pet = pets.find(p => p.id === doc.petId);
    const tutor = tutores.find(t => t.cpf === (doc.tutorCpf || (pet ? pet.tutorCpf : null)));

    let titulos = {
        receita: "Prescrição Médica Veterinária (Receituário)",
        vacina: "Comprovante de Imunização"
    };

    document.getElementById('doc-titulo-tipo').innerText = titulos[doc.tipo] || "Documento Clínico";
    if (doc.tipo === 'vacina' && doc.vacinaTipo) {
        document.getElementById('doc-titulo-tipo').innerText += " — " + doc.vacinaTipo;
    }
    document.getElementById('doc-nome-pet').innerText = (pet ? pet.nome : 'N/A') + " (" + (pet ? pet.raca : '') + ")";
    document.getElementById('doc-nome-tutor').innerText = tutor ? (tutor.nome + " (CPF " + tutor.cpf + ")") : 'N/A';
    document.getElementById('doc-data').innerText = doc.data;
    document.getElementById('doc-conteudo').innerText = doc.detalhe;
    // Nome e registro do veterinário vêm dos perfis reais; a assinatura digital
    // segue pendente de implementação e validação jurídica.
    // Nome e CRMV andam juntos: admin/funcionário sem CRMV não assina documento
    // clínico — nesse caso assina o veterinário de referência (regra pura testada).
    const vetRef = (administradores && administradores[0]) || { nome: '—', crm: '—' };
    const assinatura = RegrasTutor.assinaturaDocumento(currentUser, vetRef);
    const vetNome = assinatura.nome;
    const vetCrm = assinatura.crm;
    document.getElementById('doc-vet-nome').innerText = vetNome;
    document.getElementById('doc-vet-crmv').innerText = vetCrm;
    document.getElementById('doc-assinatura-nome').innerText = vetNome;
    document.getElementById('doc-assinatura-crmv').innerText = vetCrm;

    document.getElementById('modal-impressao-documento').classList.remove('hidden');
}

// ==========================================================
// SEÇÃO 9: RELATÓRIOS
// ==========================================================

function switchRelatorioTab(tipo) {
    document.querySelectorAll('.relatorio-conteudo').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.relatorio-tab-btn').forEach(btn => {
        btn.classList.remove('bg-slate-800', 'text-white', 'border-slate-700');
        btn.classList.add('bg-slate-950', 'text-slate-400', 'border-slate-850');
    });

    const conteudo = document.getElementById('rel-conteudo-' + tipo);
    if (conteudo) conteudo.classList.remove('hidden');

    const btn = document.getElementById('rel-tab-' + tipo);
    if (btn) {
        btn.classList.add('bg-slate-800', 'text-white', 'border-slate-700');
        btn.classList.remove('bg-slate-950', 'text-slate-400', 'border-slate-850');
    }

    if (tipo === 'servicos') renderizarRelatorioServicos();
    else if (tipo === 'tutor') renderizarRelatorioTutor();
    else if (tipo === 'periodo') renderizarRelatorioPeriodo();

    lucide.createIcons();
}

function formatarMoeda(valor) {
    return "R$ " + valor.toFixed(2).replace('.', ',');
}

function atualizarKpisDashboard() {
    const quantidadeAgendamentos = document.getElementById('kpi-agendamentos-count');
    const notaAgendamentos = document.getElementById('kpi-agendamentos-nota');
    const quantidadePets = document.getElementById('kpi-pacientes-count');
    const quantidadeTutores = document.getElementById('kpi-tutores-count');
    const naoCancelados = agendamentos.filter(a => a.status !== 'cancelado');
    const confirmados = naoCancelados.filter(a => a.status === 'confirmado' || a.status === 'concluido').length;
    const taxa = naoCancelados.length ? Math.round(confirmados / naoCancelados.length * 100) : 0;

    if (quantidadeAgendamentos) quantidadeAgendamentos.textContent = `${agendamentos.length} Atendimentos`;
    if (notaAgendamentos) notaAgendamentos.textContent = `${taxa}% confirmados/concluídos`;
    if (quantidadePets) quantidadePets.textContent = `${pets.length} Pets`;
    if (quantidadeTutores) quantidadeTutores.textContent =
        `${tutores.filter(t => !t.arquivado).length} Tutores ativos`;
}

function dataLocalISO(data) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

function renderizarRelatorioServicos() {
    const body = document.getElementById('rel-servicos-table-body');
    if (!body) return;
    body.innerHTML = '';

    const grupos = {};
    agendamentos.forEach(a => {
        const chave = /vacin/i.test(a.servico) && a.vacinaTipo ? a.servico + ' — ' + a.vacinaTipo : a.servico;
        if (!grupos[chave]) {
            grupos[chave] = { qtde: 0, confirmados: 0, receita: 0, valoresCount: 0 };
        }
        grupos[chave].qtde += 1;
        if (a.status !== 'cancelado') {
            grupos[chave].receita += Number(a.valor || 0);
            grupos[chave].valoresCount += 1;
        }
        if (a.status === 'confirmado' || a.status === 'concluido') grupos[chave].confirmados += 1;
    });

    const servicos = Object.keys(grupos).sort((a, b) => grupos[b].receita - grupos[a].receita);
    let receitaTotalGeral = 0;
    let atendimentosTotalGeral = 0;

    servicos.forEach(nome => {
        const g = grupos[nome];
        const pctConfirmados = g.qtde > 0 ? Math.round((g.confirmados / g.qtde) * 100) : 0;
        const ticketMedio = g.valoresCount > 0 ? g.receita / g.valoresCount : 0;
        receitaTotalGeral += g.receita;
        atendimentosTotalGeral += g.qtde;

        body.innerHTML += `
            <tr class='hover:bg-slate-900/60 border-b border-slate-800/50'>
                <td class='py-3.5 px-6 font-bold text-slate-200'>${escaparHtml(nome)}</td>
                <td class='py-3.5 px-6 text-slate-300'>${g.qtde}</td>
                <td class='py-3.5 px-6 text-slate-300'>${pctConfirmados}%</td>
                <td class='py-3.5 px-6 font-bold text-brand-lime'>${formatarMoeda(g.receita)}</td>
                <td class='py-3.5 px-6 text-slate-300'>${formatarMoeda(ticketMedio)}</td>
            </tr>
        `;
    });

    if (servicos.length === 0) {
        body.innerHTML = `<tr><td colspan='5' class='py-6 px-6 text-center text-slate-500 italic text-xs'>Nenhum agendamento registrado.</td></tr>`;
    }

    document.getElementById('rel-serv-distintos').innerText = servicos.length;
    document.getElementById('rel-serv-total-atend').innerText = atendimentosTotalGeral;
    document.getElementById('rel-serv-receita-total').innerText = formatarMoeda(receitaTotalGeral);
}

function renderizarRelatorioTutor() {
    const body = document.getElementById('rel-tutor-table-body');
    if (!body) return;
    body.innerHTML = '';

    let receitaTotalGeral = 0;
    let tutoresAtivos = 0;

    const linhas = tutores.map(t => {
        const agendamentosDoTutor = agendamentos.filter(a => a.tutorCpf === t.cpf);
        const petsDoTutor = pets.filter(p => p.tutorCpf === t.cpf);
        const atendimentosComValor = agendamentosDoTutor.filter(a => a.status !== 'cancelado');
        const valorTotal = atendimentosComValor.reduce((soma, a) => soma + Number(a.valor || 0), 0);
        const ultimaData = agendamentosDoTutor.length > 0
            ? agendamentosDoTutor.map(a => a.data).sort().reverse()[0]
            : null;

        if (agendamentosDoTutor.length > 0) tutoresAtivos += 1;
        receitaTotalGeral += valorTotal;

        return {
            nome: t.nome,
            pets: petsDoTutor.length,
            qtde: agendamentosDoTutor.length,
            valorTotal,
            ultimaData
        };
    }).sort((a, b) => b.valorTotal - a.valorTotal);

    linhas.forEach(l => {
        body.innerHTML += `
            <tr class='hover:bg-slate-900/60 border-b border-slate-800/50'>
                <td class='py-3.5 px-6 font-bold text-slate-200'>${escaparHtml(l.nome)}</td>
                <td class='py-3.5 px-6 text-slate-300'>${l.pets}</td>
                <td class='py-3.5 px-6 text-slate-300'>${l.qtde}</td>
                <td class='py-3.5 px-6 font-bold text-brand-lime'>${formatarMoeda(l.valorTotal)}</td>
                <td class='py-3.5 px-6 text-slate-300'>${escaparHtml(l.ultimaData || '—')}</td>
            </tr>
        `;
    });

    if (linhas.length === 0) {
        body.innerHTML = `<tr><td colspan='5' class='py-6 px-6 text-center text-slate-500 italic text-xs'>Nenhum tutor cadastrado.</td></tr>`;
    }

    document.getElementById('rel-tutor-ativos').innerText = tutoresAtivos;
    const totalComValor = agendamentos.filter(a => a.status !== 'cancelado').length;
    document.getElementById('rel-tutor-ticket-medio').innerText = formatarMoeda(totalComValor > 0 ? receitaTotalGeral / totalComValor : 0);
    document.getElementById('rel-tutor-receita-total').innerText = formatarMoeda(receitaTotalGeral);
}

function renderizarRelatorioPeriodo() {
    const body = document.getElementById('rel-periodo-table-body');
    if (!body) return;
    body.innerHTML = '';

    const inicio = document.getElementById('rel-periodo-inicio').value;
    const fim = document.getElementById('rel-periodo-fim').value;

    let filtrados = [...agendamentos];
    if (inicio) filtrados = filtrados.filter(a => a.data >= inicio);
    if (fim) filtrados = filtrados.filter(a => a.data <= fim);
    filtrados.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));

    let receitaTotal = 0;

    filtrados.forEach(a => {
        const pet = pets.find(p => p.id === a.petId);
        const tutor = tutores.find(t => t.cpf === a.tutorCpf);
        if (a.status !== 'cancelado') receitaTotal += Number(a.valor || 0);

        let badge = "";
        if (a.status === 'confirmado') {
            badge = "<span class='bg-brand-lime/10 text-brand-lime border border-brand-lime/20 text-[10px] font-bold px-2 py-0.5 rounded-full'>Confirmado</span>";
        } else if (a.status === 'cancelado') {
            badge = "<span class='bg-red-950/40 text-rose-400 border border-rose-800/40 text-[10px] font-bold px-2 py-0.5 rounded-full'>Cancelado</span>";
        } else {
            badge = "<span class='bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20 text-[10px] font-bold px-2 py-0.5 rounded-full'>Pendente</span>";
        }

        body.innerHTML += `
            <tr class='hover:bg-slate-900/60 border-b border-slate-800/50'>
                <td class='py-3.5 px-6 text-slate-300'>
                    <div>${escaparHtml(a.data)}</div>
                    <div class='text-[10px] text-brand-pink font-bold'>${escaparHtml(a.hora)}</div>
                </td>
                <td class='py-3.5 px-6'>
                    <div class='font-bold text-slate-200'>${escaparHtml(pet ? pet.nome : 'N/A')}</div>
                    <div class='text-[10px] text-slate-500'>${escaparHtml(tutor ? tutor.nome : 'N/A')}</div>
                </td>
                <td class='py-3.5 px-6 text-slate-300 font-semibold'>${escaparHtml(a.servico)}</td>
                <td class='py-3.5 px-6'>${badge}</td>
                <td class='py-3.5 px-6 font-bold text-slate-200'>${formatarMoeda(a.valor)}</td>
            </tr>
        `;
    });

    if (filtrados.length === 0) {
        body.innerHTML = `<tr><td colspan='5' class='py-6 px-6 text-center text-slate-500 italic text-xs'>Nenhum agendamento encontrado no período selecionado.</td></tr>`;
    }

    document.getElementById('rel-periodo-qtde').innerText = filtrados.length;
    document.getElementById('rel-periodo-receita').innerText = formatarMoeda(receitaTotal);
    const agendamentosComValor = filtrados.filter(a => a.status !== 'cancelado').length;
    document.getElementById('rel-periodo-ticket').innerText =
        formatarMoeda(agendamentosComValor > 0 ? receitaTotal / agendamentosComValor : 0);
}

function limparFiltroPeriodo() {
    document.getElementById('rel-periodo-inicio').value = '';
    document.getElementById('rel-periodo-fim').value = '';
    renderizarRelatorioPeriodo();
}

function abrirModalGerarRelatorios() { document.getElementById('modal-gerar-relatorios').classList.remove('hidden'); }
function fecharModalGerarRelatorios() { document.getElementById('modal-gerar-relatorios').classList.add('hidden'); }

function executarGeracaoRelatorio() {
    const tipo = document.getElementById('relatorio-tipo').value;
    fecharModalGerarRelatorios();
    showToast("Abrindo a janela de impressão do relatório (" + tipo + ").");
    setTimeout(() => window.print(), 500);
}

// ==========================================================
// SEÇÃO 10: USUÁRIOS & PERMISSÕES
// ==========================================================

function renderizarUsuarios() {
    const body = document.getElementById('usuarios-table-body');
    if (!body) return;
    body.innerHTML = '';

    usuarios.forEach(u => {
        const status = u.deletedAt ? 'Acesso excluído' : (u.active ? 'Ativo' : 'Inativo');
        body.innerHTML += `
            <tr class='hover:bg-slate-900/60 border-b border-slate-800/50'>
                <td class='py-3.5 px-6 font-bold text-slate-200'>${escaparHtml(u.nome)}</td>
                <td class='py-3.5 px-6 text-brand-lime font-bold uppercase text-[11px]'>${formatarCargo(u.role)}</td>
                <td class='py-3.5 px-6 text-slate-400'>${escaparHtml(u.cpf)}</td>
                <td class='py-3.5 px-6 text-slate-400'>${status}</td>
                <td class='py-3.5 px-6 text-right space-x-2'>
                    ${u.id !== currentUser?.id ? `<button onclick="abrirModalEditarPermissao('${u.id}', '${u.role}')" class='text-brand-blue font-bold hover:underline text-xs'>Editar Permissão</button>` : ''}
                    ${u.id !== currentUser?.id ? `<button onclick="alternarAcessoUsuario('${u.id}')" class='text-amber-400 font-bold hover:underline text-xs'>${u.active ? 'Desativar' : 'Reativar'}</button>` : ''}
                    ${u.id !== currentUser?.id ? `<button onclick="excluirUsuarioLogin('${u.id}')" class='text-rose-400 font-bold hover:underline text-xs'>Excluir Login</button>` : ''}
                </td>
            </tr>
        `;
    });
}

function abrirModalUsuario() {
    document.getElementById('user-new-crm').value = '';
    document.getElementById('user-new-crm-validade').value = '';
    document.getElementById('modal-usuario').classList.remove('hidden');
    atualizarCamposCrmvUsuario();
}
function fecharModalUsuario() { document.getElementById('modal-usuario').classList.add('hidden'); }

function atualizarCamposCrmvUsuario() {
    const veterinario = document.getElementById('user-new-role').value === 'veterinario';
    const campos = document.getElementById('campos-crmv-usuario');
    campos.classList.toggle('hidden', !veterinario);
    document.getElementById('user-new-crm').required = veterinario;
    document.getElementById('user-new-crm-validade').required = veterinario;
}

// Cria usuário no Auth e no perfil público por Edge Function administrativa.
async function salvarNovoUsuario(e) {
    e.preventDefault();
    const nome = document.getElementById('user-new-nome').value.trim();
    const cpf = document.getElementById('user-new-cpf').value.trim();
    const email = document.getElementById('user-new-email').value.trim().toLowerCase();
    const role = document.getElementById('user-new-role').value;
    const crm = document.getElementById('user-new-crm').value.trim();
    const crmValidade = document.getElementById('user-new-crm-validade').value;

    // Valida CPF: apenas digitos + dígito verificador
    if (!validarCPF(cpf)) {
        showToast("CPF inválido. Informe um CPF com dígitos verificadores válidos.", "error");
        return;
    }

    // Valida formato de e-mail
    if (!validarEmail(email)) {
        showToast("E-mail inválido. Informe um endereço como exemplo@dominio.com.", "error");
        return;
    }

    // Verifica unicidade de CPF (sem revelar qual campo duplicou)
    if (usuarios.some(u => u.cpf === cpf)) {
        showToast("Credenciais inválidas", "error");
        return;
    }

    // Verifica unicidade de e-mail
    if (usuarios.some(u => u.email.toLowerCase() === email)) {
        showToast("Credenciais inválidas", "error");
        return;
    }

    // A Edge Function gera senha temporária e mustChange=true; o administrador a entrega por canal seguro.
    if (role === 'veterinario' && (!crm || !crmValidade || crmValidade < hojeISO())) {
        showToast("Informe o CRMV e uma validade vigente para o veterinário.", "error");
        return;
    }

    const resultado = await executarMutacaoSupabase("criar o usuário", () =>
        obterClienteSupabaseAuth().functions.invoke('admin-criar-usuario', {
            body: { nome, cpf, email, role, crm, crm_validade: crmValidade }
        })
    );
    if (!resultado.ok || !resultado.data?.usuario || !resultado.data?.senha_temporaria) return;
    usuarios.push(window.DayVetPersistencia.mapearUsuario(resultado.data.usuario));
    fecharModalUsuario();
    renderizarUsuarios();
    confirmarEscrita("Novo usuário criado");
    document.getElementById('senha-temporaria-gerada').value = resultado.data.senha_temporaria;
    document.getElementById('modal-senha-temporaria').classList.remove('hidden');
}

function fecharModalSenhaTemporaria() {
    document.getElementById('senha-temporaria-gerada').value = '';
    document.getElementById('modal-senha-temporaria').classList.add('hidden');
}

async function copiarSenhaTemporaria() {
    const senha = document.getElementById('senha-temporaria-gerada').value;
    if (!senha) return;
    try {
        await navigator.clipboard.writeText(senha);
        showToast("Senha temporária copiada.");
    } catch (erro) {
        console.error("Falha ao copiar a senha temporária.", erro);
        showToast("Não foi possível copiar. Selecione e copie a senha manualmente.", "error");
    }
}

function abrirModalEditarPermissao(id, roleAtual) {
    if (id === currentUser?.id) {
        showToast("Não é possível alterar o próprio perfil administrativo.", "error");
        return;
    }
    document.getElementById('permissao-user-id').value = id;
    document.getElementById('permissao-user-role').value = roleAtual;
    document.getElementById('modal-editar-permissao').classList.remove('hidden');
}
function fecharModalEditarPermissao() { document.getElementById('modal-editar-permissao').classList.add('hidden'); }

async function salvarPermissaoUsuario(e) {
    e.preventDefault();
    const id = document.getElementById('permissao-user-id').value;
    const novaRole = document.getElementById('permissao-user-role').value;
    const user = usuarios.find(u => u.id === id);
    if (!user || id === currentUser?.id) {
        showToast("Não foi possível alterar este perfil.", "error");
        return;
    }
    const resultado = await executarMutacaoSupabase("alterar a permissão do usuário", () =>
        obterClienteSupabaseAuth().from('usuarios')
            .update({ role: novaRole }).eq('id', id).select('*').single()
    );
    if (!resultado.ok) return;
    Object.assign(user, window.DayVetPersistencia.mapearUsuario(resultado.data));
    renderizarUsuarios();
    fecharModalEditarPermissao();
    confirmarEscrita("Permissão de login alterada");
}

async function alternarAcessoUsuario(id) {
    const user = usuarios.find(u => u.id === id);
    if (!user || id === currentUser?.id) return;
    const reativar = !user.active;
    const resultado = await executarMutacaoSupabase(reativar ? "reativar o usuário" : "desativar o usuário", () =>
        obterClienteSupabaseAuth().from('usuarios')
            .update(reativar
                ? { active: true, deleted_at: null }
                : { active: false, deleted_at: null })
            .eq('id', id).select('*').single()
    );
    if (!resultado.ok) return;
    Object.assign(user, window.DayVetPersistencia.mapearUsuario(resultado.data));
    renderizarUsuarios();
    confirmarEscrita(reativar ? "Acesso reativado" : "Acesso desativado");
}

async function excluirUsuarioLogin(id) {
    if (id === currentUser?.id) {
        showToast("Não é possível excluir o próprio acesso administrativo.", "error");
        return;
    }
    const user = usuarios.find(u => u.id === id);
    if (!user || !confirm(`Excluir o acesso de ${user.nome}? O perfil será mantido para preservar o histórico.`)) return;
    const resultado = await executarMutacaoSupabase("excluir o acesso do usuário", () =>
        obterClienteSupabaseAuth().from('usuarios')
            .update({ active: false, deleted_at: new Date().toISOString() })
            .eq('id', id).select('*').single()
    );
    if (!resultado.ok) return;
    Object.assign(user, window.DayVetPersistencia.mapearUsuario(resultado.data));
    renderizarUsuarios();
    confirmarEscrita("Acesso excluído");
}

// ==========================================================
// SEÇÃO 3b: RECUPERAÇÃO DE SENHA (Supabase Auth)
// ==========================================================

// O QUE: Abre modal de recuperar senha na etapa 1 (informar CPF/email).
// PORQUÊ: Permite ao usuario iniciar fluxo de reset quando esqueceu a senha.
function abrirModalRecuperarSenha() {
    document.getElementById('modal-recuperar-senha').classList.remove('hidden');
    document.getElementById('recuperar-etapa-1').classList.remove('hidden');
    document.getElementById('recuperar-etapa-2').classList.add('hidden');
    document.getElementById('btn-recuperar-proximo').classList.remove('hidden');
    document.getElementById('btn-recuperar-confirmar').classList.add('hidden');
    document.getElementById('recuperar-cpf').value = '';
    document.getElementById('recuperar-nova-senha').value = '';
    document.getElementById('recuperar-confirmar-senha').value = '';
    atualizarIndicadoresRegraSenha('');
}

function abrirEtapaRedefinirSenha() {
    document.getElementById('modal-recuperar-senha').classList.remove('hidden');
    document.getElementById('recuperar-etapa-1').classList.add('hidden');
    document.getElementById('recuperar-etapa-2').classList.remove('hidden');
    document.getElementById('btn-recuperar-proximo').classList.add('hidden');
    document.getElementById('btn-recuperar-confirmar').classList.remove('hidden');
    atualizarIndicadoresRegraSenha('');
}

// O QUE: Fecha modal de recuperar senha e reseta campos.
// PORQUÊ: Limpa estado do modal para proxima abertura.
function fecharModalRecuperarSenha() {
    document.getElementById('modal-recuperar-senha').classList.add('hidden');
    document.getElementById('recuperar-etapa-1').classList.remove('hidden');
    document.getElementById('recuperar-etapa-2').classList.add('hidden');
    document.getElementById('btn-recuperar-proximo').classList.remove('hidden');
    document.getElementById('btn-recuperar-confirmar').classList.add('hidden');
    document.getElementById('recuperar-cpf').value = '';
    document.getElementById('recuperar-nova-senha').value = '';
    document.getElementById('recuperar-confirmar-senha').value = '';
}

// O QUE: Solicita por e-mail um link de redefinição sem revelar se a conta existe.
async function recuperarSenhaProximo() {
    const identifier = document.getElementById('recuperar-cpf').value.trim();

    if (!identifier) {
        showToast("Informe seu usuário, CPF ou e-mail.", "error");
        return;
    }

    try {
        const cliente = obterClienteSupabaseAuth();
        const { data: email, error: erroResolver } = await cliente.rpc('resolver_login', {
            p_identificador: identifier
        });
        if (erroResolver) throw erroResolver;
        if (typeof email === 'string' && email) {
            const redirectTo = window.location.origin === 'null'
                ? 'https://agendau-2.vercel.app/dayvet/'
                : `${window.location.origin}${window.location.pathname}`;
            const { error } = await cliente.auth.resetPasswordForEmail(email, { redirectTo });
            if (error) throw error;
        }
        showToast("Se a conta corresponder aos dados informados, você receberá um link para redefinir a senha.", "info");
        fecharModalRecuperarSenha();
    } catch (erro) {
        console.error("Falha ao solicitar redefinição de senha.", erro);
        showToast("Não foi possível solicitar a redefinição. Tente novamente.", "error");
    }
}

// O QUE: Valida a senha e conclui a redefinição na sessão autenticada pelo link.
async function recuperarSenhaConfirmar() {
    const novaSenha = document.getElementById('recuperar-nova-senha').value;
    const confirmarSenha = document.getElementById('recuperar-confirmar-senha').value;

    if (!novaSenha || !confirmarSenha) {
        showToast("Preencha os dois campos de senha.", "error");
        return;
    }

    if (novaSenha !== confirmarSenha) {
        showToast("As senhas não coincidem.", "error");
        return;
    }

    if (!validarSenhaForte(novaSenha)) {
        showToast("Senha não atende à política: 8+ caracteres, 1 maiúscula, 1 número, 1 especial.", "error");
        return;
    }

    let senhaAtualizada = false;
    try {
        const cliente = obterClienteSupabaseAuth();
        const { error: erroSenha } = await cliente.auth.updateUser({ password: novaSenha });
        if (erroSenha) throw erroSenha;
        senhaAtualizada = true;
        const { error: erroFlag } = await cliente.rpc('marcar_senha_alterada');
        if (erroFlag) {
            console.error("Senha redefinida, mas a flag de primeiro acesso não foi atualizada.", erroFlag);
            showToast("Senha alterada, mas não foi possível atualizar o primeiro acesso. Entre em contato com o administrador.", "error");
            return;
        }
        const { error: erroSaida } = await cliente.auth.signOut();
        if (erroSaida) throw erroSaida;
        currentUser = null;
        currentRole = '';
        limparDadosAutenticados();
        fecharModalRecuperarSenha();
        document.getElementById('login-screen').classList.remove('hidden');
        showToast("Senha alterada com sucesso. Faça login com a nova senha.");
    } catch (erro) {
        console.error("Falha ao redefinir a senha.", erro);
        showToast(senhaAtualizada
            ? "Senha alterada, mas não foi possível encerrar a sessão. Recarregue a página antes de entrar novamente."
            : "Não foi possível alterar a senha. O link pode ter expirado.", "error");
    }
}

// ==========================================================
// SEÇÃO 3c: TROCA FORÇADA DE SENHA (mustChange=true)
// ==========================================================

// O QUE: Abre modal de troca forçada quando mustChange=true no login.
// PORQUÊ: Obriga usuario a definir senha forte antes de acessar o sistema.
// Supabase Auth atualiza a senha; a RPC marca_senha_alterada baixa a flag
// must_change sem permitir que o usuário altere outros dados do perfil.
let _mustChangeUser = null;
function abrirModalForcarTrocaSenha(user) {
    _mustChangeUser = user;
    document.getElementById('forcar-senha-etapa').classList.remove('hidden');
    document.getElementById('forcar-senha-nova').value = '';
    document.getElementById('forcar-senha-confirmar').value = '';
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('forcar-senha-etapa').querySelector('p').textContent =
        'Olá ' + user.nome + '! Você deve definir uma nova senha para acessar o sistema.';
    atualizarIndicadoresForcarSenha('');
}

async function fecharModalForcarTrocaSenha(encerraSessao = true) {
    const user = _mustChangeUser;
    document.getElementById('forcar-senha-etapa').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    _mustChangeUser = null;
    if (encerraSessao && user && MODO_AUTENTICACAO === 'supabase') {
        try {
            const { error } = await obterClienteSupabaseAuth().auth.signOut();
            if (error) {
                console.error("Falha ao encerrar sessão após cancelar a troca de senha.", error);
                showToast("Não foi possível encerrar a sessão. Tente novamente.", "error");
            }
        } catch (erro) {
            console.error("Falha de comunicação ao cancelar a troca de senha.", erro);
            showToast("Não foi possível encerrar a sessão. Tente novamente.", "error");
        }
    }
}

async function confirmarForcarTrocaSenha() {
    const novaSenha = document.getElementById('forcar-senha-nova').value;
    const confirmarSenha = document.getElementById('forcar-senha-confirmar').value;

    if (!novaSenha || !confirmarSenha) {
        showToast("Preencha os dois campos de senha.", "error");
        return;
    }

    if (novaSenha !== confirmarSenha) {
        showToast("As senhas não coincidem.", "error");
        return;
    }

    if (!validarSenhaForte(novaSenha)) {
        showToast("Senha não atende à política: 8+ caracteres, 1 maiúscula, 1 número, 1 especial.", "error");
        return;
    }

    if (!_mustChangeUser) return;
    const userObj = { ..._mustChangeUser };
    const cliente = obterClienteSupabaseAuth();
    try {
        const { error: erroSenha } = await cliente.auth.updateUser({ password: novaSenha });
        if (erroSenha) throw erroSenha;

        const { error: erroFlag } = await cliente.rpc('marcar_senha_alterada');
        if (erroFlag) {
            console.error("Falha ao registrar a troca obrigatória de senha.", erroFlag);
            showToast("A senha foi alterada, mas não foi possível concluir o primeiro acesso.", "error");
            return;
        }

        await fecharModalForcarTrocaSenha(false);
        try {
            await carregarDadosAutenticados(userObj);
        } catch (erroDados) {
            console.error("Senha alterada, mas os dados não puderam ser carregados.", erroDados);
            await cliente.auth.signOut();
            showToast("Senha alterada, mas não foi possível carregar os dados. Faça login novamente.", "error");
            return;
        }
        realizarLogin(userObj, userObj.role);
        showToast("Senha alterada com sucesso!");
    } catch (erro) {
        console.error("Falha de comunicação ao alterar a senha.", erro);
        showToast("Não foi possível concluir a troca de senha.", "error");
    }
}

// O QUE: Atualiza indicadores visuais das regras de senha no modal de recuperação.
// PORQUÊ: Feedback em tempo real das regras de validação para o usuário.
function atualizarIndicadoresRegraSenha(senha) {
    const mapa = {
        'regra-tamanho': senha.length >= 8,
        'regra-simbolo': /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha),
        'regra-letras': (senha.match(/[a-zA-Z]/g) || []).length >= 3,
        'regra-numeros': (senha.match(/[0-9]/g) || []).length >= 3
    };
    Object.entries(mapa).forEach(([id, ok]) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<span class="inline-block w-3 mr-1">' + (ok ? '●' : '○') + '</span> ' + el.textContent.replace(/^[●○]\s*/, '');
    });
}

// O QUE: Atualiza indicadores visuais das regras no modal de troca forçada.
// PORQUÊ: Feedback em tempo real durante primeiro login (mustChange).
function atualizarIndicadoresForcarSenha(senha) {
    const mapa = {
        'forcar-regra-tamanho': senha.length >= 8,
        'forcar-regra-simbolo': /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha),
        'forcar-regra-letras': (senha.match(/[a-zA-Z]/g) || []).length >= 3,
        'forcar-regra-numeros': (senha.match(/[0-9]/g) || []).length >= 3
    };
    Object.entries(mapa).forEach(([id, ok]) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<span class="inline-block w-3 mr-1">' + (ok ? '●' : '○') + '</span> ' + el.textContent.replace(/^[●○]\s*/, '');
    });
}

function aplicarConfiguracaoHoraria() {
    const seletorModo = document.getElementById('config-horario');
    const abertura = document.getElementById('horario-abertura');
    const fechamento = document.getElementById('horario-fechamento');
    const fds = document.getElementById('horario-fds');
    const horarioAgendamento = document.getElementById('agend-hora');

    if (seletorModo) seletorModo.value = configuracaoClinica.modoRestricao;
    if (abertura) abertura.value = configuracaoClinica.horaAbertura;
    if (fechamento) fechamento.value = configuracaoClinica.horaFechamento;
    if (fds) fds.value = configuracaoClinica.funcionamentoFds;
    if (horarioAgendamento) {
        horarioAgendamento.min = configuracaoClinica.modoRestricao === 'comercial'
            ? configuracaoClinica.horaAbertura : '';
        horarioAgendamento.max = configuracaoClinica.modoRestricao === 'comercial'
            ? configuracaoClinica.horaFechamento : '';
    }
}

function horarioAgendamentoPermitido(data, hora) {
    if (!data || !hora) return false;
    if (configuracaoClinica.modoRestricao === 'livre') return true;

    const dataLocal = new Date(`${data}T12:00:00`);
    if (Number.isNaN(dataLocal.getTime())) return false;
    const dia = dataLocal.getDay();
    if (dia === 0) return configuracaoClinica.funcionamentoFds === 'direto';
    if (dia === 6) {
        if (configuracaoClinica.funcionamentoFds === 'fechado') return false;
        if (configuracaoClinica.funcionamentoFds === 'direto') return true;
        const fechamentoSabado = configuracaoClinica.horaFechamento < '12:00'
            ? configuracaoClinica.horaFechamento : '12:00';
        return hora >= configuracaoClinica.horaAbertura && hora <= fechamentoSabado;
    }
    return hora >= configuracaoClinica.horaAbertura && hora <= configuracaoClinica.horaFechamento;
}

async function atualizarConfiguracaoClinica(campos, acao) {
    const resultado = await executarMutacaoSupabase(acao, () =>
        obterClienteSupabaseAuth().from('configuracoes_clinica')
            .update({ ...campos, atualizado_por: currentUser.id })
            .eq('id', true).select('*').single()
    );
    if (!resultado.ok) {
        aplicarConfiguracaoHoraria();
        return false;
    }
    if (!resultado.data) {
        console.error("O Supabase não retornou a configuração atualizada da clínica.");
        showToast("Não foi possível confirmar a configuração atualizada.", "error");
        aplicarConfiguracaoHoraria();
        return false;
    }
    configuracaoClinica = window.DayVetPersistencia.mapearConfiguracao(resultado.data);
    configRestricao = configuracaoClinica.modoRestricao;
    aplicarConfiguracaoHoraria();
    return true;
}

function abrirModalHorarioFuncionamento() {
    aplicarConfiguracaoHoraria();
    document.getElementById('modal-horario-funcionamento').classList.remove('hidden');
}
function fecharModalHorarioFuncionamento() { document.getElementById('modal-horario-funcionamento').classList.add('hidden'); }

async function salvarHorarioFuncionamento(e) {
    e.preventDefault();
    const ab = document.getElementById('horario-abertura').value;
    const fech = document.getElementById('horario-fechamento').value;
    if (ab >= fech) {
        showToast("O horário de fechamento deve ser posterior à abertura.", "error");
        return;
    }
    const salvo = await atualizarConfiguracaoClinica({
        hora_abertura: ab,
        hora_fechamento: fech,
        modo_restricao: document.getElementById('config-horario').value,
        funcionamento_fds: document.getElementById('horario-fds').value
    }, "salvar o horário de funcionamento");
    if (!salvo) return;
    fecharModalHorarioFuncionamento();
    confirmarEscrita("Horário de funcionamento atualizado");
}

// Popular dropdowns de tutores (por CPF) e pets filtrados para a aba clínica
function popularTutoresClinicos() {
    const selectT = document.getElementById('clinica-tutor-select');
    if (!selectT) return;
    const atual = selectT.value;
    preencherSelectTutores(selectT, 'Selecione o tutor (CPF)...');
    if (atual) selectT.value = atual;
    filtrarPetsClinicaPorTutor();
}

// O QUE: Filtra os pets do tutor selecionado (por CPF) no form clínico.
// PORQUÊ: O atendimento parte do tutor registrado (chave primária CPF).
function filtrarPetsClinicaPorTutor() {
    const selectT = document.getElementById('clinica-tutor-select');
    const selectP = document.getElementById('clinica-pet-select');
    if (!selectT || !selectP) return;
    const tutorCpf = selectT.value;
    selectP.innerHTML = tutorCpf
        ? '<option value="">Selecione o paciente...</option>'
        : '<option value="">Selecione o tutor primeiro...</option>';
    pets.filter(p => p.tutorCpf === tutorCpf).forEach(p => {
        selectP.innerHTML += `<option value="${escaparHtml(p.id)}">${escaparHtml(p.nome)} (${escaparHtml(p.especie)} - ${escaparHtml(p.raca)})</option>`;
    });
}

// Popular dropdowns de pets para a aba clínica
function popularPetsDropdowns() {
    popularTutoresClinicos();
}

// ==========================================================
// SEÇÃO 11: GRÁFICOS (Chart.js)
// ==========================================================

function inicializarGraficos() {
    const ctx1 = document.getElementById('financeChart')?.getContext('2d');

    if (ctx1) {
        if (financeChartRef) financeChartRef.destroy();
        const periodo = document.getElementById('periodo-faturamento')?.value || 'mensal';
        const dados = obterDadosFaturamento(periodo);
        financeChartRef = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: dados.labels,
                datasets: [{
                    label: 'Valor dos atendimentos (R$)',
                    data: dados.valores,
                    borderColor: '#0066ff',
                    backgroundColor: 'rgba(0, 102, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
                }
            }
        });
        atualizarKpiFaturamento(periodo);
    }
}

function somarAtendimentosNoPeriodo(inicio, fim) {
    const inicioISO = dataLocalISO(inicio);
    const fimISO = dataLocalISO(fim);
    return agendamentos
        .filter(a => (a.status === 'confirmado' || a.status === 'concluido') &&
            a.data >= inicioISO && a.data < fimISO)
        .reduce((total, a) => total + Number(a.valor || 0), 0);
}

function obterDadosFaturamento(periodo) {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    let inicioPeriodo;
    let fimPeriodo;
    let inicioAnterior;
    let fimAnterior;
    let quantidade;
    let rotulos;

    if (periodo === 'semanal') {
        inicioPeriodo = new Date(inicio);
        inicioPeriodo.setDate(inicioPeriodo.getDate() - ((inicioPeriodo.getDay() + 6) % 7));
        fimPeriodo = new Date(inicioPeriodo);
        fimPeriodo.setDate(fimPeriodo.getDate() + 7);
        inicioAnterior = new Date(inicioPeriodo);
        inicioAnterior.setDate(inicioAnterior.getDate() - 7);
        fimAnterior = inicioPeriodo;
        quantidade = 7;
        rotulos = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    } else if (periodo === 'anual') {
        inicioPeriodo = new Date(hoje.getFullYear(), 0, 1);
        fimPeriodo = new Date(hoje.getFullYear() + 1, 0, 1);
        inicioAnterior = new Date(hoje.getFullYear() - 1, 0, 1);
        fimAnterior = inicioPeriodo;
        quantidade = 12;
        rotulos = MESES_PT.map(mes => mes.slice(0, 3));
    } else {
        inicioPeriodo = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fimPeriodo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
        inicioAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        fimAnterior = inicioPeriodo;
        quantidade = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
        rotulos = Array.from({ length: quantidade }, (_, dia) => String(dia + 1));
    }

    const valores = Array(quantidade).fill(0);
    agendamentos.forEach(agendamento => {
        if (agendamento.status !== 'confirmado' && agendamento.status !== 'concluido') return;
        const data = new Date(`${agendamento.data}T12:00:00`);
        if (Number.isNaN(data.getTime()) || data < inicioPeriodo || data >= fimPeriodo) return;
        const indice = periodo === 'anual'
            ? data.getMonth()
            : periodo === 'semanal'
                ? (data.getDay() + 6) % 7
                : data.getDate() - 1;
        valores[indice] += Number(agendamento.valor || 0);
    });

    const total = valores.reduce((soma, valor) => soma + valor, 0);
    const anterior = somarAtendimentosNoPeriodo(inicioAnterior, fimAnterior);
    const nota = total === 0 ? 'Nenhum atendimento no período'
        : anterior === 0 ? 'Sem dados no período anterior para comparar'
            : `${((total - anterior) / anterior * 100).toFixed(1)}% vs período anterior`;
    return { labels: rotulos, valores, total, nota };
}

function atualizarKpiFaturamento(periodo) {
    const dados = obterDadosFaturamento(periodo);
    const kpi = document.getElementById('kpi-faturamento');
    if (kpi) kpi.innerText = formatarMoeda(dados.total);
    const nota = document.getElementById('kpi-faturamento-nota');
    if (nota) nota.textContent = dados.nota;
}

// O QUE: Troca o período do gráfico + KPI de faturamento do dashboard.
function atualizarPeriodoFaturamento() {
    const periodo = document.getElementById('periodo-faturamento')?.value || 'mensal';
    const dados = obterDadosFaturamento(periodo);
    if (financeChartRef) {
        financeChartRef.data.labels = dados.labels;
        financeChartRef.data.datasets[0].data = dados.valores;
        financeChartRef.update();
    } else {
        inicializarGraficos();
        return;
    }
    atualizarKpiFaturamento(periodo);
    lucide.createIcons();
}

// ==========================================================
// DASHBOARD POR PERFIL (ROADMAP item 16)
// ==========================================================
// O QUE: Vet não vê receita/faturamento — vê Próxima Consulta + consultas/vacinas do dia.
// PORQUÊ: Dashboard operacional p/ veterinário; financeiro segue só do admin.
// TODO [INTEGRAÇÃO SUPABASE]: filtrar por `vetId` + `data` no backend.
function atualizarDashboardPorPerfil() {
    const ehVet = currentRole === 'veterinario';
    document.getElementById('dash-titulo').innerText = ehVet ? 'Minha Agenda do Dia' : 'Resumo de Atendimentos';
    document.getElementById('dash-subtitulo').innerText = ehVet
        ? 'Próxima consulta e movimento de hoje.'
        : 'Dados carregados do banco. Valores representam agendamentos, não pagamentos.';
    toggleEl('card-faturamento', !ehVet);
    toggleEl('periodo-faturamento', !ehVet);
    toggleEl('grafico-receita-card', !ehVet);
    toggleEl('bloco-vet', ehVet);
    if (ehVet) {
        renderizarProximaConsulta();
        inicializarConsultasChart();
    } else {
        if (consultasChartRef) { consultasChartRef.destroy(); consultasChartRef = null; }
        inicializarGraficos();
    }
    lucide.createIcons();
}

// O QUE: Card da próxima consulta do veterinário logado (data/hora futura, pendente/confirmado).
function renderizarProximaConsulta() {
    const box = document.getElementById('prox-consulta-conteudo');
    if (!box) return;
    const agora = hojeISO() + 'T' + new Date().toTimeString().slice(0, 5);
    const proximos = agendamentos
        .filter(a => (a.vetId || '') === (currentUser && currentUser.id) && (a.status === 'pendente' || a.status === 'confirmado') && String(a.data + 'T' + a.hora) >= agora)
        .sort((x, y) => String(x.data + x.hora).localeCompare(String(y.data + y.hora)));
    if (!proximos.length) {
        box.innerHTML = `<p class='text-xs text-slate-500 italic'>Nenhuma consulta agendada.</p>`;
        return;
    }
    const a = proximos[0];
    const pet = pets.find(p => p.id === a.petId);
    const tutor = tutores.find(t => t.cpf === a.tutorCpf);
    box.innerHTML = `
        <div class='flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800'>
            <div class='space-y-1'>
                <p class='font-bold text-slate-100 text-sm'>${escaparHtml(pet ? pet.nome : 'N/A')} <span class='text-xs text-slate-400 font-semibold'>· ${escaparHtml(a.servico)}${a.vacinaTipo ? ' — ' + escaparHtml(a.vacinaTipo) : ''}</span></p>
                <p class='text-xs text-slate-400'>${escaparHtml(tutor ? tutor.nome : 'N/A')} · ${escaparHtml(a.data)} às ${escaparHtml(a.hora)}</p>
            </div>
            <button onclick="switchTab('agendamentos')" class='px-4 py-2 bg-brand-blue text-xs font-bold text-white rounded-xl shrink-0'>Ver agenda</button>
        </div>
    `;
}

// O QUE: Barras por hora (07–19h) — consultas × vacinações de hoje do veterinário logado.
function inicializarConsultasChart() {
    const ctx = document.getElementById('consultasChart')?.getContext('2d');
    if (!ctx) return;
    const hoje = hojeISO();
    const horas = [];
    for (let h = 7; h <= 19; h++) horas.push(String(h).padStart(2, '0') + 'h');
    const consultas = horas.map(() => 0);
    const vacinas = horas.map(() => 0);
    agendamentos
        .filter(a => (a.vetId || '') === (currentUser && currentUser.id) && a.data === hoje && a.status !== 'cancelado')
        .forEach(a => {
            const h = parseInt(String(a.hora).slice(0, 2), 10);
            if (h >= 7 && h <= 19) {
                if (/vacin/i.test(a.servico)) vacinas[h - 7]++;
                else consultas[h - 7]++;
            }
        });
    if (consultasChartRef) consultasChartRef.destroy();
    consultasChartRef = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: horas,
            datasets: [
                { label: 'Consultas', data: consultas, backgroundColor: '#0066ff' },
                { label: 'Vacinações', data: vacinas, backgroundColor: '#ccff00' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#94a3b8', boxWidth: 12 } } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                y: { beginAtZero: true, ticks: { stepSize: 1, color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

// ==========================================================
// SEÇÃO 12: TEMA CLARO/ESCURO
// ==========================================================

function aplicarTema(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

function temaSistema() {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function inicializarTema() {
    const salvo = localStorage.getItem('dayvet-tema');
    if (salvo) {
        aplicarTema(salvo);
    } else {
        aplicarTema(temaSistema());
        window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function(e) {
            if (!localStorage.getItem('dayvet-tema')) {
                aplicarTema(e.matches ? 'light' : 'dark');
                atualizarIconeTema();
            }
        });
    }
    atualizarIconeTema();
}

function alternarTema() {
    const atual = document.documentElement.getAttribute('data-theme');
    const novo = atual === 'dark' ? 'light' : 'dark';
    localStorage.setItem('dayvet-tema', novo);
    aplicarTema(novo);
    atualizarIconeTema();
    lucide.createIcons();
}

// O QUE: Atualiza ícone sol/lua nos botões de tema (header principal e login).
// PORQUÊ: Dois botões exibem o tema atual — header (pós-login) e login screen.
//   No modo escuro mostra sol (clicar vai para claro); no claro mostra lua (clicar vai para escuro).
function atualizarIconeTema() {
    const tema = document.documentElement.getAttribute('data-theme');
    const novoIcone = tema === 'dark' ? 'sun' : 'moon';

    // Botão do header principal (visível pós-login)
    const btn = document.getElementById('btn-tema');
    if (btn) {
        const icone = btn.querySelector('i');
        if (icone) icone.setAttribute('data-lucide', novoIcone);
    }

    // Botão do login screen (visível antes do login)
    const btnLogin = document.getElementById('btn-tema-login');
    if (btnLogin) {
        const iconeLogin = btnLogin.querySelector('i');
        if (iconeLogin) iconeLogin.setAttribute('data-lucide', novoIcone);
    }
}

// O QUE: Tooltip instantâneo do botão info do login (ROADMAP §1 item 6).
// PORQUÊ: Substitui o title= nativo (delay 1–2s) por exibição imediata via
//   CSS (hover/foco) + toque no mobile e teclado (Enter/Espaço alterna, Esc fecha).
// DEMO (mock): Sem backend; apenas alterna visibilidade do #tooltip-info-login.
function inicializarTooltipInfoLogin() {
    const btn = document.getElementById('btn-info-login');
    const dica = document.getElementById('tooltip-info-login');
    if (!btn || !dica) return;
    const visivel = () => btn.getAttribute('aria-expanded') === 'true';
    const mostrar = (estado) => {
        btn.setAttribute('aria-expanded', estado ? 'true' : 'false');
        dica.classList.toggle('tooltip-visivel', estado);
    };
    btn.addEventListener('click', () => mostrar(!visivel()));
    btn.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') mostrar(false);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && visivel()) mostrar(false);
    });
    document.addEventListener('click', (e) => {
        if (visivel() && !btn.contains(e.target)) mostrar(false);
    });
}

// ==========================================================
// SEÇÃO 13: INICIALIZAÇÃO
// ==========================================================

window.onload = async function() {
    const parametrosAuth = new URLSearchParams(window.location.hash.slice(1));
    inicializarTema();
    aplicarAvisoModoDados();
    inicializarTooltipInfoLogin();
    lucide.createIcons();
    atualizarPermissoesNavegacao();
    inicializarPesquisaMes();
    renderizarAgendamentos();
    renderizarTutores();
    renderizarHistoricoClinico();
    renderizarAnexos();
    renderizarUsuarios();
    inicializarGraficos();
    await restaurarSessaoSupabase();
    if (parametrosAuth.get('type') === 'recovery') {
        abrirEtapaRedefinirSenha();
    }
};
