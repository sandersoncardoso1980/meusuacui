// src/api-routes.ts
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

console.log('🔧 Inicializando API routes...');

const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('📝 Verificando variáveis de ambiente...');
console.log('GEMINI_API_KEY:', geminiKey ? '✅ Configurada' : '❌ Não configurada');
console.log('SUPABASE_URL:', supabaseUrl ? '✅ Configurada' : '❌ Não configurada');
console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Configurada' : '❌ Não configurada');

const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

async function searchSupabase(query: string) {
  console.log('🔍 Buscando dados no Supabase para:', query);
  
  if (!supabase) {
    console.warn('⚠️ Supabase não configurado');
    return { 
      eventos: [], 
      empresas: [], 
      anuncios: [], 
      comunicados: [], 
      noticias: [], 
      saudeUnidades: [], 
      saudeCampanhas: [] 
    };
  }

  try {
    console.log('📊 Executando consultas ao Supabase...');
    // ATENÇÃO: A ordem do array de desestruturação deve ser EXATAMENTE a mesma do Promise.all
    const [
      eventos,
      empresas,
      anuncios,
      comunicados,
      noticias,
      saudeUnidades,
      saudeCampanhas
    ] = await Promise.all([
      supabase.from('eventos').select('*').limit(5),
      supabase.from('empresas').select('*').limit(5),
      supabase.from('anuncios').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('comunicados_prefeitura').select('*').order('data_publicacao', { ascending: false }).limit(5),
      supabase.from('noticias').select('*').order('data_publicacao', { ascending: false }).limit(5),
      supabase.from('saude_unidades').select('*').limit(5),   // <-- 6ª consulta (saudeUnidades)
      supabase.from('saude_campanhas').select('*').limit(5)   // <-- 7ª consulta (saudeCampanhas)
    ]);

    // Logs para diagnosticar se alguma tabela do Supabase retornou erro de permissão ou nome
    if (saudeUnidades.error) console.error('❌ Erro saude_unidades:', saudeUnidades.error);
    if (saudeCampanhas.error) console.error('❌ Erro saude_campanhas:', saudeCampanhas.error);

    const result = {
      eventos: eventos.data || [],
      empresas: empresas.data || [],
      anuncios: anuncios.data || [],
      comunicados: comunicados.data || [],
      noticias: noticias.data || [],
      saudeUnidades: saudeUnidades.data || [],
      saudeCampanhas: saudeCampanhas.data || [],
    };
    
    console.log('✅ Dados encontrados:', {
      eventos: result.eventos.length,
      empresas: result.empresas.length,
      anuncios: result.anuncios.length,
      comunicados: result.comunicados.length,
      noticias: result.noticias.length,
      saudeUnidades: result.saudeUnidades.length,
      saudeCampanhas: result.saudeCampanhas.length,
    });
    
    return result;
  } catch (error) {
    console.error('❌ Erro ao buscar dados do Supabase:', error);
    return { 
      eventos: [], 
      empresas: [], 
      anuncios: [], 
      comunicados: [], 
      noticias: [], 
      saudeUnidades: [], 
      saudeCampanhas: [] 
    };
  }
}
export async function handleChat(request: Request) {
  console.log('📩 handleChat iniciado');
  
  try {
    console.log('📖 Lendo body da requisição...');
    const body = await request.json();
    const { messages } = body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.warn('⚠️ Mensagens inválidas');
      return new Response(JSON.stringify({ error: 'Mensagens inválidas' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userMessage = messages[messages.length - 1].content;
    console.log('📩 Pergunta recebida:', userMessage);

    console.log('🔍 Buscando dados no Supabase...');
    const dadosContexto = await searchSupabase(userMessage);

    if (!genAI) {
      console.warn('⚠️ Gemini não configurado, usando modo fallback');
      let resposta = 'Informações locais:\n\n';
      resposta += `Sua pergunta: "${userMessage}"\n\n`;
      
      if (dadosContexto.saudeUnidades.length > 0) {
        resposta += 'Unidades de Saúde:\n';
        dadosContexto.saudeUnidades.forEach((u: any) => {
          resposta += `• ${u.nome} - ${u.endereco} (${u.horario})\n`;
        });
        resposta += '\n';
      }
      
      return new Response(JSON.stringify({ message: resposta }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('🤖 Gerando resposta com Gemini...');
    const contexto = `
Você é um assistente virtual especializado em informações locais de Entre Rios de Minas.

Dados atualizados do banco de dados:

UNIDADES DE SAÚDE:
${dadosContexto.saudeUnidades.map((u: any) => `• ${u.nome}: ${u.endereco} | Horário: ${u.horario} | Serviços: ${Array.isArray(u.servicos) ? u.servicos.join(', ') : u.servicos}`).join('\n') || 'Nenhuma unidade cadastrada'}

CAMPANHAS DE SAÚDE:
${dadosContexto.saudeCampanhas.map((c: any) => `• ${c.titulo} (${c.periodo}): Público: ${c.publico_alvo}`).join('\n') || 'Nenhuma campanha ativa'}

EVENTOS:
${dadosContexto.eventos.map((e: any) => `• ${e.titulo} - ${new Date(e.data_hora_inicio).toLocaleDateString('pt-BR')} em ${e.local || 'N/A'}`).join('\n') || 'Nenhum evento agendado'}

EMPRESAS E COMÉRCIO:
${dadosContexto.empresas.map((e: any) => `• ${e.nome} (${e.categoria}) - ${e.endereco || 'Sem endereço'}`).join('\n') || 'Nenhuma empresa'}

COMUNICADOS OFICIAIS:
${dadosContexto.comunicados.map((c: any) => `• ${c.titulo}: ${c.conteudo}`).join('\n') || 'Nenhum comunicado'}

NOTÍCIAS:
${dadosContexto.noticias.map((n: any) => `• ${n.titulo}`).join('\n') || 'Nenhuma notícia recente'}

Pergunta do usuário: ${userMessage}

Instruções: Responda de forma clara, amigável e objetiva utilizando prioritariamente as informações de saúde e locais fornecidas acima.
`;

    console.log('📤 Enviando contexto para o Gemini...');
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
    });

    const result = await model.generateContent(contexto);
    const text = result.response.text();
    console.log('✅ Resposta gerada com sucesso');

    return new Response(JSON.stringify({ message: text }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro no handleChat:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao processar sua pergunta',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

console.log('✅ API routes inicializadas com sucesso');