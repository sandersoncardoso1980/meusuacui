import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/prefeitura")({
  head: () => ({
    meta: [
      { title: "Prefeitura — Entre Rios IA" },
      { name: "description", content: "Comunicados oficiais e informações da Prefeitura de Entre Rios de Minas." },
      { property: "og:title", content: "Prefeitura de Entre Rios de Minas" },
      { property: "og:description", content: "Comunicados, serviços e canais oficiais." },
    ],
  }),
  component: Prefeitura,
});

function Prefeitura() {
  const { data } = useQuery({
    queryKey: ["comunicados-all"],
    queryFn: async () => {
      const { data } = await supabase.from("comunicados_prefeitura").select("*").order("data_publicacao", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <AppLayout>
      <header className="animate-reveal">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">— Governo municipal</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Prefeitura</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Comunicados oficiais, serviços e canais de atendimento da administração municipal.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-4 animate-reveal">
          <h2 className="text-lg font-bold">Comunicados oficiais</h2>
          {(data ?? []).map((c) => (
            <article key={c.id} className="bg-card p-5 rounded-xl ring-1 ring-black/5">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-mono font-bold text-primary uppercase">{c.categoria}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {new Date(c.data_publicacao).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <h3 className="font-bold text-lg leading-tight">{c.titulo}</h3>
              <p className="text-sm text-muted-foreground mt-2">{c.conteudo}</p>
            </article>
          ))}
        </section>

        <aside className="space-y-6 animate-reveal">
          <div className="bg-card p-6 rounded-xl ring-1 ring-black/5">
            <h3 className="font-bold mb-4">Contatos oficiais</h3>
            <dl className="text-sm space-y-3">
              <div><dt className="text-xs uppercase text-muted-foreground">Endereço</dt><dd>Praça Cel. Castro, s/n — Centro</dd></div>
              <div><dt className="text-xs uppercase text-muted-foreground">Telefone</dt><dd>(31) 3821-0000</dd></div>
              <div><dt className="text-xs uppercase text-muted-foreground">Ouvidoria</dt><dd>0800 000 0000</dd></div>
            </dl>
          </div>
          <div className="bg-card p-6 rounded-xl ring-1 ring-black/5">
            <h3 className="font-bold mb-4">Serviços</h3>
            <ul className="text-sm space-y-2">
              <li><a href="#" className="text-primary hover:underline">Emissão de IPTU</a></li>
              <li><a href="#" className="text-primary hover:underline">Portal da Transparência</a></li>
              <li><a href="#" className="text-primary hover:underline">Licitações</a></li>
              <li><a href="#" className="text-primary hover:underline">Diário Oficial</a></li>
            </ul>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}
