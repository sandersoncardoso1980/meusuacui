import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Clock, User } from "lucide-react";

export const Route = createFileRoute("/eventos")({
  head: () => ({
    meta: [
      { title: "Eventos — Entre Rios IA" },
      { name: "description", content: "Agenda cultural e eventos em Entre Rios de Minas." },
      { property: "og:title", content: "Eventos — Entre Rios IA" },
      { property: "og:description", content: "Não perca o que vem por aí na nossa cidade." },
    ],
  }),
  component: Eventos,
});

function Eventos() {
  const { data } = useQuery({
    queryKey: ["eventos-all"],
    queryFn: async () => {
      const { data } = await supabase
        .from("eventos")
        .select("*")
        .order("data_hora_inicio", { ascending: true });
      return data ?? [];
    },
  });

  return (
    <AppLayout>
      <header className="animate-reveal">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">— Agenda</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Eventos</h1>
      </header>

      <div className="space-y-4 animate-reveal">
        {(data ?? []).map((ev) => {
          const d = new Date(ev.data_hora_inicio);
          return (
            <article key={ev.id} className="flex gap-4 md:gap-6 bg-card rounded-xl ring-1 ring-black/5 p-5">
              <div className="w-16 md:w-20 h-20 flex flex-col items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
                <span className="text-[10px] font-bold uppercase opacity-80">
                  {d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                </span>
                <span className="text-2xl md:text-3xl font-black leading-none">{d.getDate().toString().padStart(2, "0")}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg">{ev.titulo}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ev.descricao}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="size-3.5" />{d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                  {ev.local && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{ev.local}</span>}
                  {ev.organizador && <span className="flex items-center gap-1"><User className="size-3.5" />{ev.organizador}</span>}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </AppLayout>
  );
}
