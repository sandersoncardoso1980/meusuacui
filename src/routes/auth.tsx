import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

const search = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Entrar — Entre Rios IA" },
      { name: "description", content: "Faça login ou crie sua conta no portal Entre Rios IA." },
      { property: "og:title", content: "Entrar — Entre Rios IA" },
      { property: "og:description", content: "Acesse sua conta no portal municipal." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já está logado.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo!");
      }
      navigate({ to: redirect ?? "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na autenticação");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Erro ao entrar com Google");
      return;
    }
    if (!result.redirected) {
      navigate({ to: redirect ?? "/" });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg ring-1 ring-black/5 p-8">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <span className="size-3 bg-primary rounded-full" />
          <h1 className="text-lg font-bold tracking-tight text-primary">Entre Rios IA</h1>
        </Link>
        <h2 className="text-2xl font-extrabold mb-1">
          {mode === "login" ? "Entrar na sua conta" : "Criar sua conta"}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "login"
            ? "Acesse o portal da nossa cidade."
            : "Junte-se à comunidade de Entre Rios de Minas."}
        </p>

        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-border rounded-lg text-sm font-semibold hover:bg-muted/50 mb-4"
        >
          <svg className="size-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar com Google
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-sm font-medium">Nome completo</label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-input rounded-lg bg-background text-sm"
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-input rounded-lg bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-input rounded-lg bg-background text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold text-sm hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-primary font-semibold hover:underline"
          >
            {mode === "login" ? "Cadastre-se" : "Entrar"}
          </button>
        </p>
      </div>
    </div>
  );
}
