// src/routes/api/chat.ts
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

// ============================================
// TIPOS
// ============================================

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  messages: Message[]
}

// ============================================
// CONFIGURAÇÕES
// ============================================

// Inicializa Gemini
const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null

// Inicializa Supabase
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

async function searchSupabase(query: string) {
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

      // 👇 ADICIONADAS AS TABELAS DE SAÚDE AQUI
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
// HANDLER DA ROTA (padrão do TanStack Start)
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

    // Busca dados no Supabase (já incluindo saúde)
    const dadosContexto = await searchSupabase(userMessage)

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

    // Se não tiver Gemini, retorna resposta estruturada
    if (!genAI) {
      let resposta = '📌 **Informações sobre São Brás do Suaçuí**\n\n'
      resposta += `Sua pergunta: "${userMessage}"\n\n`
      
      if (dadosContexto.unidadesSaude.length > 0) {
        resposta += '🏥 **Unidades de Saúde:**\n'
        dadosContexto.unidadesSaude.forEach((u: any) => {
          resposta += `• ${u.nome} - ${u.endereco} (${u.horario})\n`
        })
        resposta += '\n'
      }

      if (dadosContexto.emergenciasSaude.length > 0) {
        resposta += '🚨 **Emergências:**\n'
        dadosContexto.emergenciasSaude.forEach((e: any) => {
          resposta += `• ${e.nome}: ${e.telefone}\n`
        })
        resposta += '\n'
      }
      
      resposta += '\n💡 **Dica:** Configure a chave GEMINI_API_KEY no arquivo .env!'
      
      return new Response(JSON.stringify({ message: resposta }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Prepara o contexto completo para o Gemini
    const contexto = `
Você é um assistente virtual especializado em informações sobre a cidade de São Brás do Suaçuí, Minas Gerais.

Aqui estão os dados atualizados da cidade:

🏥 SAÚDE - UNIDADES E POSTOS:
${textoSaude}

🚨 SAÚDE - EMERGÊNCIAS E TELEFONES ÚTEIS:
${textoEmergencias}

💉 SAÚDE - CAMPANHAS:
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

Pergunta do usuário: ${userMessage}

Responda de forma amigável e útil sobre São Brás do Suaçuí usando os dados fornecidos acima. Use **negrito** para destacar informações importantes (como endereços e telefones). Seja específico e dê respostas completas e detalhadas.
    `

    // Chama o Gemini
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 600,
      },
    })

    const result = await model.generateContent(contexto)
    const response = await result.response
    const text = response.text()

    console.log('✅ Resposta gerada com sucesso')
    
    return new Response(JSON.stringify({ message: text }), {
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

// GET para teste (opcional)
export async function GET(): Promise<Response> {
  return new Response(
    JSON.stringify({
      status: 'OK',
      message: 'API de chat do São Brás do Suaçuí',
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
