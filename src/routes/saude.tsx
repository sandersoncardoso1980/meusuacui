import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  HeartPulse,
  Stethoscope,
  Syringe,
  Ambulance,
  Phone,
  Clock,
  MapPin,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/saude")({
  head: () => ({
    meta: [
      { title: "Saúde — Entre Rios IA" },
      {
        name: "description",
        content:
          "Unidades de saúde, campanhas de vacinação, telefones de emergência e orientações de saúde pública em Entre Rios de Minas.",
      },
    ],
  }),
  component: Saude,
});

const EMERGENCIAS = [
  { nome: "SAMU", tel: "192", desc: "Urgência e emergência móvel" },
  { nome: "Bombeiros", tel: "193", desc: "Resgate e incêndios" },
  { nome: "Polícia Militar", tel: "190", desc: "Segurança pública" },
  { nome: "Vigilância Sanitária", tel: "(31) 3755-0000", desc: "Denúncias e fiscalização" },
];

const DICAS_PADRAO = [
  "Elimine água parada em vasos, calhas e pneus para evitar o mosquito da dengue.",
  "Mantenha a caderneta de vacinação em dia — sua e das crianças.",
  "Leve documento com foto e cartão SUS ao procurar uma unidade de saúde.",
  "Em caso de emergência grave, ligue 192 antes de se deslocar.",
];

function Saude() {
  // Query 1: Unidades de Saúde
  const { data: unidades = [] } = useQuery({
    queryKey: ["saude-unidades"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("saude_unidades").select("*");
      return data ?? [];
    },
  });

  // Query 2: Campanhas de Saúde
  const { data: campanhas = [] } = useQuery({
    queryKey: ["saude-campanhas"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("saude_campanhas").select("*");
      return data ?? [];
    },
  });

  // Query 3: Dicas / Orientações de Saúde
  const { data: dicas = [] } = useQuery({
    queryKey: ["saude-dicas"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("saude_dicas").select("*");
      return data ?? [];
    },
  });

  // Lista final de dicas (se houver no banco, usa do banco; senão, usa o padrão)
  const listaDicas = dicas.length > 0 
    ? dicas.map((d: any) => d.orientacao) 
    : DICAS_PADRAO;

  return (
    <AppLayout>
      <header className="animate-reveal">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
          — Saúde pública
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <HeartPulse className="size-7 text-emerald-600" /> Saúde
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Unidades, campanhas, emergências e orientações da rede pública de Entre Rios de Minas.
        </p>
      </header>

      {/* Emergências */}
      <section className="animate-reveal">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
          <Ambulance className="size-5 text-red-500" /> Telefones de emergência
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {EMERGENCIAS.map((e) => (
            <a
              key={e.nome}
              href={`tel:${e.tel.replace(/\D/g, "")}`}
              className="bg-card rounded-xl ring-1 ring-black/5 p-4 hover:ring-emerald-500/40 transition"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {e.nome}
              </p>
              <p className="text-2xl font-black font-mono text-emerald-700 mt-1">{e.tel}</p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Phone className="size-3" /> {e.desc}
              </p>
            </a>
          ))}
        </div>
      </section>

      {/* Unidades do Supabase */}
      <section className="animate-reveal">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
          <Stethoscope className="size-5 text-emerald-600" /> Unidades de saúde
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {unidades.map((u: any) => (
            <article key={u.id || u.nome} className="bg-card rounded-xl ring-1 ring-black/5 p-5">
              <h3 className="font-bold text-lg">{u.nome}</h3>
              <p className="text-sm text-muted-foreground mt-2 flex items-start gap-2">
                <MapPin className="size-4 shrink-0 mt-0.5 text-emerald-600" /> {u.endereco}
              </p>
              <p className="text-sm text-muted-foreground mt-1 flex items-start gap-2">
                <Clock className="size-4 shrink-0 mt-0.5 text-emerald-600" /> {u.horario}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-4">
                {(Array.isArray(u.servicos) ? u.servicos : []).map((s: string) => (
                  <span
                    key={s}
                    className="text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Campanhas do Supabase */}
      <section className="animate-reveal">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
          <Syringe className="size-5 text-emerald-600" /> Campanhas e vacinação
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campanhas.map((c: any) => (
            <article key={c.id || c.titulo} className="bg-card rounded-xl ring-1 ring-black/5 p-5">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                {c.periodo}
              </span>
              <h3 className="font-bold mt-1">{c.titulo}</h3>
              <p className="text-sm text-muted-foreground mt-2">{c.publico_alvo}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Dicas do Supabase */}
      <section className="animate-reveal">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
          <ShieldCheck className="size-5 text-emerald-600" /> Orientações de prevenção
        </h2>
        <ul className="bg-card rounded-xl ring-1 ring-black/5 divide-y divide-border">
          {listaDicas.map((dica: string, index: number) => (
            <li key={index} className="p-4 text-sm text-muted-foreground">
              {dica}
            </li>
          ))}
        </ul>
      </section>
    </AppLayout>
  );
}