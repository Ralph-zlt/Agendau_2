// ==========================================================
// TESTES E2E — DayVet-Gestão (navegador real, headless)
// O QUE: sobe o produto como usuário real e valida os fluxos-chave.
// PORQUÊ: o ai-e2e da VPS executa todos os --click antes dos --fill,
//         o que impede fluxos de login (clicar depois de preencher).
//         Este runner usa o mesmo Playwright, na ordem correta.
// REQUISITOS: Playwright já instalado (ver ~/workspace/agents/TOOLS.md).
// USO: node tests/e2e.mjs [admin|vet|func|mobile|firefox|todos]
// Auth usa stub local; DAYVET_E2E_REAL_SUPABASE=1 testa os botões na nuvem.
// EVIDÊNCIA: screenshots em /tmp/ai-evidence/
// ==========================================================
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const PKG = process.env.PLAYWRIGHT_PKG || "/home/ubuntu/.local/share/ai-tools/e2e/node_modules/playwright";
const { chromium, firefox } = require(PKG);

const raiz = path.resolve(import.meta.dirname, "..");
const url = "file://" + path.join(raiz, "dayvet", "index.html");
const evidencia = process.env.E2E_EVIDENCE || "/tmp/ai-evidence";
const usarAuthStub = process.env.DAYVET_E2E_REAL_SUPABASE !== "1";
fs.mkdirSync(evidencia, { recursive: true });

const falhas = [];
function ok(msg) { console.log("  ✓ " + msg); }
function erro(msg) { falhas.push(msg); console.error("  ✗ " + msg); }

async function abrirPage(browser, { mobile = false, mustChange = false } = {}) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 } });
    const problemas = [];
    page.on("console", m => { if (m.type() === "error") problemas.push("console: " + m.text()); });
    page.on("pageerror", e => problemas.push("pageerror: " + e.message));
    page.on("response", r => { if (r.status() >= 400) problemas.push(`HTTP ${r.status()}: ${r.url()}`); });
    if (usarAuthStub) {
        await page.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js", route =>
            route.fulfill({ status: 200, contentType: "application/javascript", body: "" })
        );
        await page.addInitScript(({ exigeTroca }) => {
            const contas = [
                { id: "u1", usuario: "raphael_dias", cpf: "111.111.111-11", email: "raphael.dias@dayvet.com", nome: "Raphael Dias", role: "admin", crm: null, must_change: exigeTroca, active: true, deleted_at: null },
                { id: "u2", usuario: "lais_vet", cpf: "222.222.222-22", email: "lais.vet@dayvet.com", nome: "Dra. Laís", role: "veterinario", crm: "CRMV-SP 00000", must_change: false, active: true, deleted_at: null },
                { id: "u3", usuario: "douglas_funcionario", cpf: "333.333.333-33", email: "douglas.funcionario@dayvet.com", nome: "Douglas", role: "funcionario", crm: null, must_change: false, active: true, deleted_at: null }
            ];
            const tabelas = {
                tutores: [],
                pets: [],
                agendamentos: [],
                raca_tipos: [{ id: "raca-e2e-srd", especie: "Canino", nome: "SRD" }],
                historico_clinico: [],
                vacina_tipos: [],
                documentos: [],
                configuracoes_clinica: [{
                    id: true,
                    hora_abertura: "08:00:00",
                    hora_fechamento: "18:00:00",
                    modo_restricao: "comercial",
                    funcionamento_fds: "sabado"
                }],
                usuarios: contas
            };
            let sequencia = 0;
            let sessaoId = null;
            window.__supabaseTestState = {
                senhaAtualizada: false,
                trocaRegistrada: false,
                emailRedefinicao: null,
                redirectRedefinicao: null
            };
            let listenerAuth = null;
            window.__triggerAuthEvent = evento => listenerAuth?.(evento);
            window.supabase = {
                createClient() {
                    return {
                        async rpc(nome, args = {}) {
                            if (nome === "resolver_login") {
                                const identificador = String(args.p_identificador || "").trim().toLowerCase();
                                const digitos = identificador.replace(/\D/g, "");
                                const conta = contas.find(c =>
                                    c.usuario === identificador || c.email === identificador ||
                                    (digitos.length === 11 && c.cpf.replace(/\D/g, "") === digitos)
                                );
                                return { data: conta?.email || null, error: null };
                            }
                            if (nome === "marcar_senha_alterada") {
                                const conta = contas.find(c => c.id === sessaoId);
                                if (conta) conta.must_change = false;
                                window.__supabaseTestState.trocaRegistrada = true;
                                return { data: null, error: null };
                            }
                            return { data: null, error: { message: "RPC desconhecida" } };
                        },
                        auth: {
                            onAuthStateChange(callback) {
                                listenerAuth = callback;
                                return { data: { subscription: { unsubscribe() {} } } };
                            },
                            async getSession() {
                                return { data: { session: null }, error: null };
                            },
                            async resetPasswordForEmail(email, options) {
                                window.__supabaseTestState.emailRedefinicao = email;
                                window.__supabaseTestState.redirectRedefinicao = options.redirectTo;
                                return { data: {}, error: null };
                            },
                            async signInWithPassword({ email, password }) {
                                const conta = contas.find(c => c.email === email);
                                if (!conta || !conta.active || password !== "Veterin@ria") {
                                    return { data: { user: null }, error: { message: "Invalid login credentials" } };
                                }
                                sessaoId = conta.id;
                                return { data: { user: { id: conta.id, email: conta.email } }, error: null };
                            },
                            async updateUser({ password }) {
                                window.__supabaseTestState.senhaAtualizada = Boolean(password);
                                return { data: { user: { id: sessaoId } }, error: null };
                            },
                            async signOut() {
                                sessaoId = null;
                                return { error: null };
                            }
                        },
                        from(tabela) {
                            let operacao = "select";
                            let dadosEscrita = null;
                            const filtros = [];
                            const registros = tabelas[tabela] || [];
                            const executar = () => {
                                const encontrados = registros.filter(registro =>
                                    filtros.every(([coluna, valor]) => registro[coluna] === valor)
                                );
                                if (operacao === "insert") {
                                    const novos = (Array.isArray(dadosEscrita) ? dadosEscrita : [dadosEscrita])
                                        .map(registro => ({
                                            ...registro,
                                            ...(registro.id ? {} : { id: `e2e-${++sequencia}` })
                                        }));
                                    registros.push(...novos);
                                    return novos;
                                }
                                if (operacao === "update") {
                                    encontrados.forEach(registro => Object.assign(registro, dadosEscrita));
                                    return encontrados;
                                }
                                if (operacao === "delete") {
                                    const removidos = [...encontrados];
                                    encontrados.forEach(registro => {
                                        const indice = registros.indexOf(registro);
                                        if (indice >= 0) registros.splice(indice, 1);
                                    });
                                    return removidos;
                                }
                                return encontrados;
                            };
                            return {
                                select() { return this; },
                                order() { return this; },
                                range(inicio, fim) {
                                    const resultado = executar();
                                    return Promise.resolve({ data: resultado.slice(inicio, fim + 1), error: null });
                                },
                                eq(coluna, valor) {
                                    filtros.push([coluna, valor]);
                                    return this;
                                },
                                insert(dados) { operacao = "insert"; dadosEscrita = dados; return this; },
                                update(dados) { operacao = "update"; dadosEscrita = dados; return this; },
                                delete() { operacao = "delete"; return this; },
                                single() { return Promise.resolve({ data: executar()[0] || null, error: null }); },
                                maybeSingle() { return Promise.resolve({ data: executar()[0] || null, error: null }); },
                                then(resolve, reject) {
                                    return Promise.resolve({ data: executar(), error: null }).then(resolve, reject);
                                }
                            };
                        }
                    };
                }
            };
        }, { exigeTroca: mustChange });
    }
    await page.goto(url, { waitUntil: "load" });
    return { page, problemas };
}

// Login: preenche CPF/senha e submete (atalho demo 1/2/3).
async function login(page, cpf) {
    await page.fill("#login-cpf", cpf);
    await page.fill("#login-password", cpf);
    await page.click("#auth-form button[type=submit]");
    // Espera o login sumir (classe hidden) — o elemento continua no DOM.
    await page.waitForFunction(
        () => document.getElementById("login-screen")?.classList.contains("hidden"),
        null, { timeout: 8000 }
    );
}

async function visivel(page, seletor) {
    return page.locator(seletor).first().isVisible();
}

async function shot(page, nome) {
    const arquivo = path.join(evidencia, `${nome}-${Date.now()}.png`);
    await page.screenshot({ path: arquivo, fullPage: true });
    console.log("    print: " + arquivo);
}

// ----------------------------------------------------------
// CENÁRIOS
// ----------------------------------------------------------
const cenarios = {
    // Admin: vê tudo; módulo clínico sem atalho de guia.
    async admin(browser) {
        const { page, problemas } = await abrirPage(browser);
        await login(page, "1");
        (await visivel(page, "#nav-dashboard")) ? ok("dashboard visível") : erro("dashboard não apareceu");
        (await visivel(page, "#nav-usuarios")) ? ok("aba Usuários visível") : erro("aba Usuários ausente");
        (await visivel(page, "#nav-clinica")) ? ok("aba Clínica visível") : erro("aba Clínica ausente");

        await page.click("#nav-clinica");
        await page.waitForTimeout(300);
        const textoClinica = await page.locator("#tab-clinica").innerText();
        textoClinica.includes("Incluir Guia") ? erro("atalho 'Incluir Guia' ainda visível") : ok("atalho 'Incluir Guia' removido");
        const opcoes = await page.locator("#clinica-tipo option").allInnerTexts();
        opcoes.some(t => /guia/i.test(t)) ? erro("tipo 'guia' ainda no select: " + opcoes.join(" | ")) : ok("select de tipo sem guia");

        const prontuarioVazio = (await page.locator("#prontuario-count").innerText()).trim();
        prontuarioVazio === "0 registros"
            ? ok("sem prontuário fictício pré-carregado")
            : erro(`prontuário inicial inesperado: "${prontuarioVazio}"`);

        await shot(page, "admin-clinica");
        problemas.forEach(p => erro(p));
        await page.close();
    },

    // Veterinário: clínico + vacinação, sem financeiro.
    async vet(browser) {
        const { page, problemas } = await abrirPage(browser);
        await login(page, "2");
        (await visivel(page, "#nav-clinica")) ? ok("aba Clínica visível p/ vet") : erro("vet sem aba Clínica");
        const financeiro = await page.locator("#grafico-receita-card").isVisible();
        financeiro ? erro("vet está vendo o card financeiro") : ok("financeiro oculto p/ vet");
        await shot(page, "vet-dashboard");
        problemas.forEach(p => erro(p));
        await page.close();
    },

    // Funcionário: sem clínico; edita tutor e faz o ciclo arquivar/restaurar/excluir.
    async func(browser) {
        let CPF = "999.888.777-14";
        const CPF_EDITADO = "987.654.321-00";
        const { page, problemas } = await abrirPage(browser);
        page.on("dialog", async d => {
            if (d.type() === "prompt") await d.accept(CPF);
            else await d.accept();
        });

        await login(page, "3");
        (await visivel(page, "#nav-clinica")) ? erro("funcionário com aba Clínica") : ok("funcionário sem aba Clínica");
        (await visivel(page, "#nav-clientes")) ? ok("aba Tutores & Pets visível") : erro("funcionário sem aba Tutores & Pets");

        await page.click("#nav-clientes");
        await page.waitForTimeout(300);
        (await page.locator("#tutores-grid > div").count()) === 0
            ? ok("tutores de demonstração não são pré-carregados")
            : erro("há tutor fictício pré-carregado no banco de teste");

        // Cria um tutor limpo para o ciclo (sem pets/agenda/histórico).
        await page.click("#btn-novo-tutor");
        await page.fill("#tutor-nome", "Tutor E2E CPF inválido");
        await page.fill("#tutor-cpf", "999.888.777-66");
        await page.fill("#tutor-tel", "(11) 99999-0000");
        await page.click("#modal-tutor button[type=submit]");
        await page.waitForTimeout(200);
        const cpfInvalidoRejeitado = await page.getByText("CPF inválido. Verifique os dígitos informados.", { exact: true }).isVisible()
            && await page.locator("#modal-tutor").isVisible()
            && await page.locator("#tutores-grid > div").filter({ hasText: "Tutor E2E CPF inválido" }).count() === 0;
        cpfInvalidoRejeitado ? ok("CPF com dígitos verificadores inválidos não é cadastrado") : erro("CPF inválido não foi bloqueado");

        await page.fill("#tutor-nome", "Tutor E2E");
        await page.fill("#tutor-cpf", CPF.replace(/\D/g, ""));
        await page.fill("#tutor-tel", "(11) 99999-0000");
        await page.fill("#tutor-email", "tutor.e2e@dayvet.test");
        await page.fill("#tutor-endereco", "Rua do Teste, 1");
        await page.click("#modal-tutor button[type=submit]");
        await page.waitForTimeout(400);

        const cartao = page.locator("#tutores-grid > div").filter({ hasText: "Tutor E2E" });
        (await cartao.count()) === 1 ? ok("tutor de teste criado") : erro("tutor de teste não apareceu");

        await cartao.locator("button:has-text('Editar Tutor')").first().click();
        await page.fill("#edit-tutor-cpf", CPF_EDITADO.replace(/\D/g, ""));
        await page.click("#modal-editar-tutor button[type=submit]");
        await page.waitForTimeout(400);
        CPF = CPF_EDITADO;
        (await cartao.getByText(`CPF: ${CPF}`, { exact: true }).count()) === 1
            ? ok("edição persiste CPF alterado com máscara canônica")
            : erro("edição não persistiu CPF alterado");

        // Arquiva
        await cartao.locator("button:has-text('Arquivar')").first().click();
        await page.waitForTimeout(400);
        (await page.locator("#tutores-grid > div").filter({ hasText: "Tutor E2E" }).count()) === 0
            ? ok("tutor arquivado saiu da lista padrão") : erro("tutor arquivado continua na lista");

        // Não pode aparecer em selects (novo pet)
        await page.click("#btn-novo-pet");
        const opcoesPet = await page.locator("#pet-tutor-select option").allInnerTexts();
        opcoesPet.some(t => t.includes(CPF)) ? erro("tutor arquivado aparece no select de pet") : ok("tutor arquivado fora do select de pet");
        await page.evaluate(() => fecharModalPet());

        // Mostra arquivados + restaura
        await page.click("#btn-mostrar-arquivados");
        await page.waitForTimeout(200);
        (await page.locator("#tutores-grid > div").filter({ hasText: "Tutor E2E" }).count()) === 1
            ? ok("'Mostrar arquivados' exibe o tutor") : erro("tutor arquivado não apareceu com o filtro");
        await page.locator("#tutores-grid > div").filter({ hasText: "Tutor E2E" }).locator("button:has-text('Restaurar')").first().click();
        await page.waitForTimeout(300);
        await page.click("#btn-novo-pet");
        const opcoesPet2 = await page.locator("#pet-tutor-select option").allInnerTexts();
        opcoesPet2.some(t => t.includes(CPF)) ? ok("tutor restaurado volta aos selects") : erro("tutor restaurado não voltou aos selects");
        await page.evaluate(() => fecharModalPet());

        // Arquiva de novo e exclui definitivamente (sem vínculos)
        await page.locator("#tutores-grid > div").filter({ hasText: "Tutor E2E" }).locator("button:has-text('Arquivar')").first().click();
        await page.waitForTimeout(400);
        await page.locator("#tutores-grid > div").filter({ hasText: "Tutor E2E" }).locator("button:has-text('Excluir definitivo')").first().click();
        await page.waitForTimeout(500);
        (await page.locator("#tutores-grid > div").filter({ hasText: "Tutor E2E" }).count()) === 0
            ? ok("tutor excluído definitivamente") : erro("tutor continua após exclusão definitiva");

        await shot(page, "func-tutores");
        problemas.forEach(p => erro(p));
        await page.close();
    },

    // Botões de acesso rápido de teste: preenchem CPF + senha e o login real
    // (não o atalho 1/2/3) autentica cada perfil.
    async acessos(browser) {
        const perfis = [
            { botao: "Admin", usuario: "raphael_dias", nome: "Raphael Dias", nav: "#nav-usuarios", deveVer: true },
            { botao: "Veterinário", usuario: "lais_vet", nome: "Dra. Laís", nav: "#nav-clinica", deveVer: true },
            { botao: "Funcionário", usuario: "douglas_funcionario", nome: "Douglas", nav: "#nav-clinica", deveVer: false }
        ];
        for (const p of perfis) {
            const { page, problemas } = await abrirPage(browser);
            const botao = page.locator("#acessos-teste button").filter({ hasText: p.botao }).first();
            (await botao.isVisible()) ? ok(`botão "${p.botao}" visível`) : erro(`botão "${p.botao}" não apareceu`);
            await botao.click();

            const usuarioPreenchido = await page.inputValue("#login-cpf");
            const senhaPreenchida = await page.inputValue("#login-password");
            usuarioPreenchido === p.usuario ? ok(`${p.botao}: usuário preenchido`) : erro(`${p.botao}: usuário "${usuarioPreenchido}"`);
            senhaPreenchida.length > 0 ? ok(`${p.botao}: senha preenchida`) : erro(`${p.botao}: senha não preenchida`);

            await page.click("#auth-form button[type=submit]");
            await page.waitForFunction(
                () => document.getElementById("login-screen")?.classList.contains("hidden"),
                null, { timeout: 8000 }
            );
            ok(`${p.botao}: login concluído`);

            const viu = await visivel(page, p.nav);
            viu === p.deveVer ? ok(`${p.botao}: "${p.nav}" ${p.deveVer ? "visível" : "oculto"} como esperado`)
                : erro(`${p.botao}: "${p.nav}" inesperado (${viu})`);

            problemas.forEach(x => erro(x));
            await page.close();
        }
    },

    // Login aceita usuário, CPF (com/sem máscara) e e-mail; senha errada não entra.
    async identificadores(browser) {
        const perfis = [
            { nome: "Raphael Dias", usuario: "raphael_dias", cpf: "11111111111", mask: "111.111.111-11", email: "raphael.dias@dayvet.com" },
            { nome: "Dra. Laís", usuario: "lais_vet", cpf: "22222222222", mask: "222.222.222-22", email: "lais.vet@dayvet.com" },
            { nome: "Douglas", usuario: "douglas_funcionario", cpf: "33333333333", mask: "333.333.333-33", email: "douglas.funcionario@dayvet.com" }
        ];
        for (const p of perfis) {
            for (const [rotulo, identificador] of [
                ["usuário", p.usuario], ["usuário com maiúsculas", p.usuario.toUpperCase()],
                ["CPF sem máscara", p.cpf], ["CPF mascarado", p.mask], ["e-mail", p.email]
            ]) {
                const { page, problemas } = await abrirPage(browser);
                await page.fill("#login-cpf", identificador);
                await page.fill("#login-password", "Veterin@ria");
                await page.click("#auth-form button[type=submit]");
                await page.waitForFunction(
                    () => document.getElementById("login-screen")?.classList.contains("hidden"),
                    null, { timeout: 8000 }
                );
                const nomeNoHeader = await page.locator("#header-user-name").innerText();
                nomeNoHeader === p.nome
                    ? ok(`${p.nome} por ${rotulo} ("${identificador}")`)
                    : erro(`${p.nome} por ${rotulo}: header mostrou "${nomeNoHeader}"`);
                problemas.forEach(x => erro(x));
                await page.close();
            }
        }

        // Senha errada: continua na tela de login
        const { page } = await abrirPage(browser);
        await page.fill("#login-cpf", "raphael_dias");
        await page.fill("#login-password", "senha-errada");
        await page.click("#auth-form button[type=submit]");
        await page.waitForTimeout(600);
        (await page.locator("#login-screen").isVisible())
            ? ok("senha errada mantém na tela de login") : erro("senha errada logou!");
        await page.close();
    },

    // Primeiro acesso exige troca no Auth e baixa must_change pela RPC.
    async mustChange(browser) {
        const { page, problemas } = await abrirPage(browser, { mustChange: true });
        await page.fill("#login-cpf", "raphael_dias");
        await page.fill("#login-password", "Veterin@ria");
        await page.click("#auth-form button[type=submit]");
        await page.waitForFunction(
            () => !document.getElementById("forcar-senha-etapa")?.classList.contains("hidden"),
            null, { timeout: 8000 }
        );
        await page.fill("#forcar-senha-nova", "NovaSenha2026!");
        await page.fill("#forcar-senha-confirmar", "NovaSenha2026!");
        await page.click("#forcar-senha-etapa button:has-text('Alterar e Entrar')");
        await page.waitForFunction(
            () => document.getElementById("login-screen")?.classList.contains("hidden"),
            null, { timeout: 8000 }
        );
        const estado = await page.evaluate(() => window.__supabaseTestState);
        estado.senhaAtualizada ? ok("must_change: senha enviada ao Supabase Auth") : erro("must_change: senha não atualizada");
        estado.trocaRegistrada ? ok("must_change: flag baixada pela RPC") : erro("must_change: flag não foi baixada");
        problemas.forEach(p => erro(p));
        await page.close();
    },

    // Recuperação usa a RPC de identificador e a sessão PASSWORD_RECOVERY do Auth.
    async recuperarSenha(browser) {
        const { page, problemas } = await abrirPage(browser);
        await page.click("#btn-esqueci-senha");
        await page.fill("#recuperar-cpf", "raphael_dias");
        await page.click("#btn-recuperar-proximo");
        await page.waitForFunction(
            () => document.getElementById("modal-recuperar-senha")?.classList.contains("hidden"),
            null, { timeout: 8000 }
        );
        const pedido = await page.evaluate(() => window.__supabaseTestState);
        pedido.emailRedefinicao === "raphael.dias@dayvet.com"
            ? ok("recovery: identificador resolvido e link solicitado pelo Auth")
            : erro("recovery: pedido de link não chegou ao Auth");
        await page.evaluate(() => window.__triggerAuthEvent("PASSWORD_RECOVERY"));
        await page.waitForFunction(
            () => !document.getElementById("recuperar-etapa-2")?.classList.contains("hidden"),
            null, { timeout: 8000 }
        );
        await page.fill("#recuperar-nova-senha", "NovaSenha2026!");
        await page.fill("#recuperar-confirmar-senha", "NovaSenha2026!");
        await page.click("#btn-recuperar-confirmar");
        await page.waitForFunction(
            () => document.getElementById("modal-recuperar-senha")?.classList.contains("hidden"),
            null, { timeout: 8000 }
        );
        const concluido = await page.evaluate(() => window.__supabaseTestState);
        concluido.senhaAtualizada ? ok("recovery: senha atualizada no Auth") : erro("recovery: senha não atualizada");
        concluido.trocaRegistrada ? ok("recovery: flag de primeiro acesso atualizada") : erro("recovery: flag não atualizada");
        problemas.forEach(p => erro(p));
        await page.close();
    },

    // Admin em viewport mobile (390x844).
    async mobile(browser) {
        const { page, problemas } = await abrirPage(browser, { mobile: true });
        await login(page, "1");
        await shot(page, "admin-mobile");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
        overflow ? erro("overflow horizontal no mobile") : ok("sem overflow horizontal no mobile");
        problemas.forEach(p => erro(p));
        await page.close();
    },

    // Login em janela baixa: o cartão deve rolar e o envio continuar clicável.
    async loginAlturaCurta(browser) {
        const { page, problemas } = await abrirPage(browser);
        await page.setViewportSize({ width: 613, height: 304 });
        const rolagem = await page.locator("#login-screen").evaluate(el => ({
            disponivel: el.scrollHeight > el.clientHeight,
            overflowY: getComputedStyle(el).overflowY
        }));
        rolagem.disponivel && rolagem.overflowY === "auto"
            ? ok("tela de login permite rolagem vertical em janela baixa")
            : erro("tela de login continua cortada em janela baixa");
        await page.locator("#acessos-teste button").filter({ hasText: "Admin" }).click();
        await page.click("#auth-form button[type=submit]");
        await page.waitForFunction(
            () => document.getElementById("login-screen")?.classList.contains("hidden"),
            null, { timeout: 8000 }
        );
        (await page.locator("#header-user-role").innerText()).includes("Administrador")
            ? ok("botão de acesso autentica em janela baixa")
            : erro("login não concluiu em janela baixa");
        problemas.forEach(p => erro(p));
        await page.close();
    },

    // O painel mensal deve incluir agendamentos do mês futuro selecionado.
    async financeMonth(browser) {
        const { page, problemas } = await abrirPage(browser);
        await login(page, "1");
        const periodo = await page.evaluate(() => {
            const data = new Date();
            data.setDate(1);
            data.setMonth(data.getMonth() + 1);
            while (data.getDay() === 0 || data.getDay() === 6) data.setDate(data.getDate() + 1);
            const mes = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
            const dia = String(data.getDate()).padStart(2, "0");
            return { mes, data: `${mes}-${dia}` };
        });

        await page.click("#nav-clientes");
        await page.click("#btn-novo-tutor");
        await page.fill("#tutor-nome", "Tutor E2E Financeiro");
        await page.fill("#tutor-cpf", "98765432100");
        await page.fill("#tutor-tel", "11999990000");
        await page.fill("#tutor-email", "financeiro.e2e@dayvet.test");
        await page.fill("#tutor-endereco", "Rua E2E, 1");
        await page.click("#modal-tutor button[type=submit]");
        await page.getByText("Tutor cadastrado", { exact: true }).waitFor({ timeout: 5000 });

        await page.click("#btn-novo-pet");
        await page.locator("#pet-tutor-select").selectOption("987.654.321-00");
        await page.fill("#pet-nome", "Pet E2E Financeiro");
        await page.locator("#pet-especie").selectOption("Canino");
        await page.locator("#pet-sexo").selectOption("Macho");
        await page.fill("#pet-comportamento", "Teste de dashboard");
        await page.fill("#pet-alergias", "Não informado — teste");
        await page.click("#modal-pet button[type=submit]");
        try {
            await page.getByText("Pet cadastrado", { exact: true }).waitFor({ timeout: 5000 });
        } catch {
            const toast = (await page.locator("#toast-container").innerText()).trim();
            const modal = (await page.locator("#modal-pet").innerText()).trim();
            const campos = await page.locator("#modal-pet form select").evaluateAll(selects =>
                selects.map(select => ({
                    id: select.id,
                    value: select.value,
                    valid: select.validity.valid,
                    options: [...select.options].map(option => option.value)
                }))
            );
            throw new Error(`cadastro do pet não confirmou; toast="${toast}"; campos=${JSON.stringify(campos)}; modal="${modal}"`);
        }

        await page.click("#nav-agendamentos");
        await page.click("#btn-agendar-consulta");
        await page.locator("#agend-tutor-select").selectOption("987.654.321-00");
        await page.locator("#agend-pet-select").selectOption({ index: 0 });
        await page.fill("#agend-tipo", "Consulta E2E Financeiro");
        await page.fill("#agend-data", periodo.data);
        await page.fill("#agend-hora", "10:00");
        await page.fill("#agend-valor", "123.45");
        await page.click("#modal-agendamento button[type=submit]");
        await page.getByText("Agendamento criado", { exact: true }).waitFor({ timeout: 5000 });

        await page.click("#nav-dashboard");
        const seletorMes = page.locator("#mes-faturamento");
        await seletorMes.fill(periodo.mes);
        await page.waitForFunction(
            () => document.getElementById("kpi-faturamento")?.textContent === "R$ 123,45",
            null, { timeout: 5000 }
        );
        (await seletorMes.isVisible())
            ? ok("valor confirmado aparece no mês escolhido")
            : erro("seletor de mês não está visível para admin");
        (await page.locator("#kpi-faturamento").innerText()) === "R$ 123,45"
            ? ok("dashboard inclui o valor do agendamento futuro")
            : erro("dashboard não somou o agendamento futuro");

        await page.selectOption("#periodo-faturamento", "anual");
        await page.waitForFunction(
            () => document.getElementById("kpi-faturamento")?.textContent === "R$ 123,45",
            null, { timeout: 5000 }
        );
        await page.selectOption("#periodo-faturamento", "mensal");
        (await page.locator("#mes-faturamento").isVisible())
            ? ok("seletor de mês volta ao alternar para o período mensal")
            : erro("seletor de mês não voltou no período mensal");

        problemas.forEach(p => erro(p));
        await page.close();
    }
};

// ----------------------------------------------------------
// EXECUÇÃO
// ----------------------------------------------------------
const alvo = process.argv[2] || "todos";
const navegador = alvo === "firefox" ? "firefox" : "chromium";
const tipo = navegador === "firefox" ? firefox : chromium;
const lista = alvo === "todos" ? ["admin", "vet", "func", "acessos", "identificadores", "mustChange", "recuperarSenha", "mobile", "loginAlturaCurta", "financeMonth"]
    : alvo === "firefox" ? ["admin", "func"]
    : [alvo];

const browser = await tipo.launch();
console.log(`\nE2E — ${navegador} — ${lista.join(", ")}`);
for (const nome of lista) {
    if (!cenarios[nome]) { erro(`cenário desconhecido: ${nome}`); continue; }
    console.log(`\n[${nome}]`);
    try {
        await cenarios[nome](browser);
    } catch (e) {
        erro(`${nome}: ${e.message}`);
    }
}
await browser.close();

if (falhas.length) {
    console.error(`\nE2E: ${falhas.length} falha(s).`);
    process.exit(1);
}
console.log("\nE2E: tudo verde.");
