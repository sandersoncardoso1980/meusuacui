import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/servicos")({
  head: () => ({
    meta: [
      { title: "Serviços — Entre Rios IA" },
      { name: "description", content: "Prestadores de serviços em Entre Rios de Minas." },
      { property: "og:title", content: "Serviços — Entre Rios IA" },
      { property: "og:description", content: "Encontre profissionais e serviços locais." },
    ],
  }),
  component: Servicos,
});

function Servicos() {
  const { data } = useQuery({
    queryKey: ["servicos"],
    queryFn: async () => {
      const { data } = await supabase.from("anuncios").select("*").eq("tipo_negociacao", "servico");
      return data ?? [];
    },
  });

  return (
    <AppLayout>
      <header className="animate-reveal">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">— Prestadores</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Serviços</h1>
        <p className="text-sm text-muted-foreground mt-2">Quem faz o quê na nossa cidade.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-reveal">
        {(data ?? []).map((s) => (
          <article key={s.id} className="bg-card rounded-xl ring-1 ring-black/5 p-5">
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{s.categoria}</span>
            <h3 className="font-bold mt-1 text-lg">{s.titulo}</h3>
            <p className="text-sm text-muted-foreground mt-2">{s.descricao}</p>
            <p className="mt-4 font-mono font-bold text-primary">
              {s.preco ? `R$ ${Number(s.preco).toLocaleString("pt-BR")}` : "Sob consulta"}
            </p>
          </article>
        ))}
        {(!data || data.length === 0) && (
          <p className="col-span-full text-center text-muted-foreground py-12">Nenhum serviço cadastrado.</p>
        )}
      </div>
    </AppLayout>
  );
}
