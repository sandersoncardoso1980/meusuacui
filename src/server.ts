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
    console.error('❌ ERRO CRÍTICO: URL ou Chave do Supabase não encontradas!');
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
// HANDLER DE FUNCTION CALLING / TRADUÇÃO SQL
// ============================================

async function handleChat(request: Request, env: any) {
  try {
    const body = await request.json();
    const { messages } = body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Mensagens inválidas' }),
        { status: { status: 400 }, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const aiClient = createAiClient(env);
    const apiKey = getApiKey(env) || '';
    const supabaseClient = getSupabaseClient(env);

    if (!aiClient || !apiKey || !supabaseClient) {
      return new Response(
        JSON.stringify({ message: 'Erro de configuração no servidor (IA ou Supabase ausentes).' }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userMessage = messages[messages.length - 1].content;

    // Ferramentas (Tools) que dizem ao LLM quais tabelas ele pode consultar
    const tools = [
      {
        type: "function",
        function: {
          name: "consultar_banco_dados",
          description: "Consulta tabelas oficiais da prefeitura de São Brás do Suaçuí para buscar informações de saúde, emergências, comércios, eventos ou notícias.",
          parameters: {
            type: "object",
            properties: {
              tabela: {
                type: "string",
                enum: [
                  "saude_unidades", 
                  "saude_emergencias", 
                  "saude_campanhas", 
                  "empresas", 
                  "anuncios", 
                  "eventos", 
                  "comunicados_prefeitura", 
                  "noticias"
                ],
                description: "A tabela específica a ser consultada com base na pergunta do usuário."
              },
              termo_busca: {
                type: "string",
                description: "Palavra-chave opcional para filtrar os dados (ex: 'vigilância', 'hospital', 'jardinagem'). Deixe vazio se quiser listar todos."
              }
            },
            required: ["tabela"]
          }
        }
      }
    ];

    const isGroq = apiKey.startsWith('gsk_');
    const modelName = isGroq ? 'llama-3.3-70b-versatile' : 'grok-2-latest';

    // 1. O LLM analisa a pergunta e decide qual função/tabela chamar
    const response = await aiClient.chat.completions.create({
      model: modelName,
      messages: [
        { 
          role: 'system', 
          content: 'Você é um assistente de banco de dados de São Brás do Suaçuí. Use a ferramenta "consultar_banco_dados" para traduzir a pergunta do usuário na tabela correta do Supabase. Nunca invente dados.' 
        },
        ...messages
      ],
      tools: tools,
      tool_choice: "auto",
      temperature: 0.0,
    });

    const responseMessage = response.choices[0]?.message;

    // Se o LLM decidiu chamar uma função do banco de dados
    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log(`🔍 Function Calling acionado -> Tabela: ${args.tabela}, Termo: ${args.termo_busca || 'Nenhum'}`);

      // Executa a query exata no Supabase
      let query = supabaseClient.from(args.tabela).select('*');
      
      if (args.termo_busca && args.termo_busca.trim() !== '') {
        // Tenta filtrar por nome ou título de forma inteligente
        query = query.or(`nome.ilike.%${args.termo_busca}%,titulo.ilike.%${args.termo_busca}%,descricao.ilike.%${args.termo_busca}%`);
      }

      const { data, error } = await query.limit(10);

      if (error) {
        console.error('❌ Erro na query do Supabase:', error);
        return new Response(JSON.stringify({ message: 'Erro ao consultar o banco de dados.' }), { headers: { 'Content-Type': 'application/json' } });
      }

      // Se nenhum registro foi encontrado na tabela
      if (!data || data.length === 0) {
        return new Response(JSON.stringify({ message: 'Desculpe, não encontrei registros correspondentes no banco de dados oficial de São Brás do Suaçuí.' }), { headers: { 'Content-Type': 'application/json' } });
      }

      // 2. Passamos os dados brutos encontrados para o LLM apenas formatar a resposta para o cidadão
      const formatPrompt = `
Com base exclusivamente nestes dados brutos obtidos diretamente da tabela "${args.tabela}" do banco de dados oficial, responda à pergunta do cidadão de forma clara, educada e destacando em negrito os telefones, horários e nomes.

DADOS OBTIDOS:
${JSON.stringify(data, null, 2)}
`;

      const finalResponse = await aiClient.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: formatPrompt },
          ...messages
        ],
        temperature: 0.1,
      });

      const respostaFinal = finalResponse.choices[0]?.message?.content || 'Dados encontrados, mas houve um erro ao formatar.';
      
      return new Response(JSON.stringify({ message: respostaFinal }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Caso o LLM responda diretamente sem precisar de tabela (ex: conversas casuais tipo "Olá")
    const respostaSimples = responseMessage?.content || 'Olá! Como posso ajudar você hoje em São Brás do Suaçuí?';
    return new Response(JSON.stringify({ message: respostaSimples }), { headers: { 'Content-Type': 'application/json' } });

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
