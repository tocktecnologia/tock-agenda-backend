import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ServiceRequest {
    nome: string;
    duracao_minutos: number;
    preco: number;
    descricao?: string;
    ativo?: boolean;
    business_id: string;
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Criar cliente Supabase
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Validar método HTTP
        if (req.method !== "POST") {
            return new Response(
                JSON.stringify({ error: "Método não permitido. Use POST." }),
                {
                    status: 405,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Parse do body
        const body: ServiceRequest = await req.json();

        // Validação dos campos obrigatórios
        if (!body.nome || !body.duracao_minutos || body.preco === undefined || body.preco === null || !body.business_id) {
            return new Response(
                JSON.stringify({
                    error: "Campos obrigatórios faltando",
                    required: ["nome", "duracao_minutos", "preco", "business_id"],
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Validação de tipos e valores
        if (typeof body.duracao_minutos !== "number" || body.duracao_minutos <= 0) {
            return new Response(
                JSON.stringify({ error: "A duração deve ser um número maior que zero" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        if (typeof body.preco !== "number" || body.preco < 0) {
            return new Response(
                JSON.stringify({ error: "O preço deve ser um número maior ou igual a zero" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        if (body.nome.trim().length === 0) {
            return new Response(
                JSON.stringify({ error: "O nome não pode estar vazio" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Verificar se o business existe
        const { data: business, error: businessError } = await supabase
            .from("business")
            .select("id")
            .eq("id", body.business_id)
            .single();

        if (businessError || !business) {
            return new Response(
                JSON.stringify({ error: "Business não encontrado" }),
                {
                    status: 404,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Verificar se já existe um serviço com o mesmo nome para este business
        const { data: existingService } = await supabase
            .from("servicos")
            .select("id")
            .eq("business_id", body.business_id)
            .eq("nome", body.nome.trim())
            .single();

        if (existingService) {
            return new Response(
                JSON.stringify({ error: "Já existe um serviço com este nome para este business" }),
                {
                    status: 409,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Inserir serviço
        const { data, error } = await supabase
            .from("servicos")
            .insert({
                nome: body.nome.trim(),
                duracao_minutos: body.duracao_minutos,
                preco: body.preco,
                descricao: body.descricao?.trim() || null,
                ativo: body.ativo ?? true,
                business_id: body.business_id,
            })
            .select()
            .single();

        if (error) {
            console.error("Erro ao criar serviço:", error);
            return new Response(
                JSON.stringify({ error: "Erro ao criar serviço", details: error.message }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Resposta de sucesso
        return new Response(
            JSON.stringify({
                success: true,
                message: "Serviço criado com sucesso",
                data: data,
            }),
            {
                status: 201,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Erro na função:", error);
        return new Response(
            JSON.stringify({ error: "Erro interno do servidor", details: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});