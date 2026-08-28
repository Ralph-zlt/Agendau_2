// --- BANCO DE DADOS EM MEMÓRIA (MOCKUPS INICIAIS COM CONTAS E SENHAS) ---
        // Administradores e Tutores possuem senhas para simular primeiro acesso
        let administradores = [
            { id: "admin1", nome: "Dr. Douglas Ferreira", cpf: "111.111.111-11", profissao: "veterinario", crm: "CRM-SP 45678", crmValidade: "2029-10-12", senha: "admin" },
            { id: "admin2", nome: "Laís Oliveira", cpf: "222.222.222-22", profissao: "groomer", crm: "", crmValidade: "", senha: "admin" }
        ];

        let tutores = [
            { id: "1", nome: "Douglas Silva Ferreira", tel: "(11) 98765-4321", cpf: "111.222.333-44", email: "douglas.ferreira@agendau.com", endereco: "Rua do Pet, 120 - Pilar do Sul", senha: "123" },
            { id: "2", nome: "Laís Vieira de Oliveira", tel: "(11) 97777-8888", cpf: "222.333.444-55", email: "lais.oliveira@agendau.com", endereco: "Av. Veterinária, 350 - Pilar do Sul", senha: "123" }
        ];

        let pets = [
            { id: "101", tutorId: "1", nome: "Rex", especie: "Cachorro", raca: "Golden Retriever", comportamento: "Muito dócil, mas ansioso com barulho intenso de secador.", alergias: "Nenhuma registrada." },
            { id: "102", tutorId: "2", nome: "Mingau", especie: "Gato", raca: "Persa", comportamento: "Muito dócil, preguiçoso e amigável.", alergias: "Sensibilidade a xampus perfumados." }
        ];

        let agendamentos = [
            { id: "201", petId: "101", tutorId: "1", servico: "Consulta Veterinária", data: "2026-05-18", hora: "09:30", valor: 150.00, status: "confirmado" },
            { id: "202", petId: "102", tutorId: "2", servico: "Atendimento", data: "2026-05-18", hora: "14:00", valor: 90.00, status: "confirmado" },
            { id: "203", petId: "101", tutorId: "1", servico: "Atendimento", data: "2026-05-17", hora: "10:00", valor: 110.00, status: "confirmado" },
            { id: "204", petId: "102", tutorId: "2", servico: "Consulta Veterinária", data: "2026-05-19", hora: "11:00", valor: 150.00, status: "pendente" }
        ];

        let produtos = [
            { id: "301", nome: "Dipirona Veterinária Gotas", categoria: "Medicamento", estoque: 15, preco: 35.00 },
            { id: "302", nome: "Shampoo Hipoalergênico Pet 1L", categoria: "Shampoo/Estética", estoque: 8, preco: 65.00 },
            { id: "303", nome: "Coleira Antipulgas Frontline", categoria: "Acessório", estoque: 22, preco: 89.90 },
            { id: "304", nome: "Vacina V10 Imunizante", categoria: "Vacina", estoque: 30, preco: 120.00 }
        ];

        let historicoClinico = [
            { id: "401", petId: "101", tipo: "vacina", data: "2026-05-10", detalhe: "Vacina V10 aplicada com sucesso. Lote: AB203. Vencimento: 2027-12-10." },
            { id: "402", petId: "102", tipo: "receita", data: "2026-05-12", detalhe: "Prescrição: Dipirona Gotas (1 gota por kg a cada 12 horas por 3 dias)." }
        ];

        // Usuários mock para popular a tela de Gerenciamento de Contas
        // TODO [Integração DB]: Remover este array e carregar via API: GET /api/usuarios
        let usuariosMock = [
            { id: 'u1', nome: 'Dr. Douglas Ferreira', role: 'admin', cpf: '111.111.111-11' },
            { id: 'u2', nome: 'Laís Oliveira', role: 'gestor', cpf: '222.222.222-22' },
            { id: 'u3', nome: 'Marcos Silva', role: 'veterinario', cpf: '222.333.444-55' }
        ];

        function formatarCargo(role) {
            const labels = {
                admin: 'Administrador',
                gestor: 'Gestor',
                veterinario: 'Veterinário',
                funcionario: 'Funcionário',
                tutor: 'Tutor'
            };
            return labels[role] || (role || 'Usuário');
        }

        // --- CONTROLE DE SESSÃO DO USUÁRIO ---
        let currentUser = null; // Guardará o objeto do usuário ativo
        // Perfis de usuário (protótipo de mapeamento numérico):
        // 1 = Administrador (admin) - acesso total
        // 2 = Veterinário (veterinario) - acesso clínico reduzido
        // 3 = Gestor (gestor) - acesso a relatórios e financeiro
        // 4 = Funcionário (funcionario) - acesso operacional (banho & tosa)
        // Observação: para este protótipo os CPFs de teste (1,2,3,4) já aparecem
        // no bloco `perfisTestes` utilizado na tela de login.
        // Guia de integração com banco de dados (resumo técnico):
        // - Backend: criar tabela `users` com campos: id, nome, cpf, email,
        //   senhaHash, role, profissao, crm, crmValidade, etc.
        // - Autenticação: endpoint `POST /api/login` (body { cpf, senha })
        //   que valida credenciais, retorna token JWT e objeto do usuário.
        // - Sessão no frontend: armazenar token e buscar `GET /api/me` para
        //   popular `currentUser` e `currentRole` (server-side authoritative).
        // - Autorização: definir permissões no backend por `role` e sempre
        //   validar no servidor; frontend aplica apenas restrições visuais.
        // - Para relacionamentos (pets, agendamentos, produtos) usar APIs
        //   REST/GraphQL: e.g. `GET /api/pets?tutorId=...`, `GET /api/agendamentos`.
        // - Migração do protótipo: substituir os arrays em memória por chamadas
        //   às APIs e remover dados mock quando backend estiver disponível.
        // Valor inicial para prototipação (mudar para recuperar do servidor):
        let currentRole = 'admin'; // valores: 'admin','veterinario','gestor','funcionario'

        let configRestricao = "comercial"; // comercial ou livre
        let filtroAgendamentosStatus = "todos";
        let periodoFaturamento = "mensal";

        // Referências Globais de Charts
        let financeChartRef = null;
        let topProductsChartRef = null;

        // --- SISTEMA DE TOASTS ---
        function showToast(mensagem, tipo = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            
            let bgClass = "bg-slate-900 border-slate-800 text-slate-100";
            let icon = '<i data-lucide="check-circle-2" class="w-5 h-5 text-brand-lime"></i>';
            if (tipo === 'error') {
                bgClass = "bg-red-950 border-red-800 text-red-100";
                icon = '<i data-lucide="alert-triangle" class="w-5 h-5 text-brand-pink"></i>';
            }

            toast.className = "flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl pointer-events-auto transition-all duration-300 transform translate-y-5 opacity-0 " + bgClass;
            toast.innerHTML = icon + " <span class='text-sm font-semibold'>" + mensagem + "</span>";
            
            container.appendChild(toast);
            lucide.createIcons();

            setTimeout(() => {
                toast.classList.remove('translate-y-5', 'opacity-0');
            }, 10);

            setTimeout(() => {
                toast.classList.add('translate-y-5', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        }

        // --- FLUXO DE SELEÇÃO DE PERFIL DE LOGIN ---
        function selectLoginProfile(profile) {
            currentRole = profile;
            const btnAdmin = document.getElementById('btn-login-admin');
            const btnTutor = document.getElementById('btn-login-tutor');
            const adminGroup = document.getElementById('admin-class-group');
            const tutorFirstAccess = document.getElementById('tutor-first-access-fields');

            // Resetar formulários de primeiro acesso na troca
            tutorFirstAccess.classList.add('hidden');

            if (profile === 'admin') {
                btnAdmin.className = "py-2.5 rounded-lg text-xs font-bold transition-all bg-brand-blue text-white shadow-lg";
                btnTutor.className = "py-2.5 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white";
                adminGroup.classList.remove('hidden');
            } else {
                btnTutor.className = "py-2.5 rounded-lg text-xs font-bold transition-all bg-brand-blue text-white shadow-lg";
                btnAdmin.className = "py-2.5 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white";
                adminGroup.classList.add('hidden');
            }
        }

        function toggleCrmRequirement() {
            const crmFields = document.getElementById('crm-fields');
            const selectedJob = document.querySelector('input[name="admin-job"]:checked').value;
            
            if (selectedJob === 'veterinario') {
                crmFields.classList.remove('hidden');
                document.getElementById('admin-crm').setAttribute('required', 'true');
            } else {
                crmFields.classList.add('hidden');
                document.getElementById('admin-crm').removeAttribute('required');
            }
        }

        
        // --- SUBMIT DA TELA DE LOGIN (MODO PROTÓTIPO) ---
        function handleAuthSubmit(e) {
            e.preventDefault();
            const cpf = document.getElementById('login-cpf').value.trim();

            // Mapeamento de perfis de teste (Qualquer senha será aceita)
            const perfisTestes = {
                "1": { id: "1", nome: "Admin Geral", role: "admin", profissao: "admin" },
                "111": { id: "1", nome: "Admin Geral", role: "admin", profissao: "admin" },
        
             "2": { id: "2", nome: "Dr. Carlos (Veterinário)", role: "veterinario", profissao: "veterinario", crm: "CRM-SP 12345" },
                "222": { id: "2", nome: "Dr. Carlos (Veterinário)", role: "veterinario", profissao: "veterinario", crm: "CRM-SP 12345" },
        
                "3": { id: "3", nome: "Mariana (Gestora)", role: "gestor", profissao: "gestor" },
                "333": { id: "3", nome: "Mariana (Gestora)", role: "gestor", profissao: "gestor" },
        
             "4": { id: "4", nome: "Lucas (Funcionário)", role: "funcionario", profissao: "groomer" },
                "444": { id: "4", nome: "Lucas (Funcionário)", role: "funcionario", profissao: "groomer" }
            };

            let userObj = perfisTestes[cpf];

            if (userObj) {
                realizarLogin(userObj, userObj.role);
            } else {
                showToast("Use os CPFs de teste: 1 (Admin), 2 (Vet), 3 (Gestor) ou 4 (Funcionário)", "info");
            }
        }
        function realizarLogin(userObj, role) {
            currentUser = userObj;
            currentRole = role;
            localStorage.setItem('userRole', role); // Salvar role no localStorage para uso posterior

            // Esconde a tela de login
            document.getElementById('login-screen').classList.add('hidden');
            
            // Atualiza nome no cabeçalho
            document.getElementById('current-user-name').innerText = userObj.nome;
            document.getElementById('header-user-name').innerText = userObj.nome;
            // Atualiza profissão no cabeçalho (ex.: Profissão: Veterinário)
            try {
                const headerProf = document.getElementById('header-user-role');
                if (headerProf) {
                    let prof = userObj.profissao || userObj.role || '';
                    // Normalizar termo (ex.: 'veterinario' -> 'Veterinário')
                    prof = prof.toString();
                    prof = prof.charAt(0).toUpperCase() + prof.slice(1);
                    headerProf.innerText = 'Profissão: ' + prof;
                }
            } catch (e) { /* ignore */ }

            // Oculta todos os blocos de permissão para resetar a tela
            document.querySelectorAll('.admin-only, .admin-gestor-only, .vet-only, .gestor-only, .func-only').forEach(el => el.classList.add('hidden'));

            // Definir quais abas / navegações ficam visíveis por papel
            const roleTabs = {
                // Admin reduzido: não mostrar abas de produtos e abas de tutor/tutor-only
                admin: ['dashboard','agendamentos','clientes','clinica','usuarios','historico-tutor'],
                // Veterinário agora tem acesso a Dashboard, Agendamentos, Módulo Clínico e Histórico dos Pets
                veterinario: ['dashboard','agendamentos','clinica','historico-tutor'],
                // Gestor: Dashboard, Agendamentos, Clientes, Usuários, Serviços, Dados Agro, Relatórios
                gestor: ['dashboard','agendamentos','clientes','usuarios','servicos','dados-agro','historico-tutor'],
                funcionario: ['dashboard','banho-tosa','agendamentos']
            };

            // Oculta todos os botões de navegação e mostra apenas os permitidos
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.add('hidden'));
            const allowed = roleTabs[role] || ['dashboard'];
            allowed.forEach(tab => {
                const btn = document.getElementById('nav-' + tab);
                if (btn) btn.classList.remove('hidden');
            });

            // Configuração de regras por perfil - visuais e permissões locais (protótipo)
            if (role === 'admin' || role === 'gestor') {
                document.querySelectorAll('.admin-gestor-only').forEach(el => el.classList.remove('hidden'));
            }

            if (role === 'admin') {
                document.getElementById('current-user-role-label').innerText = "Administrador";
                document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
                switchTab(allowed[0] || 'dashboard');
            } 
            else if (role === 'veterinario') {
                document.getElementById('current-user-role-label').innerText = "Veterinário";
                // Mostrar somente blocos específicos para veterinário
                document.querySelectorAll('.vet-only').forEach(el => el.classList.remove('hidden'));
                switchTab(allowed[0] || 'clinica'); // abrir a aba principal do veterinário
            } 
            else if (role === 'gestor') {
                document.getElementById('current-user-role-label').innerText = "Gestor";
                document.querySelectorAll('.gestor-only').forEach(el => el.classList.remove('hidden'));
                // Mostrar relatório do gestor (não do tutor)
                aplicarPermissaoGestor();
                switchTab(allowed[0] || 'dashboard');
            } 
            else if (role === 'funcionario') {
                document.getElementById('current-user-role-label').innerText = "Funcionário";
                document.querySelectorAll('.func-only').forEach(el => el.classList.remove('hidden'));
                switchTab(allowed[0] || 'meus-pets');
            }

            showToast("Acesso autorizado como " + userObj.nome);
            // Aplicar ajustes de visibilidade específicos por papel (protótipo)
            aplicarVisibilidadePorRole();
            // Ajustar visibilidade de campos clínicos conforme profissão (CRM)
            ajustarModuloClinicoProfissao();
        }

        // Ajustes finos de visibilidade por perfil para remover elementos não pertinentes
        // Veterinário deve ver apenas o módulo clínico e informações clínicas, sem KPIs comerciais
        function aplicarVisibilidadePorRole() {
            try {
                if (currentRole === 'veterinario') {
                    // Esconder itens de navegação administrativos
                    const hideNav = ['nav-clientes', 'nav-produtos'];
                    hideNav.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.classList.add('hidden');
                    });

                    // Esconder KPIs comerciais (Volume de Vendas, Produtos Cadastrados)

                    // Esconder somente os cards específicos (mais seguros que subir muitos níveis)
                    const vendaEl = document.getElementById('kpi-vendas');
                    if (vendaEl) {
                        const card = vendaEl.closest('.rounded-xl') || vendaEl.parentElement.parentElement;
                        if (card) card.classList.add('hidden');
                    }

                    const prodEl = document.getElementById('kpi-produtos-count');
                    if (prodEl) {
                        const card = prodEl.closest('.rounded-xl') || prodEl.parentElement.parentElement;
                        if (card) card.classList.add('hidden');
                    }

                    // Esconder painel de produtos mais utilizados (gráfico)
                    const topProductsCard = document.getElementById('topProductsChart');
                    if (topProductsCard) {
                        const card = topProductsCard.closest('.rounded-xl') || topProductsCard.closest('div');
                        if (card) card.classList.add('hidden');
                    }

                    // Esconder o banner de relatório de vendas (opcional para veterinário)
                    const h3s = Array.from(document.getElementsByTagName('h3'));
                    const relBanner = h3s.find(h => h.innerText && h.innerText.includes('Relatório de Desempenho Operacional'));
                    if (relBanner && relBanner.closest('div')) {
                        relBanner.closest('div').classList.add('hidden');
                    }
                    // Ajustar título/subtítulo do módulo clínico para veterinário
                    const clinicaHeader = document.querySelector('#tab-clinica h3');
                    if (clinicaHeader) clinicaHeader.innerText = 'Atendimento Clínico Veterinário';
                    const clinicaP = document.querySelector('#tab-clinica p');
                    if (clinicaP) clinicaP.innerText = 'Registro de imunização, emissão de receitas e registro de exames para pacientes.';
                } else {
                    // Restaurar visibilidade para outros perfis (simplesmente remove a classe 'hidden')
                    const showNav = ['nav-clientes', 'nav-produtos'];
                    showNav.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) el.classList.remove('hidden');
                    });

                    const vendaEl = document.getElementById('kpi-vendas');
                    if (vendaEl) {
                        const card = vendaEl.closest('.rounded-xl') || vendaEl.parentElement.parentElement;
                        if (card) card.classList.remove('hidden');
                    }

                    const prodEl = document.getElementById('kpi-produtos-count');
                    if (prodEl) {
                        const card = prodEl.closest('.rounded-xl') || prodEl.parentElement.parentElement;
                        if (card) card.classList.remove('hidden');
                    }

                    const topProductsCard = document.getElementById('topProductsChart');
                    if (topProductsCard) {
                        const card = topProductsCard.closest('.rounded-xl') || topProductsCard.closest('div');
                        if (card) card.classList.remove('hidden');
                    }

                    const h3s = Array.from(document.getElementsByTagName('h3'));
                    const relBanner = h3s.find(h => h.innerText && h.innerText.includes('Relatório de Desempenho Operacional'));
                    if (relBanner && relBanner.closest('div')) {
                        relBanner.closest('div').classList.remove('hidden');
                    }
                    // Restaurar título padrão do módulo clínico
                    const clinicaHeader = document.querySelector('#tab-clinica h3');
                    if (clinicaHeader) clinicaHeader.innerText = 'Módulo Clínico (Acesso Restrito)';
                    const clinicaP = document.querySelector('#tab-clinica p');
                    if (clinicaP) clinicaP.innerText = 'Registro de imunização por vacina, emissão eletrônica de receitas e registro de exames / laudos de animais cadastrados.';
                }
            } catch (err) {
                console.warn('Erro aplicando visibilidade por role:', err);
            }
        }
    
        /*
         * Exemplo de função para integrar com backend e usar o atributo `role`
         * retornado pelo servidor. Mantém a lógica visual, mas assume autoridade
         * do backend para autenticação/autorização real.
         * TODO [Integração DB]: substituir chamadas mock por fetch/axios para
         * endpoints autenticados (POST /api/login, GET /api/me, GET /api/usuarios ...)
         */
        function renderUsuarios() {
            const tbody = document.getElementById('usuarios-table-body');
            if (!tbody) return;
            tbody.innerHTML = '';
            usuariosMock.forEach(u => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-800/50 transition-colors';
                tr.dataset.userid = u.id;
                tr.innerHTML = `
                    <td class="py-3 px-6">${escapeHtml(u.nome)}</td>
                    <td class="py-3 px-6">${escapeHtml(formatarCargo(u.role))}</td>
                    <td class="py-3 px-6">${escapeHtml(u.cpf)}</td>
                    <td class="py-3 px-6">
                        <div class="flex items-center justify-end gap-2">
                            <button onclick="abrirModalEditarUsuario('${u.id}')" class="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-850 text-slate-300 rounded-md">Editar</button>
                            <button onclick="abrirModalConfirmDeleteUsuario('${u.id}','${escapeJsString(u.nome)}')" class="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-850 text-slate-300 rounded-md">Excluir</button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        function aplicarPermissoesInterface(role) {
            // 1. Reset: Oculta tudo por padrão para segurança visual
            document.querySelectorAll('.admin-only, .tutor-only, .admin-gestor-only, .gestor-only, .vet-only, .func-only').forEach(el => {
                el.classList.add('hidden');
                el.style.display = 'none';
            });

            // 2. Libera acesso baseado no atributo 'role' da entidade do Banco de Dados
            if (role === 'admin' || role === 'gestor') {
                document.querySelectorAll('.admin-gestor-only').forEach(el => {
                    el.classList.remove('hidden');
                    el.style.display = '';
                });
                renderUsuarios();
            }
        
            if (role === 'admin') {
                document.querySelectorAll('.admin-only').forEach(el => {
                    el.classList.remove('hidden');
                    el.style.display = '';
                });
            }
        
            if (role === 'veterinario') {
                document.querySelectorAll('.vet-only').forEach(el => el.classList.remove('hidden'));
            }

            // Mostrar aba de histórico do tutor (exames) para todos os usuários profissionais
            if (role === 'admin' || role === 'veterinario' || role === 'gestor') {
                document.querySelectorAll('.tutor-only').forEach(el => {
                    el.classList.remove('hidden');
                    el.style.display = '';
                });
            }
        }
        
        function handleLogout() {
            currentUser = null;
            document.getElementById('login-cpf').value = '';
            document.getElementById('login-password').value = '';
            document.getElementById('tutor-first-access-fields').classList.add('hidden');
            document.getElementById('login-screen').classList.remove('hidden');
            // Reset cabeçalho
            const headerProf = document.getElementById('header-user-role');
            if (headerProf) headerProf.innerText = 'Profissão: -';
            document.getElementById('header-user-name').innerText = 'Carregando...';
            showToast("Você saiu do sistema de agendamento.");
        }

        // Bloquear/liberar ações conforme as regras de profissional
        function ajustarModuloClinicoProfissao() {
            const blockingMsg = document.getElementById('crm-blocking-message');
            const clinicalForm = document.getElementById('clinica-allowed-content');

            if (currentUser && currentUser.profissao === 'groomer') {
                blockingMsg.classList.remove('hidden');
                clinicalForm.classList.add('hidden');
            } else {
                blockingMsg.classList.add('hidden');
                clinicalForm.classList.remove('hidden');
            }
        }

        // --- SISTEMA DE INICIALIZAÇÃO E ABAS ---
        window.onload = function() {
            lucide.createIcons();
            atualizarRestricaoHorariaVisual();
            popularTutorDropdowns();
            renderizarEstoque();
            renderizarAgendamentos();
            renderizarTutores();
            renderizarHistoricoClinico();
            aplicarVisibilidadePorRole();
            ajustarModuloClinicoProfissao();
        };

        function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.classList.remove('bg-slate-900', 'text-white');
                btn.classList.add('text-slate-400');
            });

            document.getElementById("tab-" + tabId).classList.remove('hidden');
            const activeBtn = document.getElementById("nav-" + tabId);
            if (activeBtn) {
                activeBtn.classList.add('bg-slate-900', 'text-white');
                activeBtn.classList.remove('text-slate-400');
            }

            // Ajuste do título da página
            const titulos = {
                'dashboard': 'Dashboards & Finanças',
                'agendamentos': 'Controle de Agendamentos',
                'clientes': 'Tutores & Pets Cadastrados',
                'meus-pets': 'Meus Animais de Estimação',
                'historico-tutor': 'Histórico Médico e de Vacinas',
                'clinica': 'Atendimento Clínico Veterinário',
                'banho-tosa': 'Painel de Banho & Tosa',
                'produtos': 'Controle de Estoque & Insumos'
            };
            document.getElementById('page-title').innerText = titulos[tabId] || 'Agend-Au';

            // Comportamentos e atualizações de dados sob demanda
            if (tabId === 'dashboard') {
                atualizarKPIs();
                inicializarGraficos();
            } else if (tabId === 'meus-pets') {
                renderizarMeusPetsTutor();
            } else if (tabId === 'historico-tutor') {
                renderizarHistoricoExclusivoTutor();
            } else if (tabId === 'agendamentos') {
                renderizarAgendamentos();
            }
        }

        // --- MÓDULO CONFIGURAÇÕES (RESTRIÇÃO DE HORÁRIOS) ---
        function alterarRestricaoHoraria() {
            configRestricao = document.getElementById('config-horario').value;
            atualizarRestricaoHorariaVisual();
            showToast("Configuração atualizada: Restrição em horário " + (configRestricao === 'comercial' ? 'Comercial (08h às 18h)' : 'Livre (24h)') + ".");
        }

        function atualizarRestricaoHorariaVisual() {
            const ping = document.getElementById('status-ping');
            const dot = document.getElementById('status-dot');
            if (configRestricao === 'comercial') {
                ping.className = "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-brand-lime";
                dot.className = "relative inline-flex rounded-full h-2 w-2 bg-brand-lime";
            } else {
                ping.className = "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-brand-pink";
                dot.className = "relative inline-flex rounded-full h-2 w-2 bg-brand-pink";
            }
        }

        // --- DROPDOWNS E CADASTROS ---
        function abrirModalTutor() { document.getElementById('modal-tutor').classList.remove('hidden'); }
        function fecharModalTutor() { document.getElementById('modal-tutor').classList.add('hidden'); }
        
        function abrirModalPet() { 
            document.getElementById('modal-pet').classList.remove('hidden'); 
            
            // Caso seja tutor logado, já amarra no próprio ID
            const selectionWrapper = document.getElementById('pet-tutor-selection-wrapper');
            if (currentRole === 'tutor') {
                selectionWrapper.classList.add('hidden');
            } else {
                selectionWrapper.classList.remove('hidden');
                popularTutorDropdowns();
            }
        }
        function fecharModalPet() { document.getElementById('modal-pet').classList.add('hidden'); }

        function popularTutorDropdowns() {
            const selectPetTutor = document.getElementById('pet-tutor-select');
            const selectAgendTutor = document.getElementById('agend-tutor-select');
            
            let options = '<option value="">Selecione um Tutor...</option>';
            tutores.forEach(t => {
                options += "<option value='" + t.id + "'>" + t.nome + "</option>";
            });

            if (selectPetTutor) selectPetTutor.innerHTML = options;
            if (selectAgendTutor) selectAgendTutor.innerHTML = options;
        }

        function salvarTutor(e) {
            e.preventDefault();
            const nome = document.getElementById('tutor-nome').value;
            const tel = document.getElementById('tutor-tel').value;
            const cpf = document.getElementById('tutor-cpf').value;
            const email = document.getElementById('tutor-email').value;
            const endereco = document.getElementById('tutor-endereco').value;

            const novo = {
                id: (tutores.length + 1).toString(),
                nome: nome, tel: tel, cpf: cpf, email: email, endereco: endereco, senha: "123"
            };

            tutores.push(novo);
            fecharModalTutor();
            document.getElementById('tutor-nome').value = '';
            document.getElementById('tutor-tel').value = '';
            document.getElementById('tutor-cpf').value = '';
            document.getElementById('tutor-email').value = '';
            document.getElementById('tutor-endereco').value = '';

            renderizarTutores();
            popularTutorDropdowns();
            showToast("Tutor " + nome + " cadastrado com sucesso!");
        }

        function salvarPet(e) {
            e.preventDefault();
            let tutorId = "";
            
            if (currentRole === 'tutor') {
                tutorId = currentUser.id;
            } else {
                tutorId = document.getElementById('pet-tutor-select').value;
            }

            const nome = document.getElementById('pet-nome').value;
            const especie = document.getElementById('pet-especie').value;
            const raca = document.getElementById('pet-raca').value;
            const comportamento = document.getElementById('pet-comportamento').value;
            const alergias = document.getElementById('pet-alergias').value;

            if (!tutorId) {
                showToast("Selecione um tutor válido!", "error");
                return;
            }

            // Cada pet terá um ID exclusivo incremental
            const novo = {
                id: (pets.length + 101).toString(),
                tutorId: tutorId, nome: nome, especie: especie, raca: raca, comportamento: comportamento, alergias: alergias
            };

            pets.push(novo);
            fecharModalPet();
            document.getElementById('pet-nome').value = '';
            document.getElementById('pet-comportamento').value = '';
            document.getElementById('pet-alergias').value = '';

            renderizarTutores();
            renderizarMeusPetsTutor();
            renderizarHistoricoClinico();
            renderizarHistoricoExclusivoTutor();
            
            showToast("Pet " + nome + " (ID: " + novo.id + ") cadastrado com sucesso!");
        }

        function renderizarTutores() {
            const grid = document.getElementById('tutores-grid');
            if (!grid) return;
            grid.innerHTML = '';

            tutores.forEach(t => {
                const petsDoTutor = pets.filter(p => p.tutorId === t.id);
                let petsHTML = '';

                if (petsDoTutor.length === 0) {
                    petsHTML = "<div class='text-xs text-slate-400 italic'>Nenhum pet de estimação vinculado.</div>";
                } else {
                    petsDoTutor.forEach(p => {
                        petsHTML += "<div class='bg-slate-950 border border-slate-800 p-3.5 rounded-xl hover:shadow-sm transition-all space-y-1.5'>" +
                                "<div class='flex items-center justify-between'>" +
                                    "<span class='text-xs font-black uppercase text-brand-lime tracking-wide'>" + p.especie + "</span>" +
                                    "<span class='text-[10px] bg-slate-800 text-brand-lime px-1.5 py-0.5 rounded font-mono font-bold'>ID: " + p.id + "</span>" +
                                "</div>" +
                                "<h5 class='font-bold text-slate-100 text-sm flex items-center gap-1.5'>" +
                                    "<i data-lucide='paw-print' class='w-4 h-4 text-brand-lime'></i> " + p.nome + "" +
                                "</h5>" +
                                "<p class='text-[11px] text-slate-400 font-semibold'>" + p.raca + "</p>" +
                                "<div class='text-xs text-slate-300 bg-slate-900 p-2 rounded-lg border border-slate-800'>" +
                                    "<strong>Comportamento:</strong> " + (p.comportamento || 'Sem registros') + "" +
                                "</div>" +
                                "<div class='text-xs text-slate-300 bg-slate-900 p-2 rounded-lg border border-slate-800'>" +
                                    "<strong>Alergias:</strong> " + (p.alergias || 'Nenhuma alergia relatada') + "" +
                                "</div>" +
                            "</div>";
                    });
                }

                grid.innerHTML += "<div class='bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden flex flex-col md:flex-row'>" +
                        "<div class='p-5 md:w-2/5 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/40 flex flex-col justify-between'>" +
                            "<div class='space-y-3'>" +
                                "<div class='flex items-center gap-2'>" +
                                    "<div class='w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold'>" +
                                        t.nome.substring(0, 2).toUpperCase() +
                                    "</div>" +
                                    "<div>" +
                                        "<h4 class='font-bold text-slate-100 text-sm leading-tight'>" + t.nome + "</h4>" +
                                        "<span class='text-xs text-slate-400'>CPF: " + t.cpf + "</span>" +
                                    "</div>" +
                                "</div>" +
                                "<div class='space-y-1 text-xs text-slate-400'>" +
                                    "<p class='flex items-center gap-1.5'><i data-lucide='phone' class='w-3.5 h-3.5 text-brand-blue'></i> " + t.tel + "</p>" +
                                    "<p class='flex items-center gap-1.5'><i data-lucide='mail' class='w-3.5 h-3.5 text-brand-pink'></i> " + t.email + "</p>" +
                                    "<p class='flex items-center gap-1.5'><i data-lucide='map-pin' class='w-3.5 h-3.5 text-brand-purple'></i> " + t.endereco + "</p>" +
                                "</div>" +
                            "</div>" +
                            "<button onclick=\"removerTutor('" + t.id + "')\" class='text-brand-pink hover:opacity-80 text-xs font-bold mt-4 flex items-center gap-1'>" +
                                "<i data-lucide='trash' class='w-3.5 h-3.5'></i> Excluir Tutor" +
                            "</button>Grid" +
                        "</div>" +
                        "<div class='p-5 md:w-3/5 flex-1 space-y-4'>" +
                            "<div class='flex items-center justify-between'>" +
                                "<h4 class='text-xs font-black uppercase text-slate-400 tracking-wider'>Pets Vinculados</h4>" +
                                "<span class='bg-brand-purple/10 text-brand-lime border border-brand-purple/20 text-xs font-bold px-2 py-0.5 rounded-full'>" + petsDoTutor.length + " pets</span>" +
                            "</div>" +
                            "<div class='space-y-3 overflow-y-auto max-h-[190px] pr-1 custom-scrollbar'>" +
                                petsHTML +
                            "</div>" +
                        "</div>" +
                    "</div>";
            });
            lucide.createIcons();
        }

        // Renderiza apenas os pets de quem está logado como tutor
        function renderizarMeusPetsTutor() {
            const grid = document.getElementById('meus-pets-grid');
            if (!grid) return;
            grid.innerHTML = '';

            if (currentRole !== 'tutor' || !currentUser) return;

            const meusPets = pets.filter(p => p.tutorId === currentUser.id);

            if (meusPets.length === 0) {
                grid.innerHTML = "<div class='col-span-full bg-slate-900 border border-slate-800 p-8 text-center rounded-2xl space-y-3'>" +
                        "<i data-lucide='smile' class='w-12 h-12 text-brand-lime mx-auto'></i>" +
                        "<h4 class='font-bold text-slate-100'>Você ainda não cadastrou pets!</h4>" +
                        "<p class='text-xs text-slate-400'>Cadastre seus companheiros clicando no botão de cadastro de pets acima.</p>" +
                    "</div>";
                return;
            }

            meusPets.forEach(p => {
                grid.innerHTML += "<div class='bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-sm hover:shadow-md transition-all relative'>" +
                        "<div class='flex items-center justify-between'>" +
                            "<span class='text-xs font-black uppercase text-brand-lime tracking-wide'>" + p.especie + "</span>" +
                            "<span class='text-xs font-mono font-bold bg-slate-950 px-2 py-0.5 rounded text-brand-lime border border-slate-800'>ID: " + p.id + "</span>" +
                        "</div>" +
                        "<div>" +
                            "<h4 class='font-black text-slate-100 text-lg flex items-center gap-1.5'>" +
                                "<i data-lucide='paw-print' class='w-5 h-5 text-brand-pink'></i> " + p.nome + "" +
                            "</h4>" +
                            "<p class='text-xs text-slate-400 mt-1 font-semibold'>" + p.raca + "</p>" +
                        "</div>" +
                        "<div class='space-y-2'>" +
                            "<div class='text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800'>" +
                                "<strong class='text-brand-lime'>Comportamento do Pet:</strong>" +
                                "<p class='mt-0.5'>" + (p.comportamento || 'Sem observações cadastradas.') + "</p>" +
                            "</div>" +
                            "<div class='text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800'>" +
                                "<strong class='text-brand-pink'>Possíveis Alergias:</strong>" +
                                "<p class='mt-0.5'>" + (p.alergias || 'Nenhuma alergia ou contraindicação.') + "</p>" +
                            "</div>" +
                        "</div>" +
                    "</div>";
            });
            lucide.createIcons();
        }

        function removerTutor(id) {
            tutores = tutores.filter(t => t.id !== id);
            pets = pets.filter(p => p.tutorId !== id); // Remove em cascata
            renderizarTutores();
            popularTutorDropdowns();
            renderizarHistoricoClinico();
            atualizarKPIs();
            showToast("Tutor e seus animais de estimação foram removidos!");
        }

        // --- SOLICITAÇÃO E CONFIRMAÇÃO DE AGENDAMENTOS ---
        function abrirModalAgendamento() {
            document.getElementById('modal-agendamento').classList.remove('hidden');
            
            const tutorWrapper = document.getElementById('agend-tutor-wrapper');
            const selectPet = document.getElementById('agend-pet-select');
            
            if (currentRole === 'tutor') {
                // Tutor logado não precisa selecionar outro tutor
                tutorWrapper.classList.add('hidden');
                
                // Popula os pets direto do tutor logado
                let options = '<option value="">Selecione o Pet...</option>';
                const meusPets = pets.filter(p => p.tutorId === currentUser.id);
                meusPets.forEach(p => {
                    options += "<option value='" + p.id + "'>" + p.nome + "</option>";
                });
                selectPet.innerHTML = options;
            } else {
                tutorWrapper.classList.remove('hidden');
                popularTutorDropdowns();
            }
        }
        
        function fecharModalAgendamento() {
            document.getElementById('modal-agendamento').classList.add('hidden');
        }

        function popularPetsDoTutor() {
            const tutorId = document.getElementById('agend-tutor-select').value;
            const selectPet = document.getElementById('agend-pet-select');
            
            let options = '<option value="">Selecione o Pet...</option>';
            if (tutorId) {
                const petsDoTutor = pets.filter(p => p.tutorId === tutorId);
                petsDoTutor.forEach(p => {
                    options += "<option value='" + p.id + "'>" + p.nome + "</option>";
                });
            }
            selectPet.innerHTML = options;
        }

        function salvarAgendamento(e) {
            e.preventDefault();
            
            let tutorId = "";
            if (currentRole === 'tutor') {
                tutorId = currentUser.id;
            } else {
                tutorId = document.getElementById('agend-tutor-select').value;
            }

            const petId = document.getElementById('agend-pet-select').value;
            const servico = document.getElementById('agend-tipo').value;
            const valor = parseFloat(document.getElementById('agend-valor').value);
            const data = document.getElementById('agend-data').value;
            const hora = document.getElementById('agend-hora').value;

            // Validação de Restrição Horária (Comercial 08:00 às 18:00)
            if (configRestricao === "comercial") {
                const h = parseInt(hora.split(':')[0]);
                if (h < 8 || h >= 18) {
                    showToast("Agendamento fora do Horário Comercial (08h às 18h)! Modifique o horário ou altere as regras de restrição.", "error");
                    return;
                }
            }

            // Agendamento cadastrado por Tutor entra como "pendente". Cadastrado por Admin já entra como "confirmado".
            const statusInicial = (currentRole === 'admin') ? 'confirmado' : 'pendente';

            const novo = {
                id: (agendamentos.length + 201).toString(),
                tutorId: tutorId, petId: petId, servico: servico, data: data, hora: hora, valor: valor,
                status: statusInicial
            };

            agendamentos.push(novo);
            fecharModalAgendamento();
            renderizarAgendamentos();
            atualizarKPIs();
            
            if (currentRole === 'tutor') {
                showToast("Sua solicitação foi enviada! Aguardando confirmação do administrador.");
            } else {
                showToast("Novo agendamento confirmado e inserido no sistema.");
            }
        }

        function filtrarAgendamentos(status) {
            filtroAgendamentosStatus = status;
            document.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('bg-slate-800', 'text-white');
                b.classList.add('text-slate-400', 'bg-slate-950', 'border-slate-800');
            });

            const mapper = {
                'todos': 'all',
                'pendente': 'pendente',
                'confirmado': 'confirmado',
                'cancelado': 'cancelado'
            };
            const targetBtn = document.getElementById("filter-" + mapper[status]);
            if (targetBtn) {
                targetBtn.classList.add('bg-slate-800', 'text-white');
                targetBtn.classList.remove('text-slate-400', 'bg-slate-950', 'border-slate-800');
            }

            renderizarAgendamentos();
        }

        function renderizarAgendamentos() {
            const body = document.getElementById('agendamentos-table-body');
            if (!body) return;
            body.innerHTML = '';

            // Se for tutor logado, ele só enxerga os agendamentos dele próprio
            let filtrados = agendamentos;
            if (currentRole === 'tutor') {
                filtrados = agendamentos.filter(a => a.tutorId === currentUser.id);
                document.getElementById('agenda-subtitle').innerText = "Acompanhe e faça a solicitação de novos horários para os seus pets cadastrados.";
            } else {
                document.getElementById('agenda-subtitle').innerText = "Faça a solicitação, aprovação, reagendamento ou cancelamento de horários clínicos e pet shop.";
            }

            if (filtroAgendamentosStatus !== 'todos') {
                filtrados = filtrados.filter(a => a.status === filtroAgendamentosStatus);
            }

            document.getElementById('agendamento-counter').innerText = "Exibindo " + filtrados.length + " compromissos";

            if (filtrados.length === 0) {
                body.innerHTML = "<tr><td colspan='6' class='text-center py-8 text-slate-500'>Nenhum compromisso encontrado para este filtro.</td></tr>";
                return;
            }

            filtrados.forEach(a => {
                const pet = pets.find(p => p.id === a.petId);
                const tutor = tutores.find(t => t.id === a.tutorId);

                let badge = '';
                if (a.status === 'pendente') {
                    badge = "<span class='bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20 text-xs font-bold px-2.5 py-1 rounded-full'>Pendente</span>";
                } else if (a.status === 'confirmado') {
                    badge = "<span class='bg-brand-lime/10 text-brand-lime border border-brand-lime/20 text-xs font-bold px-2.5 py-1 rounded-full'>Confirmado</span>";
                } else {
                    badge = "<span class='bg-brand-pink/10 text-brand-pink border border-brand-pink/20 text-xs font-bold px-2.5 py-1 rounded-full'>Cancelado</span>";
                }

                let actions = '';
                
                // Confirmar agendamento (Apenas administradores podem confirmar agendamentos pendentes)
                if (a.status === 'pendente' && currentRole === 'admin') {
                    actions = "<button onclick=\"alterarStatusAgendamento('" + a.id + "', 'confirmado')\" class='text-brand-lime hover:opacity-85 font-bold text-xs bg-brand-lime/10 border border-brand-lime/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1'>" +
                            "<i data-lucide='check' class='w-3.5 h-3.5'></i> Confirmar" +
                        "</button>";
                }

                // Opção de cancelamento (Livre para Admin e Tutor cancelar seu próprio compromisso)
                if (a.status !== 'cancelado') {
                    actions += "<button onclick=\"alterarStatusAgendamento('" + a.id + "', 'cancelado')\" class='text-brand-pink hover:opacity-85 font-bold text-xs bg-brand-pink/10 border border-brand-pink/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1'>" +
                            "<i data-lucide='trash-2' class='w-3.5 h-3.5'></i> Cancelar" +
                        "</button>";
                } else {
                    actions = "<span class='text-slate-500 text-xs italic'>Sem ações disponíveis</span>";
                }

                body.innerHTML += "<tr class='hover:bg-slate-900/60 transition-all border-b border-slate-800/50'>" +
                        "<td class='py-4 px-6'>" +
                            "<div class='font-bold text-slate-200'>" + (pet ? pet.nome : 'N/A') + "</div>" +
                            "<div class='text-xs text-slate-500'>" + (tutor ? tutor.nome : 'N/A') + "</div>" +
                        "</td>" +
                        "<td class='py-4 px-6'>" +
                            "<div class='font-semibold text-slate-300 flex items-center gap-1.5'>" +
                                                "<i data-lucide='" + (a.servico === 'Consulta Veterinária' ? 'stethoscope' : 'calendar') + "' class='w-4 h-4 text-brand-lime'></i> " + a.servico + "" +
                            "</div>" +
                        "</td>" +
                        "<td class='py-4 px-6 text-slate-300'>" +
                            "<div>" + formatarDataBr(a.data) + "</div>" +
                            "<div class='text-xs text-brand-pink font-bold'>" + a.hora + "</div>" +
                        "</td>" +
                        "<td class='py-4 px-6 font-bold text-slate-200'>" +
                            "R$ " + a.valor.toFixed(2) + "" +
                        "</td>" +
                        "<td class='py-4 px-6'>" +
                            badge +
                        "</td>" +
                        "<td class='py-4 px-6 text-right'>" +
                            "<div class='flex justify-end gap-1.5'>" +
                                actions +
                            "</div>" +
                        "</td>" +
                    "</tr>";
            });
            lucide.createIcons();
        }

        function alterarStatusAgendamento(id, novoStatus) {
            const agend = agendamentos.find(a => a.id === id);
            if (agend) {
                agend.status = novoStatus;
                renderizarAgendamentos();
                atualizarKPIs();
                showToast("Agendamento atualizado para: " + novoStatus.toUpperCase());
            }
        }

        function formatarDataBr(dataStr) {
            const partes = dataStr.split('-');
            if (partes.length === 3) return partes[2] + "/" + partes[1] + "/" + partes[0];
            return dataStr;
        }

        // --- HISTÓRICO EXCLUSIVO DO TUTOR ---
        function renderizarHistoricoExclusivoTutor() {
            const timeline = document.getElementById('tutor-historico-timeline');
            const selectPetExame = document.getElementById('tutor-exame-pet-select');
            
            if (!timeline || !selectPetExame || !currentUser) return;

            // Popular select de exames - mostrar todos os pets para profissionais, apenas meus pets para tutores
            let selectOpts = '<option value="">Escolher um pet...</option>';
            let petsParaMostrar;
            
            if (currentRole === 'tutor') {
                petsParaMostrar = pets.filter(p => p.tutorId === currentUser.id);
            } else {
                // Para veterinários, admins e gestores - mostrar todos os pets
                petsParaMostrar = pets;
            }
            
            petsParaMostrar.forEach(p => {
                selectOpts += "<option value='" + p.id + "'>" + p.nome + "</option>";
            });
            selectPetExame.innerHTML = selectOpts;

            // Carregar timeline - para tutores, apenas seus pets; para profissionais, todos os pets
            timeline.innerHTML = '';
            let prontuariosFiltrados;
            
            if (currentRole === 'tutor') {
                const meusPetsIds = petsParaMostrar.map(p => p.id);
                prontuariosFiltrados = historicoClinico.filter(h => meusPetsIds.includes(h.petId));
            } else {
                // Profissionais veem todos os exames
                prontuariosFiltrados = historicoClinico.filter(h => h.tipo === 'exame');
            }

            document.getElementById('tutor-prontuario-count').innerText = prontuariosFiltrados.length + " registros";

            if (prontuariosFiltrados.length === 0) {
                timeline.innerHTML = "<div class='text-center py-12 text-slate-500'>Nenhum exame encontrado.</div>";
                return;
            }

            // Ordenação decrescente de data
            const ordenados = [...prontuariosFiltrados].sort((a,b) => new Date(b.data) - new Date(a.data));

            ordenados.forEach(h => {
                const pet = pets.find(p => p.id === h.petId);
                let icone = '';
                let corBorda = '';
                let tituloRegistro = '';

                if (h.tipo === 'vacina') {
                    icone = "<div class='p-2.5 bg-slate-950 text-brand-lime rounded-xl border border-slate-800'><i data-lucide='shield-check' class='w-5 h-5'></i></div>";
                    corBorda = 'border-l-4 border-l-brand-lime';
                    tituloRegistro = 'Imunização (Vacina Aplicada)';
                } else if (h.tipo === 'receita') {
                    icone = "<div class='p-2.5 bg-slate-950 text-brand-blue rounded-xl border border-slate-800'><i data-lucide='file-text' class='w-5 h-5'></i></div>";
                    corBorda = 'border-l-4 border-l-brand-blue';
                    tituloRegistro = 'Receituário Digital Recebido';
                } else if (h.tipo === 'exame') {
                    icone = "<div class='p-2.5 bg-slate-950 text-brand-pink rounded-xl border border-slate-800'><i data-lucide='clipboard' class='w-5 h-5'></i></div>";
                    corBorda = 'border-l-4 border-l-brand-pink';
                    tituloRegistro = 'Laudo / Exame Médico';
                }

                let botoesAcao = '';
                if (h.tipo === 'exame') {
                    botoesAcao = "<div class='flex gap-2 mt-3'>" +
                        "<button type='button' onclick=\"editarExameTutor('" + h.id + "')\" class='text-xs px-2 py-1 bg-brand-lime/20 text-brand-lime rounded hover:bg-brand-lime/30 font-bold transition-all'>Editar</button>" +
                        "<button type='button' onclick=\"excluirExameTutor('" + h.id + "')\" class='text-xs px-2 py-1 bg-brand-pink/20 text-brand-pink rounded hover:bg-brand-pink/30 font-bold transition-all'>Excluir</button>" +
                    "</div>";
                }

                timeline.innerHTML += "<div class='bg-slate-950 p-4 rounded-xl flex gap-4 items-start " + corBorda + " border border-slate-850'>" +
                        icone +
                        "<div class='flex-1 space-y-1'>" +
                            "<div class='flex justify-between items-center'>" +
                                "<h5 class='text-sm font-bold text-slate-100'>" + tituloRegistro + "</h5>" +
                                "<span class='text-xs text-slate-500 font-semibold'>" + formatarDataBr(h.data) + "</span>" +
                            "</div>" +
                            "<p class='text-xs text-slate-400 font-bold'>Paciente: <span class='text-brand-lime'>" + (pet ? pet.nome : 'N/A') + "</span></p>" +
                            "<div class='bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 mt-2 font-medium'>" +
                                h.detalhe +
                            "</div>" +
                            botoesAcao +
                        "</div>" +
                    "</div>";
            });
            lucide.createIcons();
        }

        function salvarExameTutor(e) {
            e.preventDefault();
            const petId = document.getElementById('tutor-exame-pet-select').value;
            const nomeExame = document.getElementById('tutor-exame-nome').value;
            const laudo = document.getElementById('tutor-exame-resultado').value;
            const editId = document.getElementById('tutor-exame-edit-id').value;
            const dataHoje = new Date().toISOString().split('T')[0];

            if (!petId || !nomeExame || !laudo) {
                showToast("Preencha todos os campos do seu exame!", "error");
                return;
            }

            if (editId) {
                // Modo edição: atualizar registro existente
                const registro = historicoClinico.find(h => h.id === editId);
                if (registro) {
                    registro.petId = petId;
                    registro.detalhe = "Exame anexado pelo Tutor: " + nomeExame + ". Detalhes/Resultado: " + laudo;
                    showToast("Exame atualizado com sucesso!");
                } else {
                    showToast("Registro não encontrado!", "error");
                    return;
                }
            } else {
                // Modo criação: adicionar novo registro
                const novoProntuario = {
                    id: (historicoClinico.length + 401).toString(),
                    petId: petId,
                    tipo: "exame",
                    data: dataHoje,
                    detalhe: "Exame anexado pelo Tutor: " + nomeExame + ". Detalhes/Resultado: " + laudo
                };
                historicoClinico.push(novoProntuario);
                showToast("Resultado de exame adicionado ao histórico clínico do pet!");
            }

            document.getElementById('tutor-exame-nome').value = '';
            document.getElementById('tutor-exame-resultado').value = '';
            document.getElementById('tutor-exame-edit-id').value = '';
            document.getElementById('tutor-exame-submit-btn').textContent = 'Enviar Resultados';
            document.getElementById('tutor-exame-cancel-btn').classList.add('hidden');

            renderizarHistoricoExclusivoTutor();
            renderizarHistoricoClinico();
        }

        function editarExameTutor(id) {
            const registro = historicoClinico.find(h => h.id === id);
            if (!registro) return;

            const match = registro.detalhe.match(/Exame anexado pelo Tutor: (.+?)\. Detalhes\/Resultado: (.+)$/);
            if (match) {
                document.getElementById('tutor-exame-pet-select').value = registro.petId;
                document.getElementById('tutor-exame-nome').value = match[1].trim();
                document.getElementById('tutor-exame-resultado').value = match[2].trim();
            }

            document.getElementById('tutor-exame-edit-id').value = id;
            document.getElementById('tutor-exame-submit-btn').textContent = 'Atualizar Exame';
            document.getElementById('tutor-exame-cancel-btn').classList.remove('hidden');

            showToast('Exame carregado para edição.');
            document.getElementById('tutor-exame-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        function excluirExameTutor(id) {
            if (confirm('Tem certeza que deseja excluir este exame?')) {
                historicoClinico = historicoClinico.filter(h => h.id !== id);
                renderizarHistoricoExclusivoTutor();
                renderizarHistoricoClinico();
                showToast("Exame excluído com sucesso!");
            }
        }

        function cancelarEdicaoExameTutor() {
            document.getElementById('tutor-exame-nome').value = '';
            document.getElementById('tutor-exame-resultado').value = '';
            document.getElementById('tutor-exame-edit-id').value = '';
            document.getElementById('tutor-exame-submit-btn').textContent = 'Enviar Resultados';
            document.getElementById('tutor-exame-cancel-btn').classList.add('hidden');
        }

        // --- MÓDULO CLÍNICO (Acesso Veterinário/Gestor) ---
        // Lógica para exibir/ocultar os campos específicos de vacinação
        function toggleCamposVacina(tipoRegistro) {
            const blocoVacina = document.getElementById('bloco-vacina') || document.getElementById('campos-vacina');
            const nomeVacina = document.getElementById('vacina-nome');
            const loteVacina = document.getElementById('vacina-lote');

            if (!blocoVacina || !nomeVacina || !loteVacina) return;

            if (tipoRegistro === 'vacina') {
                blocoVacina.classList.remove('hidden');
                blocoVacina.classList.add('grid');
                nomeVacina.required = true;
                loteVacina.required = true;
            } else {
                blocoVacina.classList.add('hidden');
                blocoVacina.classList.remove('grid');
                nomeVacina.required = false;
                loteVacina.required = false;
            }
        }

        function alternarCamposClinicos() {
            const tipo = document.getElementById('clinico-tipo').value;
            document.getElementById('campos-vacina').classList.add('hidden');
            document.getElementById('campos-receita').classList.add('hidden');
            document.getElementById('campos-exame').classList.add('hidden');

            if (tipo === 'vacina') {
                document.getElementById('campos-vacina').classList.remove('hidden');
            } else if (tipo === 'receita') {
                document.getElementById('campos-receita').classList.remove('hidden');
            } else if (tipo === 'exame') {
                document.getElementById('campos-exame').classList.remove('hidden');
            }

            toggleCamposVacina(tipo);
        }

        function formatarTipoRegistro(tipo) {
            const labels = {
                vacina: 'Vacina',
                receita: 'Receita',
                exame: 'Exame',
                laudo: 'Laudo'
            };
            return labels[tipo] || 'Registro';
        }

        function renderizarRegistrosClinicos() {
            const tbody = document.getElementById('clinico-registros-body');
            const count = document.getElementById('clinico-registros-count');
            if (!tbody) return;

            const ordenados = [...historicoClinico].sort((a, b) => new Date(b.data) - new Date(a.data));
            if (count) count.innerText = ordenados.length + ' registro' + (ordenados.length === 1 ? '' : 's');

            if (ordenados.length === 0) {
                tbody.innerHTML = "<tr><td colspan='5' class='py-4 text-center text-slate-500'>Nenhum registro clínico cadastrado.</td></tr>";
                return;
            }

            tbody.innerHTML = '';
            ordenados.forEach(h => {
                const pet = pets.find(p => p.id === h.petId);
                const resumo = h.detalhe.length > 70 ? h.detalhe.substring(0, 70) + '...' : h.detalhe;
                tbody.innerHTML += "<tr class='border-b border-slate-800 align-top'>" +
                    "<td class='py-3 pr-3 font-semibold text-slate-200'>" + (pet ? pet.nome : 'Pet não informado') + "</td>" +
                    "<td class='py-3 pr-3'><span class='px-2 py-1 rounded-full text-[10px] font-bold border border-slate-700 bg-slate-950 text-slate-200'>" + formatarTipoRegistro(h.tipo) + "</span></td>" +
                    "<td class='py-3 pr-3 text-slate-400'>" + formatarDataBr(h.data) + "</td>" +
                    "<td class='py-3 pr-3 text-slate-300 max-w-xs'>" + resumo + "</td>" +
                    "<td class='py-3 text-right whitespace-nowrap'>" +
                        "<button type='button' onclick=\"editarRegistroClinico('" + h.id + "')\" class='text-brand-lime hover:opacity-80 text-xs font-bold mr-2'>Editar</button>" +
                        "<button type='button' onclick=\"removerRegistroClinico('" + h.id + "')\" class='text-brand-pink hover:opacity-80 text-xs font-bold'>Excluir</button>" +
                    "</td>" +
                "</tr>";
            });
        }

        function editarRegistroClinico(id) {
            const registro = historicoClinico.find(h => h.id === id);
            if (!registro) return;

            const form = document.getElementById('clinico-form');
            const petSelect = document.getElementById('clinico-pet-select');
            const tipoSelect = document.getElementById('clinico-tipo');
            if (!form || !petSelect || !tipoSelect) return;

            petSelect.value = registro.petId || petSelect.options[0]?.value || '';
            tipoSelect.value = registro.tipo || 'vacina';
            form.dataset.editId = id;
            alternarCamposClinicos();

            if (registro.tipo === 'vacina') {
                const match = registro.detalhe.match(/Vacina aplicada: (.+?)\. Lote: (.+?)\. Vencimento: (.+?)\./);
                if (match) {
                    document.getElementById('vacina-nome').value = match[1].trim();
                    document.getElementById('vacina-lote').value = match[2].trim();
                    const venc = match[3] && match[3].includes('/') ? match[3] : '';
                    if (venc) {
                        const [dia, mes, ano] = venc.split('/');
                        if (dia && mes && ano) {
                            document.getElementById('vacina-venc').value = ano + '-' + mes.padStart(2,'0') + '-' + dia.padStart(2,'0');
                        }
                    }
                }
            } else if (registro.tipo === 'receita') {
                const texto = registro.detalhe.replace('Prescrição digital emitida: ', '').trim();
                document.getElementById('receita-texto').value = texto;
            } else if (registro.tipo === 'exame') {
                const match = registro.detalhe.match(/Registro de exame: (.+?)\. Laudo clínico: (.+)$/);
                if (match) {
                    document.getElementById('exame-nome').value = match[1].trim();
                    document.getElementById('exame-laudo').value = match[2].trim();
                }
            }

            showToast('Registro carregado no formulário para edição.');
            document.getElementById('clinico-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Histórico Clínico Geral
        function renderizarHistoricoClinico() {
            const petSelect = document.getElementById('clinico-pet-select');
            if (!petSelect) return;

            let options = '';
            pets.forEach(p => {
                options += "<option value='" + p.id + "'>" + p.nome + "</option>";
            });
            petSelect.innerHTML = options;

            // Também popular select de laudo (mesmos pets)
            const laudoSelect = document.getElementById('laudo-pet-select');
            if (laudoSelect) laudoSelect.innerHTML = options;

            // Preencher campo do profissional com o usuário atual (se houver)
            const profInput = document.getElementById('laudo-profissional');
            if (profInput && currentUser && (currentRole === 'admin' || currentRole === 'veterinario')) {
                profInput.value = (currentUser.nome || '') + (currentUser.crm ? ' - ' + currentUser.crm : '');
            }
            const timeline = document.getElementById('clinico-timeline');
            if (!timeline) return;
            timeline.innerHTML = '';
            
            document.getElementById('prontuario-count').innerText = historicoClinico.length + " registros";
            renderizarRegistrosClinicos();

            if (historicoClinico.length === 0) {
                timeline.innerHTML = "<div class='text-center py-12 text-slate-500'>Nenhum prontuário registrado ainda.</div>";
                return;
            }

            const ordenados = [...historicoClinico].sort((a,b) => new Date(b.data) - new Date(a.data));

            ordenados.forEach(h => {
                const pet = pets.find(p => p.id === h.petId);
                let icone = '';
                let corBorda = '';
                let tituloRegistro = '';

                if (h.tipo === 'vacina') {
                    icone = "<div class='p-2.5 bg-slate-950 text-brand-lime rounded-xl border border-slate-800'><i data-lucide='shield-check' class='w-5 h-5'></i></div>";
                    corBorda = 'border-l-4 border-l-brand-lime';
                    tituloRegistro = 'Registro de Imunização (Vacina)';
                } else if (h.tipo === 'receita') {
                    icone = "<div class='p-2.5 bg-slate-950 text-brand-blue rounded-xl border border-slate-800'><i data-lucide='file-text' class='w-5 h-5'></i></div>";
                    corBorda = 'border-l-4 border-l-brand-blue';
                    tituloRegistro = 'Emissão de Receituário Clínico';
                } else if (h.tipo === 'exame') {
                    icone = "<div class='p-2.5 bg-slate-950 text-brand-pink rounded-xl border border-slate-800'><i data-lucide='clipboard' class='w-5 h-5'></i></div>";
                    corBorda = 'border-l-4 border-l-brand-pink';
                    tituloRegistro = 'Exame Complementar Cadastrado';
                } else if (h.tipo === 'laudo') {
                    icone = "<div class='p-2.5 bg-slate-950 text-brand-lime rounded-xl border border-slate-800'><i data-lucide='file-text' class='w-5 h-5'></i></div>";
                    corBorda = 'border-l-4 border-l-brand-lime';
                    tituloRegistro = 'Laudo Médico Veterinário';
                }

                timeline.innerHTML += "<div class='bg-slate-950 p-4 rounded-xl flex gap-4 items-start " + corBorda + " border border-slate-850 hover:shadow-sm transition-all'>" +
                        icone +
                        "<div class='flex-1 space-y-1'>" +
                            "<div class='flex justify-between items-center'>" +
                                "<h5 class='text-sm font-bold text-slate-100'>" + tituloRegistro + "</h5>" +
                                "<span class='text-xs text-slate-500 font-semibold'>" + formatarDataBr(h.data) + "</span>" +
                            "</div>" +
                            "<p class='text-xs text-slate-400 font-bold'>Paciente: <span class='text-brand-lime'>" + (pet ? pet.nome : 'Desconhecido') + "</span></p>" +
                            "<div class='bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 mt-2 font-medium'>" +
                                h.detalhe +
                            "</div>" +
                            "<div class='mt-1.5 flex items-center gap-2'>" +
                                "<button onclick=\"editarRegistroClinico('" + h.id + "')\" class='text-brand-lime hover:opacity-80 font-bold text-[10px] flex items-center gap-0.5'>" +
                                    "<i data-lucide='pencil' class='w-3 h-3'></i> Editar" +
                                "</button>" +
                                "<button onclick=\"removerRegistroClinico('" + h.id + "')\" class='text-brand-pink hover:opacity-80 font-bold text-[10px] flex items-center gap-0.5'>" +
                                    "<i data-lucide='trash' class='w-3 h-3'></i> Excluir Registro" +
                                "</button>" +
                            "</div>" +
                        "</div>" +
                    "</div>";
            });
            lucide.createIcons();
        }

        function salvarHistoricoClinico(e) {
            e.preventDefault();
            const form = document.getElementById('clinico-form');
            const petId = document.getElementById('clinico-pet-select').value;
            const tipo = document.getElementById('clinico-tipo').value;
            const dataHoje = new Date().toISOString().split('T')[0];
            let detalhe = '';

            if (tipo === 'vacina') {
                const nome = document.getElementById('vacina-nome').value;
                const lote = document.getElementById('vacina-lote').value;
                const venc = document.getElementById('vacina-venc').value;
                if (!nome || !lote) {
                    showToast("Preencha as informações de imunização obrigatórias!", "error");
                    return;
                }
                detalhe = "Vacina aplicada: " + nome + ". Lote: " + lote + ". Vencimento: " + (venc ? formatarDataBr(venc) : 'Não informado') + ".";
            } else if (tipo === 'receita') {
                const texto = document.getElementById('receita-texto').value;
                if (!texto) {
                    showToast("Insira a receita médica veterinária!", "error");
                    return;
                }
                detalhe = "Prescrição digital emitida: " + texto;
            } else if (tipo === 'exame') {
                const nomeExame = document.getElementById('exame-nome').value;
                const laudo = document.getElementById('exame-laudo').value;
                if (!nomeExame || !laudo) {
                    showToast("Preencha o tipo de exame e o laudo correspondente!", "error");
                    return;
                }
                detalhe = "Registro de exame: " + nomeExame + ". Laudo clínico: " + laudo;
            }

            const editId = form ? form.dataset.editId : null;

            if (editId) {
                const registro = historicoClinico.find(h => h.id === editId);
                if (registro) {
                    registro.petId = petId;
                    registro.tipo = tipo;
                    registro.data = dataHoje;
                    registro.detalhe = detalhe;
                }
                delete form.dataset.editId;
                showToast("Registro clínico atualizado com sucesso!");
            } else {
                const novo = {
                    id: (historicoClinico.length + 401).toString(),
                    petId: petId, tipo: tipo, data: dataHoje, detalhe: detalhe
                };
                historicoClinico.push(novo);
                showToast("Registro clínico inserido com sucesso!");
            }

            document.getElementById('vacina-nome').value = '';
            document.getElementById('vacina-lote').value = '';
            document.getElementById('vacina-venc').value = '';
            document.getElementById('receita-texto').value = '';
            document.getElementById('exame-nome').value = '';
            document.getElementById('exame-laudo').value = '';
            document.getElementById('clinico-form').reset();
            document.getElementById('clinico-tipo').value = 'vacina';
            alternarCamposClinicos();

            renderizarHistoricoClinico();
            renderizarHistoricoExclusivoTutor();
            renderizarRegistrosClinicos();
        }

        // Popular os campos do formulário de laudo a partir do pet selecionado
        function popularLaudoFromPet() {
            const petId = document.getElementById('laudo-pet-select').value;
            const pet = pets.find(p => p.id === petId);
            if (!pet) return;
            document.getElementById('laudo-paciente-nome').value = pet.nome || '';
            document.getElementById('laudo-especie').value = pet.especie || '';
            document.getElementById('laudo-raca').value = pet.raca || '';
            // idade/sexo/peso podem não existir no mock; manter campos livres
        }

        function salvarLaudo(e) {
            e.preventDefault();
            // Apenas administradores e veterinários podem emitir laudos
            if (!(currentRole === 'admin' || currentRole === 'veterinario')) {
                showToast('Sem permissão para emitir laudos.', 'error');
                return;
            }
            const petSelect = document.getElementById('laudo-pet-select');
            const petId = petSelect ? petSelect.value : '';
            const paciente = document.getElementById('laudo-paciente-nome').value.trim();
            const especie = document.getElementById('laudo-especie').value.trim();
            const raca = document.getElementById('laudo-raca').value.trim();
            const idade = document.getElementById('laudo-idade').value.trim();
            const sexo = document.getElementById('laudo-sexo').value.trim();
            const peso = document.getElementById('laudo-peso').value.trim();
            const tutor = document.getElementById('laudo-tutor').value.trim();
            const datahora = document.getElementById('laudo-datahora').value;
            const profissional = document.getElementById('laudo-profissional').value.trim() || (currentUser ? currentUser.nome + ' ' + (currentUser.crm || '') : '');
            const historico = document.getElementById('laudo-historico').value.trim();
            const metodo = document.getElementById('laudo-metodologia').value.trim();
            const achados = document.getElementById('laudo-achados').value.trim();
            const conclusao = document.getElementById('laudo-conclusao').value.trim();
            const orientacoes = document.getElementById('laudo-orientacoes').value.trim();

            if (!paciente || !profissional) {
                showToast('Preencha pelo menos o paciente e o profissional responsável.', 'error');
                return;
            }

            const detalhe = `Paciente: ${paciente}\nEspécie: ${especie}\nRaça: ${raca}\nIdade: ${idade}\nSexo: ${sexo}\nPeso: ${peso}\nTutor: ${tutor}\nAtendimento: ${datahora}\nProfissional: ${profissional}\n\nHistórico/Justificativa:\n${historico}\n\nMetodologia:\n${metodo}\n\nAchados:\n${achados}\n\nConclusão/Diagnóstico:\n${conclusao}\n\nOrientações:\n${orientacoes}`;

            const novo = {
                id: (historicoClinico.length + 401).toString(),
                petId: petId || null,
                tipo: 'laudo',
                data: datahora ? datahora.split('T')[0] : new Date().toISOString().split('T')[0],
                detalhe: detalhe
            };

            historicoClinico.push(novo);
            renderizarHistoricoClinico();
            renderizarHistoricoExclusivoTutor();
            showToast('Laudo emitido e salvo no prontuário do pet.');
            document.getElementById('clinico-laudo-form').reset();
        }

        function removerRegistroClinico(id) {
            historicoClinico = historicoClinico.filter(h => h.id !== id);
            renderizarHistoricoClinico();
            renderizarHistoricoExclusivoTutor();
            renderizarRegistrosClinicos();
            showToast("Registro excluído.");
        }

     
        // Fluxo de estética removido: Banho & Tosa não é mais tratado aqui.

        // --- PRODUTOS & MEDICAMENTOS ---
        function abrirModalProduto() { document.getElementById('modal-produto').classList.remove('hidden'); }
        function fecharModalProduto() { document.getElementById('modal-produto').classList.add('hidden'); }

        // --- MODAIS DE USUÁRIOS (Simulação / Frontend-only) ---
        function abrirModalUsuario() { 
            const form = document.getElementById('usuario-form');
            if (form) { form.removeAttribute('data-edit-id'); }
            const submitBtn = document.querySelector('#usuario-form button[type="submit"]');
            if (submitBtn) submitBtn.innerText = 'Adicionar';
            document.getElementById('modal-usuario').classList.remove('hidden'); 
        }
        function fecharModalUsuario() { document.getElementById('modal-usuario').classList.add('hidden'); const f = document.getElementById('usuario-form'); if (f) { f.reset(); f.removeAttribute('data-edit-id'); } }

        function abrirModalEditarUsuario(id) {
            const tbody = document.getElementById('usuarios-table-body');
            if (!tbody) return;
            const tr = tbody.querySelector('tr[data-userid="' + id + '"]');
            if (!tr) return;
            const cols = tr.querySelectorAll('td');
            const nome = cols[0] ? cols[0].innerText.trim() : '';
            const cargoLabel = cols[1] ? cols[1].innerText.trim() : '';
            const cpf = cols[2] ? cols[2].innerText.trim() : '';
            const role = Object.keys({ admin: 'Administrador', gestor: 'Gestor', veterinario: 'Veterinário', funcionario: 'Funcionário' }).find(key => {
                return formatarCargo(key) === cargoLabel;
            }) || 'admin';

            document.getElementById('usuario-nome').value = nome;
            document.getElementById('usuario-cpf').value = cpf;
            document.getElementById('usuario-role').value = role;

            const form = document.getElementById('usuario-form');
            if (form) form.dataset.editId = id;
            const submitBtn = document.querySelector('#usuario-form button[type="submit"]');
            if (submitBtn) submitBtn.innerText = 'Salvar alterações';
            document.getElementById('modal-usuario').classList.remove('hidden');
        }

        function abrirModalConfirmDeleteUsuario(id, nome) {
            const btn = document.getElementById('confirm-delete-usuario-btn');
            if (btn) btn.dataset.userid = id;
            const el = document.getElementById('confirm-delete-username');
            if (el) el.innerText = nome || '—';
            document.getElementById('modal-confirm-delete-usuario').classList.remove('hidden');
        }
        function fecharModalConfirmDeleteUsuario() { document.getElementById('modal-confirm-delete-usuario').classList.add('hidden'); const btn = document.getElementById('confirm-delete-usuario-btn'); if (btn) btn.dataset.userid = ''; }

        // Simula cadastro visual de usuário (evita recarregar a página)
        function simularCadastroUsuario(e) {
            e.preventDefault();
            const nome = document.getElementById('usuario-nome').value.trim();
            const cpf = document.getElementById('usuario-cpf').value.trim();
            const senha = document.getElementById('usuario-senha').value.trim();
            const role = document.getElementById('usuario-role').value;

            if (!nome || !cpf || !senha) {
                showToast('Preencha todos os campos obrigatórios.');
                return;
            }

            const id = 'u' + Date.now();
            usuariosMock.unshift({ id, nome, role, cpf, senha: senha || '123456' });
            renderUsuarios();
            fecharModalUsuario();
            showToast('Usuário "' + nome + '" adicionado (simulação).');
        }
        
        // If form has data-edit-id, update existing row instead of creating
        function simularEditarUsuario(e) {
            e.preventDefault();
            const form = document.getElementById('usuario-form');
            if (!form) return simularCadastroUsuario(e);
            const editId = form.dataset.editId;
            if (!editId) return simularCadastroUsuario(e);

            const nome = document.getElementById('usuario-nome').value.trim();
            const cpf = document.getElementById('usuario-cpf').value.trim();
            const role = document.getElementById('usuario-role').value;
            const userIndex = usuariosMock.findIndex(user => user.id === editId);
            if (userIndex !== -1) {
                usuariosMock[userIndex] = { ...usuariosMock[userIndex], nome, cpf, role };
            }

            renderUsuarios();
            fecharModalUsuario();
            showToast('Usuário "' + nome + '" atualizado (simulação).');
        }

        function confirmarRemoverUsuario() {
            const btn = document.getElementById('confirm-delete-usuario-btn');
            if (!btn) return;
            const id = btn.dataset.userid;
            if (!id) return fecharModalConfirmDeleteUsuario();

            const index = usuariosMock.findIndex(user => user.id === id);
            if (index !== -1) {
                usuariosMock.splice(index, 1);
            }
            renderUsuarios();
            fecharModalConfirmDeleteUsuario();
            showToast('Usuário removido (simulação).');
        }

        function handleUsuarioFormSubmit(e) {
            const form = document.getElementById('usuario-form');
            if (form && form.dataset.editId) return simularEditarUsuario(e);
            return simularCadastroUsuario(e);
        }

        // Pequenas funções utilitárias para evitar injeção visual na simulação
        function escapeHtml(str) {
            return String(str).replace(/[&<>"']/g, function(m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[m]; });
        }
        function escapeJsString(str) {
            return String(str).replace(/['"\\]/g, function(s) { return '\\' + s; });
        }

        function salvarProduto(e) {
            e.preventDefault();
            const nome = document.getElementById('prod-nome').value;
            const categoria = document.getElementById('prod-categoria').value;
            const preco = parseFloat(document.getElementById('prod-preco').value);
            const estoque = parseInt(document.getElementById('prod-qtd').value);

            const novo = {
                id: (produtos.length + 301).toString(),
                nome: nome, categoria: categoria, estoque: estoque, preco: preco
            };

            produtos.push(novo);
            fecharModalProduto();
            document.getElementById('prod-nome').value = '';
            document.getElementById('prod-preco').value = '';
            document.getElementById('prod-qtd').value = '';

            renderizarEstoque();
            atualizarKPIs();
            showToast("Insumo " + nome + " adicionado ao controle de estoque.");
        }

        function renderizarEstoque() {
            const body = document.getElementById('produtos-table-body');
            if (!body) return;
            body.innerHTML = '';

            produtos.forEach(p => {
                let badgeEstoque = '';
                if (p.estoque <= 5) {
                    badgeEstoque = "<span class='bg-brand-pink/10 text-brand-pink text-xs font-bold px-2.5 py-1 rounded-full border border-brand-pink/20 flex items-center gap-1 w-fit'><i data-lucide='alert-circle' class='w-3.5 h-3.5'></i> Estoque Crítico</span>";
                } else if (p.estoque <= 15) {
                    badgeEstoque = "<span class='bg-brand-yellow/10 text-brand-yellow text-xs font-bold px-2.5 py-1 rounded-full border border-brand-yellow/20 flex items-center gap-1 w-fit'><i data-lucide='alert-circle' class='w-3.5 h-3.5'></i> Moderado</span>";
                } else {
                    badgeEstoque = "<span class='bg-brand-lime/10 text-brand-lime text-xs font-bold px-2.5 py-1 rounded-full border border-brand-lime/20 flex items-center gap-1 w-fit'><i data-lucide='check' class='w-3.5 h-3.5'></i> Seguro</span>";
                }

                body.innerHTML += "<tr class='hover:bg-slate-900/60 transition-all border-b border-slate-800/50'>" +
                        "<td class='py-4 px-6 font-bold text-slate-100'>" + p.nome + "</td>" +
                        "<td class='py-4 px-6 font-semibold text-slate-400'>" + p.categoria + "</td>" +
                        "<td class='py-4 px-6'>" + badgeEstoque + "</td>" +
                        "<td class='py-4 px-6 font-bold text-slate-300'>" + p.estoque + " un</td>" +
                        "<td class='py-4 px-6 font-semibold text-brand-lime'>R$ " + p.preco.toFixed(2) + "</td>" +
                        "<td class='py-4 px-6 text-right'>" +
                            "<button onclick=\"adicionarQtdEstoque('" + p.id + "')\" class='text-brand-blue hover:text-white font-bold text-xs bg-brand-blue/10 border border-brand-blue/20 px-2.5 py-1.5 rounded-lg'><i data-lucide='plus' class='w-3.5 h-3.5 inline'></i> Repor +10</button>" +
                        "</td>" +
                    "</tr>";
            });
            lucide.createIcons();
        }

        function adicionarQtdEstoque(id) {
            const p = produtos.find(item => item.id === id);
            if (p) {
                p.estoque += 10;
                renderizarEstoque();
                showToast("Reposição de " + p.nome + " realizada (+10 unidades).");
            }
        }

        // --- ANALYTICS, FINANCEIRO & DASHBOARDS ---
        function filtrarPeriodo(periodo) {
            periodoFaturamento = periodo;
            document.querySelectorAll('#periodo-diario, #periodo-semanal, #periodo-mensal, #periodo-anual').forEach(b => {
                b.classList.remove('bg-white', 'shadow-sm', 'text-slate-800', 'bg-slate-900');
                b.classList.add('text-slate-400');
            });
            const targetBtn = document.getElementById("periodo-" + periodo);
            if (targetBtn) {
                targetBtn.classList.add('bg-slate-900', 'text-white');
                targetBtn.classList.remove('text-slate-400');
            }

            atualizarKPIs();
            inicializarGraficos();
        }

        function atualizarKPIs() {
            const prodKpi = document.getElementById('kpi-produtos-count');
            if (prodKpi) prodKpi.innerText = produtos.length;

            if (periodoFaturamento === 'diario') {
                document.getElementById('kpi-faturamento').innerText = "R$ 480,00";
                document.getElementById('kpi-vendas').innerText = "8";
                document.getElementById('kpi-consultas').innerText = "3";
            } else if (periodoFaturamento === 'semanal') {
                document.getElementById('kpi-faturamento').innerText = "R$ 3.100,00";
                document.getElementById('kpi-vendas').innerText = "35";
                document.getElementById('kpi-consultas').innerText = "12";
            } else if (periodoFaturamento === 'mensal') {
                document.getElementById('kpi-faturamento').innerText = "R$ 12.850,00";
                document.getElementById('kpi-vendas').innerText = "142";
                document.getElementById('kpi-consultas').innerText = "68";
            } else {
                document.getElementById('kpi-faturamento').innerText = "R$ 154.200,00";
                document.getElementById('kpi-vendas').innerText = "1.704";
                document.getElementById('kpi-consultas').innerText = "816";
            }
        }

        function inicializarGraficos() {
            const ctxFin = document.getElementById('financeChart');
            if (!ctxFin) return;

            if (financeChartRef) financeChartRef.destroy();
            if (topProductsChartRef) topProductsChartRef.destroy();

            let labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
            let dataClinica = [4000, 4500, 5100, 4800, 6200, 5800];
            let dataEstetica = [3200, 3100, 4000, 3900, 4500, 4900];

            if (periodoFaturamento === 'diario') {
                labels = ['08h', '10h', '12h', '14h', '16h', '18h'];
                dataClinica = [150, 0, 150, 0, 150, 0];
                dataEstetica = [0, 90, 0, 90, 0, 0];
            } else if (periodoFaturamento === 'semanal') {
                labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                dataClinica = [450, 600, 300, 900, 750, 300];
                dataEstetica = [180, 270, 360, 450, 540, 270];
            }

            financeChartRef = new Chart(ctxFin.getContext('2d'), {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Veterinária (Clínica)',
                            data: dataClinica,
                            borderColor: '#8B00FF',
                            backgroundColor: 'rgba(139, 0, 255, 0.05)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 3
                        },
                        {
                            label: 'Pet Shop (Banho/Tosa)',
                            data: dataEstetica,
                            borderColor: '#CCFF00',
                            backgroundColor: 'rgba(204, 255, 0, 0.05)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { 
                            position: 'bottom',
                            labels: { color: '#94a3b8' }
                        } 
                    },
                    scales: {
                        y: { 
                            grid: { color: '#1e293b' },
                            ticks: { color: '#94a3b8' }
                        },
                        x: { 
                            grid: { display: false },
                            ticks: { color: '#94a3b8' }
                        }
                    }
                }
            });

            const ctxProd = document.getElementById('topProductsChart');
            if (!ctxProd) return;

            const sortedProds = [...produtos].sort((a,b) => b.estoque - a.estoque);

            topProductsChartRef = new Chart(ctxProd.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: sortedProds.map(p => p.nome.substring(0, 15) + '...'),
                    datasets: [{
                        label: 'Insumo em Estoque',
                        data: sortedProds.map(p => p.estoque),
                        backgroundColor: ['#CCFF00', '#FF007F', '#0033FF', '#8B00FF'],
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { display: false } 
                    },
                    scales: {
                        x: { 
                            grid: { display: false },
                            ticks: { color: '#94a3b8' }
                        },
                        y: { 
                            grid: { display: false },
                            ticks: { color: '#94a3b8' }
                        }
                    }
                }
            });
        }

        // --- RELATÓRIOS ANALÍTICOS ---
        function abrirModalRelatorio() { document.getElementById('modal-relatorio').classList.remove('hidden'); }
        function fecharModalRelatorio() { document.getElementById('modal-relatorio').classList.add('hidden'); }

        function gerarRelatorio() {
            document.getElementById('relatorio-data-geracao').innerText = "Gerado em: " + new Date().toLocaleDateString('pt-BR') + " às " + new Date().toLocaleTimeString('pt-BR');
            document.getElementById('relatorio-faturamento').innerText = document.getElementById('kpi-faturamento').innerText;
            document.getElementById('relatorio-tutores').innerText = tutores.length;
            document.getElementById('relatorio-pets').innerText = pets.length;

            const agendBody = document.getElementById('relatorio-agendamentos-body');
            agendBody.innerHTML = '';
            agendamentos.forEach(a => {
                const pet = pets.find(p => p.id === a.petId);
                const tutor = tutores.find(t => t.id === a.tutorId);
                agendBody.innerHTML += "<tr class='border-b border-slate-800 py-2 text-slate-300'>" +
                        "<td class='py-2 font-semibold text-slate-200'>" + (pet ? pet.nome : 'N/A') + "</td>" +
                        "<td class='py-2 text-slate-400'>" + (tutor ? tutor.nome : 'N/A') + "</td>" +
                        "<td class='py-2 font-medium text-slate-300'>" + a.servico + "</td>" +
                        "<td class='py-2 text-xs text-brand-pink font-bold'>" + formatarDataBr(a.data) + " às " + a.hora + "</td>" +
                        "<td class='py-2 text-right font-bold text-brand-lime'>R$ " + a.valor.toFixed(2) + "</td>" +
                    "</tr>";
            });

            const prodBody = document.getElementById('relatorio-produtos-body');
            prodBody.innerHTML = '';
            produtos.forEach(p => {
                prodBody.innerHTML += "<tr class='border-b border-slate-800 py-2 text-slate-300'>" +
                        "<td class='py-2 font-semibold text-slate-200'>" + p.nome + "</td>" +
                        "<td class='py-2 text-slate-400'>" + p.categoria + "</td>" +
                        "<td class='py-2 text-xs font-bold text-brand-lime'>" + (p.estoque <= 5 ? 'REPOSIÇÃO NECESSÁRIA' : 'SEGURO') + "</td>" +
                        "<td class='py-2 text-slate-300'>" + p.estoque + " un</td>" +
                        "<td class='py-2 text-right font-bold text-brand-lime'>R$ " + p.preco.toFixed(2) + "</td>" +
                    "</tr>";
            });

            abrirModalRelatorio();
        }

        const tipoRegistroInicial = document.getElementById('clinico-tipo')?.value || 'vacina';
        toggleCamposVacina(tipoRegistroInicial);

        // ========================================
        // FUNCIONALIDADES DO GESTOR
        // ========================================

        // --- CADASTRO DE SERVIÇOS ---
        function abrirModalServico() {
            // TODO [Frontend]: Abrir modal de cadastro de serviço (criar ou editar)
            alert('Modal de Serviço será implementado');
        }

        function salvarServico() {
            // TODO [API]: POST /api/servicos ou PUT /api/servicos/:id
            // Dados a enviar:
            // {
            //   "name": valor de #servico-nome,
            //   "type": valor de #servico-tipo,
            //   "price": valor de #servico-preco,
            //   "duration": valor de #servico-duracao,
            //   "description": valor de #servico-descricao
            // }
            console.log('Serviço salvo');
        }

        function editarServico(servicoId) {
            // TODO [API]: GET /api/servicos/:id para carregar dados do serviço
            // Preencher form com dados
            // Abrir modal de edição
            console.log('Editando serviço:', servicoId);
        }

        function excluirServico(servicoId) {
            // TODO [API]: DELETE /api/servicos/:id
            // Pedir confirmação antes de excluir
            if (confirm('Tem certeza que deseja excluir este serviço?')) {
                console.log('Serviço excluído:', servicoId);
            }
        }

        // --- EDITAR DADOS AGROPECUÁRIOS ---
        function salvarDadosAgro() {
            // TODO [API]: PUT /api/company/info
            // Dados a enviar:
            // {
            //   "name": document.getElementById('agro-nome').value,
            //   "cnpj": document.getElementById('agro-cnpj').value,
            //   "phone": document.getElementById('agro-telefone').value,
            //   "email": document.getElementById('agro-email').value,
            //   "address": document.getElementById('agro-endereco').value,
            //   "city": document.getElementById('agro-cidade').value,
            //   "state": document.getElementById('agro-estado').value,
            //   "zip_code": document.getElementById('agro-cep').value,
            //   "description": document.getElementById('agro-descricao').value,
            //   "logo": arquivo de #agro-logo (multipart upload)
            // }
            alert('Dados agropecuários salvos');
            console.log('Dados Agro salvos');
        }

        // --- RELATÓRIOS GESTOR ---
        function carregarRelatorios() {
            // TODO [API]: GET /api/reports/revenue, /api/reports/bookings, etc
            // Filtrar por:
            // - Data inicial: document.getElementById('relatorio-data-inicio').value
            // - Data final: document.getElementById('relatorio-data-fim').value
            // - Serviço: document.getElementById('relatorio-servico-filter').value
            
            console.log('Carregando relatórios...');
            // Atualizar gráficos (Chart.js)
            // TODO [Frontend]: Integrar Chart.js
            // carregarGraficoReceita();
            // carregarGraficoServicos();
            // carregarTabelaTopServicos();
        }

        function exportarRelatorios() {
            // TODO [API]: GET /api/reports/export?format=pdf ou xlsx
            // Retornar arquivo para download
            alert('Exportação será implementada');
            console.log('Exportando relatórios...');
        }

        function carregarGraficoReceita() {
            // TODO [Frontend - Chart.js]:
            // const ctx = document.getElementById('chart-receita').getContext('2d');
            // new Chart(ctx, {
            //   type: 'line',
            //   data: {
            //     labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            //     datasets: [{
            //       label: 'Receita',
            //       data: [2000, 2500, 3000, 2800, 3500, 4000],
            //       borderColor: '#84cc16',
            //       backgroundColor: 'rgba(132, 204, 22, 0.1)',
            //       tension: 0.4
            //     }]
            //   }
            // });
        }

        function carregarGraficoServicos() {
            // TODO [Frontend - Chart.js]:
            // Pie Chart com distribuição de agendamentos por serviço
            // Dados: GET /api/reports/bookings/by-service
        }

        function carregarTabelaTopServicos() {
            // TODO [API]: GET /api/reports/top-services
            // Preencher tabela com:
            // - Nome do serviço
            // - Quantidade de agendamentos
            // - Receita total
            // - Percentual
        }

        // --- SUPORTE A PERMISSÕES (gestor-only, admin-gestor-only) ---
        // Adicionar classes ao documento quando necessário
        function aplicarPermissaoGestor() {
            const currentRole = localStorage.getItem('userRole');
            
            // Mostrar elementos gestor-only apenas se role for 'gestor'
            if (currentRole === 'gestor') {
                document.querySelectorAll('.gestor-only').forEach(el => {
                    el.classList.remove('hidden');
                });
                
                // Mostrar relatório do gestor, não do tutor
                document.getElementById('relatorio-tutor-content')?.classList.add('hidden');
                document.getElementById('relatorio-gestor-content')?.classList.remove('hidden');
            }
        }
