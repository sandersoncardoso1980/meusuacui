// src/routes/api/chat.ts
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

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
    return { eventos: [], empresas: [], anuncios: [], comunicados: [], noticias: [], unidadesSaude: [], emergenciasSaude: [], campanhasSaude: [] }
  }

  try {
    const [eventos, empresas, anuncios, comunicados, noticias, unidadesSaude, emergenciasSaude, campanhasSaude] = await Promise.all([
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

      supabase
        .from('saude_unidades')
        .select('*'),

      supabase
        .from('saude_emergencias')
        .select('*'),

      supabase
        .from('saude_campanhas')
        .select('*'),
    ])

    return {
      eventos: eventos.data || [],
      empresas: empresas.data || [],
      anuncios: anuncios.data || [],
      comunicados: comunicados.data || [],
      noticias: noticias.data || [],
      unidadesSaude: unidadesSaude.data || [],
      emergenciasSaude: emergenciasSaude.data || [],
      campanhasSaude: campanhasSaude.data || [],
    }
  } catch (error) {
    console.error('Erro ao buscar dados do Supabase:', error)
    return { eventos: [], empresas: [], anuncios: [], comunicados: [], noticias: [], unidadesSaude: [], emergenciasSaude: [], campanhasSaude: [] }
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

    // Busca dados no Supabase
    const dadosContexto = await searchSupabase()

    // Formatação segura dos dados de saúde
    const textoSaude = dadosContexto.unidadesSaude.map((u: any) => {
      let servicosStr = 'Atendimento Geral'
      if (Array.isArray(u.servicos)) {
        servicosStr = u.servicos.join(', ')
      } else if (typeof u.servicos === 'string') {
        servicosStr = u.servicos.replace(/[{}]/g, '').replace(/["']/g, '').split(',').join(', ')
      }
      return `• Unidade: ${u.nome} | Endereço: ${u.endereco} | Horário: ${u.horario} | Serviços: ${servicosStr}`
    }).join('\n') || 'Nenhuma unidade cadastrada'

    const textoEmergencias = dadosContexto.emergenciasSaude.map((e: any) => 
      `• ${e.nome}: ${e.telefone} (${e.descricao || 'Emergência'})`
    ).join('\n') || 'Bombeiros 193, Polícia 190, SAMU 192'

    const textoCampanhas = dadosContexto.campanhasSaude.map((c: any) => 
      `• ${c.titulo} | Período: ${c.periodo}`
    ).join('\n') || 'Nenhuma campanha ativa'

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
VOCÊ É O ASSISTENTE OFICIAL DE SÃO BRÁS DO SUAÇUÍ. SUA MAIOR PRIORIDADE É RESPONDER SOBRE SAÚDE, HOSPITAIS E UNIDADES PÚBLICAS.
Hoje é ${dataHoje}.

DADOS OFICIAIS DE SAÚDE (USE ESTAS INFORMAÇÕES OBRIGATORIAMENTE):
🏥 UNIDADES DE SAÚDE:
${textoSaude}

🚨 EMERGÊNCIAS:
${textoEmergencias}

💉 CAMPANHAS:
${textoCampanhas}

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
1. Se o usuário perguntar sobre o "Hospital Municipal", você DEVE responder que ele fica na Rua Dr. Lima, 300 — Centro, funcionando 24 horas, conforme os dados de saúde acima.
2. Nunca diga que não encontrou informações sobre saúde se o dado estiver listado nas "UNIDADES DE SAÚDE" acima.
3. Seja objetivo, educado e use **negrito** nos endereços, nomes de unidades e horários.
`

    console.log('🤖 Gerando resposta com o Grok (xAI)...');

    const completion = await aiClient.chat.completions.create({
      model: 'grok-2-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.5,
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
