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

        if (req.method !== "POST") {
            return new Response(
                JSON.stringify({ error: "Método não permitido. Use POST." }),
                {
                    status: 405,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const { businessId, month, year } = await req.json();

        if (!businessId) {
            return new Response(
                JSON.stringify({ error: "Parâmetro 'businessId' é obrigatório" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Verificar se o business existe
        const { data: businessData, error: businessError } = await supabase
            .from("business")
            .select("id")
            .eq("id", businessId)
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

        // Definir ano e mês de referência
        const hoje = new Date(Date.now() - (3 * 60 * 60 * 1000)); // Ajustar para timezone de Fortaleza (UTC-3)
        const referenceYear = year ? year.toString() : hoje.getFullYear().toString();
        const referenceMonth = month ? String(month).padStart(2, '0') : String(hoje.getMonth() + 1).padStart(2, '0');

        // Data e horário atual para comparação
        const dataHoje = hoje.toISOString().split('T')[0];
        const horarioAtual = hoje.toTimeString().split(' ')[0].substring(0, 2); // Formato HH:MM

        // Calcular primeiro e último dia do mês
        const primeiroDia = `${referenceYear}-${referenceMonth}-01`;
        const ultimoDia = new Date(parseInt(referenceYear), parseInt(referenceMonth), 0).toISOString().split('T')[0];

        // Buscar agendamentos filtrados por business e mês/ano (incluindo hora_inicio)
        const { data: agendamentos, error: agendamentosError } = await supabase
            .from("agendamentos")
            .select("id, status, data_agendamento, hora_inicio")
            .eq("business_id", businessId)
            .gte("data_agendamento", primeiroDia)
            .lte("data_agendamento", ultimoDia);

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

        // Contar os agendamentos por categoria
        let confirmadoPassado = 0;
        let confirmadoPorFazer = 0;
        let cancelado = 0;

        // Objeto para contar agendamentos por dia
        const agendamentosPorDia: { [key: string]: number } = {};

        agendamentos?.forEach((agendamento) => {
            const dataAgendamento = agendamento.data_agendamento;
            const horaInicio = agendamento.hora_inicio;
            const status = agendamento.status;

            // Extrair o dia da data (formato YYYY-MM-DD)
            const dia = dataAgendamento.split('-')[2];
            const diaNumero = parseInt(dia, 10).toString(); // Remove zeros à esquerda

            // Contar agendamentos por dia
            if (agendamentosPorDia[diaNumero]) {
                agendamentosPorDia[diaNumero]++;
            } else {
                agendamentosPorDia[diaNumero] = 1;
            }

            if (status === "cancelado") {
                cancelado++;
            } else if (status === "confirmado") {
                // Comparar data e horário
                if (dataAgendamento < dataHoje) {
                    // Data passada
                    confirmadoPassado++;
                } else if (dataAgendamento === dataHoje) {
                    // Mesma data, comparar horário
                    if (horaInicio < horarioAtual) {
                        confirmadoPassado++;
                    } else {
                        confirmadoPorFazer++;
                    }
                } else {
                    // Data futura
                    confirmadoPorFazer++;
                }
            }
        });

        const totalConfirmed = confirmadoPassado + confirmadoPorFazer;

        // Converter o objeto em array de objetos com label e value
        const agendamentosMes = Object.keys(agendamentosPorDia)
            .sort((a, b) => parseInt(a) - parseInt(b)) // Ordenar por dia
            .map(dia => ({
                label: dia,
                value: agendamentosPorDia[dia]
            }));

        // Retornar a resposta no formato solicitado
        return new Response(
            JSON.stringify({
                reference_year: referenceYear,
                reference_month: referenceMonth,
                total_confirmed: totalConfirmed,
                agendamentosMes: agendamentosMes,
                chartSchedule: [
                    {
                        label: "Feitos",
                        value: confirmadoPassado
                    },
                    {
                        label: "A fazer",
                        value: confirmadoPorFazer
                    },
                    {
                        label: "Cancelados",
                        value: cancelado
                    }
                ]
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