import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import heroCity from "@/assets/hero-city.jpg";
import {
  Home as HomeIcon,
  Wrench,
  Briefcase,
  Car,
  UtensilsCrossed,
  Sparkles,
  Sun,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entre Rios IA — Portal da cidade" },
      {
        name: "description",
        content:
          "Início do portal Entre Rios IA: promoções, últimos anúncios, comunicados da Prefeitura e próximos eventos em Entre Rios de Minas.",
      },
      { property: "og:title", content: "Entre Rios IA — Portal da cidade" },
      { property: "og:description", content: "Início do portal Entre Rios IA: promoções, últimos anúncios, comunicados da Prefeitura e próximos eventos em Entre Rios de Minas." },
    ],
  }),
  component: Index,
});

const CATEGORIES = [
  { icon: HomeIcon, label: "Imóveis" },
  { icon: Wrench, label: "Serviços" },
  { icon: Briefcase, label: "Empregos" },
  { icon: Car, label: "Veículos" },
  { icon: UtensilsCrossed, label: "Gastronomia" },
  { icon: Sparkles, label: "Outros" },
];

function fmtGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function fmtDate() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function Index() {
  const { user } = useAuth();

  const empresas = useQuery({
    queryKey: ["empresas-promos"],
    queryFn: async () => {
      const { data } = await supabase
        .from("empresas")
        .select("*")
        .eq("promocao_ativa", true)
        .limit(3);
      return data ?? [];
    },
  });

  const anuncios = useQuery({
    queryKey: ["anuncios-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("anuncios")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
  });

  const comunicados = useQuery({
    queryKey: ["comunicados-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("comunicados_prefeitura")
        .select("*")
        .order("data_publicacao", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  const eventos = useQuery({
    queryKey: ["eventos-upcoming"],
    queryFn: async () => {
      const { data } = await supabase
        .from("eventos")
        .select("*")
        .gte("data_hora_inicio", new Date().toISOString())
        .order("data_hora_inicio", { ascending: true })
        .limit(3);
      return data ?? [];
    },
  });

  return (
    <AppLayout>
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-reveal">
        <div>
          <p className="text-sm font-mono text-muted-foreground mb-1 capitalize">{fmtDate()}</p>
          <h2 className="text-3xl font-extrabold tracking-tight">
            {fmtGreeting()}, {user?.email?.split("@")[0] ?? "Entre-riense"}.
          </h2>
        </div>
        <div className="flex items-center gap-4 bg-card ring-1 ring-black/5 p-3 rounded-xl shadow-sm">
          <div className="text-right">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tempo agora</p>
            <p className="font-bold">24°C • Ensolarado</p>
          </div>
          <div className="size-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
            <Sun className="size-5" />
          </div>
        </div>
      </header>

      <section className="animate-reveal">
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 aspect-[21/9] md:aspect-[3/1]">
          <img
            src={heroCity}
            alt="Vista aérea de Entre Rios de Minas"
            width={1600}
            height={600}
            className="absolute inset-0 w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12 bg-gradient-to-t from-black/80 to-transparent">
            <h3 className="text-2xl md:text-4xl font-bold text-white mb-3">
              Conectando nossa comunidade digitalmente.
            </h3>
            <p className="text-white/80 max-w-[50ch] text-pretty mb-6">
              Encontre comércio local, serviços públicos e as últimas novidades da nossa Entre Rios.
            </p>
            <div className="flex gap-3">
              <Link
                to="/anuncios"
                className="bg-white text-slate-900 px-6 py-2 rounded-full font-bold text-sm hover:bg-slate-100"
              >
                Ver anúncios
              </Link>
              <Link
                to="/empresas"
                className="bg-white/10 text-white ring-1 ring-white/30 px-6 py-2 rounded-full font-bold text-sm hover:bg-white/20"
              >
                Quero divulgar
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="animate-reveal">
        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-6">
          — Categorias rápidas
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {CATEGORIES.map(({ icon: Icon, label }) => (
            <Link
              key={label}
              to="/anuncios"
              className="group bg-card p-4 rounded-xl ring-1 ring-black/5 hover:ring-primary/30 transition-all shadow-sm"
            >
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="size-5" />
              </div>
              <span className="text-sm font-semibold">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
        <div className="lg:col-span-2 space-y-10 animate-reveal">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold tracking-tight">Promoções em destaque</h3>
              <Link to="/empresas" className="text-sm font-semibold text-primary">
                Ver todas
              </Link>
            </div>
            {empresas.data && empresas.data.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {empresas.data.map((e) => (
                  <div key={e.id} className="group cursor-pointer">
                    <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-muted flex items-center justify-center">
                      {e.imagem_url ? (
                        <img src={e.imagem_url} alt={e.nome} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">🏪</span>
                      )}
                      <span className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-lg">
                        Oferta
                      </span>
                    </div>
                    <h4 className="font-bold text-sm mb-1">{e.nome}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">{e.descricao_promocao}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma promoção ativa no momento.</p>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold tracking-tight">Últimos anúncios</h3>
              <Link to="/anuncios" className="text-sm font-semibold text-primary">
                Ver todos
              </Link>
            </div>
            <div className="space-y-3">
              {anuncios.data?.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-4 p-3 bg-card rounded-xl ring-1 ring-black/5 hover:bg-muted/50 transition-colors"
                >
                  <div className="size-16 rounded-lg bg-muted shrink-0 flex items-center justify-center text-2xl">
                    📦
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{a.titulo}</p>
                    <p className="text-xs text-muted-foreground">{a.categoria}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono font-bold text-primary">
                      {a.preco ? `R$ ${Number(a.preco).toLocaleString("pt-BR")}` : "Sob consulta"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-10 animate-reveal">
          <section className="bg-card rounded-2xl ring-1 ring-black/5 p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-4">📢 Comunicados</h3>
            <div className="space-y-5">
              {comunicados.data?.map((c) => (
                <div key={c.id}>
                  <p className="text-xs font-mono text-primary font-bold mb-1 uppercase">{c.categoria}</p>
                  <h4 className="text-sm font-bold leading-tight mb-1">{c.titulo}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{c.conteudo}</p>
                </div>
              ))}
            </div>
            <Link
              to="/prefeitura"
              className="block text-center w-full mt-6 py-2 text-xs font-bold text-muted-foreground border border-dashed border-border rounded-lg hover:bg-muted/50"
            >
              Ver todos os comunicados
            </Link>
          </section>

          <section>
            <h3 className="text-lg font-bold mb-4">Próximos eventos</h3>
            <div className="space-y-4">
              {eventos.data?.map((ev, i) => {
                const d = new Date(ev.data_hora_inicio);
                return (
                  <div key={ev.id} className="flex gap-4">
                    <div
                      className={`w-12 h-14 flex flex-col items-center justify-center rounded-lg shrink-0 ${
                        i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase opacity-80">
                        {d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                      </span>
                      <span className="text-lg font-black leading-none">
                        {d.getDate().toString().padStart(2, "0")}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">{ev.titulo}</h4>
                      <p className="text-xs text-muted-foreground">
                        {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} • {ev.local}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
