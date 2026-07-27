import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Send, Sparkles } from "lucide-react";

export const Route = createFileRoute("/ia-cidade")({
  head: () => ({
    meta: [
      { title: "IA da Cidade — Entre Rios IA" },
      { name: "description", content: "Chat inteligente que responde suas perguntas sobre Entre Rios de Minas." },
      { property: "og:title", content: "IA da Cidade — Entre Rios IA" },
      { property: "og:description", content: "Pergunte tudo sobre a cidade." },
    ],
  }),
  component: IACidade,
});

type Msg = { role: "user" | "assistant"; text: string };

const SUGESTOES = [
  "Onde tem farmácia de plantão?",
  "Quais eventos acontecem essa semana?",
  "Restaurantes com promoção hoje?",
  "Como emitir o IPTU?",
];

async function respond(q: string): Promise<string> {
  const query = q.toLowerCase();

  if (/(evento|agenda|programação|programacao)/.test(query)) {
    const { data } = await supabase
      .from("eventos")
      .select("titulo, data_hora_inicio, local")
      .gte("data_hora_inicio", new Date().toISOString())
      .order("data_hora_inicio")
      .limit(5);
    if (!data?.length) return "Não encontrei eventos próximos na agenda.";
    return "Aqui estão os próximos eventos:\n\n" + data.map((e) => `• **${e.titulo}** — ${new Date(e.data_hora_inicio).toLocaleDateString("pt-BR")} em ${e.local}`).join("\n");
  }

  if (/(promo|desconto|oferta)/.test(query)) {
    const { data } = await supabase.from("empresas").select("nome, descricao_promocao").eq("promocao_ativa", true);
    if (!data?.length) return "Nenhuma promoção ativa no momento.";
    return "Promoções ativas na cidade:\n\n" + data.map((e) => `• **${e.nome}**: ${e.descricao_promocao}`).join("\n");
  }

  if (/(farmácia|farmacia|saúde|saude|hospital|posto)/.test(query)) {
    const { data } = await supabase.from("empresas").select("nome, endereco, horario_funcionamento, contato").eq("categoria", "Saúde");
    if (!data?.length) return "Sem estabelecimentos de saúde cadastrados.";
    return data.map((e) => `**${e.nome}**\n${e.endereco}\n${e.horario_funcionamento}\n${e.contato}`).join("\n\n");
  }

  if (/(anúncio|anuncio|venda|comprar|vender)/.test(query)) {
    const { data } = await supabase.from("anuncios").select("titulo, preco, categoria").order("created_at", { ascending: false }).limit(5);
    if (!data?.length) return "Nenhum anúncio disponível.";
    return "Últimos anúncios:\n\n" + data.map((a) => `• **${a.titulo}** (${a.categoria}) — ${a.preco ? "R$ " + a.preco : "Sob consulta"}`).join("\n");
  }

  if (/(comunicado|prefeitura|iptu|imposto)/.test(query)) {
    const { data } = await supabase.from("comunicados_prefeitura").select("titulo, conteudo").order("data_publicacao", { ascending: false }).limit(3);
    if (!data?.length) return "Sem comunicados recentes.";
    return "Comunicados recentes da Prefeitura:\n\n" + data.map((c) => `• **${c.titulo}**\n${c.conteudo}`).join("\n\n");
  }

  if (/(notícia|noticia)/.test(query)) {
    const { data } = await supabase.from("noticias").select("titulo, resumo").order("data_publicacao", { ascending: false }).limit(3);
    if (!data?.length) return "Sem notícias no momento.";
    return "Últimas notícias:\n\n" + data.map((n) => `• **${n.titulo}**\n${n.resumo}`).join("\n\n");
  }

  return "Posso te ajudar com **eventos**, **promoções**, **empresas locais**, **anúncios**, **comunicados da Prefeitura** e **notícias**. O que você gostaria de saber?";
}

function IACidade() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", text: "Olá! Sou a IA da Cidade. Pergunte sobre eventos, comércio local, serviços públicos e mais." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    const reply = await respond(text);
    setMsgs((m) => [...m, { role: "assistant", text: reply }]);
    setLoading(false);
  }

  return (
    <AppLayout>
      <header className="animate-reveal">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">— Assistente</p>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Sparkles className="size-7 text-primary" /> IA da Cidade
        </h1>
        <p className="text-sm text-muted-foreground mt-2">Perguntas sobre Entre Rios respondidas na hora.</p>
      </header>

      <div className="bg-card rounded-2xl ring-1 ring-black/5 flex flex-col h-[65vh] max-h-[700px] animate-reveal">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}>
                {m.text.split("**").map((part, idx) => idx % 2 === 1 ? <strong key={idx}>{part}</strong> : part)}
              </div>
            </div>
          ))}
          {loading && <div className="text-xs text-muted-foreground italic">Pensando...</div>}
        </div>

        <div className="border-t border-border p-3">
          {msgs.length <= 1 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {SUGESTOES.map((s) => (
                <button key={s} onClick={() => send(s)} className="text-xs bg-muted hover:bg-muted/70 px-3 py-1.5 rounded-full text-muted-foreground">
                  {s}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pergunte algo sobre a cidade..."
              className="flex-1 px-4 py-2.5 border border-input rounded-lg bg-background text-sm"
            />
            <button type="submit" disabled={loading} className="bg-primary text-primary-foreground px-4 rounded-lg hover:bg-primary/90 disabled:opacity-50">
              <Send className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
