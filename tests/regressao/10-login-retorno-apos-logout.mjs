// ==========================================================
// REGRESSÃO 10 — Login continua funcional após sair e retornar.
// FALHA SEM O FIX / PASSA COM O FIX — nunca renumerar.
// ==========================================================
import { execFileSync } from "node:child_process";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..", "..");
execFileSync(process.execPath, [path.join(raiz, "tests", "e2e.mjs"), "loginExplicito"], {
    stdio: "inherit"
});
