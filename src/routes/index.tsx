import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Home, 
  Bot, 
  Megaphone, 
  Building2, 
  Wrench, 
  Newspaper, 
  CalendarDays, 
  HeartPulse, 
  Camera, 
  Landmark, 
  Mail,
  Send,
  Mic
} from "lucide-react";
import heroCity from "@/assets/hero-city2.jpg";

export const Route = createFileRoute("/")({
  component: Index,
});

const QUICK_NAV = [
  { to: "/", label: "Início", Icon: Home, color: "from-slate-500 to-slate-600" },
  { to: "/ia-cidade", label: "IA da Cidade", Icon: Bot, color: "from-emerald-500 to-teal-600" },
  { to: "/anuncios", label: "Anúncios", Icon: Megaphone, color: "from-amber-500 to-orange-600" },
  { to: "/empresas", label: "Empresas", Icon: Building2, color: "from-blue-500 to-indigo-600" },
  { to: "/servicos", label: "Serviços", Icon: Wrench, color: "from-violet-500 to-purple-600" },
  { to: "/noticias", label: "Notícias", Icon: Newspaper, color: "from-sky-500 to-cyan-600" },
  { to: "/eventos", label: "Eventos", Icon: CalendarDays, color: "from-pink-500 to-rose-600" },
  { to: "/saude", label: "Saúde", Icon: HeartPulse, color: "from-red-500 to-rose-600" },
  { to: "/turismo", label: "Turismo", Icon: Camera, color: "from-amber-600 to-yellow-600" },
  { to: "/prefeitura", label: "Prefeitura", Icon: Landmark, color: "from-slate-700 to-slate-900" },
  { to: "/fale-conosco", label: "Fale Conosco", Icon: Mail, color: "from-teal-600 to-emerald-700" },
] as const;

function Index() {
  return (
    <div className="space-y-8">
      {/* 1. Banner Principal com Maior Visibilidade e Peso Visual */}
      <div className="relative w-full h-[210px] md:h-[240px] rounded-3xl overflow-hidden shadow-lg ring-1 ring-white/10">
        <div 
          className="w-full h-full bg-cover bg-center transform hover:scale-105 transition-transform duration-700" 
          style={{ backgroundImage: `url(${heroCity})` }} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-5 left-5 md:bottom-6 md:left-6 text-white">
          <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
            Portal Oficial
          </span>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">São Brás do Suaçuí</h2>
          <p className="text-xs md:text-sm text-slate-200 font-medium opacity-90">Nossa cidade, nosso orgulho</p>
        </div>
      </div>

      {/* Caixa de Pesquisa da IA da Cidade */}
      <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="Pergunte qualquer coisa para a IA da cidade..."
            className="w-full bg-background border border-border rounded-xl py-3.5 pl-4 pr-24 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="absolute right-3 flex items-center gap-1.5">
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
              <Mic className="size-4" />
            </button>
            <button className="size-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center transition-colors shadow-sm">
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Grade de Ícones Sincronizada com o Menu Lateral */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-4 tracking-wide uppercase opacity-80">
          Acesso Rápido
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-3">
          {QUICK_NAV.map(({ to, label, Icon, color }) => (
            <Link
              key={to}
              to={to}
              className="group flex flex-col items-center justify-center p-3.5 bg-card hover:bg-accent/50 border border-border rounded-2xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 text-center"
            >
              <div className={`size-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-sm mb-2.5 group-hover:scale-110 transition-transform`}>
                <Icon className="size-5" />
              </div>
              <span className="text-xs font-semibold text-foreground/90 group-hover:text-emerald-600 transition-colors line-clamp-1">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
