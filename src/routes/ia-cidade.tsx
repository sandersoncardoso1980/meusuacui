// src/routes/ia-cidade.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Send, Sparkles, Loader2, Bot, User } from "lucide-react";

export const Route = createFileRoute("/ia-cidade")({
  head: () => ({
    meta: [
      { title: "IA da Cidade — São Brás do Suaçuí" },
      { name: "description", content: "Chat inteligente que responde suas perguntas sobre São Brás do Suaçuí." },
      { property: "og:title", content: "IA da Cidade — São Brás do Suaçuí" },
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
  "Quais são os pontos turísticos da cidade?",
  "O que tem para fazer no fim de semana?",
];

function IACidade() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { 
      role: "assistant", 
      text: "Olá! Sou a IA da Cidade de São Brás do Suaçuí. Estou aqui para ajudar você com informações sobre nossa cidade!\n\nPosso falar sobre:\n* Eventos e agenda\n* Comércio e serviços\n* Comunicados oficiais\n* Notícias locais\n* Serviços públicos\n\nO que você gostaria de saber?" 
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [msgs]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    setMsgs((prev) => [...prev, { role: "user", text: text.trim() }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: text.trim() }]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar sua pergunta');
      }

      const data = await response.json();
      
      setMsgs((prev) => [...prev, { role: "assistant", text: data.message }]);
    } catch (error) {
      console.error('Erro:', error);
      setMsgs((prev) => [...prev, { 
        role: "assistant", 
        text: "Desculpe, tive um problema ao processar sua pergunta. Por favor, tente novamente mais tarde ou reformule sua pergunta." 
      }]);
    } finally {
      setLoading(false);
    }
  }

  // Função segura para formatar mensagens sem emojis problemáticos
  const formatMessage = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    
    return lines.map((line, i) => {
      // Títulos em negrito
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} className="font-bold text-base mt-2">{line.slice(2, -2)}</div>;
      }
      
      // Listas com marcadores
      if (line.startsWith('•') || line.startsWith('*') || line.startsWith('-')) {
        const content = line.replace(/^[•*\-]\s*/, '');
        return <div key={i} className="flex items-start gap-2 ml-2">
          <span className="text-primary">•</span>
          <span>{content}</span>
        </div>;
      }
      
      // Parágrafo normal
      return <div key={i} className={i > 0 ? 'mt-1' : ''}>{line}</div>;
    });
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4">
        <header className="animate-reveal py-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">— Assistente Inteligente</p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <Sparkles className="size-8 text-primary" /> 
            <span>IA da Cidade</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Assistente virtual com IA para São Brás do Suaçuí
          </p>
        </header>

        <div className="bg-card rounded-2xl ring-1 ring-black/5 shadow-lg flex flex-col h-[65vh] max-h-[700px] animate-reveal overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {msgs.map((m, i) => (
              <div 
                key={i} 
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className={`flex items-start gap-2 max-w-[85%] ${
                  m.role === "user" ? "flex-row-reverse" : ""
                }`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    m.role === "user" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-foreground"
                  }`}>
                    {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
                  </div>
                  
                  <div className={`rounded-2xl px-4 py-3 text-sm ${
                    m.role === "user" 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-foreground"
                  }`}>
                    {m.role === "assistant" ? formatMessage(m.text) : m.text}
                  </div>
                </div>
              </div>
            ))}
            
            <div ref={messagesEndRef} />
            
            {loading && (
              <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="size-4" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Pensando...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border p-4 bg-background/50 backdrop-blur-sm">
            {msgs.length <= 1 && (
              <div className="flex gap-2 flex-wrap mb-3">
                {SUGESTOES.map((s) => (
                  <button 
                    key={s} 
                    onClick={() => sendMessage(s)} 
                    className="text-xs bg-muted hover:bg-primary/10 px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground transition-all duration-200 border border-transparent hover:border-primary/20"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua pergunta sobre a cidade..."
                className="flex-1 px-4 py-2.5 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                disabled={loading}
              />
              <button 
                type="submit" 
                disabled={loading || !input.trim()} 
                className="bg-primary text-primary-foreground px-4 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all duration-200 flex items-center gap-2"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </form>
          </div>
        </div>
        
        <p className="text-xs text-center text-muted-foreground mt-4">
         IA alimentada por Grok (xAI) • Dados atualizados de São Brás do Suaçuí
        </p>
      </div>
    </AppLayout>
  );
}
