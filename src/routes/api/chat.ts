import type { VercelRequest, VercelResponse } from '@vercel/node';

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

interface UnidadeSaude {
  nome: string;
  endereco: string;
  horario: string;
  servicos?: string[] | string;
}

interface EmergenciaSaude {
  nome: string;
  telefone: string;
  descricao?: string;
}

interface CampanhaSaude {
  titulo: string;
  periodo: string;
  publico_alvo: string;
}

interface DicaSaude {
  orientacao: string;
}

interface DadosContexto {
  eventos: Evento[];
  empresas: Empresa[];
  anuncios: Anuncio[];
  comunicados: Comunicado[];
  noticias: Noticia[];
  unidadesSaude: UnidadeSaude[];
  emergenciasSaude: EmergenciaSaude[];
  campanhasSaude: CampanhaSaude[];
  dicasSaude: DicaSaude[];
}

// Busca os dados no banco de dados (import dinâmico para evitar crash no carregamento do módulo)
async function searchSupabase(supabaseUrl: string, supabaseAnonKey: string): Promise<DadosContexto> {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const [eventos, empresas, anuncios, comunicados, noticias, unidadesSaude, emergenciasSaude, campanhasSaude, dicasSaude] = await Promise.all([
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
    supabase
      .from('saude_unidades')
      .select('*'),
    supabase
      .from('saude_emergencias')
      .select('*'),
    supabase
      .from('saude_campanhas')
      .select('*'),
    supabase
      .from('saude_dicas')
      .select('*'),
  ]);

  return {
    eventos: (eventos.data || []) as Evento[],
    empresas: (empresas.data || []) as Empresa[],
    anuncios: (anuncios.data || []) as Anuncio[],
    comunicados: (comunicados.data || []) as Comunicado[],
    noticias: (noticias.data || []) as Noticia[],
    unidadesSaude: (unidadesSaude.data || []) as UnidadeSaude[],
    emergenciasSaude: (emergenciasSaude.data || []) as EmergenciaSaude[],
    campanhasSaude: (campanhasSaude.data || []) as CampanhaSaude[],
    dicasSaude: (dicasSaude.data || []) as DicaSaude[],
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

  // Valida variáveis do Supabase ANTES de tentar criar o cliente
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: 'As variáveis SUPABASE_URL ou SUPABASE_ANON_KEY não estão configuradas no Vercel. Verifique em Settings > Environment Variables.',
    });
  }

  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Mensagens não fornecidas' });
    }

    const userMessage = messages[messages.length - 1].content;

    // Busca o contexto atualizado no Supabase (com credenciais passadas como parâmetro)
    const dadosContexto = await searchSupabase(supabaseUrl, supabaseAnonKey);

    // Formata dados de saúde para o prompt
    const textoUnidades = dadosContexto.unidadesSaude.length > 0
      ? dadosContexto.unidadesSaude.map((u) => {
          let servicosStr = 'Atendimento Geral';
          if (Array.isArray(u.servicos)) {
            servicosStr = u.servicos.join(', ');
          } else if (typeof u.servicos === 'string' && u.servicos) {
            servicosStr = u.servicos.replace(/[{}"']/g, '').trim();
          }
          return `• ${u.nome} | Endereço: ${u.endereco} | Horário: ${u.horario} | Serviços: ${servicosStr}`;
        }).join('\n')
      : 'Nenhuma unidade cadastrada no momento.';

    const textoEmergencias = dadosContexto.emergenciasSaude.length > 0
      ? dadosContexto.emergenciasSaude.map((e) => 
          `• ${e.nome}: ${e.telefone} (${e.descricao || 'Emergência'})`
        ).join('\n')
      : 'Contatos padrão: Polícia 190, SAMU 192, Bombeiros 193.';

    const textoCampanhas = dadosContexto.campanhasSaude.length > 0
      ? dadosContexto.campanhasSaude.map((c) => 
          `• ${c.titulo} | Período: ${c.periodo} | Público-alvo: ${c.publico_alvo}`
        ).join('\n')
      : 'Nenhuma campanha ativa no momento.';

    const textoDicas = dadosContexto.dicasSaude.length > 0
      ? dadosContexto.dicasSaude.map((d) => `• ${d.orientacao}`).join('\n')
      : 'Nenhuma dica disponível no momento.';

    // Prepara o Prompt para São Brás do Suaçuí
    const promptSistema = `
Você é o assistente virtual do projeto "Meu Suaçuí", especializado na cidade de São Brás do Suaçuí, Minas Gerais.

Aqui estão os dados atualizados da cidade para embasar suas respostas:

🏥 UNIDADES DE SAÚDE:
${textoUnidades}

🚨 EMERGÊNCIAS:
${textoEmergencias}

💉 CAMPANHAS DE SAÚDE:
${textoCampanhas}

💡 DICAS DE SAÚDE:
${textoDicas}

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

INSTRUÇÕES IMPORTANTES:
1. Se o usuário perguntar sobre saúde, hospitais, postos de saúde, vacinas, emergências ou campanhas de vacinação, responda OBRIGATORIAMENTE com os dados de saúde acima.
2. Se a informação solicitada não estiver na base cadastrada, informe educadamente que ainda não foi registrada no aplicativo.
3. Responda de forma cortês, objetiva e útil sobre São Brás do Suaçuí com base nos dados fornecidos.
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
