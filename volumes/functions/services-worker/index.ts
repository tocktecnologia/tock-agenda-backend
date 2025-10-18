import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, content-type",
};

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Missing environment variables");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Obter ID do trabalhador da URL ou query params
        const url = new URL(req.url);
        const trabalhadorId = url.searchParams.get("trabalhador_id");

        if (!trabalhadorId) {
            return new Response(
                JSON.stringify({ error: "trabalhador_id é obrigatório" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Passo 1: Buscar os IDs dos serviços na tabela trabalhador_servico
        const { data: trabalhadorServicos, error: erro1 } = await supabase
            .from("trabalhador_servico")
            .select("servico_id")
            .eq("trabalhador_id", trabalhadorId);

        if (erro1) {
            throw erro1;
        }

        if (!trabalhadorServicos || trabalhadorServicos.length === 0) {
            return new Response(JSON.stringify({ data: [] }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // Passo 2: Extrair os IDs dos serviços
        const servicoIds = trabalhadorServicos.map((ts) => ts.servico_id);

        // Passo 3: Buscar os objetos completos dos serviços
        const { data: servicos, error: erro2 } = await supabase
            .from("servicos")
            .select("*")
            .in("id", servicoIds);

        if (erro2) {
            throw erro2;
        }

        return new Response(JSON.stringify({ data: servicos }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("Erro:", error);

        return new Response(
            JSON.stringify({
                error: error.message || "Erro interno do servidor",
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});