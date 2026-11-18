// ==========================================================
// CONFIGURAÇÃO PÚBLICA — Supabase (Fase B, 2026-11-18)
// O QUE: URL do projeto e chave `anon` (publishable).
// PORQUÊ: a chave `anon` é pública por design — vai em toda requisição
//         do navegador e só permite o que as policies de RLS autorizam.
// SEGREDO: a chave `service_role` NUNCA entra aqui nem no repositório.
//          Ela fica em ~/.supabase/agendau-keys.env (modo 600), fora do Git.
// ESTADO: este arquivo ainda NÃO é carregado pelo index.html — a ponte de
//         Auth e de dados é a Fase C. Até lá o front continua 100% mock.
// ==========================================================
window.DAYVET_CONFIG = {
    supabaseUrl: "https://dkdvhstjnverofgzwzne.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrZHZoc3RqbnZlcm9mZ3p3em5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1MDk0MjMsImV4cCI6MjExMDA4NTQyM30.JkXask5LJbk34BZKp0WVm9eGQLjmiKhFkAylnuk2vAs",
    projeto: "agendau-2",
    regiao: "sa-east-1",
    ambiente: "producao",
    fase: "B — banco criado e validado; frontend ainda com dados mockados"
};
