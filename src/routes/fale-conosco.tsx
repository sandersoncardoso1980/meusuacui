import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "sonner";
import { z } from "zod";
import { Mail, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/fale-conosco")({
  head: () => ({
    meta: [
      { title: "Fale Conosco — Entre Rios IA" },
      { name: "description", content: "Envie sua mensagem, sugestão ou dúvida para o portal Entre Rios IA." },
      { property: "og:title", content: "Fale Conosco — Entre Rios IA" },
      { property: "og:description", content: "Estamos à disposição para ouvir você." },
    ],
  }),
  component: Contato,
});

const schema = z.object({
  nome: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  mensagem: z.string().trim().min(10).max(1000),
});

function Contato() {
  const [f, setF] = useState({ nome: "", email: "", mensagem: "" });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = schema.safeParse(f);
    if (!r.success) {
      toast.error("Verifique os campos e tente novamente.");
      return;
    }
    toast.success("Mensagem enviada! Retornaremos em breve.");
    setF({ nome: "", email: "", mensagem: "" });
  }

  return (
    <AppLayout>
      <header className="animate-reveal">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">— Estamos aqui</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Fale conosco</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Sugestões, dúvidas, reportar problemas ou parceria com o portal.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8 animate-reveal">
        <form onSubmit={submit} className="lg:col-span-2 bg-card p-6 md:p-8 rounded-2xl ring-1 ring-black/5 space-y-4">
          <div>
            <label className="text-sm font-medium">Nome</label>
            <input required maxLength={100} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} className="mt-1 w-full px-3 py-2 border border-input rounded-lg bg-background text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">E-mail</label>
            <input required type="email" maxLength={255} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="mt-1 w-full px-3 py-2 border border-input rounded-lg bg-background text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Mensagem</label>
            <textarea required maxLength={1000} rows={6} value={f.mensagem} onChange={(e) => setF({ ...f, mensagem: e.target.value })} className="mt-1 w-full px-3 py-2 border border-input rounded-lg bg-background text-sm" />
          </div>
          <button type="submit" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-primary/90">
            Enviar mensagem
          </button>
        </form>

        <aside className="space-y-4">
          <div className="bg-card p-6 rounded-xl ring-1 ring-black/5 text-sm space-y-4">
            <p className="flex items-start gap-3"><Mail className="size-4 mt-0.5 text-primary" />contato@entreriosia.com.br</p>
            <p className="flex items-start gap-3"><Phone className="size-4 mt-0.5 text-primary" />(31) 3821-0000</p>
            <p className="flex items-start gap-3"><MapPin className="size-4 mt-0.5 text-primary" />Entre Rios de Minas, MG</p>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}
