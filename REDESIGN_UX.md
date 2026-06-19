# Redesign UX/UI — Sistema AVP (AutoVale Prevenções)
## Documento de Planejamento Completo

---

## 1. Conceito Visual

### Personalidade da interface
- **Sólida** — transmite que os dados estão seguros e organizados
- **Precisa** — cada elemento tem propósito, sem decoração vazia
- **Silenciosa** — não grita, não distrai. A informação fala por si
- **Confiável** — estabilidade visual que remete a sistemas bancários

### Estilo visual
- **Flat com profundidade sutil** — sem gradientes pesados, mas com sombras mínimas para hierarquia
- **Espaço negativo generoso** — respiro entre elementos para reduzir fadiga
- **Geometria limpa** — cantos arredondados sutis (6-8px), linhas finas
- **Monocromático com acentos** — base neutra, cor só onde há ação ou atenção

### Sensação do usuário
"Estou no controle. Sei exatamente o que está acontecendo com a base. O sistema me guia sem me atrapalhar."

---

## 2. Identidade Visual — Paleta de Cores

### Princípio
O azul escuro da marca é a cor de ESTRUTURA (header, navegação, elementos fixos).
O verde é a cor de AÇÃO (botões, confirmações, progresso).


### Paleta Completa

| Variável | Light Mode | Dark Mode | Uso |
|---|---|---|---|
| `--primary` | `#1A2B6B` | `#4B7BF5` | Navegação, headers, elementos estruturais |
| `--primary-light` | `#E8EDF8` | `#1E2D4A` | Hover suave, fundos selecionados |
| `--accent` | `#1B7A3D` | `#34D058` | Botões de ação, confirmações, CTAs |
| `--accent-hover` | `#146B32` | `#2EA84B` | Hover em botões verdes |
| `--success` | `#0D9F4F` | `#2DD06B` | Status OK, validações positivas |
| `--warning` | `#D97706` | `#FBBF24` | Alertas, pendências, atenção |
| `--danger` | `#DC2626` | `#F87171` | Erros, exclusões, problemas |
| `--info` | `#2563EB` | `#60A5FA` | Informações, links, badges neutros |
| `--bg` | `#F8FAFC` | `#0B1121` | Fundo geral da aplicação |
| `--surface` | `#FFFFFF` | `#131B2E` | Cards, modais, painéis |
| `--surface-2` | `#F1F5F9` | `#1A2540` | Áreas secundárias, hover em linhas |
| `--border` | `#E2E8F0` | `#1E293B` | Bordas de cards, separadores |
| `--border-strong` | `#CBD5E1` | `#334155` | Bordas de inputs, elementos interativos |
| `--text-1` | `#0F172A` | `#F1F5F9` | Texto principal (títulos, valores) |
| `--text-2` | `#475569` | `#94A3B8` | Texto secundário (labels, descrições) |
| `--text-3` | `#94A3B8` | `#4B5563` | Texto terciário (placeholders, notas) |

### Cor do Header
- **Light:** `#0F1A3D` (azul muito escuro) com texto branco
- **Dark:** `#0A0F1C` (quase preto com tint azul) com borda inferior verde sutil

---

## 3. Tipografia

### Fonte principal: **Inter**
- Disponível via Google Fonts (sem custo)
- Desenhada especificamente para interfaces digitais
- Excelente legibilidade em tamanhos pequenos (tabelas, badges)
- Amplo suporte a pesos (300-700)

### Escala tipográfica

| Nível | Tamanho | Peso | Uso |
|---|---|---|---|
| Display | 24px | 700 | Título da seção ativa |
| H1 | 20px | 700 | Títulos de cards principais |
| H2 | 16px | 600 | Subtítulos, títulos de tabela |
| H3 | 14px | 600 | Labels de campo, cabeçalhos menores |
| Body | 13px | 400 | Texto padrão em tabelas e descrições |
| Small | 12px | 400 | Badges, notas, metadados |
| Tiny | 11px | 500 | Tags, contadores, shortcuts |

### Line-height
- Títulos: 1.3
- Body: 1.5
- Tabelas: 1.4

---


## 4. Estrutura do Sistema

### Decisão: SIDEBAR COLAPSÁVEL + HEADER FINO

**Justificativa:**
- O sistema tem 8+ seções (Visão Geral, Categorias, Duplicidades, Divergências, Manutenção, Histórico, Exportações, Liberações)
- Tabs horizontais ficam apertadas e não escalam
- Sidebar dá "peso" de produto corporativo (Linear, HubSpot, Salesforce)
- Colapsável permite mais espaço para dados quando necessário
- Header fino (48px) maximiza área vertical para tabelas

### Layout da página

```
┌──────────────────────────────────────────────────────────┐
│  [Logo]  AutoVale    [══ Pesquisa Ctrl+K ══]  🔔  [User] │ ← Header 48px
├────────┬─────────────────────────────────────────────────┤
│        │                                                  │
│  📊    │   Conteúdo Principal                            │
│  📁    │                                                  │
│  🔁    │   (varia por seção)                             │
│  ↔️    │                                                  │
│  🔧    │                                                  │
│  📜    │                                                  │
│  📥    │                                                  │
│  ⚠️    │                                                  │
│        │                                                  │
│        │                                                  │
├────────┤                                                  │
│ [<<]   │                                                  │ ← Botão colapsar
└────────┴─────────────────────────────────────────────────┘
```

### Sidebar (expandida: 240px / colapsada: 64px)
- Ícone + texto quando expandida
- Apenas ícone quando colapsada (com tooltip)
- Indicador visual na seção ativa (barra lateral verde)
- Badge de notificação em seções com pendências (ex: "3" em Duplicidades)

### Header (48px fixo)
- Logo SVG (símbolo VV) + "AutoVale" à esquerda
- Barra de pesquisa centralizada (50% da largura)
- Sino de notificações + avatar/nome à direita
- Sem borda inferior — separação por sombra sutil

---

## 5. Dashboard Inicial (Visão Geral)

### Wireframe textual

```
┌─────────────────────────────────────────────────────────────┐
│ Visão Geral                                    Atualizado há 2min │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ │
│  │ 18      │ │ 49      │ │ 9.488   │ │ 2.459   │ │ 328   │ │
│  │Categorias│ │ Marcas  │ │ Modelos │ │ Duplic. │ │Diverg.│ │
│  │ ══════  │ │ ══════  │ │ ═══════ │ │ ═══════ │ │══════ │ │
│  │ +2 mês  │ │ +0 mês  │ │ +45 mês │ │ -12 mês │ │-5 mês│ │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────┘ │
│                                                              │
│  ┌── Alertas ──────────────────────────────────────────────┐ │
│  │ ⚠ 3 liberações temporárias aguardando finalização       │ │
│  │ ⚠ Base FIPE atualizada há 0 dias (próxima: 19/07)      │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌── Categorias ───────────────────────────────────────────┐ │
│  │  [Filtro]  [Tipo ▼]  [Ordenar ▼]  [+ Nova Categoria]   │ │
│  │                                                          │ │
│  │  Categoria          Modelos  Marcas  Duplic.  Diverg.   │ │
│  │  ─────────────────────────────────────────────────────  │ │
│  │  Automóvel Premium   360      13       5       —        │ │
│  │  Elétrico | Híbrido   46      10       9       —        │ │
│  │  ...                                                     │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌── Top Duplicados ──┐  ┌── Top Divergências ────────────┐ │
│  │  AUDI A3 — 3 cat.  │  │  Nacional vs Importado — 142   │ │
│  │  BMW X1 — 2 cat.   │  │  SUV vs Utilitário — 89       │ │
│  │  ...                │  │  ...                           │ │
│  └─────────────────────┘  └────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### KPIs com contexto
Cada KPI card mostra:
- Valor numérico grande
- Label descritivo
- Mini barra de tendência (sparkline ou comparativo mês)
- Cor lateral indicando saúde (verde=ok, amber=atenção, red=problema)

---


## 6. Página de Categorias

### Abordagem: Table-first com painel lateral

```
┌─────────────────────────────────────────────────────────────┐
│ Categorias                          [+ Nova Categoria]       │
├─────────────────────────────────────────────────────────────┤
│ [Buscar...]  [Tipo: Todos ▼]  [Ordenar: A-Z ▼]             │
├─────────────────────────────────────────────────────────────┤
│  □  Categoria            Modelos  Marcas  Dupl.  Status     │
│  ─  ──────────────────── ─────── ─────── ────── ────────── │
│  □  Automóvel Premium     360      13       5    ● Saudável │
│  □  Elétrico | Híbrido     46      10       9    ● Atenção  │
│  □  Motocicletas Honda     72       1       —    ● Saudável │
│  ...                                                         │
├─────────────────────────────────────────────────────────────┤
│ 18 categorias  •  9.488 modelos totais                       │
└─────────────────────────────────────────────────────────────┘
```

Ao clicar em uma categoria → abre **painel lateral direito** (drawer) com:
- Lista de modelos (com busca)
- Lista de marcas
- Ações rápidas (adicionar, exportar)
- Estatísticas da categoria

---

## 7. Página de Duplicidades

### Abordagem: Cards agrupados + ações em lote

```
┌─────────────────────────────────────────────────────────────┐
│ Duplicidades                    2.459 modelos em múltiplas cat. │
├─────────────────────────────────────────────────────────────┤
│ [Buscar marca/modelo...]  [≥2 cat ▼]  [Ações: Remover sel.] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  □ ┌─────────────────────────────────────────────────────┐  │
│    │ AUDI  •  A3 1.6 3p                    3 categorias  │  │
│    │ ┌──────────────────┐┌──────────────┐┌────────────┐ │  │
│    │ │ Automóvel Premium ││ Passeio Nac. ││ Passeio Imp│ │  │
│    │ └──────────────────┘└──────────────┘└────────────┘ │  │
│    │                              [Manter em...]  [Remover de...] │
│    └─────────────────────────────────────────────────────┘  │
│                                                              │
│  □ ┌─────────────────────────────────────────────────────┐  │
│    │ BMW  •  X1 SDRIVE 20i                 2 categorias  │  │
│    │ ...                                                  │  │
│    └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Página de Divergências

### Abordagem: Split view com comparação lado a lado

```
┌─────────────────────────────────────────────────────────────┐
│ Divergências                                                 │
├─────────────────────────────────────────────────────────────┤
│ Comparando: [Nacional ▼]  ←→  [Importado ▼]                 │
├──────────────────────────┬──────────────────────────────────┤
│ Somente em Nacional (142)│ Somente em Importado (86)        │
├──────────────────────────┼──────────────────────────────────┤
│  AUDI A3 1.8 Turbo       │  AUDI A3 Sedan 2.0 TFSI        │
│  BMW 320i                 │  BMW 330i M Sport               │
│  [Copiar para Importado→] │  [←Copiar para Nacional]        │
│  ...                      │  ...                             │
├──────────────────────────┴──────────────────────────────────┤
│ Em ambas (1.461 modelos)                      [Ver todos]    │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Sistema de Pesquisa — Command Palette

### Estilo: Spotlight (macOS) / Ctrl+K (Linear)

```
┌─────────────────────────────────────────────────────────────┐
│  🔍  Pesquisar modelos, marcas, categorias...      ESC      │
├─────────────────────────────────────────────────────────────┤
│  Filtros: [Cadastrados ✓]  [Não cadastrados]                │
├─────────────────────────────────────────────────────────────┤
│  RESULTADOS                                                  │
│                                                              │
│  📁 Categorias                                               │
│     Automóvel Premium — 360 modelos                          │
│                                                              │
│  🔤 Modelos                                                  │
│     AUDI A3 1.6 3p — Automóvel Premium                      │
│     AUDI A3 1.6 5p — Automóvel Premium                      │
│                                                              │
│  ⚡ Ações rápidas                                            │
│     + Adicionar modelo    → Adicionar "A3" em uma categoria │
│     🔍 Ver na FIPE       → Consultar preço FIPE            │
├─────────────────────────────────────────────────────────────┤
│  ↑↓ navegar    ↵ selecionar    esc fechar                   │
└─────────────────────────────────────────────────────────────┘
```

---


## 10. Sistema de Alertas

### Hierarquia

| Tipo | Componente | Quando usar |
|---|---|---|
| **Toast** | Notificação flutuante (canto inferior direito) | Confirmações rápidas ("Modelo adicionado") |
| **Banner** | Faixa no topo do conteúdo | Avisos persistentes ("Base desatualizada") |
| **Badge** | Contador em ícones/tabs | Pendências numéricas |
| **Inline** | Mensagem dentro de formulários | Validações em tempo real |

### Estilo dos toasts
- Sem emoji — ícone SVG (check, X, triangle, info)
- Borda lateral colorida (3px) indicando tipo
- Duração: sucesso=3s, erro=5s, aviso=4s
- Posição: bottom-right com stack (máx 3 visíveis)

---

## 11. Sistema de Modais

### Princípios
- **Nunca fullscreen** — manter contexto visual por trás (overlay escuro 60%)
- **Largura máxima: 520px** para formulários, **720px** para comparações
- **Footer fixo** com botões de ação (Cancelar à esquerda, Confirmar à direita)
- **Botão primário (Confirmar)** sempre verde marca
- **Botão destrutivo (Excluir)** sempre vermelho, com confirmação dupla

### Hierarquia de ações no modal
```
┌──────────────────────────────────────────┐
│  ╳  Título do Modal                      │
├──────────────────────────────────────────┤
│                                          │
│  Conteúdo do formulário                  │
│                                          │
├──────────────────────────────────────────┤
│  [Cancelar]              [▓ Confirmar ▓] │
└──────────────────────────────────────────┘
```

---

## 12. Cores por Status

| Status | Cor (light) | Cor (dark) | Background | Uso |
|---|---|---|---|---|
| Saudável | `#0D9F4F` | `#2DD06B` | `#ECFDF5` / `#052E16` | Base OK, modelo válido |
| Atenção | `#D97706` | `#FBBF24` | `#FFFBEB` / `#422006` | Desatualização, pendência |
| Problema | `#DC2626` | `#F87171` | `#FEF2F2` / `#450A0A` | Erro, conflito, duplicidade alta |
| Informação | `#2563EB` | `#60A5FA` | `#EFF6FF` / `#172554` | Neutro, dados gerais |
| Pendente | `#7C3AED` | `#A78BFA` | `#F5F3FF` / `#2E1065` | Ações em staging, aguardando |
| Neutro | `#64748B` | `#94A3B8` | `#F8FAFC` / `#1E293B` | Desabilitado, inativo |

---

## 13. Dark Mode Premium

### Princípios
- **NÃO é inversão de cores** — é um modo projetado separadamente
- Fundo principal: `#0B1121` (azul muito escuro, não preto puro)
- Superfícies elevadas são mais CLARAS (não mais escuras)
- Texto principal: `#F1F5F9` (não branco puro — reduz contraste agressivo)
- Bordas sutis: `#1E293B` (quase invisíveis, apenas separação)
- Sombras: box-shadow com opacidade reduzida (não funcionam bem em dark)

### Hierarquia por elevação (dark mode)
```
Fundo:    #0B1121  (mais profundo)
Card:     #131B2E  (superfície 1)
Hover:    #1A2540  (superfície 2)  
Modal:    #1E2D4A  (superfície 3 — mais elevada)
```

### Cores ajustadas para dark
- Primária desatura levemente (evita "neon")
- Verdes e vermelhos ficam mais suaves
- Bordas são quase invisíveis — profundidade vem de gap/espaço

---

## 14. Componentes

### Tabelas
- Header fixo com fundo `--surface-2`
- Linhas alternadas sutis (cada 2ª linha 2% mais escura)
- Hover com fundo `--primary-light`
- Ações em cada linha: ícone de 3 pontos (⋮) com dropdown
- Paginação inferior com "Mostrando 1-50 de 2.459"

### Cards (KPI)
- Padding: 20px 24px
- Border-radius: 10px
- Sombra: `0 1px 3px rgba(0,0,0,0.04)`
- Borda: 1px solid var(--border)
- Borda lateral colorida (3px) indicando status

### Botões
| Variante | Fundo | Texto | Borda | Uso |
|---|---|---|---|---|
| Primary | `--accent` | branco | nenhuma | Ação principal (Salvar, Confirmar) |
| Secondary | transparente | `--text-1` | `--border-strong` | Ação secundária (Cancelar) |
| Danger | `--danger` | branco | nenhuma | Excluir, Remover |
| Ghost | transparente | `--text-2` | nenhuma | Ações terciárias |
| Icon | transparente | `--text-2` | nenhuma | Botões de ação em tabelas |

### Inputs
- Altura: 40px
- Border-radius: 6px
- Borda: 1px solid var(--border-strong)
- Focus: borda `--accent` + sombra `0 0 0 3px rgba(27,122,61,0.1)`
- Placeholder: var(--text-3)

### Tags/Badges
- Padding: 2px 8px
- Border-radius: 4px
- Tamanho: 11px uppercase bold
- Variantes por cor de status

---


## 15. Experiência de Uso

### Princípios de UX para uso prolongado

1. **Densidade controlada** — bastante informação visível, mas com respiro (padding generoso)
2. **Atalhos de teclado** — Ctrl+K (pesquisa), Ctrl+Z (undo), Ctrl+S (salvar)
3. **Feedback imediato** — toda ação tem resposta visual em <100ms
4. **Zero estados vazios** — quando não há dados, mostra call-to-action claro
5. **Progressão visual** — badges numéricos que diminuem conforme resolve pendências

### Microinterações

| Ação | Animação | Duração |
|---|---|---|
| Hover em card | Elevação sutil (translateY -1px + shadow) | 150ms |
| Abrir sidebar | Slide com ease-out | 200ms |
| Toast aparecer | Slide-in from right + fade | 300ms |
| Modal abrir | Scale 0.95→1 + fade overlay | 200ms |
| Tab mudar | Indicador desliza (não pula) | 250ms |
| Badge counter | Pulse breve ao atualizar | 400ms |
| Botão click | Scale 0.97 → 1 | 100ms |

### Transições entre seções
- Conteúdo principal faz fade sutil (opacity 0→1) ao trocar seção
- Sidebar marca ativa com barra verde que "desliza" entre itens
- Sem page reload — tudo instantâneo

---

## 16. Justificativas de Design

| Decisão | Por quê |
|---|---|
| Sidebar em vez de tabs | 8+ seções não cabem em tabs. Sidebar escala infinitamente e dá peso de "produto" |
| Azul como estrutura, verde como ação | Azul é mais neutro para elementos fixos (menos fadiga). Verde chama atenção para onde agir |
| Inter como fonte | A mais legível em tamanhos pequenos (crucial para tabelas com 9.000+ linhas) |
| Header fino (48px) | Maximiza espaço vertical para dados. O foco do sistema é a TABELA, não a navegação |
| Dark mode com azul escuro (não preto) | Preto puro (#000) causa fadiga. Azul escuro é mais confortável e mantém identidade da marca |
| Border-radius 6-10px | Arredondamento sutil transmite modernidade sem parecer infantil (vs 20px+) |
| Sombras mínimas | Em dark mode sombras não funcionam. Espaçamento e bordas sutis criam hierarquia melhor |
| Command palette (Ctrl+K) | Padrão em ferramentas pro (Linear, VS Code, Notion). Usuários avançados adoram |
| Toasts no canto inferior direito | Não bloqueia visualização da tabela (que é o foco principal) |
| Ações em lote | Com 2.459 duplicidades, resolver uma por uma é inviável. Seleção múltipla é essencial |

---

## 17. Próximos Passos para Implementação

### Fase 1 — Fundação (prioridade)
1. Variáveis CSS (nova paleta completa)
2. Fonte Inter (Google Fonts)
3. Sidebar colapsável (substituir tabs)
4. Header redesenhado (fino + logo + pesquisa)
5. Dark mode premium

### Fase 2 — Componentes
6. Botões (nova hierarquia)
7. Cards KPI (com borda lateral colorida)
8. Tabelas (header fixo, hover, ações)
9. Inputs (novo estilo)
10. Toasts (novo visual sem emoji)

### Fase 3 — Páginas
11. Dashboard (layout novo)
12. Categorias (com drawer lateral)
13. Duplicidades (cards agrupados)
14. Divergências (split view)
15. Exportações (cards uniformes)

### Fase 4 — Polish
16. Microinterações (transitions CSS)
17. Estados vazios
18. Loading states
19. Favicon + meta tags
20. Performance final

---

*Documento gerado como planejamento de redesign. Sujeito a aprovação antes da implementação.*
