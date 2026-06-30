-- ========= Permissões por Setor =========
-- Executar em: https://supabase.com/dashboard/project/thchtjwbytdphmviympg/sql/new

-- Adicionar coluna de permissões na tabela setores
ALTER TABLE setores ADD COLUMN IF NOT EXISTS permissoes JSONB DEFAULT '{
  "abas": {
    "visao_geral": true,
    "analise": false,
    "gestao": false,
    "consultas": true,
    "exportacoes": true,
    "comissoes": true,
    "historico": false
  },
  "acoes": {
    "criar_categorias": false,
    "editar_categorias": false,
    "remover_categorias": false,
    "adicionar_modelos": false,
    "editar_modelos": false,
    "remover_modelos": false,
    "adicionar_marcas": false,
    "remover_marcas": false,
    "criar_operacoes": true,
    "ver_alteracoes": false,
    "ver_conflitos": false,
    "ver_divergencias": false
  }
}'::jsonb;
