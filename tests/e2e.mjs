// ==========================================================
// TESTES E2E — DayVet-Gestão (navegador real, headless)
// O QUE: sobe o produto como usuário real e valida os fluxos-chave.
// PORQUÊ: o ai-e2e da VPS executa todos os --click antes dos --fill,
//         o que impede fluxos de login (clicar depois de preencher).
//         Este runner usa o mesmo Playwright, na ordem correta.
// REQUISITOS: Playwright já instalado (ver ~/workspace/agents/TOOLS.md).
// USO: node tests/e2e.mjs [admin|vet|func|mobile|firefox|todos]
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
fs.mkdirSync(evidencia, { recursive: true });

const falhas = [];
function ok(msg) { console.log("  ✓ " + msg); }
function erro(msg) { falhas.push(msg); console.error("  ✗ " + msg); }

async function abrirPage(browser, { mobile = false } = {}) {
    const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 } });
    const problemas = [];
    page.on("console", m => { if (m.type() === "error") problemas.push("console: " + m.text()); });
    page.on("pageerror", e => problemas.push("pageerror: " + e.message));
    page.on("response", r => { if (r.status() >= 400) problemas.push(`HTTP ${r.status()}: ${r.url()}`); });
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
        const CPF = "999.888.777-66";
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
        (await page.locator("#tutores-grid button:has-text('Editar Tutor')").count()) > 0
            ? ok("funcionário vê 'Editar Tutor'") : erro("funcionário sem 'Editar Tutor'");

        // Cria um tutor limpo para o ciclo (sem pets/agenda/histórico).
        await page.click("#btn-novo-tutor");
        await page.fill("#tutor-nome", "Tutor E2E");
        await page.fill("#tutor-cpf", CPF);
        await page.fill("#tutor-tel", "(11) 99999-0000");
        await page.fill("#tutor-email", "tutor.e2e@dayvet.test");
        await page.fill("#tutor-endereco", "Rua do Teste, 1");
        await page.click("#modal-tutor button[type=submit]");
        await page.waitForTimeout(400);

        const cartao = page.locator("#tutores-grid > div").filter({ hasText: "Tutor E2E" });
        (await cartao.count()) === 1 ? ok("tutor de teste criado") : erro("tutor de teste não apareceu");

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
            { botao: "Admin", cpf: "111.111.111-11", senha: "1", nav: "#nav-usuarios", deveVer: true },
            { botao: "Veterinário", cpf: "333.333.333-33", senha: "2", nav: "#nav-clinica", deveVer: true },
            { botao: "Funcionário", cpf: "444.444.444-44", senha: "3", nav: "#nav-clinica", deveVer: false }
        ];
        for (const p of perfis) {
            const { page, problemas } = await abrirPage(browser);
            const botao = page.locator("#acessos-teste button").filter({ hasText: p.botao }).first();
            (await botao.isVisible()) ? ok(`botão "${p.botao}" visível`) : erro(`botão "${p.botao}" não apareceu`);
            await botao.click();

            const cpfPreenchido = await page.inputValue("#login-cpf");
            const senhaPreenchida = await page.inputValue("#login-password");
            cpfPreenchido === p.cpf ? ok(`${p.botao}: CPF preenchido`) : erro(`${p.botao}: CPF "${cpfPreenchido}"`);
            senhaPreenchida === p.senha ? ok(`${p.botao}: senha preenchida`) : erro(`${p.botao}: senha "${senhaPreenchida}"`);

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

    // Admin em viewport mobile (390x844).
    async mobile(browser) {
        const { page, problemas } = await abrirPage(browser, { mobile: true });
        await login(page, "1");
        await shot(page, "admin-mobile");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
        overflow ? erro("overflow horizontal no mobile") : ok("sem overflow horizontal no mobile");
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
const lista = alvo === "todos" ? ["admin", "vet", "func", "acessos", "mobile"]
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
