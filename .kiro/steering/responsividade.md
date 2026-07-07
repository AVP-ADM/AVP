# Responsividade Mobile-First

## Regra obrigatória

Toda e qualquer alteração nos sistemas AVP (`index.html`, `demandas.html`, ou qualquer outro arquivo do projeto) **DEVE** ser pensada e implementada para ser **100% responsiva** em todos os dispositivos (desktop, tablet e mobile).

## Breakpoints padrão

- `1100px` — tablet landscape / desktop pequeno
- `768px` — tablet portrait
- `480px` — mobile

## Requisitos mínimos para mobile (<480px)

1. **Touch targets**: mínimo 44px de altura em botões, links e inputs
2. **Font sizes**: nunca menor que 12px em texto legível
3. **Padding/margins**: reduzir para valores proporcionais (16px max em mobile)
4. **Grids**: máximo 2 colunas em mobile, 1 coluna para conteúdo principal
5. **Tabelas**: usar `overflow-x:auto` com indicador visual de scroll
6. **Modais**: quase fullscreen em mobile (padding 10-14px)
7. **Flexbox/Grid**: usar `flex-wrap:wrap` em containers horizontais
8. **Imagens**: usar `max-width:100%` e `height:auto`
9. **Inputs**: `width:100%` em mobile, `min-height:42px`
10. **Dropdowns/Selects**: full-width em mobile

## Padrão CSS

Sempre adicionar regras responsivas dentro dos media queries existentes:

```css
@media(max-width:768px){ /* tablet */ }
@media(max-width:480px){ /* mobile */ }
```

## Testes

Antes de finalizar qualquer alteração visual, verificar mentalmente:
- Como fica em 375px de largura? (iPhone SE)
- Como fica em 390px? (iPhone 14)
- Como fica em 768px? (iPad portrait)
- Os touch targets são grandes o suficiente para dedos?
