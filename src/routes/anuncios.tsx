import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Search, Phone, User } from "lucide-react";

export const Route = createFileRoute("/anuncios")({
  head: () => ({
    meta: [
      { title: "Anúncios — Entre Rios IA" },
      { name: "description", content: "Anúncios de venda, aluguel e serviços em Entre Rios de Minas." },
      { property: "og:title", content: "Anúncios — Entre Rios IA" },
      { property: "og:description", content: "Compre, venda e ofereça serviços na nossa cidade." },
    ],
  }),
  component: Anuncios,
});

function Anuncios() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");

  const { data } = useQuery({
    queryKey: ["anuncios-all"],
    queryFn: async () => {
      const { data } = await supabase.from("anuncios").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const cats = Array.from(new Set((data ?? []).map((d) => d.categoria)));
  const filtered = (data ?? []).filter(
    (a) => (!cat || a.categoria === cat) && (!q || a.titulo.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <AppLayout>
      <header className="animate-reveal">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">— Marketplace local</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Anúncios</h1>
        <p className="text-sm text-muted-foreground mt-2">O que a nossa cidade está negociando hoje.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-3 animate-reveal">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar anúncios..."
            className="w-full pl-10 pr-3 py-2.5 border border-input rounded-lg bg-card text-sm"
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="px-3 py-2.5 border border-input rounded-lg bg-card text-sm"
        >
          <option value="">Todas as categorias</option>
          {cats.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-reveal">
        {filtered.map((a) => {
          // Pega a primeira imagem do array imagens_urls
          const imagemPrincipal = a.imagens_urls?.[0];

          return (
            <article key={a.id} className="bg-card rounded-xl ring-1 ring-black/5 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              {/* Exibe a imagem do storage ou um placeholder caso não tenha imagem */}
              <div className="aspect-video bg-muted relative overflow-hidden flex items-center justify-center">
                {imagemPrincipal ? (
                  <img
                    src={imagemPrincipal}
                    alt={a.titulo}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">📦</span>
                )}
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{a.categoria}</span>
                  <h3 className="font-bold mt-1 line-clamp-1">{a.titulo}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-8">{a.descricao}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50">
                  {/* Nome e Telefone do Vendedor */}
                  {(a.nome_vendedor || a.telefone_vendedor) && (
                    <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                      {a.nome_vendedor && (
                        <div className="flex items-center gap-1.5">
                          <User className="size-3.5" />
                          <span className="truncate">{a.nome_vendedor}</span>
                        </div>
                      )}
                      {a.telefone_vendedor && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="size-3.5" />
                          <span>{a.telefone_vendedor}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-lg font-mono font-bold text-primary">
                    {a.preco ? `R$ ${Number(a.preco).toLocaleString("pt-BR")}` : "Sob consulta"}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">Nenhum anúncio encontrado.</p>
        )}
      </div>
    </AppLayout>
  );
}
