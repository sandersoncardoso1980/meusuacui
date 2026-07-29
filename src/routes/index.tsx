import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import heroCity from "@/assets/hero-city2.jpg";
import {
  Car,
  Home as HomeIcon,
  Briefcase,
  Wrench,
  ShoppingBag,
  UtensilsCrossed,
  HeartPulse,
  Landmark,
  Mic,
  Send,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MEU SUAÇUÍ IA — Portal da cidade" },
      {
        name: "description",
        content:
          "Portal da cidade de São Brás do Suaçuí: pergunte à IA, veja anúncios, empresas, eventos e comunicados da Prefeitura.",
      },
      { property: "og:title", content: "São Brás IA — Portal da cidade" },
      { property: "og:description", content: "Portal da cidade de São Brás do Suaçuí: pergunte à IA, veja anúncios, empresas, eventos e comunicados." },
    ],
  }),
  component: Index,
});

const CATEGORIES = [
  { icon: Car, label: "Carros", color: "bg-blue-50 text-blue-600", href: "/anuncios" }, // ou /empresas dependendo de onde cobrir veículos
  { icon: HomeIcon, label: "Imóveis", color: "bg-emerald-50 text-emerald-600", href: "/anuncios" },
  { icon: Briefcase, label: "Empregos", color: "bg-amber-50 text-amber-600", href: "/anuncios" },
  { icon: Wrench, label: "Serviços", color: "bg-violet-50 text-violet-600", href: "/servicos" },
  { icon: ShoppingBag, label: "Comércio", color: "bg-rose-50 text-rose-600", href: "/empresas" },
  { icon: UtensilsCrossed, label: "Restaurantes", color: "bg-orange-50 text-orange-600", href: "/empresas" },
  { icon: HeartPulse, label: "Saúde", color: "bg-teal-50 text-teal-600", href: "/saude" },
  { icon: Landmark, label: "Prefeitura", color: "bg-slate-100 text-slate-700", href: "/prefeitura" },
];

const SUGGESTIONS = [
  "Onde encontro farmácia aberta agora?",
  "Preciso de um eletricista",
  "Oficinas de câmbio automático",
  "Quais eventos vão acontecer esse mês?",
];

const PROMO_STYLES = [
  { bg: "bg-emerald-100", badge: "bg-emerald-600", badgeText: "Até 40% OFF" },
  { bg: "bg-red-50", badge: "bg-red-600", badgeText: "Aproveite!" },
  { bg: "bg-slate-900", badge: "bg-amber-500", badgeText: "Confira!" },
];

function fmtGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function Index() {
  const { user } = useAuth();
  const name = user?.email?.split("@")[0] ?? "Suaçuiense";

  const empresas = useQuery({
    queryKey: ["empresas-promos"],
    queryFn: async () => {
      const { data } = await supabase.from("empresas").select("*").eq("promocao_ativa", true).limit(3);
      return data ?? [];
    },
  });

  const anuncios = useQuery({
    queryKey: ["anuncios-recent"],
    queryFn: async () => {
      const { data } = await supabase.from("anuncios").select("*").order("created_at", { ascending: false }).limit(5);
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
      {/* Greeting + city card */}
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">
        <div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
            {fmtGreeting()}, <span className="text-emerald-600 capitalize">{name}</span>! <span className="inline-block">👋</span>
          </h2>
          <p className="text-slate-600 mt-2 max-w-lg">
            Pergunte, pesquise e encontre o que precisa em <span className="font-bold text-slate-900">São Brás do Suaçuí</span>.
          </p>
        </div>
        <div className="relative w-full lg:w-[280px] h-[130px] rounded-2xl overflow-hidden ring-1 ring-slate-200 shadow-sm">
          <div className="w-full h-full bg-cover bg-center"  style={{ backgroundImage: `url(${heroCity})` }}
/>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-3 left-3 text-white">
            <p className="text-sm font-bold">São Brás do Suaçuí</p>
            <p className="text-[11px] opacity-90">Nossa cidade, nosso orgulho</p>
          </div>
        </div>
      </section>

      {/* AI search */}
      <section className="bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm p-4 md:p-5">
        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition">
          <input
            type="text"
            placeholder="Pergunte qualquer coisa para a IA da cidade..."
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-400"
          />
          <button className="p-2 text-slate-400 hover:text-emerald-600">
            <Mic className="size-5" />
          </button>
          <Link
            to="/ia-cidade"
            className="size-10 rounded-full bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center text-white shadow-sm"
          >
            <Send className="size-4" />
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {SUGGESTIONS.map((s) => (
            <Link
              key={s}
              to="/ia-cidade"
              className="text-xs font-medium text-slate-600 border border-slate-200 rounded-full px-3.5 py-1.5 hover:border-emerald-500 hover:text-emerald-700 transition-colors"
            >
              {s}
            </Link>
          ))}
        </div>
      </section>

     {/* Categories */}
<section>
  <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
    {CATEGORIES.map(({ icon: Icon, label, color, href }) => (
      <Link
        key={label}
        to={href}
        className="group bg-white rounded-xl ring-1 ring-slate-200 p-3 flex flex-col items-center gap-2 hover:shadow-md hover:-translate-y-0.5 transition-all"
      >
        <div className={`size-11 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="size-5" />
        </div>
        <span className="text-xs font-semibold text-slate-700">{label}</span>
      </Link>
    ))}
  </div>
</section>

      {/* Promoções */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black tracking-tight text-slate-900">Promoções em destaque</h3>
          <Link to="/empresas" className="text-sm font-semibold text-emerald-700 hover:underline">
            Ver todas
          </Link>
        </div>
        <div className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(empresas.data && empresas.data.length > 0
              ? empresas.data.slice(0, 3)
              : [null, null, null]
            ).map((e, i) => {
              const style = PROMO_STYLES[i % PROMO_STYLES.length];
              const isDark = i === 2;
              return (
                <div
                  key={e?.id ?? i}
                  className={`relative rounded-2xl p-5 h-40 overflow-hidden ${style.bg} ring-1 ring-black/5 flex flex-col justify-between`}
                >
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-amber-400" : "text-slate-500"}`}>
                      {e?.categoria ?? "Oferta"}
                    </p>
                    <h4 className={`text-lg font-black leading-tight mt-1 ${isDark ? "text-white" : "text-slate-900"}`}>
                      {e?.nome ?? (i === 0 ? "SUPERMERCADO SÃO JOSÉ" : i === 1 ? "FARMÁCIA BEM ESTAR" : "AUTO PEÇAS ENTRE RIOS")}
                    </h4>
                    <p className={`text-xs mt-2 max-w-[18ch] ${isDark ? "text-white/80" : "text-slate-700"}`}>
                      {e?.descricao_promocao ?? (i === 0
                        ? "Fim de semana com ofertas imperdíveis!"
                        : i === 1
                        ? "Vitaminas com até 30% OFF"
                        : "Tudo para seu carro com os melhores preços!")}
                    </p>
                  </div>
                  <span className={`self-start px-3 py-1.5 rounded-full text-[11px] font-bold text-white ${style.badge}`}>
                    {style.badgeText}
                  </span>
                </div>
              );
            })}
          </div>
          <button className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 size-8 rounded-full bg-white shadow-md ring-1 ring-slate-200 items-center justify-center text-slate-600 hover:text-emerald-600">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </section>

      {/* Últimos anúncios */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black tracking-tight text-slate-900">Últimos anúncios</h3>
          <Link to="/anuncios" className="text-sm font-semibold text-emerald-700 hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {(anuncios.data ?? []).slice(0, 5).map((a) => (
            <Link
              key={a.id}
              to="/anuncios"
              className="group bg-white rounded-xl ring-1 ring-slate-200 overflow-hidden hover:shadow-md transition-all"
            >
              <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center text-4xl">
                {a.imagens_urls && a.imagens_urls[0] ? (
                  <img src={a.imagens_urls[0]} alt={a.titulo} className="w-full h-full object-cover" />
                ) : (
                  <span>📦</span>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-bold text-slate-900 truncate">{a.titulo}</p>
                <p className="text-sm font-black text-emerald-700 mt-0.5">
                  {a.preco ? `R$ ${Number(a.preco).toLocaleString("pt-BR")}` : "A combinar"}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 truncate">São Brás do Suaçuí - MG</p>
                <span className="inline-block mt-2 text-[10px] font-bold text-slate-600 bg-slate-100 rounded px-2 py-0.5">
                  {a.categoria}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Comunicados + Eventos */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black tracking-tight text-slate-900">Comunicados da Prefeitura</h3>
            <Link to="/prefeitura" className="text-xs font-semibold text-emerald-700 hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {(comunicados.data ?? []).map((c) => (
              <div key={c.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="size-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Landmark className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{c.titulo}</p>
                  <p className="text-xs text-slate-500 line-clamp-1">{c.conteudo}</p>
                </div>
                <p className="text-[11px] text-slate-400 font-mono shrink-0">
                  {new Date(c.data_publicacao).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl ring-1 ring-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black tracking-tight text-slate-900">Próximos eventos</h3>
            <Link to="/eventos" className="text-xs font-semibold text-emerald-700 hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="space-y-3">
            {(eventos.data ?? []).map((ev) => {
              const d = new Date(ev.data_hora_inicio);
              return (
                <div key={ev.id} className="flex items-center gap-3">
                  <div className="w-12 shrink-0 flex flex-col items-center justify-center rounded-lg bg-slate-50 py-2">
                    <span className="text-lg font-black text-slate-900 leading-none">
                      {d.getDate().toString().padStart(2, "0")}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase mt-1">
                      {d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{ev.titulo}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {ev.local} • {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}h
                    </p>
                  </div>
                  <div className="size-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-lg">
                    {ev.imagem_url ? (
                      <img src={ev.imagem_url} alt={ev.titulo} className="w-full h-full object-cover" />
                    ) : (
                      <span>🎉</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
