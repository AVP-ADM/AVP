-- ========= Bug 2: Lock de Concorrência Real =========
-- Executar em: https://supabase.com/dashboard/project/thchtjwbytdphmviympg/sql/new
-- 
-- Este SQL cria as tabelas e RPCs necessárias para o controle de concorrência.
-- O código JS tem fallback graceful: se essas tabelas/RPCs não existirem,
-- o sistema continua funcionando normalmente (sem lock).

-- 1. Tabela meta_sync (controle de timestamp do último save)
CREATE TABLE IF NOT EXISTS meta_sync (
  chave TEXT PRIMARY KEY,
  valor TEXT,
  usuario TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meta_sync ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "meta_sync_all" ON meta_sync;
CREATE POLICY "meta_sync_all" ON meta_sync FOR ALL USING (true) WITH CHECK (true);

-- 2. Tabela lock_edicao (lock pessimista com expiração)
CREATE TABLE IF NOT EXISTS lock_edicao (
  id INT PRIMARY KEY DEFAULT 1,
  usuario_id UUID,
  usuario_nome TEXT,
  acquired_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE lock_edicao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lock_edicao_all" ON lock_edicao;
CREATE POLICY "lock_edicao_all" ON lock_edicao FOR ALL USING (true) WITH CHECK (true);

-- Inserir linha inicial (lock singleton)
INSERT INTO lock_edicao (id, usuario_id, usuario_nome)
VALUES (1, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 3. RPC: Adquirir lock (expira em 60 segundos)
CREATE OR REPLACE FUNCTION adquirir_lock_edicao(p_usuario_id UUID, p_usuario_nome TEXT)
RETURNS JSONB AS $$
DECLARE
  lock_row lock_edicao%ROWTYPE;
BEGIN
  SELECT * INTO lock_row FROM lock_edicao WHERE id = 1 FOR UPDATE;
  
  -- Se o lock pertence a outro usuário E não expirou (60s), recusar
  IF lock_row.usuario_id IS NOT NULL 
     AND lock_row.usuario_id != p_usuario_id 
     AND lock_row.acquired_at > NOW() - INTERVAL '60 seconds' THEN
    RETURN jsonb_build_object('success', false, 'lockedBy', lock_row.usuario_nome);
  END IF;
  
  -- Adquirir lock
  UPDATE lock_edicao 
  SET usuario_id = p_usuario_id, 
      usuario_nome = p_usuario_nome, 
      acquired_at = NOW() 
  WHERE id = 1;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- 4. RPC: Liberar lock
CREATE OR REPLACE FUNCTION liberar_lock_edicao(p_usuario_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE lock_edicao 
  SET usuario_id = NULL, usuario_nome = NULL 
  WHERE id = 1 AND usuario_id = p_usuario_id;
END;
$$ LANGUAGE plpgsql;
