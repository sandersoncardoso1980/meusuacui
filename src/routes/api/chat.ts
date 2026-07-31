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

  return new OpenAI({ apiKey, baseURL });
}

function getSupabaseClient(env: any) {
  const url = env?.SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://unquslsfksopfimzplyn.supabase.co';
  const key = env?.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''; 

  if (!url || !key) {
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
// BUSCA DIRECIONADA INTELIGENTE (BASEADA NA PERGUNTA)
// ============================================

async function buscarDadosContextuais(env: any, ultimaMensagem: string) {
  const supabaseClient = getSupabaseClient(env);
  if (!supabaseClient) return { contexto: "Banco indisponível.", dadosBrutos: {} };

  const termo = ultimaMensagem.toLowerCase();
  let dadosContexto = "";
  const dadosBrutos: Record<string, any> = {};

  try {
    // Detecta intenção de Saúde (Unidades, Emergências, Campanhas, Dicas)
    const querSaude = /saúde|hospital|posto|ubs|ubs|vacina|vacinação|emergência|samu|bombeiro|polícia|vigilância|dengue|febre|médico|dentista|remédio|ubs/i.test(termo);
    const querEmpresa = /empresa|comércio|loja|farmácia|padaria|mercado|restaurante|onde comprar|telefone de/i.test(termo);
    const querAnuncio = /anúncio|classificado|vende|aluga|preço|comprar/i.test(termo);
    const querEvento = /evento|festa|show|cultura|quando vai acontecer|agenda/i.test(termo);
    const querComunicado = /prefeitura|comunicado|aviso|nota oficial|prefeito/i.test(termo);

    // Se nenhuma intenção clara for detectada, busca um panorama geral leve
    const carregarTudo = !querSaude && !querEmpresa && !querAnuncio && !querEvento && !querComunicado;

    const promessas: Promise<any>[] = [];

    if (querSaude || carregarTudo) {
      promessas.push(
        supabaseClient.from('saude_unidades').select('*').then(res => { dadosBrutos.unidades = res.data || []; }),
        supabaseClient.from('saude_emergencias').select('*').then(res => { dadosBrutos.emergencias = res.data || []; }),
        supabaseClient.from('saude_campanhas').select('*').then(res => { dadosBrutos.campanhas = res.data || []; }),
        supabaseClient.from('saude_dicas').select('*').then(res => { dadosBrutos.dicas = res.data || []; })
      );
    }

    if (querEmpresa || carregarTudo) {
      promessas.push(
        supabaseClient.from('empresas').select('*').or(`nome.ilike.%${termo}%,categoria.ilike.%${termo}%`).limit(15).then(res => { dadosBrutos.empresas = res.data || []; })
      );
    }

    if (querAnuncio || carregarTudo) {
      promessas.push(
        supabaseClient.from('anuncios').select('*').order('created_at', { ascending: false }).limit(10).then(res => { dadosBrutos.anuncios = res.data || []; })
      );
    }

    if (querEvento || carregarTudo) {
      promessas.push(
        supabaseClient.from('eventos').select('*').gte('data_hora_inicio', new Date().toISOString()).limit(5).then(res => { dadosBrutos.eventos = res.data || []; })
      );
    }

    if (querComunicado || carregarTudo) {
      promessas.push(
        supabaseClient.from('comunicados_prefeitura').select('*').order('data_publicacao', { ascending: false }).limit(3).then(res => { dadosBrutos.comunicados = res.data || []; })
      );
    }

    await Promise.all(promessas);

    // Monta string de contexto enxuta apenas com o que foi recuperado
    if (dadosBrutos.emergencias?.length) {
      dadosContexto += `\n🚨 EMERGÊNCIAS:\n` + dadosBrutos.emergencias.map((e: any) => `- ${e.nome}: ${e.telefone} (${e.descricao || ''})`).join('\n');
    }
    if (dadosBrutos.unidades?.length) {
      dadosContexto += `\n🏥 UNIDADES DE SAÚDE:\n` + dadosBrutos.unidades.map((u: any) => `- ${u.nome} | Endereço: ${u.endereco} | Horário: ${u.horario} | Serviços: ${Array.isArray(u.servicos) ? u.servicos.join(', ') : u.servicos}`).join('\n');
    }
    if (dadosBrutos.campanhas?.length) {
      dadosContexto += `\n💉 CAMPANHAS:\n` + dadosBrutos.campanhas.map((c: any) => `- ${c.titulo} (Período: ${c.periodo})`).join('\n');
    }
    if (dadosBrutos.dicas?.length) {
      dadosContexto += `\n🛡️ ORIENTAÇÕES:\n` + dadosBrutos.dicas.map((d: any) => `- ${d.orientacao}`).join('\n');
    }
    if (dadosBrutos.empresas?.length) {
      dadosContexto += `\n🏢 EMPRESAS:\n` + dadosBrutos.empresas.map((e: any) => `- ${e.nome} (${e.categoria}) | Tel: ${e.contato || 'N/A'} | Endereço: ${e.endereco || 'N/D'}`).join('\n');
    }
    if (dadosBrutos.anuncios?.length) {
      dadosContexto += `\n🛍️ ANÚNCIOS:\n` + dadosBrutos.anuncios.map((a: any) => `- ${a.titulo}: R$ ${a.preco || 'A combinar'}`).join('\n');
    }
    if (dadosBrutos.eventos?.length) {
      dadosContexto += `\n📅 EVENTOS:\n` + dadosBrutos.eventos.map((ev: any) => `- ${ev.titulo} em ${ev.local || 'São Brás'}`).join('\n');
    }
    if (dadosBrutos.comunicados?.length) {
      dadosContexto += `\n📢 COMUNICADOS:\n` + dadosBrutos.comunicados.map((cm: any) => `- ${cm.titulo}: ${cm.conteudo}`).join('\n');
    }

    return { contexto: dadosContexto || "Nenhuma informação correspondente encontrada no banco.", dadosBrutos };
  } catch (error) {
    console.error('❌ Erro na busca direcionada:', error);
    return { contexto: "Erro ao consultar base de dados.", dadosBrutos: {} };
  }
}

// ============================================
// HANDLER DO CHAT
// ============================================

async function handleChat(request: Request, env: any) {
  try {
    const body = await request.json();
    const { messages } = body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Mensagens inválidas' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const aiClient = createAiClient(env);
    const apiKey = getApiKey(env) || '';

    if (!aiClient || !apiKey) {
      return new Response(JSON.stringify({ message: 'IA não configurada no servidor.' }), { headers: { 'Content-Type': 'application/json' } });
    }

    const ultimaMensagemObj = messages[messages.length - 1];
    const textoUltimaMensagem = typeof ultimaMensagemObj?.content === 'string' ? ultimaMensagemObj.content : '';

    // Executa a busca inteligente focada na dúvida do usuário
    const resultado = await buscarDadosContextuais(env, textoUltimaMensagem);

console.log("====================================");
console.log("PERGUNTA:", textoUltimaMensagem);
console.log("CONTEXTO:");
console.log(resultado.contexto);
console.log("DADOS:");
console.log(JSON.stringify(resultado.dadosBrutos, null, 2));
console.log("====================================");

const { contexto } = resultado;

    const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const systemPrompt = `
Você é o assistente virtual oficial do aplicativo "Meu Suaçuí", exclusivo de São Brás do Suaçuí, MG.
Hoje é ${dataHoje}.

⚠️ REGRA ABSOLUTA:
Responda utilizando **APENAS** os dados oficiais fornecidos abaixo. Se a informação exata não estiver presente, diga estritamente: "Desculpe, essa informação não está cadastrada no banco de dados oficial."

📊 DADOS RECUPERADOS PARA ESTA PERGUNTA:
${contexto}
`;

    const isGroq = apiKey.startsWith('gsk_');
    const modelName = isGroq ? 'llama-3.3-70b-versatile' : 'grok-2-latest';

    const response = await aiClient.chat.completions.create({
      model: modelName,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.1,
      max_tokens: 500,
    });

    const resposta = response.choices[0]?.message?.content || 'Desculpe, não consegui obter resposta.';
    return new Response(JSON.stringify({ message: resposta }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('❌ Erro no handleChat:', error);
    return new Response(JSON.stringify({ error: 'Erro ao processar', details: error instanceof Error ? error.message : '' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// ============================================
// SERVIDOR
// ============================================

export default {
  async fetch(request: Request, env: any, ctx: unknown) {
    const url = new URL(request.url);
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      return handleChat(request, env);
    }
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch {
      return new Response(renderErrorPage(), { status: 500, headers: { "content-type": "text/html; charset=utf-8" } });
    }
  },
};
