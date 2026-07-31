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
// HANDLER DO CHAT COM IA
// ============================================

async function handleChat(request: Request, env: any) {
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
          message: 'Desculpe, a IA não está configurada no servidor (falta GROQ_API_KEY / XAI_API_KEY).' 
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const dados = await buscarInformacoesSupabase(env);

    // Formatação rigorosa dos dados de saúde
    const textoSaude = Array.isArray(dados?.unidadesSaude) && dados.unidadesSaude.length > 0
      ? dados.unidadesSaude.map((u: any) => {
          let servicosStr = 'Não especificado';
          
          if (Array.isArray(u.servicos)) {
            servicosStr = u.servicos.join(', ');
          } else if (typeof u.servicos === 'string') {
            try {
              const parsed = JSON.parse(u.servicos);
              if (Array.isArray(parsed)) {
                servicosStr = parsed.join(', ');
              } else {
                servicosStr = u.servicos;
              }
            } catch {
              servicosStr = u.servicos.replace(/[{}]/g, '').replace(/["']/g, '').split(',').join(', ');
            }
          }

          return `• Unidade: ${u.nome} | Endereço: ${u.endereco || 'Não informado'} | Horário: ${u.horario || 'Não informado'} | Serviços Oferecidos: ${servicosStr}`;
        }).join('\n')
      : 'Nenhuma unidade de saúde cadastrada no momento.';

    const textoEmergencias = dados?.emergenciasSaude.map((e: any) => 
      `• ${e.nome}: ${e.telefone} (${e.descricao || 'Emergência'})`
    ).join('\n') || 'Nenhum contato de emergência cadastrado.';

    const textoCampanhas = dados?.campanhasSaude.map((c: any) => 
      `• ${c.titulo} | Período: ${c.periodo || 'Não informado'} | Público: ${c.publico_alvo || 'Geral'}`
    ).join('\n') || 'Nenhuma campanha de saúde ativa no momento.';

    const textoEmpresas = dados?.empresas.map((e: any) => {
      return `• ${e.nome} (${e.categoria}) | Endereço: ${e.endereco || 'Não informado'} | Horário: ${e.horario_funcionamento || 'Não informado'} | Tel: ${e.contato || 'N/A'}`;
    }).join('\n') || 'Nenhuma empresa cadastrada.';

    const textoAnuncios = dados?.anuncios.map((a: any) => {
      const preco = a.preco ? `R$ ${a.preco}` : 'Preço a combinar';
      return `• [CLASSIFICADO] ${a.titulo} (${a.categoria}) | Valor: ${preco} | Descrição: ${a.descricao || 'Sem descrição'}`;
    }).join('\n') || 'Nenhum anúncio recente.';

    const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // SYSTEM PROMPT RESTRITIVO ANTIALUCINAÇÃO
    const systemPrompt = `
Você é o assistente virtual oficial do aplicativo "Meu Suaçuí", exclusivo da cidade de São Brás do Suaçuí, Minas Gerais.
Hoje é ${dataHoje}.

⚠️ REGRA ABSOLUTA E INEGOCIÁVEL:
Você DEVE responder às perguntas utilizando **APENAS E EXCLUSIVAMENTE** os dados oficiais fornecidos abaixo extraídos do banco de dados da cidade. 
- **PROIBIDO ABSOLUTAMENTE** usar conhecimento prévio da internet, inventar nomes de ruas, criar estabelecimentos, farmácias, campanhas de vacinação ou serviços que NÃO constem explicitamente nos textos abaixo.
- Se a informação solicitada pelo usuário não estiver presente nas listas abaixo, responda estritamente: "Desculpe, essa informação ainda não está cadastrada no banco de dados oficial do aplicativo."

---

📊 DADOS OFICIAIS DO BANCO DE DADOS:

🏥 SAÚDE - UNIDADES E SERVIÇOS:
${textoSaude}

🚨 SAÚDE - EMERGÊNCIAS:
${textoEmergencias}

💉 SAÚDE - CAMPANHAS:
${textoCampanhas}

🏢 COMÉRCIO E EMPRESAS:
${textoEmpresas}

🛍️ CLASSIFICADOS E ANÚNCIOS:
${textoAnuncios}

📅 EVENTOS:
${dados?.eventos.map((e: any) => `• ${e.titulo} em ${e.local || 'São Brás'} - Início: ${new Date(e.data_hora_inicio).toLocaleString('pt-BR')}`).join('\n') || 'Nenhum evento agendado.'}

📢 COMUNICADOS DA PREFEITURA:
${dados?.comunicados.map((c: any) => `• ${c.titulo}: ${c.conteudo}`).join('\n') || 'Nenhum comunicado recente.'}

📰 NOTÍCIAS:
${dados?.noticias.map((n: any) => `• ${n.titulo}: ${n.resumo || ''}`).join('\n') || 'Nenhuma notícia no momento.'}

---
INSTRUÇÕES DE COMPORTAMENTO:
1. Seja cortês, claro e use formatação em **negrito** para destacar nomes de unidades, endereços e horários.
2. Ao responder sobre serviços de saúde, liste estritamente o que consta na seção "SAÚDE - UNIDADES E SERVIÇOS" correspondente à unidade consultada, sem adicionar itens externos.
`;

    const isGroq = apiKey.startsWith('gsk_');
    const modelName = isGroq ? 'llama-3.3-70b-versatile' : 'grok-2-latest';

    const response = await aiClient.chat.completions.create({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.1, // Temperatura reduzida para focar em precisão absoluta e eliminar criatividade/alucinação
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
