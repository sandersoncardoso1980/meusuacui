import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import heroCity from "@/assets/hero-city.jpg";

export const Route = createFileRoute("/turismo")({
  head: () => ({
    meta: [
      { title: "Turismo — Entre Rios IA" },
      { name: "description", content: "Conheça os pontos turísticos, hospedagem e a história de Entre Rios de Minas." },
      { property: "og:title", content: "Turismo em Entre Rios de Minas" },
      { property: "og:description", content: "História, natureza e cultura mineira em um só destino." },
    ],
  }),
  component: Turismo,
});

const POINTS = [
  { title: "Igreja Matriz", desc: "Templo histórico do século XIX, marco arquitetônico da cidade." },
  { title: "Cachoeiras da Serra", desc: "Trilhas e banhos naturais em meio à Serra do Espinhaço." },
  { title: "Fazendas Históricas", desc: "Casarões coloniais que contam a história do ciclo do ouro." },
  { title: "Praça Central", desc: "Coração da cidade, com feiras, coreto e vida noturna." },
];

function Turismo() {
  return (
    <AppLayout>
      <div className="relative overflow-hidden rounded-2xl aspect-[21/9] animate-reveal">
        <img src={heroCity} alt="Vista de Entre Rios de Minas" width={1600} height={600} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6 md:p-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80 mb-2">— Visite</p>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white">Turismo em Entre Rios</h1>
          </div>
        </div>
      </div>

      <section className="max-w-3xl animate-reveal">
        <p className="text-lg text-muted-foreground leading-relaxed">
          Entre Rios de Minas é uma joia da região central de Minas Gerais. Cercada por serras,
          rios e casarões coloniais, oferece uma combinação única de história, natureza e a
          hospitalidade tipicamente mineira.
        </p>
      </section>

      <section className="animate-reveal">
        <h2 className="text-xl font-bold mb-6">Pontos turísticos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {POINTS.map((p) => (
            <article key={p.title} className="bg-card p-6 rounded-xl ring-1 ring-black/5">
              <h3 className="font-bold text-lg">{p.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{p.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-card p-6 md:p-8 rounded-2xl ring-1 ring-black/5 animate-reveal">
        <h2 className="text-xl font-bold mb-4">Links úteis</h2>
        <ul className="space-y-2 text-sm">
          <li><a className="text-primary hover:underline" href="#">Roteiros turísticos oficiais</a></li>
          <li><a className="text-primary hover:underline" href="#">Guia de hospedagem</a></li>
          <li><a className="text-primary hover:underline" href="#">Calendário festivo</a></li>
        </ul>
      </section>
    </AppLayout>
  );
}
