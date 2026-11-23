// ==========================================================
// REGRESSÃO 09 — Conclusão aparece no histórico e no dashboard após reload.
// FALHA SEM O FIX / PASSA COM O FIX — nunca renumerar.
// ==========================================================
import { execFileSync } from "node:child_process";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..", "..");
execFileSync(process.execPath, [path.join(raiz, "tests", "e2e.mjs"), "concluirPersistencia"], {
    stdio: "inherit"
});
