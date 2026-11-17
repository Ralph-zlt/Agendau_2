// ==========================================================
// VERIFICAÇÃO PÓS-PUBLICAÇÃO — demo do GitHub Pages
// O QUE: abre a URL pública de verdade e confere que o que está
//        no ar é a versão testada localmente (assets, login pelos
//        3 identificadores, assinatura da receita, mobile).
// PORQUÊ: suíte verde no arquivo local não prova nada sobre o que
//         o Pages publicou — artefato pode estar velho ou incompleto
//         (o workflow copia só os arquivos listados em deploy-pages.yml).
// USO: node tests/publicado.mjs [url]
// REQUISITOS: rede + Playwright (mesmo pacote do tests/e2e.mjs).
// EVIDÊNCIA: prints em /tmp/ai-evidence/publicado-*.png
// ==========================================================
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const PKG = process.env.PLAYWRIGHT_PKG || "/home/ubuntu/.local/share/ai-tools/e2e/node_modules/playwright";
const { chromium } = require(PKG);

const URL = process.argv[2] || "https://ralph-zlt.github.io/Agendau_2/dayvet/";
const SENHA = "Veterin@ria";

const ok = [];
const falhas = [];
const check = (nome, cond, detalhe = "") =>
    cond ? ok.push(nome) : falhas.push(detalhe ? `${nome} — ${detalhe}` : nome);

async function entra(page, identificador) {
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.fill("#login-cpf", identificador);
    await page.fill("#login-password", SENHA);
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

await page.goto(URL, { waitUntil: "networkidle" });

// 1. Os assets novos estão realmente publicados
const publicado = await page.evaluate(() => ({
    login: typeof RegrasLogin !== "undefined" && typeof RegrasLogin.encontraUsuario === "function",
    assinatura: typeof RegrasTutor !== "undefined" && typeof RegrasTutor.assinaturaDocumento === "function",
    contas: (typeof usuariosMock !== "undefined" ? usuariosMock.map(u => u.username) : []).join(",")
}));
check("RegrasLogin publicado", publicado.login);
check("assinaturaDocumento publicado", publicado.assinatura);
check("3 contas de teste publicadas",
    publicado.contas === "raphael_dias,lais_vet,douglas_funcionario", publicado.contas);

// 2. Login pelos três identificadores, conferindo o nome no header
const casos = [
    ["raphael_dias", "Raphael Dias"],
    ["11111111111", "Raphael Dias"],
    ["111.111.111-11", "Raphael Dias"],
    ["lais_vet", "Dra. Laís"],
    ["222.222.222-22", "Dra. Laís"],
    ["douglas_funcionario", "Douglas"],
    ["33333333333", "Douglas"]
];
for (const [identificador, esperado] of casos) {
    const p = await ctx.newPage();
    const nome = await entra(p, identificador);
    check(`login "${identificador}" → ${esperado}`, nome === esperado, `mostrou "${nome}"`);
    await p.close();
}

// 3. Senha errada não entra
const pErr = await ctx.newPage();
await pErr.goto(URL, { waitUntil: "domcontentloaded" });
await pErr.fill("#login-cpf", "raphael_dias");
await pErr.fill("#login-password", "senha-errada");
await pErr.click("#auth-form button[type=submit]");
await pErr.waitForTimeout(800);
check("senha errada mantém na tela de login", await pErr.locator("#login-screen").isVisible());
await pErr.close();

// 4. Receita: nome e CRMV da mesma pessoa (admin não assina com CRMV alheio)
await entra(page, "raphael_dias");
await page.waitForTimeout(400);
await page.evaluate(() => imprimirDocumentoGenerico(historicoClinico[0].id));
await page.waitForTimeout(300);
const assinatura = {
    nome: (await page.locator("#doc-vet-nome").innerText()).trim(),
    crm: (await page.locator("#doc-vet-crmv").innerText()).trim(),
    rodape: (await page.locator("#doc-assinatura-nome").innerText()).trim()
};
check("receita assinada pelo vet de referência",
    assinatura.nome === "Dra. Laís" && assinatura.rodape === "Dra. Laís", JSON.stringify(assinatura));
check("CRMV coerente na receita", assinatura.crm === "CRMV-SP 00000", assinatura.crm);
await page.screenshot({ path: "/tmp/ai-evidence/publicado-receita.png" });

check("sem erro de console, página ou HTTP ≥400", problemas.length === 0, problemas.join(" | "));

// 5. Mobile sem overflow horizontal
const m = await ctx.newPage();
await m.setViewportSize({ width: 390, height: 844 });
await m.goto(URL, { waitUntil: "networkidle" });
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("mobile 390px sem overflow", overflow <= 1, `overflow ${overflow}px`);
await m.screenshot({ path: "/tmp/ai-evidence/publicado-mobile.png" });

await browser.close();

console.log(ok.map(x => "  ✓ " + x).join("\n"));
if (falhas.length) {
    console.log(falhas.map(x => "  ✗ " + x).join("\n"));
    console.log(`\nPublicado: ${falhas.length} falha(s).`);
    process.exit(1);
}
console.log(`\nPublicado OK: ${ok.length} verificações na URL real.`);
