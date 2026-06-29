-- ========= Central de Notificações =========
-- Executar em: https://supabase.com/dashboard/project/thchtjwbytdphmviympg/sql/new

-- 1. Tabela de notificações
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  publico_alvo JSONB NOT NULL DEFAULT '{"tipo":"todos"}',
  criado_por UUID,
  criado_por_nome TEXT,
  publicado_em TIMESTAMPTZ DEFAULT NOW(),
  arquivado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notificacoes_select" ON notificacoes;
CREATE POLICY "notificacoes_select" ON notificacoes FOR SELECT USING (true);
DROP POLICY IF EXISTS "notificacoes_insert" ON notificacoes;
CREATE POLICY "notificacoes_insert" ON notificacoes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "notificacoes_update" ON notificacoes;
CREATE POLICY "notificacoes_update" ON notificacoes FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "notificacoes_delete" ON notificacoes;
CREATE POLICY "notificacoes_delete" ON notificacoes FOR DELETE USING (true);

-- 2. Tabela de leituras (confirmações)
CREATE TABLE IF NOT EXISTS leituras_notificacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notificacao_id UUID REFERENCES notificacoes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  usuario_nome TEXT,
  visualizado_em TIMESTAMPTZ,
  confirmado_em TIMESTAMPTZ,
  status TEXT DEFAULT 'nao_lida' CHECK (status IN ('nao_lida', 'confirmada')),
  UNIQUE(notificacao_id, usuario_id)
);

ALTER TABLE leituras_notificacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leituras_select" ON leituras_notificacoes;
CREATE POLICY "leituras_select" ON leituras_notificacoes FOR SELECT USING (true);
DROP POLICY IF EXISTS "leituras_insert" ON leituras_notificacoes;
CREATE POLICY "leituras_insert" ON leituras_notificacoes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "leituras_update" ON leituras_notificacoes;
CREATE POLICY "leituras_update" ON leituras_notificacoes FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "leituras_delete" ON leituras_notificacoes;
CREATE POLICY "leituras_delete" ON leituras_notificacoes FOR DELETE USING (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leituras_usuario ON leituras_notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_leituras_notificacao ON leituras_notificacoes(notificacao_id);
CREATE INDEX IF NOT EXISTS idx_leituras_status ON leituras_notificacoes(status);
CREATE INDEX IF NOT EXISTS idx_notificacoes_publicado ON notificacoes(publicado_em DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_arquivado ON notificacoes(arquivado);
