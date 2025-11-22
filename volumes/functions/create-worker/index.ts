import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkerRequest {
    nome?: string | null;
    email: string;
    telefone?: string | null;
    ativo?: boolean;
    business_id: string;
    position?: string | null;
    services?: (string | number)[];
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
                JSON.stringify({ message: "Método não permitido. Use POST." }),
                {
                    status: 405,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Parse do body
        const body: WorkerRequest = await req.json();

        // Validação dos campos obrigatórios (apenas email e business_id)
        if (!body.telefone || !body.business_id) {
            return new Response(
                JSON.stringify({
                    error: "Campos obrigatórios faltando",
                    required: ["telefone", "business_id"],
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Validação do array de serviços (se fornecido)
        if (body.services && !Array.isArray(body.services)) {
            return new Response(
                JSON.stringify({ message: "O campo 'services' deve ser um array de IDs ou nomes" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Validação de email
        // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        // if (!emailRegex.test(body.email)) {
        //     return new Response(
        //         JSON.stringify({ message: "Email inválido" }),
        //         {
        //             status: 400,
        //             headers: { ...corsHeaders, "Content-Type": "application/json" },
        //         }
        //     );
        // }

        // Verificar se o business existe
        const { data: business, error: businessError } = await supabase
            .from("business")
            .select("id")
            .eq("id", body.business_id)
            .single();

        if (businessError || !business) {
            return new Response(
                JSON.stringify({ message: "Business não encontrado" }),
                {
                    status: 404,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // // Verificar se o email já existe
        // const { data: existingWorker } = await supabase
        //     .from("trabalhadores")
        //     .select("id")
        //     .eq("email", body.email)
        //     .single();

        // if (existingWorker) {
        //     return new Response(
        //         JSON.stringify({ message: "Email já cadastrado" }),
        //         {
        //             status: 409,
        //             headers: { ...corsHeaders, "Content-Type": "application/json" },
        //         }
        //     );
        // }

        // Inserir trabalhador
        const emailSplitted = body.email.trim().toLowerCase().split("@")[0];
        const telefoneFormatado: string = body.telefone ? body.telefone.replace(/\D/g, '') : "";
        const { data, error } = await supabase
            .from("trabalhadores")
            .insert({
                nome: body.nome ? body.nome.trim() : emailSplitted,
                email: body.email ? body.email.trim().toLowerCase() : "",
                telefone: telefoneFormatado,
                ativo: body.ativo ?? true,
                business_id: body.business_id,
                position: body.position ? body.position : "",
            })
            .select()
            .single();

        if (error) {
            console.error("Erro ao criar trabalhador:", error);
            return new Response(
                JSON.stringify({ message: "Erro ao criar trabalhador", details: error.message }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Vincular serviços ao trabalhador (se fornecidos)
        let servicesLinked = [];
        if (body.services && body.services.length > 0) {
            // Separar IDs e nomes
            const serviceIds = body.services.filter(s => !isNaN(Number(s)));
            const serviceNames = body.services.filter(s => isNaN(Number(s)));

            let validServices = [];
            let servicesError = null;

            // Buscar por IDs
            if (serviceIds.length > 0) {
                const { data: servicesByIds, error: idsError } = await supabase
                    .from("servicos")
                    .select("id, nome")
                    .eq("business_id", body.business_id)
                    .in("id", serviceIds);

                if (idsError) {
                    servicesError = idsError;
                } else {
                    validServices.push(...servicesByIds);
                }
            }

            // Buscar por nomes
            if (serviceNames.length > 0) {
                const { data: servicesByNames, error: namesError } = await supabase
                    .from("servicos")
                    .select("id, nome")
                    .eq("business_id", body.business_id)
                    .in("nome", serviceNames);

                if (namesError) {
                    servicesError = namesError;
                } else {
                    validServices.push(...servicesByNames);
                }
            }

            if (servicesError) {
                console.error("Erro ao validar serviços:", servicesError);
                // Rollback: deletar o trabalhador criado
                await supabase.from("trabalhadores").delete().eq("id", data.id);

                return new Response(
                    JSON.stringify({ message: "Erro ao validar serviços", details: servicesError.message }),
                    {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    }
                );
            }

            if (validServices.length === 0) {
                // Rollback: deletar o trabalhador criado
                await supabase.from("trabalhadores").delete().eq("id", data.id);

                return new Response(
                    JSON.stringify({
                        error: "Nenhum serviço encontrado com os IDs ou nomes fornecidos",
                        requested: body.services,
                    }),
                    {
                        status: 400,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    }
                );
            }

            // Alertar se nem todos os serviços foram encontrados
            if (validServices.length !== body.services.length) {
                console.warn(
                    `Aviso: ${body.services.length - validServices.length} de ${body.services.length} serviços não foram encontrados`
                );
            }

            // Criar registros na tabela de relacionamento trabalhador_servico
            const serviceLinks = validServices.map(service => ({
                trabalhador_id: data.id,
                servico_id: service.id,
                business_id: body.business_id,
            }));

            const { data: linkedServices, error: linkError } = await supabase
                .from("trabalhador_servico")
                .insert(serviceLinks)
                .select();

            if (linkError) {
                console.error("Erro ao vincular serviços:", linkError);
                // Rollback: deletar o trabalhador criado
                await supabase.from("trabalhadores").delete().eq("id", data.id);

                return new Response(
                    JSON.stringify({ message: "Erro ao vincular serviços", details: linkError.message }),
                    {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    }
                );
            }

            servicesLinked = linkedServices;
        }

        // Criar horários padrão para o trabalhador (Segunda a Sábado, 8h-20h com almoço)
        const defaultSchedules = [];
        for (let dia = 1; dia <= 6; dia++) { // 1=Segunda, 2=Terça, ..., 6=Sábado
            defaultSchedules.push({
                business_id: body.business_id,
                trabalhador_id: data.id,
                dia_semana: dia,
                hora_inicio: '08:00',
                hora_fim: '20:00',
                intervalo_inicio: '12:30',
                intervalo_fim: '14:00',
                ativo: true,
            });
        }

        const { data: schedulesCreated, error: scheduleError } = await supabase
            .from("horarios_padrao")
            .insert(defaultSchedules)
            .select();

        if (scheduleError) {
            console.error("Erro ao criar horários padrão:", scheduleError);
            // Não fazer rollback pois o trabalhador já foi criado com sucesso
            // Apenas logar o erro
        }

        // Resposta de sucesso
        return new Response(
            JSON.stringify({
                success: true,
                message: "Trabalhador criado com sucesso",
                data: data,
                services_linked: servicesLinked.length,
                schedules_created: schedulesCreated ? schedulesCreated.length : 0,
            }),
            {
                status: 201,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Erro na função:", error);
        return new Response(
            JSON.stringify({ message: "Erro interno do servidor", details: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});