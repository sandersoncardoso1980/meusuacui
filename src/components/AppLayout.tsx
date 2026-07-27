import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Home,
  Sparkles,
  Megaphone,
  Building2,
  Wrench,
  Newspaper,
  CalendarDays,
  MapPin,
  Landmark,
  Mail,
  Shield,
  LogIn,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const NAV = [
  { to: "/", label: "Início", Icon: Home },
  { to: "/ia-cidade", label: "IA da Cidade", Icon: Sparkles },
  { to: "/anuncios", label: "Anúncios", Icon: Megaphone },
  { to: "/empresas", label: "Empresas", Icon: Building2 },
  { to: "/servicos", label: "Serviços", Icon: Wrench },
  { to: "/noticias", label: "Notícias", Icon: Newspaper },
  { to: "/eventos", label: "Eventos", Icon: CalendarDays },
] as const;

const NAV_SECONDARY = [
  { to: "/turismo", label: "Turismo", Icon: MapPin },
  { to: "/prefeitura", label: "Prefeitura", Icon: Landmark },
  { to: "/fale-conosco", label: "Fale Conosco", Icon: Mail },
] as const;

const MOBILE_NAV = [
  { to: "/", label: "Início", Icon: Home },
  { to: "/ia-cidade", label: "IA", Icon: Sparkles },
  { to: "/anuncios", label: "Anúncios", Icon: Megaphone },
  { to: "/eventos", label: "Eventos", Icon: CalendarDays },
  { to: "/prefeitura", label: "Prefeitura", Icon: Landmark },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, isAdmin, signOut } = useAuth();
  const active = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 bg-card border-r border-border z-40">
        <div className="p-6 flex flex-col h-full">
          <Link to="/" className="mb-10 flex items-center gap-2">
            <span className="size-3 bg-primary rounded-full" />
            <h1 className="text-lg font-bold tracking-tight text-primary">Entre Rios IA</h1>
          </Link>

          <nav className="space-y-1 flex-1">
            {NAV.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  active(to)
                    ? "bg-primary/5 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
            <div className="pt-4 mt-4 border-t border-border space-y-1">
              {NAV_SECONDARY.map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    active(to)
                      ? "bg-primary/5 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    active("/admin")
                      ? "bg-primary/5 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Shield className="size-4" />
                  Admin
                </Link>
              )}
            </div>
          </nav>

          <div className="mt-auto pt-6 space-y-2">
            <Link
              to="/anuncios"
              className="block w-full bg-primary text-primary-foreground py-2.5 px-4 rounded-lg text-sm font-semibold text-center hover:bg-primary/90 transition-colors"
            >
              Quero divulgar
            </Link>
            {user ? (
              <button
                onClick={() => signOut()}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg"
              >
                <LogOut className="size-3.5" /> Sair
              </button>
            ) : (
              <Link
                to="/auth"
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg"
              >
                <LogIn className="size-3.5" /> Entrar
              </Link>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 p-4 md:p-6 lg:p-10 pb-24 lg:pb-10 space-y-8 md:space-y-10 max-w-full">
        {children}
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border grid grid-cols-5 z-40">
        {MOBILE_NAV.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold ${
              active(to) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
