// ============================================================
// TESTE DE BANCO — aplica as migrations num Postgres 17 descartável
// (container Docker) e roda a matriz de permissões (RLS).
//
// O QUE: prova, sem tocar na nuvem, que
//   1. `supabase/migrations/0001..0006` aplicam em ordem com ON_ERROR_STOP;
//   2. o seed é idempotente (roda 2× e não duplica catálogo);
//   3. a matriz admin/vet/func × SELECT/INSERT/UPDATE/DELETE bate com o RBAC
//      de `dayvet/script.js`, inclusive anexos privados e Storage.
//
// PORQUÊ: erro de RLS só aparece com dados e identidade; revisar SQL no olho
// não pega recursão de policy, GUC errado nem WITH CHECK frouxo.
//
// USO:  node tests/db.mjs
// Requer Docker. Sem Docker, o teste é declarado PULADO (lacuna, não sucesso).
// ============================================================

import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");
const dirMigrations = path.join(raiz, "supabase", "migrations");
const dirTests = path.join(raiz, "supabase", "tests");
const imagem = "postgres:17-alpine";
const container = `agendau-db-${process.pid}`;

let falhas = 0;
const ok = m => console.log(`  ✓ ${m}`);
const erro = m => { falhas++; console.error(`  ✗ ${m}`); };

function sh(cmd, args, opts = {}) {
    return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
}

function psql(arquivo) {
    const saida = sh("docker", ["exec", container, "psql", "-U", "postgres", "-q", "-v", "ON_ERROR_STOP=1", "-f", `/tmp/${path.basename(arquivo)}`]);
    return saida;
}

function dockerOk() {
    try { sh("docker", ["info", "--format", "{{.ServerVersion}}"]); return true; }
    catch { return false; }
}

console.log("\nDB — Postgres 17 descartável + matriz de RLS");

if (!dockerOk()) {
    console.log("  ! Docker indisponível — teste PULADO (lacuna declarada, não é sucesso).");
    process.exit(0);
}

try {
    // 1. Sobe o banco
    sh("docker", ["run", "-d", "--name", container, "-e", "POSTGRES_PASSWORD=teste", imagem]);
    ok("container iniciado");

    // 2. Espera ficar pronto (máx. ~30 s)
    let pronto = false;
    for (let i = 0; i < 60; i++) {
        try { sh("docker", ["exec", container, "pg_isready", "-U", "postgres"]); pronto = true; break; }
        catch { sh("sh", ["-c", "sleep 0.5"]); }
    }
    if (!pronto) { erro("Postgres não ficou pronto"); throw new Error("timeout"); }

    // 3. Stub do Supabase (auth.users, auth.uid(), roles anon/authenticated)
    const stub = path.join(dirTests, "00_auth_stub.sql");
    sh("docker", ["cp", stub, `${container}:/tmp/00_auth_stub.sql`]);
    psql(stub);
    ok("stub de auth aplicado");

    // 4. Migrations em ordem — duas passadas na 0002 para provar idempotência
    const migrations = readdirSync(dirMigrations).filter(f => f.endsWith(".sql")).sort();
    for (const arquivo of migrations) {
        const caminho = path.join(dirMigrations, arquivo);
        sh("docker", ["cp", caminho, `${container}:/tmp/${arquivo}`]);
        psql(caminho);
        if (arquivo.startsWith("0002")) { psql(caminho); ok(`${arquivo} aplicada 2× (idempotente)`); }
        else ok(`${arquivo} aplicada`);
    }

    // 5. Catálogo não duplicou
    const contagem = sh("docker", ["exec", container, "psql", "-U", "postgres", "-tAc",
        "select (select count(*) from public.vacina_tipos) || '/' || (select count(*) from public.raca_tipos)"]);
    contagem.trim() === "10/31" ? ok(`catálogo intacto após 2 execuções (${contagem.trim()})`)
        : erro(`catálogo duplicado: ${contagem.trim()} (esperado 10/31)`);

    // 5.1 RPC de login (Fase C) — caso tabelado entrada → e-mail
    const login = path.join(dirTests, "11_resolver_login.sql");
    sh("docker", ["cp", login, `${container}:/tmp/11_resolver_login.sql`]);
    const saidaLogin = psql(login);
    const falhasLogin = saidaLogin.split("\n").filter(l => l.startsWith(" FALHA") || l.startsWith("FALHA"));
    const totalLogin = (saidaLogin.match(/^\s*(OK|FALHA)\s*\|/gm) || []).length;
    if (falhasLogin.length === 0) ok(`resolver_login: ${totalLogin} casos, 0 falhas`);
    else {
        erro(`resolver_login: ${falhasLogin.length} falha(s) em ${totalLogin} casos`);
        falhasLogin.forEach(l => console.error("     " + l.trim()));
    }

    // 6. Matriz de permissões
    const matriz = path.join(dirTests, "10_matriz_rls.sql");
    sh("docker", ["cp", matriz, `${container}:/tmp/10_matriz_rls.sql`]);
    const saida = psql(matriz);
    const falhaLinhas = saida.split("\n").filter(l => l.startsWith(" FALHA") || l.startsWith("FALHA"));
    const total = (saida.match(/^\s*(OK|FALHA)\s*\|/gm) || []).length;

    if (falhaLinhas.length === 0) ok(`matriz de RLS: ${total} casos, 0 falhas`);
    else {
        erro(`matriz de RLS: ${falhaLinhas.length} falha(s) em ${total} casos`);
        falhaLinhas.forEach(l => console.error("     " + l.trim()));
    }

    // 7. Acesso à tabela de documentos e ao bucket privado
    const documentos = path.join(dirTests, "12_documentos_storage.sql");
    sh("docker", ["cp", documentos, `${container}:/tmp/12_documentos_storage.sql`]);
    const saidaDocumentos = psql(documentos);
    const falhasDocumentos = saidaDocumentos.split("\n").filter(l => l.startsWith(" FALHA") || l.startsWith("FALHA"));
    const totalDocumentos = (saidaDocumentos.match(/^\s*OK\s*\|/gm) || []).length;
    if (falhasDocumentos.length === 0 && totalDocumentos >= 8) {
        ok(`documentos/Storage: ${totalDocumentos} verificações, 0 falhas`);
    } else {
        erro(`documentos/Storage: ${falhasDocumentos.length} falha(s) em ${totalDocumentos} verificações`);
        falhasDocumentos.forEach(l => console.error("     " + l.trim()));
    }

    // 8. Persistência e enforcement de horários configuráveis.
    const horarios = path.join(dirTests, "13_configuracoes_horario.sql");
    sh("docker", ["cp", horarios, `${container}:/tmp/13_configuracoes_horario.sql`]);
    const saidaHorarios = psql(horarios);
    const totalHorarios = (saidaHorarios.match(/^\s*OK\s*\|/gm) || []).length;
    totalHorarios === 3 ? ok("horários, limite de pets e policies: 3 verificações, 0 falhas")
        : erro(`horários, limite de pets e policies: ${totalHorarios} verificações (esperado 3)`);
} catch (e) {
    erro(`execução abortada: ${e.message}`);
} finally {
    try { sh("docker", ["rm", "-f", container], { stdio: "ignore" }); } catch { /* já removido */ }
}

if (falhas) {
    console.error(`\nDB: ${falhas} falha(s).`);
    process.exit(1);
}
console.log("\nDB: tudo verde.");
