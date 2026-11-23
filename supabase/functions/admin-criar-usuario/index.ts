import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cabecalhosCors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function resposta(status: number, corpo: Record<string, unknown>) {
    return new Response(JSON.stringify(corpo), {
        status,
        headers: { ...cabecalhosCors, "Content-Type": "application/json" }
    });
}

function cpfValido(valor: string) {
    const cpf = valor.replace(/\D/g, "");
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    for (let tamanho = 9; tamanho <= 10; tamanho++) {
        let soma = 0;
        for (let i = 0; i < tamanho; i++) soma += Number(cpf[i]) * (tamanho + 1 - i);
        const resto = (soma * 10) % 11;
        const digito = resto === 10 ? 0 : resto;
        if (digito !== Number(cpf[tamanho])) return false;
    }
    return true;
}

function cpfFormatado(valor: string) {
    const digitos = valor.replace(/\D/g, "");
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

function senhaTemporaria() {
    const grupos = [
        "ABCDEFGHJKLMNPQRSTUVWXYZ",
        "abcdefghijkmnopqrstuvwxyz",
        "23456789",
        "!@#$%*-_"
    ];
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const senha = grupos.map((grupo, i) => grupo[bytes[i] % grupo.length]).join("") +
        Array.from(bytes.slice(4), byte => "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_"[
            byte % "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_".length
        ]).join("");
    const caracteres = [...senha];
    for (let i = caracteres.length - 1; i > 0; i--) {
        const j = bytes[(i + 4) % bytes.length] % (i + 1);
        [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
    }
    return caracteres.join("");
}

function dataCrmvValida(valor: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const data = new Date(`${valor}T00:00:00Z`);
    return !Number.isNaN(data.getTime()) &&
        data.toISOString().slice(0, 10) === valor &&
        valor >= new Date().toISOString().slice(0, 10);
}

Deno.serve(async (requisicao) => {
    if (requisicao.method === "OPTIONS") {
        return new Response("ok", { headers: cabecalhosCors });
    }
    if (requisicao.method !== "POST") return resposta(405, { error: "Método não permitido." });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = requisicao.headers.get("Authorization") || "";
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
        console.error("Configuração do Supabase indisponível na Edge Function.");
        return resposta(500, { error: "Serviço de cadastro indisponível." });
    }
    if (!token) return resposta(401, { error: "Autenticação necessária." });

    const clienteUsuario = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: authData, error: erroAuth } = await clienteUsuario.auth.getUser(token);
    if (erroAuth || !authData.user) return resposta(401, { error: "Autenticação necessária." });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: perfil, error: erroPerfil } = await admin
        .from("usuarios")
        .select("role, active, deleted_at")
        .eq("id", authData.user.id)
        .maybeSingle();
    if (erroPerfil) {
        console.error("Falha ao validar perfil administrativo.", erroPerfil.code || "sem código");
        return resposta(500, { error: "Não foi possível validar a permissão administrativa." });
    }
    if (!perfil || perfil.role !== "admin" || !perfil.active || perfil.deleted_at) {
        return resposta(403, { error: "Apenas administradores ativos podem cadastrar usuários." });
    }

    let entrada: Record<string, unknown>;
    try {
        entrada = await requisicao.json();
    } catch {
        return resposta(400, { error: "Requisição inválida." });
    }
    const nome = typeof entrada.nome === "string" ? entrada.nome.trim() : "";
    const cpf = typeof entrada.cpf === "string" ? entrada.cpf : "";
    const email = typeof entrada.email === "string" ? entrada.email.trim().toLowerCase() : "";
    const role = entrada.role;
    const crm = typeof entrada.crm === "string" ? entrada.crm.trim() : "";
    const crmValidade = typeof entrada.crm_validade === "string" ? entrada.crm_validade : "";

    if (!nome || nome.length > 255 || !cpfValido(cpf) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255 ||
        !["admin", "veterinario", "funcionario"].includes(String(role))) {
        return resposta(400, { error: "Revise nome, CPF, e-mail e perfil informados." });
    }
    if (role === "veterinario" && (!crm || crm.length > 50 || !dataCrmvValida(crmValidade))) {
        return resposta(400, { error: "Veterinários precisam informar CRMV e validade vigente." });
    }

    const senha = senhaTemporaria();
    const { data: criado, error: erroCriacao } = await admin.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true
    });
    if (erroCriacao || !criado.user) {
        console.error("Falha ao criar credencial Auth.", erroCriacao?.code || "sem código");
        return resposta(409, { error: "Não foi possível criar a conta. Verifique se CPF ou e-mail já estão cadastrados." });
    }

    const { error: erroCadastro } = await admin.from("usuarios").insert({
        id: criado.user.id,
        cpf: cpfFormatado(cpf),
        nome,
        email,
        role,
        crm: role === "veterinario" ? crm : null,
        crm_validade: role === "veterinario" ? crmValidade : null,
        must_change: true,
        active: true,
        criado_por: authData.user.id
    });
    if (erroCadastro) {
        const { error: erroRollback } = await admin.auth.admin.deleteUser(criado.user.id);
        console.error("Falha ao criar perfil público.", erroCadastro.code || "sem código");
        if (erroRollback) console.error("Falha ao remover credencial criada sem perfil.", erroRollback.code || "sem código");
        return resposta(409, { error: "Não foi possível concluir o cadastro. Verifique se CPF ou e-mail já estão cadastrados." });
    }

    return resposta(201, {
        usuario: {
            id: criado.user.id,
            cpf: cpfFormatado(cpf),
            nome,
            email,
            role,
            crm: role === "veterinario" ? crm : null,
            crm_validade: role === "veterinario" ? crmValidade : null,
            must_change: true,
            active: true
        },
        senha_temporaria: senha
    });
});
