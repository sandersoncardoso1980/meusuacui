import "./lib/error-capture";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import "dotenv/config";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// ============================================
// TRATAMENTO DE ERROS SSR
// ============================================

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// ============================================
// AUXILIARES E CONFIGURAÇÃO
// ============================================

function getApiKey(env: any): string | null {
  return (
    env?.GROQ_API_KEY ||
    env?.XAI_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.XAI_API_KEY ||
    null
  );
}

function createAiClient(env: any): OpenAI | null {
  const apiKey = getApiKey(env);
  if (!apiKey) return null;

  const isGroq = apiKey.startsWith('gsk_');
  const baseURL = isGroq ? 'https://api.groq.com/openai/v1' : 'https://api.x.ai/v1';

  return new OpenAI({
    apiKey,
    baseURL,
  });
}

function getSupabaseClient(env: any) {
  const url = env?.SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://unquslsfksopfimzplyn.supabase.co';
  const key = env?.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''; 

  if(!url || !key) {
    console.error('❌ ERRO CRÍTICO: URL ou Chave do Supabase não encontradas nas variáveis de ambiente!');
    return null;
  }

  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: fetch,
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    }
  });
}
}

// ============================================
// BUSCA DINÂMICA NO SUPABASE (CORRIGIDA)
// ============================================

// ============================================
// BUSCA DINÂMICA NO SUPABASE (USANDO O CLIENTE OFICIAL)
// ============================================

// ============================================
// BUSCA DINÂMICA NO SUPABASE (BLINDADA E SEGURA)
// ============================================

async function buscarInformacoesSupabase(env: any) {
  const supabaseClient = getSupabaseClient(env);
  if (!supabaseClient) {
    console.error('❌ ERRO: Cliente Supabase não inicializado.');
    return null;
  }

  try {
    // Executa as buscas de forma isolada e nomeada
    const eventosPromise = supabaseClient.from('eventos').select('*').gte('data_hora_inicio', new Date().toISOString()).order('data_hora_inicio', { ascending: true }).limit(10);
    const empresasPromise = supabaseClient.from('empresas').select('*').limit(20);
    const anunciosPromise = supabaseClient.from('anuncios').select('*').order('created_at', { ascending: false }).limit(20);
    const comunicadosPromise = supabaseClient.from('comunicados_prefeitura').select('*').order('data_publicacao', { ascending: false }).limit(5);
    const noticiasPromise = supabaseClient.from('noticias').select('*').order('data_publicacao', { ascending: false }).limit(5);
    const unidadesPromise = supabaseClient.from('saude_unidades').select('*');
    const emergenciasPromise = supabaseClient.from('saude_emergencias').select('*');
    const campanhasPromise = supabaseClient.from('saude_campanhas').select('*');

    const [
      eventosRes,
      empresasRes,
      anunciosRes,
      comunicadosRes,
      noticiasRes,
      unidadesRes,
      emergenciasRes,
      campanhasRes
    ] = await Promise.all([
      eventosPromise,
      empresasPromise,
      anunciosPromise,
      comunicadosPromise,
      noticiasPromise,
      unidadesPromise,
      emergenciasPromise,
      campanhasPromise
    ]);

    if (unidadesRes.error) {
      console.error('❌ Erro ao buscar saude_unidades:', unidadesRes.error);
    } else {
      console.log('✅ Unidades de saúde carregadas com sucesso:', unidadesRes.data);
    }

    return {
      eventos: eventosRes.data ?? [],
      empresas: empresasRes.data ?? [],
      anuncios: anunciosRes.data ?? [],
      comunicados: comunicadosRes.data ?? [],
      noticias: noticiasRes.data ?? [],
      unidadesSaude: unidadesRes.data ?? [],
      emergenciasSaude: emergenciasRes.data ?? [],
      campanhasSaude: campanhasRes.data ?? []
    };
  } catch (error) {
    console.error('❌ Erro crítico ao buscar dados do Supabase:', error);
    return null;
  }
}

// ============================================
// HANDLER DO CHAT COM IA (CORRIGIDO)
// ============================================

async function handleChat(request: Request, env: any) {
  console.log('📩 Chat handler iniciado');
  
  try {
    const body = await request.json();
    const { messages } = body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Mensagens inválidas' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const aiClient = createAiClient(env);
    const apiKey = getApiKey(env) || '';

    if (!aiClient || !apiKey) {
      return new Response(
        JSON.stringify({ 
          message: 'Desculpe, a IA não está configurada no servidor (falta GROQ_API_KEY / XAI_API_KEY).',
          warning: 'Configure as variáveis de ambiente.'
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const dados = await buscarInformacoesSupabase(env);

    // Formatação das seções com dados do Supabase
    // 👇 Correção robusta para tratar o array de serviços do Postgres text[]
   const textoSaude = Array.isArray(dados?.unidadesSaude) && dados.unidadesSaude.length > 0
      ? dados.unidadesSaude.map((u: any) => {
          let servicosStr = 'Atendimento Geral';
          
          if (Array.isArray(u.servicos)) {
            servicosStr = u.servicos.join(', ');
          } else if (typeof u.servicos === 'string') {
            try {
              // Tenta converter caso venha como string JSON (ex: '["Clínica", "Vacinação"]')
              const parsed = JSON.parse(u.servicos);
              if (Array.isArray(parsed)) {
                servicosStr = parsed.join(', ');
              } else {
                servicosStr = u.servicos;
              }
            } catch {
              // Se não for JSON, limpa chaves do Postgres se houver (ex: {Clínica,Vacinação})
              servicosStr = u.servicos.replace(/[{}]/g, '').replace(/["']/g, '').split(',').join(', ');
            }
          }

          return `• Nome: ${u.nome} | Endereço: ${u.endereco} | Horário: ${u.horario} | Serviços: ${servicosStr}`;
        }).join('\n')
      : 'Nenhuma unidade cadastrada no momento.';

    console.log("=== TEXTO SAÚDE ===");
console.log(textoSaude);

    const textoEmergencias = dados?.emergenciasSaude.map((e: any) => 
      `• ${e.nome}: ${e.telefone} (${e.descricao || 'Emergência'})`
    ).join('\n') || 'Contatos padrão: Polícia 190, SAMU 192, Bombeiros 193.';

    const textoCampanhas = dados?.campanhasSaude.map((c: any) => 
      `• ${c.titulo} | Período: ${c.periodo} | Público: ${c.publico_alvo}`
    ).join('\n') || 'Nenhuma campanha cadastrada.';

    const textoEmpresas = dados?.empresas.map((e: any) => {
      const promo = e.promocao_ativa ? ` [PROMOÇÃO: ${e.descricao_promocao}]` : '';
      return `• ${e.nome} (${e.categoria}) | Endereço: ${e.endereco || 'Não informado'} | Horário: ${e.horario_funcionamento || 'Não informado'} | Tel: ${e.contato || 'N/A'}${promo}`;
    }).join('\n') || 'Nenhuma empresa cadastrada.';

    // 👇 Correção: Seção de Anúncios adicionada e formatada
  const textoAnuncios = dados?.anuncios.map((a: any) => {
  const preco = a.preco ? `R$ ${a.preco}` : 'Preço a combinar';
  const vendedor = a.nome_vendedor ? ` | Vendedor: ${a.nome_vendedor}` : '';
  const contato = a.telefone_vendedor ? ` | Contato/Tel: ${a.telefone_vendedor}` : '';
  const desc = a.descricao ? ` - Descrição: ${a.descricao}` : '';
  return `• [CLASSIFICADO] ${a.titulo} (${a.categoria}) | Negociação: ${a.tipo_negociacao} | Valor: ${preco}${vendedor}${contato}${desc}`;
}).join('\n') || 'Nenhum anúncio recente no momento.';

    const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // 👇 Correção: systemPrompt atualizado para injetar anúncios
    const systemPrompt = `
Você é o assistente virtual do projeto "Meu Suaçuí", focado exclusivamente na cidade de São Brás do Suaçuí, Minas Gerais.
Hoje é ${dataHoje}.

Responda às dúvidas dos cidadãos e visitantes baseando-se RIGOROSAMENTE nos dados oficiais do banco de dados abaixo:

🛍️ CLASSIFICADOS E ANÚNCIOS DA COMUNIDADE:
${textoAnuncios}

🏢 COMÉRCIO E EMPRESAS LOCAIS:
${textoEmpresas}

🏥 SAÚDE - UNIDADES E POSTOS:
${textoSaude}

🚨 SAÚDE - EMERGÊNCIAS E TELEFONES:
${textoEmergencias}

💉 SAÚDE - CAMPANHAS E VACINAÇÃO:
${textoCampanhas}

📅 EVENTOS AGENDADOS:
${dados?.eventos.map((e: any) => `• ${e.titulo} em ${e.local || 'São Brás'} - Início: ${new Date(e.data_hora_inicio).toLocaleString('pt-BR')}`).join('\n') || 'Nenhum evento agendado.'}

📢 COMUNICADOS DA PREFEITURA:
${dados?.comunicados.map((c: any) => `• ${c.titulo}: ${c.conteudo}`).join('\n') || 'Nenhum comunicado recente.'}

📰 NOTÍCIAS DA CIDADE:
${dados?.noticias.map((n: any) => `• ${n.titulo}: ${n.resumo || ''}`).join('\n') || 'Nenhuma notícia no momento.'}

INSTRUÇÕES DE COMPORTAMENTO:
1. Responda de forma cortês, objetiva e útil.
2. IMPORTANTE: Se o usuário perguntar por compras, produtos (ex: sofá, móveis, carros) ou itens à venda, VERIFIQUE TANTO A LISTA DE EMPRESAS QUANTO A LISTA DE CLASSIFICADOS E ANÚNCIOS acima.
3. Se o usuário perguntar horários ou se algo está aberto hoje, compare com os horários informados nas listas e considere a data de hoje.
4. Se a informação solicitada não estiver na base cadastrada acima, informe educadamente que o dado ainda não foi registrado no aplicativo.
`;

    const isGroq = apiKey.startsWith('gsk_');
    const modelName = isGroq ? 'llama-3.3-70b-versatile' : 'grok-2-latest';

    console.log(`🤖 Gerando resposta com ${isGroq ? 'Groq' : 'xAI'}...`);

    const response = await aiClient.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.5,
      max_tokens: 600,
    });

    const resposta = response.choices[0]?.message?.content || 'Desculpe, não consegui obter uma resposta.';
    
    return new Response(
      JSON.stringify({ message: resposta }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro no handleChat:', error);
    return new Response(
      JSON.stringify({
        error: 'Erro ao processar sua pergunta',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ============================================
// SERVIDOR PRINCIPAL
// ============================================

export default {
  async fetch(request: Request, env: any, ctx: unknown) {
    const url = new URL(request.url);
    
    // ROTAS DE API
    if (url.pathname === '/api/test') {
      const apiKey = getApiKey(env);
      return new Response(
        JSON.stringify({
          status: 'OK',
          message: 'API funcionando!',
          aiConfigured: !!apiKey,
          provider: apiKey?.startsWith('gsk_') ? 'Groq' : 'xAI',
          timestamp: new Date().toISOString(),
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      return handleChat(request, env);
    }
    
    // Rotas do TanStack Start
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error('❌ Erro no SSR:', error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
