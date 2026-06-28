# AVP — AutoVale Prevencoes

## Arquitetura Atual

- **Frontend:** `index.html` (SPA monolito com CSS + JS inline)
- **Backend:** Supabase (PostgreSQL + Auth + Storage + REST API)
- **Client API:** `supabase-client.js` (wrapper fetch puro sem SDK)
- **Deploy:** GitHub Pages (branch dashboard-v2)

## Credenciais

- Login: usuario + senha via Supabase Auth
- Dominio de email interno: `@avpbase.local`
- API FIPE: Token JWT configurado no index.html (migrar para Edge Function no futuro)

## Como Rodar Localmente

1. Clone o repositorio
2. Abra `index.html` no navegador (nao precisa de servidor)
3. Login com credenciais do Supabase Auth

## Banco de Dados

- Schema completo em `supabase_setup.sql`
- RLS habilitado em todas as tabelas
- Functions SECURITY DEFINER para controle de sessao

## Notas de Seguranca

- Todas as entradas de usuario sao escapadas com `escapeHtml()` antes de renderizar
- Upload de imagens validado com magic bytes
- Rate limiting no login (5 tentativas / 5 min)
- Sessao expira apos 30 minutos de inatividade
- Controle de sessao unica por dispositivo
