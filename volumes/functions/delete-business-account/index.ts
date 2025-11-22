import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.5';

serve(async (req) => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('🚀 Iniciando delete-business-account...');
    console.log('📧 URL do Supabase:', supabaseUrl ? 'Configurada' : 'NÃO CONFIGURADA');
    console.log('🔑 Chave do Supabase:', supabaseKey ? 'Configurada' : 'NÃO CONFIGURADA');

    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    try {
        const responseAuth = await checkRequestAuth(req, supabaseClient);
        if (responseAuth != true) {
            return responseAuth;
        }

        ////////////////////////////////////////////////////////////////////////////////////////////////////
        /// CODE HERE
        const { whatsapp } = await req.json();
        console.log('📱 WhatsApp recebido:', whatsapp);

        if (!whatsapp) {
            console.log('❌ ERRO: WhatsApp não fornecido');
            return requestError('WhatsApp is required');
        }

        // Query business table to check if exists
        console.log('🔍 Buscando registro na tabela business...');
        const { data: business, error: businessError } = await supabaseClient
            .from('business')
            .select('*')
            .eq('whatsapp', whatsapp)
            .single();

        console.log('📊 Resultado da busca:', {
            business,
            businessError
        });

        if (businessError || !business) {
            console.log('❌ ERRO: Registro não encontrado ou erro:', businessError?.message || 'No business record');
            return requestError('Business record not found or error: ' + (businessError?.message || 'No business record'));
        }

        console.log('✅ Registro encontrado:', business);

        // Delete from business table
        console.log('🗑️ Deletando da tabela business...');
        const { error: deleteBusinessError } = await supabaseClient
            .from('business')
            .delete()
            .eq('whatsapp', whatsapp);

        if (deleteBusinessError) {
            console.log('❌ ERRO ao deletar da business:', deleteBusinessError.message);
            return requestError('Failed to delete from business: ' + deleteBusinessError.message);
        }

        console.log('✅ Deletado da tabela business com sucesso');

        // If business has uid, delete from auth.users
        if (business.uid) {
            console.log('🔐 Deletando usuário do sistema de autenticação...');
            const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(business.uid);

            if (deleteAuthError) {
                console.log('⚠️ Aviso ao deletar da autenticação:', deleteAuthError.message);
                // Não retorna erro, pois o registro principal já foi deletado
            } else {
                console.log('✅ Usuário deletado do sistema de autenticação com sucesso');
            }
        }

        console.log('🎉 Processo completo finalizado com sucesso!');
        console.log('✅ Operação concluída com sucesso!');

        return requestSuccess({
            message: `Business com WhatsApp ${whatsapp} deletado com sucesso`,
            deletedRecord: business
        });

    } catch (err) {
        console.log('❌ ERRO GERAL no catch:', err);
        return requestError(err);
    }
});

// -------------------------------------------------------------------------------------------------------------
// functions ---------------------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------------------

function requestError(error) {
    return new Response(
        JSON.stringify({
            result: false,
            message: 'Erro interno',
            detail: String(error)
        }),
        {
            status: 500,
            headers: getCorsHeader()
        }
    );
}

function requestSuccess(data) {
    return new Response(
        JSON.stringify({
            result: true,
            message: 'Requisição feita com sucesso!',
            data: data
        }),
        {
            status: 200,
            headers: getCorsHeader()
        }
    );
}

function getCorsHeader() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type,Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
}

async function checkRequestAuth(req, supabaseClient) {
    console.log('🔐 Iniciando checkRequestAuth...');

    if (req.method === 'OPTIONS') {
        console.log('✅ OPTIONS request - permitido');
        return new Response('ok', { headers: getCorsHeader(), status: 200 });
    }

    // CHECK REQUEST  //////////////////////////////////////////////////////////////////////////////////
    const authHeader = req.headers.get('Authorization');
    console.log('🔑 Header Authorization:', authHeader ? `${authHeader.substring(0, 20)}...` : 'NÃO ENCONTRADO');

    if (!authHeader) {
        console.log('❌ ERRO: Authorization header não encontrado');
        return new Response(
            JSON.stringify({
                result: false,
                message: 'Requisição inválida - Authorization header não encontrado'
            }),
            {
                status: 400,
                headers: getCorsHeader()
            }
        );
    }

    // CHECK USER AUTH //////////////////////////////////////////////////////////////////////////////////
    const jwt = authHeader.replace('Bearer ', '');
    console.log('🎫 JWT extraído:', jwt ? `${jwt.substring(0, 20)}...` : 'NÃO EXTRAÍDO');

    if (!jwt) {
        console.log('❌ ERRO: JWT não extraído');
        return new Response(
            JSON.stringify({
                result: false,
                message: 'JWT não encontrado no header'
            }),
            {
                status: 400,
                headers: getCorsHeader()
            }
        );
    }

    console.log('🔍 Verificando usuário com o Supabase...');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);

    console.log('📊 Resultado da verificação:', {
        userFound: !!user,
        userId: user?.id,
        userEmail: user?.email,
        userError: userError?.message || 'Nenhum erro'
    });

    if (userError) {
        console.log('❌ ERRO na autenticação:', userError);
        return new Response(
            JSON.stringify({
                result: false,
                message: 'Erro na verificação do usuário',
                detail: userError.message
            }),
            {
                status: 401,
                headers: getCorsHeader()
            }
        );
    }

    if (!user) {
        console.log('❌ ERRO: User object é null/undefined');
        return new Response(
            JSON.stringify({
                result: false,
                message: 'Usuário não autenticado',
                detail: 'User object is null'
            }),
            {
                status: 401,
                headers: getCorsHeader()
            }
        );
    }

    console.log('✅ Autenticação bem-sucedida para usuário:', user.id);
    return true;
}