import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        if (req.method !== "GET") {
            return new Response(
                JSON.stringify({ error: "Método não permitido. Use GET." }),
                {
                    status: 405,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const url = new URL(req.url);
        const business_id = url.searchParams.get("business_id");
        const data = url.searchParams.get("data");

        if (!business_id) {
            return new Response(
                JSON.stringify({ error: "Parâmetro 'business_id' é obrigatório" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        if (!data) {
            return new Response(
                JSON.stringify({ error: "Parâmetro 'data' é obrigatório (formato: DD/MM/YYYY)" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const dataRegex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (!dataRegex.test(data)) {
            return new Response(
                JSON.stringify({ error: "Formato de data inválido. Use DD/MM/YYYY (exemplo: 13/10/2025)" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const [dia, mes, ano] = data.split("/");
        const dataFormatada = `${ano}-${mes}-${dia}`;

        const dataObj = new Date(dataFormatada);
        if (isNaN(dataObj.getTime())) {
            return new Response(
                JSON.stringify({ error: "Data inválida" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const { data: businessData, error: businessError } = await supabase
            .from("business")
            .select("id")
            .eq("id", business_id)
            .single();

        if (businessError || !businessData) {
            return new Response(
                JSON.stringify({ error: "Business não encontrado" }),
                {
                    status: 404,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Buscar agendamentos e ordenar pelo horário (hora_inicio)
        const { data: agendamentos, error: agendamentosError } = await supabase
            .from("agendamentos")
            .select(`
                *,
                servico:servico_id (
                    id,
                    nome,
                    duracao_minutos,
                    preco,
                    descricao,
                    ativo
                ),
                trabalhador:trabalhador_id (
                    id,
                    nome,
                    email,
                    telefone,
                    ativo
                )
            `)
            .eq("business_id", business_id)
            .eq("data_agendamento", dataFormatada)
            .order("hora_inicio", { ascending: true }) // ← ordena do mais cedo para o mais tarde
            .order("data_agendamento", { ascending: true }); // ordenação secundária, se necessário

        if (agendamentosError) {
            console.error("Erro ao buscar agendamentos:", agendamentosError);
            return new Response(
                JSON.stringify({
                    error: "Erro ao buscar agendamentos",
                    details: agendamentosError.message,
                }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                data: agendamentos,
                count: agendamentos?.length || 0,
                filters: {
                    business_id,
                    data,
                    data_formatada: dataFormatada,
                },
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Erro na função:", error);
        return new Response(
            JSON.stringify({
                error: "Erro interno do servidor",
                details: error.message,
            }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }

});
