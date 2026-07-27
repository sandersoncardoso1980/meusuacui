import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin, Clock, Phone } from "lucide-react";

export const Route = createFileRoute("/empresas")({
  head: () => ({
    meta: [
      { title: "Empresas — Entre Rios IA" },
      { name: "description", content: "Descubra empresas, lojas e prestadores locais de Entre Rios de Minas." },
      { property: "og:title", content: "Empresas — Entre Rios IA" },
      { property: "og:description", content: "Comércio e serviços da nossa cidade." },
    ],
  }),
  component: Empresas,
});

function Empresas() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  const { data } = useQuery({
    queryKey: ["empresas-all"],
    queryFn: async () => {
      const { data } = await supabase.from("empresas").select("*").order("nome");
      return data ?? [];
    },
  });

  const cats = Array.from(new Set((data ?? []).map((d) => d.categoria)));
  const filtered = (data ?? []).filter(
    (e) => (!cat || e.categoria === cat) && (!q || e.nome.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <AppLayout>
      <header className="animate-reveal">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">— Guia comercial</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Empresas locais</h1>
        <p className="text-sm text-muted-foreground mt-2">Fortaleça o comércio da nossa cidade.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-3 animate-reveal">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar empresas..."
            className="w-full pl-10 pr-3 py-2.5 border border-input rounded-lg bg-card text-sm"
          />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="px-3 py-2.5 border border-input rounded-lg bg-card text-sm">
          <option value="">Todas as categorias</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-reveal">
        {filtered.map((e) => (
          <article key={e.id} className="bg-card rounded-xl ring-1 ring-black/5 p-5 hover:shadow-md transition-shadow relative">
            {e.promocao_ativa && (
              <span className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-1 rounded-md uppercase">
                Promoção
              </span>
            )}
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{e.categoria}</span>
            <h3 className="font-bold mt-1 text-lg">{e.nome}</h3>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{e.descricao}</p>
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              {e.endereco && <p className="flex items-start gap-2"><MapPin className="size-3.5 mt-0.5 shrink-0" />{e.endereco}</p>}
              {e.horario_funcionamento && <p className="flex items-start gap-2"><Clock className="size-3.5 mt-0.5 shrink-0" />{e.horario_funcionamento}</p>}
              {e.contato && <p className="flex items-start gap-2"><Phone className="size-3.5 mt-0.5 shrink-0" />{e.contato}</p>}
            </div>
            {e.promocao_ativa && e.descricao_promocao && (
              <p className="mt-4 p-3 bg-destructive/10 text-destructive text-xs font-semibold rounded-lg">
                🎁 {e.descricao_promocao}
              </p>
            )}
          </article>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">Nenhuma empresa encontrada.</p>
        )}
      </div>
    </AppLayout>
  );
}
