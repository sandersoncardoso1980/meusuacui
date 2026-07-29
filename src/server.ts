// src/server.ts
import "./lib/error-capture";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import OpenAI from 'openai';

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
// AUXILIAR: OBTER API KEY DORMIDA/CONFIGURADA
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

// ============================================
// CONFIGURAÇÃO DO CLIENTE DE IA
// ============================================

function createAiClient(env: any): OpenAI | null {
  const apiKey = getApiKey(env);
  if (!apiKey) return null;

  // Detecta automaticamente se é Groq (gsk_) ou xAI (xai-)
  const isGroq = apiKey.startsWith('gsk_');
  const baseURL = isGroq ? 'https://api.groq.com/openai/v1' : 'https://api.x.ai/v1';

  return new OpenAI({
    apiKey,
    baseURL,
  });
}

// ============================================
// BASE DE CONHECIMENTO LOCAL (FALLBACK)
// ============================================

const conhecimento = {
  farmacia: [
    "Farmácia São Brás - Rua Principal, 123 - Funcionamento: 08:00 às 22:00",
    "Farmácia Central - Av. Minas Gerais, 456 - Funcionamento: 24 horas",
    "Farmácia Popular - Rua da Matriz, 789 - Funcionamento: 07:00 às 21:00"
  ],
  saude: [
    "Hospital Municipal de São Brás - Av. Saúde, 100 - Atendimento 24h",
    "Posto de Saúde Central - Rua da Saúde, 50 - 07:00 às 17:00",
    "UPA - Unidade de Pronto Atendimento - Av. Principal, 200 - 24h"
  ],
  eventos: [
    "Festa do Padroeiro São Brás - Janeiro",
    "Carnaval de São Brás - Fevereiro",
    "Festa Junina - Junho",
    "Aniversário da Cidade - Agosto",
    "Natal Iluminado - Dezembro"
  ],
  restaurantes: [
    "Sabor Mineiro - Av. Central, 100 - Comida caseira",
    "Pizzaria da Praça - Praça da Matriz, 5",
    "Lanchonete do Zé - Rua Comercial, 30",
    "Restaurante Popular - Av. Principal, 150"
  ],
  turismo: [
    "Igreja Matriz de São Brás - Construída em 1920",
    "Mirante do Cruzeiro - Vista panorâmica da cidade",
    "Cachoeira do Salto - 5km do centro",
    "Praça Central - Coreto e jardins"
  ],
  prefeitura: [
    "Prefeitura Municipal - Praça da Matriz, s/n",
    "Atendimento: 08:00 às 17:00",
    "Telefone: (31) 9999-9999"
  ],
};

function buscarInformacaoLocal(pergunta: string): string {
  const perguntaLower = pergunta.toLowerCase();
  
  if (perguntaLower.includes('farmácia') || perguntaLower.includes('farmacia') || perguntaLower.includes('remédio')) {
    return "💊 **Farmácias em São Brás do Suaçuí:**\n\n" + conhecimento.farmacia.map(f => `• ${f}`).join('\n');
  }
  
  if (perguntaLower.includes('saúde') || perguntaLower.includes('saude') || perguntaLower.includes('hospital') || perguntaLower.includes('posto')) {
    return "🏥 **Unidades de Saúde:**\n\n" + conhecimento.saude.map(s => `• ${s}`).join('\n');
  }
  
  if (perguntaLower.includes('evento') || perguntaLower.includes('agenda') || perguntaLower.includes('festa')) {
    return "📅 **Eventos e Festas:**\n\n" + conhecimento.eventos.map(e => `• ${e}`).join('\n');
  }
  
  if (perguntaLower.includes('restaurante') || perguntaLower.includes('comer') || perguntaLower.includes('comida')) {
    return "🍽️ **Restaurantes e Lanchonetes:**\n\n" + conhecimento.restaurantes.map(r => `• ${r}`).join('\n');
  }
  
  if (perguntaLower.includes('turismo') || perguntaLower.includes('turístico') || perguntaLower.includes('cachoeira')) {
    return "🏛️ **Pontos Turísticos:**\n\n" + conhecimento.turismo.map(t => `• ${t}`).join('\n');
  }
  
  if (perguntaLower.includes('prefeitura') || perguntaLower.includes('iptu') || perguntaLower.includes('serviço')) {
    return "🏛️ **Prefeitura Municipal:**\n\n" + conhecimento.prefeitura.map(p => `• ${p}`).join('\n');
  }
  
  return `📌 **São Brás do Suaçuí**

Sua pergunta: "${pergunta}"

Posso ajudar com:
• 💊 Farmácias
• 🏥 Saúde
• 📅 Eventos
• 🍽️ Restaurantes
• 🏛️ Turismo
• 🏛️ Prefeitura

O que você gostaria de saber?`;
}

// ============================================
// HANDLER DO CHAT COM IA
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

    const userMessage = messages[messages.length - 1]?.content || '';
    const aiClient = createAiClient(env);
    const apiKey = getApiKey(env) || '';

    if (aiClient && apiKey) {
      console.log('🤖 Gerando resposta com a IA...');
      
      try {
        const isGroq = apiKey.startsWith('gsk_');
        
        // Modelo Groq vs xAI
        const modelName = isGroq ? 'llama-3.3-70b-versatile' : 'grok-2-latest';

        const systemPrompt = `
Você é um assistente virtual especializado em informações sobre a cidade de São Brás do Suaçuí, Minas Gerais.

Informações sobre a cidade:
- Cidade mineira com aproximadamente 8.000 habitantes
- Conhecida por sua hospitalidade e tradições
- Economia baseada em agricultura, pecuária e comércio local
- Possui belas paisagens, igrejas históricas e cachoeiras
- Festas tradicionais: Festa do Padroeiro São Brás (janeiro), Carnaval, Festas Juninas

Principais serviços:
- Farmácias: Farmácia São Brás (Rua Principal, 123), Farmácia Central (Av. Minas Gerais, 456 - 24h)
- Saúde: Hospital Municipal, Posto de Saúde Central, UPA
- Prefeitura: Praça da Matriz, s/n - Funcionamento 08:00 às 17:00

Atrações turísticas:
- Igreja Matriz de São Brás
- Mirante do Cruzeiro
- Cachoeira do Salto
- Praça Central

Pergunta do usuário: "${userMessage}"

Responda de forma amigável, cordial e útil sobre (e somente sobre) São Brás do Suaçuí.
Seja específico e dê respostas completas porém resumidas.
Suas respostas devem ser sempre iniciadas com a palavra Tchaca Tchaca na Butchaca Ratinho!
        `;

        const response = await aiClient.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          temperature: 0.7,
          max_tokens: 600,
        });

        const resposta = response.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';
        
        return new Response(
          JSON.stringify({ message: resposta }),
          { headers: { 'Content-Type': 'application/json' } }
        );

      } catch (aiError: any) {
        console.error('❌ Erro na API de IA:', aiError?.message || aiError);
        
        const fallback = buscarInformacaoLocal(userMessage);
        return new Response(
          JSON.stringify({ 
            message: fallback,
            warning: '⚠️ Usando modo fallback (IA indisponível)'
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback caso não haja chave configurada
    const resposta = buscarInformacaoLocal(userMessage);
    return new Response(
      JSON.stringify({ 
        message: resposta,
        warning: 'ℹ️ Modo offline - Configure XAI_API_KEY ou GROQ_API_KEY no .env'
      }),
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
