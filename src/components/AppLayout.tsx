import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Home,
  Bot,
  Megaphone,
  Building2,
  Wrench,
  Newspaper,
  CalendarDays,
  Camera,
  Landmark,
  Mail,
  Shield,
  Check,
  Sun,
  Heart,
  User as UserIcon,
  MapPin,
  Bell,
  ChevronDown,
  LogOut,
  LogIn,
  HeartPulse,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const NAV = [
  { to: "/", label: "Início", Icon: Home },
  { to: "/ia-cidade", label: "IA da Cidade", Icon: Bot },
  { to: "/anuncios", label: "Anúncios", Icon: Megaphone },
  { to: "/empresas", label: "Empresas", Icon: Building2 },
  { to: "/servicos", label: "Serviços", Icon: Wrench },
  { to: "/noticias", label: "Notícias", Icon: Newspaper },
  { to: "/eventos", label: "Eventos", Icon: CalendarDays },
  { to: "/saude", label: "Saúde", Icon: HeartPulse },
  { to: "/turismo", label: "Turismo", Icon: Camera },
  { to: "/prefeitura", label: "Prefeitura", Icon: Landmark },
  { to: "/fale-conosco", label: "Fale Conosco", Icon: Mail },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, isAdmin, signOut } = useAuth();
  const active = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));
  const displayName = user?.email?.split("@")[0] ?? "visitante";

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-foreground flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 bg-white border-r border-slate-200 z-40">
        <div className="p-5 flex flex-col h-full overflow-y-auto">
          <Link to="/" className="mb-6 flex items-center gap-2.5">
            <div className="size-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black">
              SB
            </div>
            <div className="leading-tight">
              <h1 className="text-base font-black tracking-tight text-slate-900">São Brás do Suaçuí</h1>
              <p className="text-[10px] text-slate-500 font-medium">A IA da nossa cidade</p>
            </div>
          </Link>

          <nav className="space-y-0.5 mb-5">
            {NAV.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                  active(to)
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="size-[18px]" />
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                  active("/admin") ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Shield className="size-[18px]" />
                Admin
              </Link>
            )}
          </nav>

          {/* Empresário card */}
          <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">É empresário?</p>
            <p className="text-sm font-bold text-slate-900 leading-snug mb-3">
              Destaque sua empresa na IA da cidade
            </p>
            <ul className="space-y-1.5 mb-4">
              {["Mais visibilidade", "Seja encontrado na pesquisa", "Receba mais clientes"].map((t) => (
                <li key={t} className="flex items-start gap-2 text-xs text-slate-600">
                  <Check className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/anuncios"
              className="block w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-bold text-center hover:bg-emerald-700 transition-colors"
            >
              Quero divulgar
            </Link>
          </div>

          {/* Weather card */}
          <div className="bg-white ring-1 ring-slate-200 rounded-xl p-4 mb-4">
            <p className="text-xs font-bold text-slate-900 mb-2">São Brás do Suaçuí</p>
            <div className="flex items-center gap-3">
              <Sun className="size-8 text-amber-500" />
              <div>
                <p className="text-2xl font-black text-slate-900 leading-none">24°</p>
                <p className="text-[11px] text-slate-500 mt-1">Ensolarado</p>
                <p className="text-[10px] text-slate-400">Máx 26° Mín 14°</p>
              </div>
            </div>
            <button className="text-[11px] text-emerald-700 font-semibold mt-3 hover:underline">
              Ver previsão completa
            </button>
          </div>

          <div className="mt-auto">
            {user ? (
              <button
                onClick={() => signOut()}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg"
              >
                <LogOut className="size-3.5" /> Sair
              </button>
            ) : (
              <Link
                to="/auth"
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg"
              >
                <LogIn className="size-3.5" /> Entrar
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#f5f7fa]/80 backdrop-blur border-b border-slate-200/60">
          <div className="flex items-center justify-between px-4 md:px-8 py-4">
            <button className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900">
              <MapPin className="size-4 text-emerald-600" />
              São Brás do Suaçuí - MG
              <ChevronDown className="size-4 text-slate-400" />
            </button>
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-slate-600 hover:text-slate-900">
                <Bell className="size-5" />
                <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full ring-2 ring-[#f5f7fa]" />
              </button>
              <Link to={user ? "/admin" : "/auth"} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <div className="size-9 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-bold text-xs">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
                <span className="hidden sm:inline">Olá, <span className="capitalize">{displayName}</span></span>
                <ChevronDown className="size-4 text-slate-400 hidden sm:inline" />
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 pb-28 lg:pb-10 space-y-8 max-w-full">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 pb-safe">
          <div className="grid grid-cols-5 items-end relative">
            {[
              { to: "/", label: "Início", Icon: Home },
              { to: "/empresas", label: "Empresas", Icon: Building2 },
              { to: "/ia-cidade", label: "IA da Cidade", Icon: Bot, primary: true },
              { to: "/anuncios", label: "Anúncios", Icon: Megaphone },
              { to: user ? "/admin" : "/auth", label: "Perfil", Icon: UserIcon },
            ].map(({ to, label, Icon, primary }) => (
              <Link
                key={label}
                to={to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold ${
                  primary
                    ? "text-white"
                    : active(to)
                    ? "text-emerald-600"
                    : "text-slate-400"
                }`}
              >
                {primary ? (
                  <span className="size-12 -mt-6 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg ring-4 ring-white">
                    <Icon className="size-6 text-white" />
                  </span>
                ) : (
                  <Icon className="size-5" />
                )}
                <span className={primary ? "text-slate-600" : ""}>{label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
