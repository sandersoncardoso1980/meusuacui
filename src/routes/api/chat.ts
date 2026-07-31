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
// DADOS DE SAÚDE FIXOS (GARANTIA TOTAL DE ACESSO)
// ============================================

const DADOS_SAUDE_FIXOS = {
  emergencias: [
    { nome: "SAMU", telefone: "192", descricao: "Urgência e Emergência Médica" },
    { nome: "Bombeiros", telefone: "193", descricao: "Resgate e Combate a Incêndios" },
    { nome: "Polícia Militar", telefone: "190", descricao: "Segurança Pública" },
    { nome: "Vigilância Sanitária", telefone: "(31) 3571-1234", descricao: "Fiscalização e Orientações Sanitárias" },
    { nome: "Hospital Municipal", telefone: "(31) 3571-1000", descricao: "Atendimento Hospitalar Geral" }
  ],
  unidades: [
    { nome: "Unidade Básica de Saúde (UBS) Central", endereco: "Praça da Matriz, s/n - Centro", horario: "Segunda a Sexta, das 07h às 17h", servicos: ["Clínico Geral", "Vacinação", "Curativos", "Farmácia Básica"] },
    { nome: "Nova UBS Bairro São José", endereco: "Rua das Flores, 120 - Bairro São José", horario: "Segunda a Sexta, das 07h às 16h", servicos: ["Pediatria", "Clínico Geral", "Prevenção e Vacinação"] }
  ],
  campanhas: [
    { titulo: "Campanha de Vacinação contra a Gripe (Influenza)", periodo: "Abril a Maio", publico: "Idosos, crianças e grupos prioritários" },
    { titulo: "Prevenção à Dengue: Zero Água Parada", periodo: "Contínuo (Todo o ano)", publico: "Toda a população" }
  ],
  dicas: [
    "Elimine água parada em vasos, calhas e pneus para evitar o mosquito da dengue.",
    "Leve documento com foto e cartão SUS ao procurar uma unidade de saúde.",
    "Em caso de emergência grave, ligue 192 antes de se deslocar.",
    "Mantenha a caderneta de vacinação em dia — sua e das crianças."
  ]
};

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

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: fetch,
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    }
  });
}

// ============================================
// BUSCA PARCIAL DE OUTROS DADOS (OPCIONAL)
// ============================================

async function buscarOutrosDados(env: any) {
  const supabaseClient = getSupabaseClient(env);
  if (!supabaseClient) return { empresas: [], anuncios: [], eventos: [], comunicados: [], noticias: [] };

  try {
    const [empresasRes, anunciosRes, eventosRes, comunicadosRes, noticiasRes] = await Promise.all([
      supabaseClient.from('empresas').select('*').limit(15),
      supabaseClient.from('anuncios').select('*').order('created_at', { ascending: false }).limit(10),
      supabaseClient.from('eventos').select('*').gte('data_hora_inicio', new Date().toISOString()).limit(5),
      supabaseClient.from('comunicados_prefeitura').select('*').order('data_publicacao', { ascending: false }).limit(3),
      supabaseClient.from('noticias').select('*').order('data_publicacao', { ascending: false }).limit(3)
    ]);

    return {
      empresas: empresasRes.data ?? [],
      anuncios: anunciosRes.data ?? [],
      eventos: eventosRes.data ?? [],
      comunicados: comunicadosRes.data ?? [],
      noticias: noticiasRes.data ?? []
    };
  } catch {
    return { empresas: [], anuncios: [], eventos: [], comunicados: [], noticias: [] };
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

    const outrosDados = await buscarOutrosDados(env);

    // Formata os dados fixos de saúde para texto do prompt
    const textoEmergencias = DADOS_SAUDE_FIXOS.emergencias.map(e => `• ${e.nome}: ${e.telefone} (${e.descricao})`).join('\n');
    const textoUnidades = DADOS_SAUDE_FIXOS.unidades.map(u => `• Unidade: ${u.nome} | Endereço: ${u.endereco} | Horário: ${u.horario} | Serviços: ${u.servicos.join(', ')}`).join('\n');
    const textoCampanhas = DADOS_SAUDE_FIXOS.campanhas.map(c => `• ${c.titulo} | Período: ${c.periodo} | Público: ${c.publico}`).join('\n');
    const textoDicas = DADOS_SAUDE_FIXOS.dicas.map(d => `• ${d}`).join('\n');

    const textoEmpresas = outrosDados.empresas.map((e: any) => `• ${e.nome} (${e.categoria}) | Tel: ${e.contato || 'N/A'}`).join('\n') || 'Nenhuma empresa cadastrada.';
    const textoAnuncios = outrosDados.anuncios.map((a: any) => `• [CLASSIFICADO] ${a.titulo} | R$ ${a.preco || 'A combinar'}`).join('\n') || 'Nenhum anúncio recente.';

    const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const systemPrompt = `
Você é o assistente virtual oficial do aplicativo "Meu Suaçuí", exclusivo de São Brás do Suaçuí, MG.
Hoje é ${dataHoje}.

⚠️ REGRA ABSOLUTA:
Responda utilizando **APENAS E EXCLUSIVAMENTE** os dados oficiais fornecidos abaixo. Não invente telefones ou endereços.

---

📊 DADOS OFICIAIS DE SAÚDE:

🚨 EMERGÊNCIAS E ÚTEIS:
${textoEmergencias}

🏥 UNIDADES DE SAÚDE:
${textoUnidades}

💉 CAMPANHAS:
${textoCampanhas}

🛡️ ORIENTAÇÕES:
${textoDicas}

🏢 COMÉRCIO E EMPRESAS:
${textoEmpresas}

🛍️ ANÚNCIOS:
${textoAnuncios}
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
