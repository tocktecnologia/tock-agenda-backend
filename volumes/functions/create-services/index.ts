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
        const body = await req.json();

        // Verificar se é um array
        if (!Array.isArray(body)) {
            return new Response(
                JSON.stringify({
                    error: "O body deve ser um array de serviços",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Verificar se o array não está vazio
        if (body.length === 0) {
            return new Response(
                JSON.stringify({
                    error: "O array de serviços não pode estar vazio",
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const services: ServiceRequest[] = body;
        const errors: Array<{ index: number; error: string }> = [];
        const businessIds = new Set<string>();

        // Validação de cada serviço
        services.forEach((service, index) => {
            // Validação dos campos obrigatórios
            if (!service.nome || !service.duracao_minutos || service.preco === undefined || service.preco === null || !service.business_id) {
                errors.push({
                    index,
                    error: "Campos obrigatórios faltando: nome, duracao_minutos, preco, business_id",
                });
                return;
            }

            // Validação de tipos e valores
            if (typeof service.duracao_minutos !== "number" || service.duracao_minutos <= 0) {
                errors.push({
                    index,
                    error: "A duração deve ser um número maior que zero",
                });
                return;
            }

            if (typeof service.preco !== "number" || service.preco < 0) {
                errors.push({
                    index,
                    error: "O preço deve ser um número maior ou igual a zero",
                });
                return;
            }

            if (service.nome.trim().length === 0) {
                errors.push({
                    index,
                    error: "O nome não pode estar vazio",
                });
                return;
            }

            businessIds.add(service.business_id);
        });

        // Se houver erros de validação, retornar
        if (errors.length > 0) {
            return new Response(
                JSON.stringify({
                    error: "Erros de validação encontrados",
                    details: errors,
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Verificar se todos os business existem
        const { data: businesses, error: businessError } = await supabase
            .from("business")
            .select("id")
            .in("id", Array.from(businessIds));

        if (businessError) {
            return new Response(
                JSON.stringify({ error: "Erro ao verificar business", details: businessError.message }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const validBusinessIds = new Set(businesses?.map(b => b.id) || []);
        const invalidBusinessIds = Array.from(businessIds).filter(id => !validBusinessIds.has(id));

        if (invalidBusinessIds.length > 0) {
            return new Response(
                JSON.stringify({
                    error: "Business não encontrados",
                    invalid_business_ids: invalidBusinessIds,
                }),
                {
                    status: 404,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Verificar duplicatas no array enviado
        const serviceNames = new Map<string, number[]>();
        services.forEach((service, index) => {
            const key = `${service.business_id}:${service.nome.trim().toLowerCase()}`;
            if (!serviceNames.has(key)) {
                serviceNames.set(key, []);
            }
            serviceNames.get(key)!.push(index);
        });

        const duplicatesInRequest: Array<{ nome: string; business_id: string; indices: number[] }> = [];
        serviceNames.forEach((indices, key) => {
            if (indices.length > 1) {
                const [business_id, ...nameParts] = key.split(":");
                duplicatesInRequest.push({
                    nome: nameParts.join(":"),
                    business_id,
                    indices,
                });
            }
        });

        if (duplicatesInRequest.length > 0) {
            return new Response(
                JSON.stringify({
                    error: "Serviços duplicados encontrados no array enviado",
                    duplicates: duplicatesInRequest,
                }),
                {
                    status: 409,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Verificar se já existem serviços com os mesmos nomes
        const { data: existingServices } = await supabase
            .from("servicos")
            .select("nome, business_id")
            .in("business_id", Array.from(businessIds));

        const existingServiceKeys = new Set(
            existingServices?.map(s => `${s.business_id}:${s.nome.toLowerCase()}`) || []
        );

        const conflicts: Array<{ nome: string; business_id: string }> = [];
        services.forEach(service => {
            const key = `${service.business_id}:${service.nome.trim().toLowerCase()}`;
            if (existingServiceKeys.has(key)) {
                conflicts.push({
                    nome: service.nome,
                    business_id: service.business_id,
                });
            }
        });

        if (conflicts.length > 0) {
            return new Response(
                JSON.stringify({
                    error: "Alguns serviços já existem no banco de dados",
                    conflicts,
                }),
                {
                    status: 409,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Preparar dados para inserção
        const servicesToInsert = services.map(service => ({
            nome: service.nome.trim(),
            duracao_minutos: service.duracao_minutos,
            preco: service.preco,
            descricao: service.descricao?.trim() || null,
            ativo: service.ativo ?? true,
            business_id: service.business_id,
        }));

        // Inserir todos os serviços
        const { data, error } = await supabase
            .from("servicos")
            .insert(servicesToInsert)
            .select();

        if (error) {
            console.error("Erro ao criar serviços:", error);
            return new Response(
                JSON.stringify({ error: "Erro ao criar serviços", details: error.message }),
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
                message: `${data.length} serviço(s) criado(s) com sucesso`,
                data: data,
                count: data.length,
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