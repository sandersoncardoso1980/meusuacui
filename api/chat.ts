import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Interfaces de tipagem
interface Evento {
  titulo: string;
  data_hora_inicio: string;
  local: string;
}

interface Empresa {
  nome: string;
  categoria: string;
  endereco?: string;
}

interface Anuncio {
  titulo: string;
  categoria: string;
  preco?: number;
}

interface Comunicado {
  titulo: string;
  conteudo: string;
}

interface Noticia {
  titulo: string;
  resumo: string;
}

interface DadosContexto {
  eventos: Evento[];
  empresas: Empresa[];
  anuncios: Anuncio[];
  comunicados: Comunicado[];
  noticias: Noticia[];
}

// Inicializa Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Busca os dados no banco de dados
async function searchSupabase(): Promise<DadosContexto> {
  const [eventos, empresas, anuncios, comunicados, noticias] = await Promise.all([
    supabase
      .from('eventos')
      .select('*')
      .gte('data_hora_inicio', new Date().toISOString())
      .order('data_hora_inicio')
      .limit(5),
    supabase
      .from('empresas')
      .select('*')
      .limit(5),
    supabase
      .from('anuncios')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('comunicados_prefeitura')
      .select('*')
      .order('data_publicacao', { ascending: false })
      .limit(5),
    supabase
      .from('noticias')
      .select('*')
      .order('data_publicacao', { ascending: false })
      .limit(5),
  ]);

  return {
    eventos: (eventos.data || []) as Evento[],
    empresas: (empresas.data || []) as Empresa[],
    anuncios: (anuncios.data || []) as Anuncio[],
    comunicados: (comunicados.data || []) as Comunicado[],
    noticias: (noticias.data || []) as Noticia[],
  };
}

// Handler nativo da Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Permite apenas método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Busca a chave do Groq/Grok configurada no painel da Vercel
  const apiKey = process.env.GROQ_API_KEY || process.env.GROK_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'A chave GROQ_API_KEY ou GROK_API_KEY não foi encontrada nas variáveis da Vercel.' });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Mensagens não fornecidas' });
    }

    const userMessage = messages[messages.length - 1].content;

    // Busca o contexto atualizado no Supabase
    const dadosContexto = await searchSupabase();

    // Prepara o Prompt para São Brás do Suaçuí
    const promptSistema = `
Você é o assistente virtual do projeto "Meu Suaçuí", especializado na cidade de São Brás do Suaçuí, Minas Gerais.

Aqui estão os dados atualizados da cidade para embasar suas respostas:

EVENTOS:
${dadosContexto.eventos.map(e => `• ${e.titulo} - ${new Date(e.data_hora_inicio).toLocaleDateString('pt-BR')} em ${e.local}`).join('\n') || 'Nenhum evento cadastrado'}

EMPRESAS E SERVIÇOS:
${dadosContexto.empresas.map(e => `• ${e.nome} - ${e.categoria} - ${e.endereco || 'Endereço não informado'}`).join('\n') || 'Nenhuma empresa cadastrada'}

ANÚNCIOS:
${dadosContexto.anuncios.map(a => `• ${a.titulo} - ${a.categoria} - ${a.preco ? 'R$ ' + a.preco : 'Sob consulta'}`).join('\n') || 'Nenhum anúncio disponível'}

COMUNICADOS DA PREFEITURA:
${dadosContexto.comunicados.map(c => `• ${c.titulo}: ${c.conteudo}`).join('\n') || 'Nenhum comunicado recente'}

NOTÍCIAS:
${dadosContexto.noticias.map(n => `• ${n.titulo}: ${n.resumo}`).join('\n') || 'Nenhuma notícia no momento'}

Responda de forma cortês, objetiva e útil sobre São Brás do Suaçuí com base nos dados fornecidos.
    `;

    // Requisita a API do Groq usando Llama 3 / Mixtral (Extremamente rápido)
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: promptSistema },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error('Erro na API do Groq:', data);
      return res.status(groqResponse.status).json({ error: data.error?.message || 'Erro na API de IA' });
    }

    const replyText = data.choices[0]?.message?.content || 'Não foi possível gerar uma resposta.';

    return res.status(200).json({ message: replyText });

  } catch (error: any) {
    console.error('Erro na Vercel Function:', error);
    return res.status(500).json({ error: error.message || 'Erro interno ao processar requisição' });
  }
}
