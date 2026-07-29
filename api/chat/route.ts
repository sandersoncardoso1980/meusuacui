// api/chat/route.ts
import express, { Request, Response, Router } from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router: Router = express.Router();

// Interfaces para tipagem
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

// Inicializa o Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Inicializa Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Função para buscar dados no Supabase
async function searchSupabase(query: string): Promise<DadosContexto> {
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

// Rota POST para chat
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    const userMessage = messages[messages.length - 1].content;

    // Busca dados no Supabase
    const dadosContexto = await searchSupabase(userMessage);

    // Prepara o contexto
    const contexto = `
Você é um assistente virtual especializado em informações sobre a cidade de São Brás do Suaçuí, Minas Gerais.

Aqui estão os dados atualizados da cidade:

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

Pergunta do usuário: ${userMessage}

Responda de forma amigável e útil sobre São Brás do Suaçuí usando os dados fornecidos.
    `;

    // Chama o Gemini
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    });

    const result = await model.generateContent(contexto);
    const response = await result.response;
    const text = response.text();

    res.json({ message: text });

  } catch (error) {
    console.error('Erro no chat:', error);
    res.status(500).json({ error: 'Erro ao processar sua pergunta' });
  }
});

export default router;