// ==========================================================
// VERIFICAÇÃO PÓS-PUBLICAÇÃO — DayVet publicado
// O QUE: confere assets de persistência, Auth real, RBAC e layout mobile.
// PORQUÊ: suíte verde no arquivo local não prova nada sobre o que
//         o Pages publicou — artefato pode estar velho ou incompleto
//         (o workflow copia só os arquivos listados em deploy-pages.yml).
// USO: node tests/publicado.mjs [url]
// REQUISITOS: rede + Playwright (mesmo pacote do tests/e2e.mjs).
// EVIDÊNCIA: prints em /tmp/ai-evidence/publicado-*.png
// ==========================================================
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const PKG = process.env.PLAYWRIGHT_PKG || "/home/ubuntu/.local/share/ai-tools/e2e/node_modules/playwright";
const { chromium } = require(PKG);

const URL = process.argv[2] || "https://ralph-zlt.github.io/Agendau_2/dayvet/";
const evidencia = process.env.E2E_EVIDENCE || "/tmp/ai-evidence";
fs.mkdirSync(evidencia, { recursive: true });

const ok = [];
const falhas = [];
const check = (nome, cond, detalhe = "") =>
    cond ? ok.push(nome) : falhas.push(detalhe ? `${nome} — ${detalhe}` : nome);

async function entra(page, perfil) {
    await page.goto(URL, { waitUntil: "load" });
    await page.locator("#acessos-teste button").filter({ hasText: perfil.botao }).first().click();
    await page.click("#auth-form button[type=submit]");
    await page.waitForFunction(
        () => document.getElementById("login-screen")?.classList.contains("hidden"),
        null, { timeout: 15000 }
    );
    return (await page.locator("#header-user-name").innerText()).trim();
}

console.log(`Verificando ${URL}\n`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

const problemas = [];
page.on("console", m => { if (m.type() === "error") problemas.push("console: " + m.text()); });
page.on("pageerror", e => problemas.push("pageerror: " + e.message));
page.on("response", r => { if (r.status() >= 400) problemas.push(`HTTP ${r.status()} ${r.url()}`); });

// `load` (não `networkidle`): em 2026-11-23 o Chromium 156 passou a resolver
// `networkidle` com o documento ainda em readyState "loading" — o parser não
// tinha chegado aos <script src="regras.js|script.js"> e as checagens de
// globais davam falso negativo. `load` só dispara depois que tudo executou.
await page.goto(URL, { waitUntil: "load" });
await page.waitForFunction(
    () => typeof window.handleAuthSubmit === "function",
    null, { timeout: 15000 }
);

// 1. Os assets novos estão realmente publicados
const publicado = await page.evaluate(() => ({
    login: typeof RegrasLogin !== "undefined" && typeof RegrasLogin.encontraUsuario === "function",
    assinatura: typeof RegrasTutor !== "undefined" && typeof RegrasTutor.assinaturaDocumento === "function",
    persistencia: typeof DayVetPersistencia !== "undefined" &&
        typeof DayVetPersistencia.carregarDados === "function",
    modo: MODO_DADOS
}));
check("RegrasLogin publicado", publicado.login);
check("assinaturaDocumento publicado", publicado.assinatura);
check("adaptadores de persistência publicados", publicado.persistencia);
check("frontend em modo Supabase real", publicado.modo === "real", publicado.modo);

// 2. Login pelas três contas reais de teste, conferindo nome e RBAC.
const casos = [
    { botao: "Admin", nome: "Raphael Dias", nav: "#nav-usuarios", visivel: true },
    { botao: "Veterinário", nome: "Dra. Laís", nav: "#nav-clinica", visivel: true },
    { botao: "Funcionário", nome: "Douglas", nav: "#nav-clinica", visivel: false }
];
for (const perfil of casos) {
    const perfilCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await perfilCtx.newPage();
    const nome = await entra(p, perfil);
    check(`login "${perfil.botao}" → ${perfil.nome}`, nome === perfil.nome, `mostrou "${nome}"`);
    check(`RBAC "${perfil.botao}"`,
        await p.locator(perfil.nav).isVisible() === perfil.visivel,
        `visibilidade de ${perfil.nav} incompatível`);
    await perfilCtx.close();
}

// Uma sessão Auth salva deve continuar no formulário até um novo envio explícito.
const sessaoCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const pExplicito = await sessaoCtx.newPage();
await entra(pExplicito, casos[0]);
await pExplicito.reload({ waitUntil: "load" });
await pExplicito.waitForTimeout(2000);
const loginVisivel = await pExplicito.locator("#login-screen").isVisible();
check("sessão salva não abre o painel ao recarregar", loginVisivel);
if (loginVisivel) {
    await pExplicito.fill("#login-cpf", "admin");
    await pExplicito.locator("#login-sugestoes button").first().click();
    check("sugestão de perfil só preenche", await pExplicito.locator("#login-screen").isVisible());
    await pExplicito.click("#auth-form button[type=submit]");
    await pExplicito.waitForFunction(
        () => document.getElementById("login-screen")?.classList.contains("hidden"),
        null, { timeout: 15000 }
    );
    check("botão Acessar funciona após selecionar sugestão",
        (await pExplicito.locator("#header-user-name").innerText()).trim() === "Raphael Dias");
}
await sessaoCtx.close();

// 3. Senha errada não entra
const erroCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const pErr = await erroCtx.newPage();
await pErr.goto(URL, { waitUntil: "domcontentloaded" });
await pErr.fill("#login-cpf", "raphael_dias");
await pErr.fill("#login-password", "senha-errada");
await pErr.click("#auth-form button[type=submit]");
await pErr.waitForTimeout(800);
check("senha errada mantém na tela de login", await pErr.locator("#login-screen").isVisible());
await erroCtx.close();

check("sem erro de console, página ou HTTP ≥400", problemas.length === 0, problemas.join(" | "));

// 5. Mobile sem overflow horizontal
const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const m = await mobileCtx.newPage();
await m.setViewportSize({ width: 390, height: 844 });
await m.goto(URL, { waitUntil: "load" });
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("mobile 390px sem overflow", overflow <= 1, `overflow ${overflow}px`);
await m.screenshot({ path: path.join(evidencia, "publicado-mobile.png") });

await mobileCtx.close();
await browser.close();

console.log(ok.map(x => "  ✓ " + x).join("\n"));
if (falhas.length) {
    console.log(falhas.map(x => "  ✗ " + x).join("\n"));
    console.log(`\nPublicado: ${falhas.length} falha(s).`);
    process.exit(1);
}
console.log(`\nPublicado OK: ${ok.length} verificações na URL real.`);
