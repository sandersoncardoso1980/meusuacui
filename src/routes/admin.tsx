import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Entre Rios IA" },
      { name: "description", content: "Painel administrativo do portal Entre Rios IA." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

type FieldType = "text" | "textarea" | "number" | "datetime" | "boolean" | "select";
type Field = { name: string; label: string; type: FieldType; options?: string[]; required?: boolean };

type TableCfg = {
  key: string;
  table: "empresas" | "anuncios" | "eventos" | "comunicados_prefeitura" | "noticias";
  label: string;
  orderBy: { col: string; asc: boolean };
  primaryLabel: string;
  fields: Field[];
};

const TABLES: TableCfg[] = [
  {
    key: "empresas", table: "empresas", label: "Empresas", orderBy: { col: "nome", asc: true }, primaryLabel: "nome",
    fields: [
      { name: "nome", label: "Nome", type: "text", required: true },
      { name: "categoria", label: "Categoria", type: "text", required: true },
      { name: "descricao", label: "Descrição", type: "textarea" },
      { name: "endereco", label: "Endereço", type: "text" },
      { name: "horario_funcionamento", label: "Horário", type: "text" },
      { name: "contato", label: "Contato", type: "text" },
      { name: "promocao_ativa", label: "Promoção ativa", type: "boolean" },
      { name: "descricao_promocao", label: "Descrição da promoção", type: "textarea" },
    ],
  },
  {
    key: "anuncios", table: "anuncios", label: "Anúncios", orderBy: { col: "created_at", asc: false }, primaryLabel: "titulo",
    fields: [
      { name: "titulo", label: "Título", type: "text", required: true },
      { name: "categoria", label: "Categoria", type: "text", required: true },
      { name: "descricao", label: "Descrição", type: "textarea" },
      { name: "preco", label: "Preço", type: "number" },
      { name: "tipo_negociacao", label: "Tipo", type: "select", options: ["venda", "aluguel", "servico"] },
    ],
  },
  {
    key: "eventos", table: "eventos", label: "Eventos", orderBy: { col: "data_hora_inicio", asc: true }, primaryLabel: "titulo",
    fields: [
      { name: "titulo", label: "Título", type: "text", required: true },
      { name: "descricao", label: "Descrição", type: "textarea" },
      { name: "data_hora_inicio", label: "Início", type: "datetime", required: true },
      { name: "local", label: "Local", type: "text" },
      { name: "organizador", label: "Organizador", type: "text" },
    ],
  },
  {
    key: "comunicados", table: "comunicados_prefeitura", label: "Comunicados", orderBy: { col: "data_publicacao", asc: false }, primaryLabel: "titulo",
    fields: [
      { name: "titulo", label: "Título", type: "text", required: true },
      { name: "conteudo", label: "Conteúdo", type: "textarea", required: true },
      { name: "categoria", label: "Categoria", type: "text" },
      { name: "data_publicacao", label: "Data", type: "datetime" },
    ],
  },
  {
    key: "noticias", table: "noticias", label: "Notícias", orderBy: { col: "data_publicacao", asc: false }, primaryLabel: "titulo",
    fields: [
      { name: "titulo", label: "Título", type: "text", required: true },
      { name: "resumo", label: "Resumo", type: "textarea" },
      { name: "data_publicacao", label: "Data", type: "datetime" },
      { name: "link_origem", label: "Link", type: "text" },
    ],
  },
];

function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const [activeKey, setActiveKey] = useState(TABLES[0].key);
  const cfg = TABLES.find((t) => t.key === activeKey)!;

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  if (loading) return <AppLayout><p className="text-muted-foreground">Carregando...</p></AppLayout>;
  if (!user) return null;
  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <Shield className="size-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold">Acesso restrito</h1>
          <p className="text-muted-foreground mt-2">Esta área é exclusiva para administradores.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <header className="animate-reveal">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">— Painel</p>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Shield className="size-7 text-primary" /> Administração
        </h1>
      </header>

      <div className="flex gap-2 border-b border-border overflow-x-auto animate-reveal">
        {TABLES.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveKey(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap ${
              activeKey === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <CrudPanel key={cfg.key} cfg={cfg} />
    </AppLayout>
  );
}

function CrudPanel({ cfg }: { cfg: TableCfg }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<null | Record<string, any>>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", cfg.table],
    queryFn: async () => {
      const { data, error } = await supabase.from(cfg.table).select("*").order(cfg.orderBy.col, { ascending: cfg.orderBy.asc });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function remove(id: string) {
    if (!confirm("Excluir este item?")) return;
    const { error } = await supabase.from(cfg.table).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Excluído.");
    qc.invalidateQueries({ queryKey: ["admin", cfg.table] });
  }

  return (
    <div className="space-y-4 animate-reveal">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} registros</p>
        <button onClick={() => setEditing({})} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-primary/90">
          <Plus className="size-4" /> Novo
        </button>
      </div>

      <div className="bg-card rounded-xl ring-1 ring-black/5 overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-muted-foreground text-sm">Carregando...</p>
        ) : (data ?? []).length === 0 ? (
          <p className="p-6 text-muted-foreground text-sm">Nenhum registro.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(data ?? []).map((row: any) => (
              <li key={row.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{row[cfg.primaryLabel]}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {row.categoria || row.local || (row.data_publicacao && new Date(row.data_publicacao).toLocaleDateString("pt-BR"))}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditing(row)} className="p-2 hover:bg-muted rounded-md"><Pencil className="size-4" /></button>
                  <button onClick={() => remove(row.id)} className="p-2 hover:bg-muted rounded-md text-destructive"><Trash2 className="size-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <EditForm cfg={cfg} initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin", cfg.table] }); }} />
      )}
    </div>
  );
}

function toInput(v: any, t: FieldType) {
  if (v == null) return "";
  if (t === "datetime") { const d = new Date(v); return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 16); }
  if (t === "boolean") return !!v;
  return String(v);
}

function EditForm({ cfg, initial, onClose, onSaved }: { cfg: TableCfg; initial: Record<string, any>; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Record<string, any>>(() => {
    const f: Record<string, any> = {};
    cfg.fields.forEach((fd) => { f[fd.name] = toInput(initial[fd.name], fd.type); });
    return f;
  });
  const [saving, setSaving] = useState(false);
  const isNew = !initial.id;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, any> = {};
    cfg.fields.forEach((fd) => {
      let v: any = form[fd.name];
      if (fd.type === "number") v = v === "" ? null : Number(v);
      else if (fd.type === "boolean") v = !!v;
      else if (fd.type === "datetime") v = v ? new Date(v).toISOString() : null;
      else v = v === "" ? null : v;
      payload[fd.name] = v;
    });

    const { error } = isNew
      ? await (supabase.from(cfg.table) as any).insert(payload)
      : await (supabase.from(cfg.table) as any).update(payload).eq("id", initial.id);

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(isNew ? "Criado!" : "Atualizado!");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="bg-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-4">
        <h3 className="text-xl font-bold">{isNew ? "Novo" : "Editar"} — {cfg.label}</h3>
        {cfg.fields.map((fd) => (
          <div key={fd.name}>
            <label className="text-sm font-medium">{fd.label}{fd.required && " *"}</label>
            {fd.type === "textarea" ? (
              <textarea rows={3} required={fd.required} value={form[fd.name] ?? ""} onChange={(e) => setForm({ ...form, [fd.name]: e.target.value })} className="mt-1 w-full px-3 py-2 border border-input rounded-lg bg-background text-sm" />
            ) : fd.type === "boolean" ? (
              <div className="mt-1"><input type="checkbox" checked={!!form[fd.name]} onChange={(e) => setForm({ ...form, [fd.name]: e.target.checked })} /></div>
            ) : fd.type === "select" ? (
              <select value={form[fd.name] ?? ""} onChange={(e) => setForm({ ...form, [fd.name]: e.target.value })} className="mt-1 w-full px-3 py-2 border border-input rounded-lg bg-background text-sm">
                <option value="">—</option>
                {fd.options!.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type={fd.type === "number" ? "number" : fd.type === "datetime" ? "datetime-local" : "text"}
                step={fd.type === "number" ? "0.01" : undefined}
                required={fd.required}
                value={form[fd.name] ?? ""}
                onChange={(e) => setForm({ ...form, [fd.name]: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-input rounded-lg bg-background text-sm"
              />
            )}
          </div>
        ))}
        <div className="flex gap-2 justify-end pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm border border-border">Cancelar</button>
          <button disabled={saving} type="submit" className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground font-semibold disabled:opacity-50">
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
