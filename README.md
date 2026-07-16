# AutoVale — Sistema de Relatorios e Dashboard

## Estrutura do Repositorio

```
AVP/
├── index.html                   → Dashboard principal (auditoria, comissoes, migracoes)
├── demandas.html                → Pagina de demandas
├── relatorios.html              → Relatorios Top Adesoes + Acompanhamento semanal
├── mapa-associados.html         → Mapa de associados
├── supabase-client.js           → Conexao com Supabase (usado por index + demandas)
├── comissoes.js                 → Modulo de comissoes (usado por index.html)
├── migracoes.js                 → Modulo de migracoes (usado por index.html)
├── notificacoes.js              → Sistema de notificacoes (usado por index.html)
├── regimento.js                 → FAQ/Regimento interno (usado por index.html)
├── faq-regimento-interno-autovale.json → Dados do FAQ (usado por regimento.js)
├── android-chrome-512x512.png   → Logo/favicon (todos os HTMLs)
├── logo.png                     → Logo PNG (index.html, mapa-associados.html)
├── favicon.ico                  → Icone da aba (mapa-associados.html)
├── README.md                    → Este arquivo
└── .gitignore
```

## Paginas

| Pagina | URL (Pages) | Descricao |
|--------|-------------|-----------|
| Dashboard | `/index.html` | Sistema principal de auditoria, comissoes, migracoes, regimento |
| Demandas | `/demandas.html` | Gerenciamento de demandas |
| Relatorios | `/relatorios.html` | Top Adesoes + Acompanhamento semanal por gestor |
| Mapa | `/mapa-associados.html` | Mapa de associados |

## Relatorios (relatorios.html)

### Funcionalidades:
- **Acompanhamento semanal/mensal** — dados historicos de Jan-Jul 2026
- **Pesquisa Livre** — consulta sob demanda via Edge Function
- **Sidebar desktop + bottom nav mobile**
- **Ocultar gestores** (salva no Supabase)
- **Cache** no Supabase + localStorage
- **Fechar Semana** — botao para registrar corte semanal

### Conexoes externas:
- **Supabase** (gestao-comercial-autovale): `xoshndinqznjhcvxttww.supabase.co`
  - Tabela `relatorios_cache` — cache de pesquisas livres
  - Tabela `relatorios_semanal` — dados semanais historicos
  - Tabela `gestores_ocultos` — gestores ocultos pelo usuario
- **Edge Function** `aeasy-proxy` — proxy para API do AEasy (login, gestores, batch)
- **API AEasy** — `aeasy.autovaleprevencoes.org` (via Edge Function, nao direto)

### Dados semanais salvos:
- Janeiro a Junho 2026: completos (semanas + fechamento)
- Julho 2026: semanas 1 e 2

## Tecnologias

- HTML/CSS/JS puro (sem frameworks)
- Supabase (2 projetos: `thchtjwbytdphmviympg` para index/demandas, `xoshndinqznjhcvxttww` para relatorios)
- Edge Functions (Deno/TypeScript)
- GitHub Pages (branch `dashboard-v2`)

## Regras do projeto

- Sem optional chaining (`?.`) no demandas.html
- Nunca usar emojis como icones — sempre SVG inline
- Supabase anon key publica (seguranca via RLS)
- Dark mode via `[data-theme="dark"]`
- Responsividade mobile: regras `@media` com `pointer:coarse`
- relatorios.html e totalmente independente (nao depende de supabase-client.js)
