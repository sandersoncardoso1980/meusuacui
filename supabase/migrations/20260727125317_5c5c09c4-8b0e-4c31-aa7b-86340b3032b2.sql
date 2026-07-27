
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_public_read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ AUTO-CREATE PROFILE + ROLE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));

  IF NEW.email = 'sandersoncardoso1980@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ UPDATED_AT HELPER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ EMPRESAS ============
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  endereco TEXT,
  horario_funcionamento TEXT,
  contato TEXT,
  promocao_ativa BOOLEAN NOT NULL DEFAULT false,
  descricao_promocao TEXT,
  descricao TEXT,
  imagem_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.empresas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresas_public_read" ON public.empresas FOR SELECT USING (true);
CREATE POLICY "empresas_admin_insert" ON public.empresas FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "empresas_admin_update" ON public.empresas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "empresas_admin_delete" ON public.empresas FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER empresas_updated BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ANUNCIOS ============
CREATE TABLE public.anuncios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(12,2),
  categoria TEXT NOT NULL,
  tipo_negociacao TEXT NOT NULL DEFAULT 'venda',
  id_usuario_vendedor UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  imagens_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.anuncios TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anuncios TO authenticated;
GRANT ALL ON public.anuncios TO service_role;
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anuncios_public_read" ON public.anuncios FOR SELECT USING (true);
CREATE POLICY "anuncios_auth_insert" ON public.anuncios FOR INSERT TO authenticated WITH CHECK (auth.uid() = id_usuario_vendedor);
CREATE POLICY "anuncios_owner_or_admin_update" ON public.anuncios FOR UPDATE TO authenticated USING (auth.uid() = id_usuario_vendedor OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "anuncios_owner_or_admin_delete" ON public.anuncios FOR DELETE TO authenticated USING (auth.uid() = id_usuario_vendedor OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER anuncios_updated BEFORE UPDATE ON public.anuncios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ EVENTOS ============
CREATE TABLE public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  data_hora_inicio TIMESTAMPTZ NOT NULL,
  data_hora_fim TIMESTAMPTZ,
  local TEXT,
  descricao TEXT,
  organizador TEXT,
  imagem_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.eventos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos TO authenticated;
GRANT ALL ON public.eventos TO service_role;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eventos_public_read" ON public.eventos FOR SELECT USING (true);
CREATE POLICY "eventos_admin_insert" ON public.eventos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "eventos_admin_update" ON public.eventos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "eventos_admin_delete" ON public.eventos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER eventos_updated BEFORE UPDATE ON public.eventos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ COMUNICADOS ============
CREATE TABLE public.comunicados_prefeitura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  data_publicacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  categoria TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.comunicados_prefeitura TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comunicados_prefeitura TO authenticated;
GRANT ALL ON public.comunicados_prefeitura TO service_role;
ALTER TABLE public.comunicados_prefeitura ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comunicados_public_read" ON public.comunicados_prefeitura FOR SELECT USING (true);
CREATE POLICY "comunicados_admin_insert" ON public.comunicados_prefeitura FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "comunicados_admin_update" ON public.comunicados_prefeitura FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "comunicados_admin_delete" ON public.comunicados_prefeitura FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER comunicados_updated BEFORE UPDATE ON public.comunicados_prefeitura FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ NOTICIAS ============
CREATE TABLE public.noticias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  resumo TEXT,
  link_origem TEXT,
  data_publicacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  imagem_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.noticias TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.noticias TO authenticated;
GRANT ALL ON public.noticias TO service_role;
ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "noticias_public_read" ON public.noticias FOR SELECT USING (true);
CREATE POLICY "noticias_admin_insert" ON public.noticias FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "noticias_admin_update" ON public.noticias FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "noticias_admin_delete" ON public.noticias FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER noticias_updated BEFORE UPDATE ON public.noticias FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SEED DATA ============
INSERT INTO public.empresas (nome, categoria, endereco, horario_funcionamento, contato, promocao_ativa, descricao_promocao, descricao) VALUES
('Padaria Central', 'Alimentação', 'Rua Direita, 123 - Centro', 'Seg-Sáb 6h-20h', '(31) 3821-1234', true, '20% off no pão de queijo hoje', 'Padaria tradicional com pães, doces e salgados artesanais.'),
('Farmácia São José', 'Saúde', 'Praça Cel. Castro, 45', 'Seg-Dom 7h-22h', '(31) 3821-5678', false, NULL, 'Farmácia com plantão 24h aos finais de semana.'),
('Mercearia do Zé', 'Mercearia', 'Av. Getúlio Vargas, 890', 'Seg-Sáb 7h-19h', '(31) 3821-2211', true, 'Cesta básica com 15% de desconto', 'Produtos frescos direto do produtor.'),
('Restaurante Sabor Mineiro', 'Gastronomia', 'Rua das Flores, 78', 'Ter-Dom 11h-15h e 18h-22h', '(31) 3821-9988', true, 'Buffet livre R$ 39,90', 'Comida mineira caseira com feijoada aos sábados.'),
('Auto Peças Entre Rios', 'Automotivo', 'BR-383, Km 45', 'Seg-Sex 8h-18h, Sáb 8h-12h', '(31) 3821-4433', false, NULL, 'Peças originais e mão de obra qualificada.');

INSERT INTO public.eventos (titulo, data_hora_inicio, local, descricao, organizador) VALUES
('Feira de Artesanato Local', '2026-08-15 14:00:00-03', 'Praça Cel. Castro', 'Artesãos locais expõem suas obras.', 'Secretaria de Cultura'),
('Cine Clube Municipal', '2026-08-20 19:30:00-03', 'Centro Cultural', 'Sessão especial de cinema nacional.', 'Centro Cultural'),
('Pedal Entre Rios 30km', '2026-09-05 07:00:00-03', 'Saída do Portal da Cidade', 'Passeio ciclístico pela zona rural.', 'Grupo Pedal ER'),
('Festa da Padroeira', '2026-09-15 08:00:00-03', 'Igreja Matriz', 'Missas, quermesse e apresentações culturais.', 'Paróquia Matriz');

INSERT INTO public.comunicados_prefeitura (titulo, conteudo, categoria) VALUES
('Atualização no cronograma de coleta seletiva', 'A partir de segunda-feira, novos horários passam a valer para os bairros do setor Sul. Consulte o site oficial para o calendário completo.', 'Administração'),
('Campanha de Vacinação Itinerante', 'A unidade móvel de saúde estará na Praça Matriz este final de semana, das 8h às 17h.', 'Saúde'),
('Pavimentação da Rua das Flores', 'Interdição parcial para obras de melhoria no escoamento pluvial. Motoristas devem utilizar rotas alternativas.', 'Obras'),
('Recadastramento IPTU 2026', 'Contribuintes têm até o fim do mês para atualizar cadastro. Comparecer à Prefeitura das 8h às 16h.', 'Tributos');

INSERT INTO public.noticias (titulo, resumo, data_publicacao) VALUES
('Entre Rios inaugura nova UBS no bairro São José', 'A nova Unidade Básica de Saúde amplia o atendimento à população local com consultórios modernos.', '2026-07-20 10:00:00-03'),
('Escola municipal recebe prêmio de educação', 'Projeto de leitura da E.M. Prof. Antônio Silva foi reconhecido em nível estadual.', '2026-07-18 09:00:00-03'),
('Turismo rural cresce na região', 'Fazendas históricas abrem visitação e movimentam a economia local nos finais de semana.', '2026-07-15 14:00:00-03');

INSERT INTO public.anuncios (titulo, descricao, preco, categoria, tipo_negociacao, imagens_urls) VALUES
('Bicicleta Aro 29 seminova', 'Bike em ótimo estado, pouco uso. Freio a disco, 21 marchas.', 1200.00, 'Esporte', 'venda', '{}'),
('Sofá 3 lugares em couro', 'Sofá de couro legítimo, cor caramelo, muito conservado.', 850.00, 'Móveis', 'venda', '{}'),
('Guitarra Fender Stratocaster', 'Guitarra semi-nova, revisada. Acompanha capa e cabo.', 4500.00, 'Instrumentos', 'venda', '{}'),
('Serviços de Jardinagem', 'Corte de grama, poda e paisagismo. Atendemos toda a cidade.', NULL, 'Serviços', 'servico', '{}');
