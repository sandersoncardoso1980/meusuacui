import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/noticias")({
  head: () => ({
    meta: [
      { title: "Notícias — Entre Rios IA" },
      { name: "description", content: "As últimas notícias de Entre Rios de Minas." },
      { property: "og:title", content: "Notícias — Entre Rios IA" },
      { property: "og:description", content: "Acompanhe o que acontece na cidade." },
    ],
  }),
  component: Noticias,
});

function Noticias() {
  const { data } = useQuery({
    queryKey: ["noticias-all"],
    queryFn: async () => {
      const { data } = await supabase.from("noticias").select("*").order("data_publicacao", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <AppLayout>
      <header className="animate-reveal">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">— Editoria local</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Notícias</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-reveal">
        {(data ?? []).map((n) => (
          <article key={n.id} className="bg-card rounded-xl ring-1 ring-black/5 overflow-hidden">
            <div className="aspect-video bg-muted flex items-center justify-center text-5xl">📰</div>
            <div className="p-5">
              <p className="text-xs font-mono text-muted-foreground">
                {new Date(n.data_publicacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
              <h3 className="font-bold mt-2 text-lg leading-tight">{n.titulo}</h3>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{n.resumo}</p>
              {n.link_origem && (
                <a href={n.link_origem} target="_blank" rel="noopener" className="inline-block mt-4 text-sm font-semibold text-primary hover:underline">
                  Ler matéria completa →
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </AppLayout>
  );
}
