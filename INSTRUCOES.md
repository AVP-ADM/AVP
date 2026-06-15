# INSTRUÇÕES FINAIS - Dashboard AVP com Google Sheets

## Você tem 2 arquivos prontos:

### 1. google-apps-script.js
→ Cole INTEIRO no Google Apps Script (Extensões > Apps Script na planilha)
→ Depois: Implantar > Gerenciar implantações > Editar > Nova versão > Implantar

### 2. sheets-integration.js  
→ Cole INTEIRO no final do HTML (antes do </script> final)
→ Substitua 'COLE_SUA_URL_AQUI' pela sua URL do Apps Script

---

## ÚNICA alteração manual no HTML:

No HTML, procure esta linha (na seção de duplicados):

```html
<th>#</th><th>Marca</th><th>Modelo</th><th>Categorias</th><th>Qtd. Categorias</th>
```

Substitua por:

```html
<th>#</th><th>Marca</th><th>Modelo</th><th>Ano Aceitação</th><th>Categorias</th><th>Qtd. Categorias</th>
```

Isso adiciona o cabeçalho da coluna "Ano Aceitação" na tabela de duplicados.

---

## Pronto! O que vai funcionar:

- Visão Geral: mostra o ano ao lado de cada modelo
- Duplicados: coluna "Ano Aceitação" na tabela
- Busca: mostra o ano abaixo do modelo (📅 Ano da categoria)
- Por Marca: mostra o ano na tabela
- Exportar CSV: inclui coluna "Ano de Aceitação"
- Google Sheets: coluna "Ano de Aceitação" editável
- Se editar o ano na planilha, o dashboard mostra o ano editado
