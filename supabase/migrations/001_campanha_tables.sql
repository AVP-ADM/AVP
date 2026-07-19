-- Exceções da campanha de premiações
CREATE TABLE IF NOT EXISTS campanha_excecoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gestor_nome text NOT NULL,
  gestor_id text,
  tipo text NOT NULL DEFAULT 'equipe_completa',
  subtrai_gestor_nome text,
  subtrai_gestor_id text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(gestor_nome)
);

ALTER TABLE campanha_excecoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso publico campanha_excecoes" ON campanha_excecoes
  FOR ALL USING (true) WITH CHECK (true);

-- Inserir exceções padrão
INSERT INTO campanha_excecoes (gestor_nome, gestor_id, tipo, subtrai_gestor_nome, subtrai_gestor_id) VALUES
  ('Alisson Pereira Da Silva', '9B386575-5156-F9D4-A13D-BC7B82DE6E0C', 'equipe_completa', NULL, NULL),
  ('FAGNER RAMON ALVES LEITE', '7899d01f-abc9-11ee-98aa-0244bdb3ddcc', 'equipe_completa', NULL, NULL),
  ('Carlos Eduardo Silva', 'AB4BFE4A-1C1B-0D67-99E3-94DD6E5AF3D5', 'equipe_completa', NULL, NULL),
  ('Osnir da Silva Lima', 'FF56C930-8002-C235-0E12-E4AB25E49AAF', 'subtrai', 'JOSE EVERTON SOUZA SANTANA', '72E6588B-4CC9-5041-5FCB-C2539871739F')
ON CONFLICT (gestor_nome) DO NOTHING;

-- Gestores por acordo
CREATE TABLE IF NOT EXISTS gestores_acordo (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gestor_nome text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gestores_acordo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso publico gestores_acordo" ON gestores_acordo
  FOR ALL USING (true) WITH CHECK (true);

-- Dados da campanha (cache)
CREATE TABLE IF NOT EXISTS campanha_dados (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gestor_nome text UNIQUE NOT NULL,
  cidade text,
  ativados integer DEFAULT 0,
  mensalidade numeric(12,2) DEFAULT 0,
  ticket_medio numeric(8,2) DEFAULT 0,
  score integer DEFAULT 0,
  pontuacao integer DEFAULT 0,
  excecao boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE campanha_dados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso publico campanha_dados" ON campanha_dados
  FOR ALL USING (true) WITH CHECK (true);
