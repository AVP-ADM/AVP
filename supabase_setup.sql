-- ========= AVP BASE - SETUP COMPLETO =========

-- Extensão para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========= TABELA: perfis (complementa auth.users) =========
CREATE TABLE IF NOT EXISTS public.perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  nivel TEXT NOT NULL DEFAULT 'viewer' CHECK (nivel IN ('admin', 'auditor', 'operador', 'viewer')),
  setor TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========= TABELA: sessoes (controle de sessão única) =========
CREATE TABLE IF NOT EXISTS public.sessoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device TEXT,
  ip TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- ========= TABELA: categorias =========
CREATE TABLE IF NOT EXISTS public.categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL UNIQUE,
  tipo_fipe TEXT DEFAULT 'cars' CHECK (tipo_fipe IN ('cars', 'motorcycles', 'trucks', 'cars,motorcycles', 'cars,trucks')),
  ano_minimo INTEGER DEFAULT 2006,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========= TABELA: modelos =========
CREATE TABLE IF NOT EXISTS public.modelos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  ano_aceitacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(categoria_id, marca, modelo)
);

-- ========= TABELA: regras_compatibilidade =========
CREATE TABLE IF NOT EXISTS public.regras_compatibilidade (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_a TEXT NOT NULL,
  categoria_b TEXT NOT NULL,
  UNIQUE(categoria_a, categoria_b)
);

-- ========= TABELA: regras_inclusao_obrigatoria =========
CREATE TABLE IF NOT EXISTS public.regras_inclusao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  categoria_origem TEXT NOT NULL,
  categoria_destino TEXT NOT NULL,
  tipo TEXT DEFAULT 'obrigatoria' CHECK (tipo IN ('obrigatoria', 'revisao')),
  UNIQUE(categoria_origem, categoria_destino)
);

-- ========= TABELA: historico =========
CREATE TABLE IF NOT EXISTS public.historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES auth.users(id),
  usuario_nome TEXT,
  tipo TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  categoria TEXT,
  detalhes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========= TABELA: liberacoes_temporarias =========
CREATE TABLE IF NOT EXISTS public.liberacoes_temporarias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  categoria TEXT NOT NULL,
  motivo TEXT,
  observacao TEXT,
  status TEXT DEFAULT 'Ativa' CHECK (status IN ('Ativa', 'Finalizada')),
  usuario_criacao TEXT,
  usuario_finalizacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finalizado_at TIMESTAMPTZ
);

-- ========= TABELA: alteracoes_pendentes (staging) =========
CREATE TABLE IF NOT EXISTS public.alteracoes_pendentes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES auth.users(id),
  usuario_nome TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('Adição', 'Remoção', 'Mover', 'Renomear')),
  marca TEXT,
  modelo TEXT,
  categoria_origem TEXT,
  categoria_destino TEXT,
  detalhes TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aplicado', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ
);

-- ========= ÍNDICES =========
CREATE INDEX IF NOT EXISTS idx_modelos_categoria ON public.modelos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_modelos_marca ON public.modelos(marca);
CREATE INDEX IF NOT EXISTS idx_modelos_marca_modelo ON public.modelos(marca, modelo);
CREATE INDEX IF NOT EXISTS idx_historico_created ON public.historico(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON public.sessoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_token ON public.sessoes(token);

-- ========= ROW LEVEL SECURITY =========
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liberacoes_temporarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alteracoes_pendentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_compatibilidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_inclusao ENABLE ROW LEVEL SECURITY;

-- ========= POLICIES: perfis =========
CREATE POLICY "Usuarios veem seu proprio perfil" ON public.perfis FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins veem todos perfis" ON public.perfis FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND nivel = 'admin')
);
CREATE POLICY "Admins gerenciam perfis" ON public.perfis FOR ALL USING (
  EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND nivel = 'admin')
);

-- ========= POLICIES: categorias (todos logados podem ver) =========
CREATE POLICY "Todos veem categorias" ON public.categorias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Operadores e admins editam categorias" ON public.categorias FOR ALL USING (
  EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND nivel IN ('admin', 'operador'))
);

-- ========= POLICIES: modelos (todos logados podem ver) =========
CREATE POLICY "Todos veem modelos" ON public.modelos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Operadores e admins editam modelos" ON public.modelos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND nivel IN ('admin', 'operador'))
);

-- ========= POLICIES: historico =========
CREATE POLICY "Todos veem historico" ON public.historico FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Sistema insere historico" ON public.historico FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ========= POLICIES: sessoes =========
CREATE POLICY "Usuarios veem suas sessoes" ON public.sessoes FOR SELECT USING (usuario_id = auth.uid());
CREATE POLICY "Sistema gerencia sessoes" ON public.sessoes FOR ALL USING (auth.role() = 'authenticated');

-- ========= POLICIES: liberacoes_temporarias =========
CREATE POLICY "Todos veem liberacoes" ON public.liberacoes_temporarias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Operadores e admins gerenciam liberacoes" ON public.liberacoes_temporarias FOR ALL USING (
  EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND nivel IN ('admin', 'operador'))
);

-- ========= POLICIES: alteracoes_pendentes =========
CREATE POLICY "Todos veem alteracoes" ON public.alteracoes_pendentes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Operadores e admins gerenciam alteracoes" ON public.alteracoes_pendentes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND nivel IN ('admin', 'operador'))
);

-- ========= POLICIES: regras =========
CREATE POLICY "Todos veem regras compat" ON public.regras_compatibilidade FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins gerenciam regras compat" ON public.regras_compatibilidade FOR ALL USING (
  EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND nivel = 'admin')
);
CREATE POLICY "Todos veem regras inclusao" ON public.regras_inclusao FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins gerenciam regras inclusao" ON public.regras_inclusao FOR ALL USING (
  EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND nivel = 'admin')
);

-- ========= TABELA: fipe_cache (cache da base oficial FIPE para acesso cross-device) =========
CREATE TABLE IF NOT EXISTS public.fipe_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave TEXT NOT NULL UNIQUE, -- 'brands', 'models_<code>', 'metadata', 'requests'
  valor JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast key lookup
CREATE INDEX IF NOT EXISTS idx_fipe_cache_chave ON public.fipe_cache(chave);

-- RLS
ALTER TABLE public.fipe_cache ENABLE ROW LEVEL SECURITY;

-- Policies: todos autenticados podem ler, operadores e admins podem escrever
CREATE POLICY "Todos veem fipe_cache" ON public.fipe_cache FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Operadores e admins gerenciam fipe_cache" ON public.fipe_cache FOR ALL USING (
  EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND nivel IN ('admin', 'operador'))
);

-- ========= FUNCTION: invalidar sessões anteriores no login =========
CREATE OR REPLACE FUNCTION public.invalidar_sessoes_anteriores(p_usuario_id UUID, p_novo_token TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.sessoes SET ativo = false WHERE usuario_id = p_usuario_id AND ativo = true;
  INSERT INTO public.sessoes (usuario_id, token, ativo) VALUES (p_usuario_id, p_novo_token, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========= FUNCTION: verificar sessão ativa =========
CREATE OR REPLACE FUNCTION public.verificar_sessao(p_usuario_id UUID, p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.sessoes WHERE usuario_id = p_usuario_id AND token = p_token AND ativo = true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

