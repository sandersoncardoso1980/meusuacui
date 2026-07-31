// src/routes/api/chat.ts
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface RequestBody {
  messages: Message[]
}

const apiKey = process.env.XAI_API_KEY || process.env.GROQ_API_KEY
const aiClient = apiKey ? new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' }) : null
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY 
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY) 
  : null

const DADOS_SAUDE = `
# Informações de Saúde: São Brás do Suaçuí
- UBS Central Dr. João da Silva: Praça da Matriz, 120, Centro. Tel: (31) 3745-1234. Horário: Segunda a sexta, 07h30 às 17h00.
- Profissionais UBS Central: 
  - Dr. Carlos Mendes (Clínico Geral)
  - Dra. Ana Paula Ferreira (Ginecologia e Obstetrícia)
  - Dr. Roberto Alves (Pediatria)
  - Dra. Juliana Costa (Cardiologia)
- UBS Rural Dona Maria: Estrada Municipal 402, Km 15, Comunidade do Alto do Pico. Tel: (31) 3745-5678. Médico responsável: Dr. Felipe Souza.
- Emergências úteis: SAMU 192, Bombeiros 193, Polícia 190.
- Vigilância Sanitária: (31) 3571-1234.
`

export async function POST(request: Request): Promise<Response> {
  // Log imediato para testar se a rota foi atingida
  console.log('🚨 ROTA /api/chat FOI ACIONADA COM SUCESSO')

  try {
    const body = await request.json() as RequestBody
    const { messages } = body
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Mensagens inválidas' }), { status: 400 })
    }

    if (!aiClient) {
      return new Response(JSON.stringify({ message: 'IA não configurada no servidor.' }), { status: 500 })
    }

    let eventosData: any[] = []
    if (supabase) {
      const res = await supabase.from('eventos').select('*').limit(5)
      eventosData = res.data || []
    }

    const systemPrompt = `
Você é o assistente oficial de São Brás do Suaçuí. 
Responda com base estrita nas informações abaixo:

${DADOS_SAUDE}

EVENTOS NO SUPABASE:
${eventosData.map((e: any) => `- ${e.titulo}`).join('\n') || 'Nenhum'}

Instrução: Se perguntarem sobre médicos ou unidades de saúde (como a Dra. Juliana Costa), responda diretamente com os dados acima.
`

    const completion = await aiClient.chat.completions.create({
      model: 'grok-2-latest',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.3,
      max_tokens: 500,
    })

    const resposta = completion.choices[0]?.message?.content || 'Sem resposta.'
    return new Response(JSON.stringify({ message: resposta }), { headers: { 'Content-Type': 'application/json' } })

  } catch (error: any) {
    console.error('❌ ERRO CRTICO NA API:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}

export async function GET(): Promise<Response> {
  return new Response(JSON.stringify({ status: 'OK' }))
}
