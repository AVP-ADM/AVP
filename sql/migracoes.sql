-- ========= Modulo Migracoes =========
-- Executar em: https://supabase.com/dashboard/project/thchtjwbytdphmviympg/sql/new

-- 1. Tabela de consultores monitorados (pre-autorizados pela diretoria)
CREATE TABLE IF NOT EXISTS migracoes_consultores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  autorizado_por TEXT NOT NULL,
  data_autorizacao DATE DEFAULT CURRENT_DATE,
  observacao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE migracoes_consultores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "migracoes_consultores_select" ON migracoes_consultores;
CREATE POLICY "migracoes_consultores_select" ON migracoes_consultores FOR SELECT USING (true);
DROP POLICY IF EXISTS "migracoes_consultores_insert" ON migracoes_consultores;
CREATE POLICY "migracoes_consultores_insert" ON migracoes_consultores FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "migracoes_consultores_update" ON migracoes_consultores;
CREATE POLICY "migracoes_consultores_update" ON migracoes_consultores FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "migracoes_consultores_delete" ON migracoes_consultores;
CREATE POLICY "migracoes_consultores_delete" ON migracoes_consultores FOR DELETE USING (true);

-- 2. Tabela de migracoes registradas (consultores monitorados)
CREATE TABLE IF NOT EXISTS migracoes_registros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultor_id UUID REFERENCES migracoes_consultores(id) ON DELETE CASCADE,
  consultor_nome TEXT NOT NULL,
  placa TEXT NOT NULL,
  valor_autovale NUMERIC(10,2) NOT NULL,
  valor_concorrente NUMERIC(10,2) NOT NULL,
  valor_desconto NUMERIC(10,2) NOT NULL,
  percentual_desconto NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE migracoes_registros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "migracoes_registros_select" ON migracoes_registros;
CREATE POLICY "migracoes_registros_select" ON migracoes_registros FOR SELECT USING (true);
DROP POLICY IF EXISTS "migracoes_registros_insert" ON migracoes_registros;
CREATE POLICY "migracoes_registros_insert" ON migracoes_registros FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "migracoes_registros_update" ON migracoes_registros;
CREATE POLICY "migracoes_registros_update" ON migracoes_registros FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "migracoes_registros_delete" ON migracoes_registros;
CREATE POLICY "migracoes_registros_delete" ON migracoes_registros FOR DELETE USING (true);

-- 3. Tabela de autorizacoes pontuais (consultores comuns que pediram autorizacao >30%)
CREATE TABLE IF NOT EXISTS migracoes_autorizacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultor_nome TEXT NOT NULL,
  placa TEXT NOT NULL,
  valor_autovale NUMERIC(10,2) NOT NULL,
  valor_concorrente NUMERIC(10,2) NOT NULL,
  valor_desconto NUMERIC(10,2) NOT NULL,
  percentual_desconto NUMERIC(5,2) NOT NULL,
  autorizado_por TEXT NOT NULL,
  anexo_url TEXT,
  registrado_por UUID,
  registrado_por_nome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE migracoes_autorizacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "migracoes_autorizacoes_select" ON migracoes_autorizacoes;
CREATE POLICY "migracoes_autorizacoes_select" ON migracoes_autorizacoes FOR SELECT USING (true);
DROP POLICY IF EXISTS "migracoes_autorizacoes_insert" ON migracoes_autorizacoes;
CREATE POLICY "migracoes_autorizacoes_insert" ON migracoes_autorizacoes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "migracoes_autorizacoes_update" ON migracoes_autorizacoes;
CREATE POLICY "migracoes_autorizacoes_update" ON migracoes_autorizacoes FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "migracoes_autorizacoes_delete" ON migracoes_autorizacoes;
CREATE POLICY "migracoes_autorizacoes_delete" ON migracoes_autorizacoes FOR DELETE USING (true);

-- 4. Configuracoes do modulo migracoes
CREATE TABLE IF NOT EXISTS migracoes_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  limite_percentual NUMERIC(5,2) DEFAULT 30.00,
  migracoes_para_alerta INTEGER DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE migracoes_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "migracoes_config_select" ON migracoes_config;
CREATE POLICY "migracoes_config_select" ON migracoes_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "migracoes_config_insert" ON migracoes_config;
CREATE POLICY "migracoes_config_insert" ON migracoes_config FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "migracoes_config_update" ON migracoes_config;
CREATE POLICY "migracoes_config_update" ON migracoes_config FOR UPDATE USING (true) WITH CHECK (true);

-- Inserir config padrao
INSERT INTO migracoes_config (limite_percentual, migracoes_para_alerta) VALUES (30.00, 10)
ON CONFLICT DO NOTHING;

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_migracoes_registros_consultor ON migracoes_registros(consultor_id);
CREATE INDEX IF NOT EXISTS idx_migracoes_registros_created ON migracoes_registros(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_migracoes_autorizacoes_created ON migracoes_autorizacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_migracoes_consultores_ativo ON migracoes_consultores(ativo);
