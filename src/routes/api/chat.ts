// src/routes/api/chat.ts
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import DADOS_SAUDE_DOCUMENTO from '../../assets/saude_sao_bras_do_suacui?raw'

// ============================================
// TIPOS
// ============================================

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface RequestBody {
  messages: Message[]
}

// ============================================
// CONFIGURAÇÕES
// ============================================

const apiKey = process.env.XAI_API_KEY || process.env.GROQ_API_KEY
const aiClient = apiKey
  ? new OpenAI({
      apiKey,
      baseURL: 'https://api.x.ai/v1',
    })
  : null

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

async function searchSupabase() {
  if (!supabase) {
    return { eventos: [], empresas: [], anuncios: [], comunicados: [], noticias: [] }
  }

  try {
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
        .limit(20),
      
      supabase
        .from('anuncios')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20),
      
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
    ])

    return {
      eventos: eventos.data || [],
      empresas: empresas.data || [],
      anuncios: anuncios.data || [],
      comunicados: comunicados.data || [],
      noticias: noticias.data || [],
    }
  } catch (error) {
    console.error('Erro ao buscar dados do Supabase:', error)
    return { eventos: [], empresas: [], anuncios: [], comunicados: [], noticias: [] }
  }
}

// ============================================
// HANDLER DA ROTA
// ============================================

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as RequestBody
    const { messages } = body
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Mensagens inválidas' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const userMessage = messages[messages.length - 1].content
    console.log('📩 Pergunta recebida:', userMessage)

    // Busca dados complementares no Supabase (comércio, anúncios, eventos, etc.)
    const dadosContexto = await searchSupabase()

    if (!aiClient) {
      return new Response(
        JSON.stringify({ 
          message: 'Desculpe, a IA (Grok/xAI) não está configurada no servidor (falta XAI_API_KEY).' 
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    const systemPrompt = `
VOCÊ É O ASSISTENTE OFICIAL DE SÃO BRÁS DO SUAÇUÍ. SUA MAIOR PRIORIDADE É RESPONDER SOBRE SAÚDE, HOSPITAIS, VIGILÂNCIA SANITÁRIA E UNIDADES PÚBLICAS.
Hoje é ${dataHoje}.

---
📄 DOCUMENTAÇÃO OFICIAL DE SAÚDE (USE ESTAS INFORMAÇÕES OBRIGATORIAMENTE PARA QUALQUER PERGUNTA MÉDICA OU DE UTILIDADE PÚBLICA):
${DADOS_SAUDE_DOCUMENTO}
---

OUTROS DADOS MUNICIPAIS (SUPABASE):
EVENTOS:
${dadosContexto.eventos.map((e: any) => `• ${e.titulo} - ${new Date(e.data_hora_inicio).toLocaleDateString('pt-BR')} em ${e.local}`).join('\n') || 'Nenhum evento cadastrado'}

EMPRESAS E SERVIÇOS:
${dadosContexto.empresas.map((e: any) => `• ${e.nome} - ${e.categoria} - ${e.endereco || 'Endereço não informado'}`).join('\n') || 'Nenhuma empresa cadastrada'}

ANÚNCIOS:
${dadosContexto.anuncios.map((a: any) => `• ${a.titulo} - ${a.categoria} - ${a.preco ? 'R$ ' + a.preco : 'Sob consulta'}`).join('\n') || 'Nenhum anúncio disponível'}

COMUNICADOS DA PREFEITURA:
${dadosContexto.comunicados.map((c: any) => `• ${c.titulo}: ${c.conteudo}`).join('\n') || 'Nenhum comunicado recente'}

NOTÍCIAS:
${dadosContexto.noticias.map((n: any) => `• ${n.titulo}: ${n.resumo}`).join('\n') || 'Nenhuma notícia no momento'}

INSTRUÇÕES CRÍTICAS:
1. Se o usuário perguntar sobre o telefone da Vigilância Sanitária, hospitais, SAMU ou unidades de saúde, você DEVE consultar estritamente o bloco "DOCUMENTAÇÃO OFICIAL DE SAÚDE" acima.
2. Nunca diga que não encontrou informações sobre saúde se o dado estiver listado no documento oficial de saúde.
3. Seja objetivo, educado e use **negrito** nos telefones, endereços, nomes de unidades e horários.
`

    console.log('🤖 Gerando resposta com o Grok (xAI)...');

    const completion = await aiClient.chat.completions.create({
      model: 'grok-2-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.3,
      max_tokens: 600,
    })

    const resposta = completion.choices[0]?.message?.content || 'Desculpe, não consegui obter uma resposta.';
    
    console.log('✅ Resposta gerada com sucesso')

    return new Response(JSON.stringify({ message: resposta }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ Erro no chat:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao processar sua pergunta',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export async function GET(): Promise<Response> {
  return new Response(
    JSON.stringify({
      status: 'OK',
      message: 'API de chat do São Brás do Suaçuí (Grok)',
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
