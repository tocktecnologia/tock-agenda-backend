// import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// const corsHeaders = {
//     "Access-Control-Allow-Origin": "*",
//     "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
// };

// interface UpdateWorkerRequest {
//     email: string;
//     business_id: string;
//     ativo?: boolean;
//     services?: string[];
// }

// serve(async (req) => {
//     // Handle CORS preflight requests
//     if (req.method === "OPTIONS") {
//         return new Response("ok", { headers: corsHeaders });
//     }

//     try {
//         // Criar cliente Supabase
//         const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
//         const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
//         const supabase = createClient(supabaseUrl, supabaseKey);

//         // Validar método HTTP
//         if (req.method !== "POST") {
//             return new Response(
//                 JSON.stringify({ error: "Método não permitido. Use POST." }),
//                 {
//                     status: 405,
//                     headers: { ...corsHeaders, "Content-Type": "application/json" },
//                 }
//             );
//         }

//         // Parse do body
//         const body: UpdateWorkerRequest = await req.json();

//         // Validação dos campos obrigatórios
//         if (!body.email || !body.business_id) {
//             return new Response(
//                 JSON.stringify({
//                     error: "Campos obrigatórios faltando",
//                     required: ["email", "business_id"],
//                 }),
//                 {
//                     status: 400,
//                     headers: { ...corsHeaders, "Content-Type": "application/json" },
//                 }
//             );
//         }

//         // Validação de email
//         const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//         if (!emailRegex.test(body.email)) {
//             return new Response(
//                 JSON.stringify({ error: "Email inválido" }),
//                 {
//                     status: 400,
//                     headers: { ...corsHeaders, "Content-Type": "application/json" },
//                 }
//             );
//         }

//         // Validação do array de serviços (se fornecido)
//         if (body.services && !Array.isArray(body.services)) {
//             return new Response(
//                 JSON.stringify({ error: "O campo 'services' deve ser um array de IDs" }),
//                 {
//                     status: 400,
//                     headers: { ...corsHeaders, "Content-Type": "application/json" },
//                 }
//             );
//         }

//         // Encontrar o trabalhador
//         const { data: worker, error: workerError } = await supabase
//             .from("trabalhadores")
//             .select("id, ativo")
//             .eq("email", body.email.trim().toLowerCase())
//             .eq("business_id", body.business_id)
//             .single();

//         if (workerError || !worker) {
//             return new Response(
//                 JSON.stringify({ error: "Trabalhador não encontrado" }),
//                 {
//                     status: 404,
//                     headers: { ...corsHeaders, "Content-Type": "application/json" },
//                 }
//             );
//         }

//         // Atualizar campo ativo (se fornecido)
//         if (body.ativo !== undefined) {
//             const { error: updateError } = await supabase
//                 .from("trabalhadores")
//                 .update({ ativo: body.ativo })
//                 .eq("id", worker.id);

//             if (updateError) {
//                 console.error("Erro ao atualizar status do trabalhador:", updateError);
//                 return new Response(
//                     JSON.stringify({ error: "Erro ao atualizar trabalhador", details: updateError.message }),
//                     {
//                         status: 500,
//                         headers: { ...corsHeaders, "Content-Type": "application/json" },
//                     }
//                 );
//             }
//         }

//         // Atualizar serviços (se fornecido)
//         let servicesUpdated = [];
//         if (body.services !== undefined) {
//             // Deletar todos os serviços anteriores
//             const { error: deleteError } = await supabase
//                 .from("trabalhador_servico")
//                 .delete()
//                 .eq("trabalhador_id", worker.id);

//             if (deleteError) {
//                 console.error("Erro ao deletar serviços anteriores:", deleteError);
//                 return new Response(
//                     JSON.stringify({ error: "Erro ao deletar serviços anteriores", details: deleteError.message }),
//                     {
//                         status: 500,
//                         headers: { ...corsHeaders, "Content-Type": "application/json" },
//                     }
//                 );
//             }

//             // Se há novos serviços, inserir
//             if (body.services.length > 0) {
//                 // Validar se os serviços existem e pertencem ao business
//                 const { data: validServices, error: servicesError } = await supabase
//                     .from("servicos")
//                     .select("id")
//                     .eq("business_id", body.business_id)
//                     .in("id", body.services);

//                 if (servicesError) {
//                     console.error("Erro ao validar serviços:", servicesError);
//                     return new Response(
//                         JSON.stringify({ error: "Erro ao validar serviços", details: servicesError.message }),
//                         {
//                             status: 500,
//                             headers: { ...corsHeaders, "Content-Type": "application/json" },
//                         }
//                     );
//                 }

//                 if (validServices.length !== body.services.length) {
//                     return new Response(
//                         JSON.stringify({
//                             error: "Alguns serviços não foram encontrados ou não pertencem a este business",
//                             provided: body.services.length,
//                             found: validServices.length
//                         }),
//                         {
//                             status: 400,
//                             headers: { ...corsHeaders, "Content-Type": "application/json" },
//                         }
//                     );
//                 }

//                 // Criar registros na tabela de relacionamento trabalhador_servico
//                 const serviceLinks = body.services.map(serviceId => ({
//                     trabalhador_id: worker.id,
//                     servico_id: serviceId,
//                     business_id: body.business_id,
//                 }));

//                 const { data: linkedServices, error: linkError } = await supabase
//                     .from("trabalhador_servico")
//                     .insert(serviceLinks)
//                     .select();

//                 if (linkError) {
//                     console.error("Erro ao vincular serviços:", linkError);
//                     return new Response(
//                         JSON.stringify({ error: "Erro ao vincular serviços", details: linkError.message }),
//                         {
//                             status: 500,
//                             headers: { ...corsHeaders, "Content-Type": "application/json" },
//                         }
//                     );
//                 }

//                 servicesUpdated = linkedServices;
//             }
//         }

//         // Buscar dados atualizados do trabalhador
//         const { data: updatedWorker } = await supabase
//             .from("trabalhadores")
//             .select("id, nome, email, telefone, ativo, business_id")
//             .eq("id", worker.id)
//             .single();

//         // Buscar todos os serviços relacionados ao trabalhador
//         const { data: workerServices } = await supabase
//             .from("trabalhador_servico")
//             .select("servico_id")
//             .eq("trabalhador_id", worker.id);

//         const serviceIds = workerServices?.map(ws => ws.servico_id) || [];

//         // Resposta de sucesso
//         return new Response(
//             JSON.stringify({
//                 success: true,
//                 message: "Trabalhador atualizado com sucesso",
//                 data: {
//                     ...updatedWorker,
//                     services: serviceIds,
//                 },
//             }),
//             {
//                 status: 200,
//                 headers: { ...corsHeaders, "Content-Type": "application/json" },
//             }
//         );
//     } catch (error) {
//         console.error("Erro na função:", error);
//         return new Response(
//             JSON.stringify({ error: "Erro interno do servidor", details: error.message }),
//             {
//                 status: 500,
//                 headers: { ...corsHeaders, "Content-Type": "application/json" },
//             }
//         );
//     }
// });


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateWorkerRequest {
    email: string;
    business_id: string;
    ativo?: boolean;
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
                JSON.stringify({ error: "Método não permitido. Use POST." }),
                {
                    status: 405,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Parse do body
        const body: UpdateWorkerRequest = await req.json();

        // Validação dos campos obrigatórios
        if (!body.email || !body.business_id) {
            return new Response(
                JSON.stringify({
                    error: "Campos obrigatórios faltando",
                    required: ["email", "business_id"],
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Validação de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.email)) {
            return new Response(
                JSON.stringify({ error: "Email inválido" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Validação do array de serviços (se fornecido)
        if (body.services && !Array.isArray(body.services)) {
            return new Response(
                JSON.stringify({ error: "O campo 'services' deve ser um array de IDs ou nomes" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Encontrar o trabalhador
        const { data: worker, error: workerError } = await supabase
            .from("trabalhadores")
            .select("id, ativo")
            .eq("email", body.email.trim().toLowerCase())
            .eq("business_id", body.business_id)
            .single();

        if (workerError || !worker) {
            return new Response(
                JSON.stringify({ error: "Trabalhador não encontrado" }),
                {
                    status: 404,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Atualizar campo ativo (se fornecido)
        if (body.ativo !== undefined) {
            const { error: updateError } = await supabase
                .from("trabalhadores")
                .update({ ativo: body.ativo })
                .eq("id", worker.id);

            if (updateError) {
                console.error("Erro ao atualizar status do trabalhador:", updateError);
                return new Response(
                    JSON.stringify({ error: "Erro ao atualizar trabalhador", details: updateError.message }),
                    {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    }
                );
            }
        }

        // Atualizar serviços (se fornecido)
        let servicesUpdated = [];
        if (body.services !== undefined) {
            // Deletar todos os serviços anteriores
            const { error: deleteError } = await supabase
                .from("trabalhador_servico")
                .delete()
                .eq("trabalhador_id", worker.id);

            if (deleteError) {
                console.error("Erro ao deletar serviços anteriores:", deleteError);
                return new Response(
                    JSON.stringify({ error: "Erro ao deletar serviços anteriores", details: deleteError.message }),
                    {
                        status: 500,
                        headers: { ...corsHeaders, "Content-Type": "application/json" },
                    }
                );
            }

            // Se há novos serviços, inserir
            if (body.services.length > 0) {
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
                    return new Response(
                        JSON.stringify({ error: "Erro ao validar serviços", details: servicesError.message }),
                        {
                            status: 500,
                            headers: { ...corsHeaders, "Content-Type": "application/json" },
                        }
                    );
                }

                if (validServices.length === 0) {
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
                    trabalhador_id: worker.id,
                    servico_id: service.id,
                    business_id: body.business_id,
                }));

                const { data: linkedServices, error: linkError } = await supabase
                    .from("trabalhador_servico")
                    .insert(serviceLinks)
                    .select();

                if (linkError) {
                    console.error("Erro ao vincular serviços:", linkError);
                    return new Response(
                        JSON.stringify({ error: "Erro ao vincular serviços", details: linkError.message }),
                        {
                            status: 500,
                            headers: { ...corsHeaders, "Content-Type": "application/json" },
                        }
                    );
                }

                servicesUpdated = linkedServices;
            }
        }

        // Buscar dados atualizados do trabalhador
        const { data: updatedWorker } = await supabase
            .from("trabalhadores")
            .select("id, nome, email, telefone, ativo, business_id")
            .eq("id", worker.id)
            .single();

        // Buscar todos os serviços relacionados ao trabalhador
        const { data: workerServices } = await supabase
            .from("trabalhador_servico")
            .select("servico_id")
            .eq("trabalhador_id", worker.id);

        const serviceIds = workerServices?.map(ws => ws.servico_id) || [];

        // Resposta de sucesso
        return new Response(
            JSON.stringify({
                success: true,
                message: "Trabalhador atualizado com sucesso",
                data: {
                    ...updatedWorker,
                    services: serviceIds,
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
            JSON.stringify({ error: "Erro interno do servidor", details: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});