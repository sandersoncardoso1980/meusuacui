import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink } from "lucide-react";

export const Route = createFileRoute("/noticias")({
  head: () => ({
    meta: [
      { title: "Notícias — Entre Rios IA" },
      { name: "description", content: "As últimas notícias de São Brás do Suaçuí." },
      { property: "og:title", content: "Notícias — MEU SUAÇUÍ IA" },
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
      <header className="animate-reveal mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">— Editoria local</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Notícias</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-reveal">
        {(data ?? []).map((n) => {
          // Trata se a imagem vem em formato JSON stringificado, array ou string direta
          let imageUrl = "";
          try {
            if (n.imagem_url) {
              if (typeof n.imagem_url === "string" && n.imagem_url.startsWith("[")) {
                const parsed = JSON.parse(n.imagem_url);
                imageUrl = Array.isArray(parsed) ? parsed[0] : n.imagem_url;
              } else if (Array.isArray(n.imagem_url)) {
                imageUrl = n.imagem_url[0];
              } else {
                imageUrl = n.imagem_url;
              }
            }
          } catch {
            imageUrl = typeof n.imagem_url === "string" ? n.imagem_url : "";
          }

          return (
            <article key={n.id} className="bg-card rounded-xl ring-1 ring-black/5 overflow-hidden flex flex-col justify-between shadow-sm">
              <div>
                <div className="aspect-video bg-muted relative overflow-hidden flex items-center justify-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={n.titulo}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback caso a imagem quebre ao carregar
                        e.currentTarget.style.display = "none";
                        if (e.currentTarget.nextElementSibling) {
                          (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                        }
                      }}
                    />
                  ) : null}
                  <div className={`absolute inset-0 items-center justify-center text-5xl bg-muted ${imageUrl ? "hidden" : "flex"}`}>
                    📰
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-xs font-mono text-muted-foreground">
                    {n.data_publicacao ? new Date(n.data_publicacao).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : ""}
                  </p>
                  <h3 className="font-bold mt-2 text-lg leading-tight text-foreground">{n.titulo}</h3>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{n.resumo}</p>
                </div>
              </div>

              {n.link_origem && (
                <div className="px-5 pb-5 pt-0">
                  <a
                    href={n.link_origem}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    <span>Ler matéria original</span>
                    <ExternalLink className="size-4" />
                  </a>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </AppLayout>
  );
}
