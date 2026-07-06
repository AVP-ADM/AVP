/**
 * Google Apps Script — Webhook para atualizar planilha de Demandas
 * 
 * COMO USAR:
 * 1. Abra a planilha Google Sheets
 * 2. Menu > Extensões > Apps Script
 * 3. Cole este código no editor
 * 4. Clique em "Implantar" > "Nova implantação"
 * 5. Tipo: "App da Web"
 * 6. Executar como: "Eu" (sua conta)
 * 7. Quem tem acesso: "Qualquer pessoa"
 * 8. Copie a URL gerada e cole no frontend (demandas.html)
 * 
 * ESTRUTURA ESPERADA DA PLANILHA:
 * - Aba "Resumo Geral": Totais e médias
 * - Aba "Demandas Entregues": Ticket | Título | Data Criação | Data Entrega | Dias desde criação
 * - Aba "Demandas em Aberto": Ticket | Título | Data Criação | Status Atual | Dias desde criação | Setor | Prioridade
 */

// ==================== CONFIGURAÇÃO ====================
var CONFIG = {
  ABA_RESUMO: 'Resumo Geral',
  ABA_ENTREGUES: 'Demandas Entregues',
  ABA_ABERTO: 'Demandas em Aberto'
};

// ==================== WEBHOOK (POST) ====================
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    
    // Verificar se é atualização de campos (setor/prioridade)
    if (payload.action === 'update_campos') {
      var resultado = atualizarCampos(payload.alteracoes || []);
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'success',
          message: 'Campos atualizados',
          detalhes: resultado
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Processamento padrão (PDF import)
    var resultado = processarDemandas(payload);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Planilha atualizada com sucesso',
        detalhes: resultado
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.message,
        stack: error.stack
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Permite teste via GET — retorna todos os dados da planilha
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var abaEntregues = ss.getSheetByName(CONFIG.ABA_ENTREGUES);
    var abaAberto = ss.getSheetByName(CONFIG.ABA_ABERTO);
    
    var entregues = [];
    var emAberto = [];
    
    // Ler aba Entregues (a partir da linha 2, pular cabeçalho)
    if (abaEntregues && abaEntregues.getLastRow() > 1) {
      var dadosEntregues = abaEntregues.getRange(2, 1, abaEntregues.getLastRow() - 1, 5).getValues();
      for (var i = 0; i < dadosEntregues.length; i++) {
        var row = dadosEntregues[i];
        if (!row[0] || String(row[0]).toLowerCase() === 'ticket') continue;
        entregues.push({
          ticket: String(row[0]).trim(),
          titulo: String(row[1]).trim(),
          data_criacao: formatarDataOutput(row[2]),
          data_entrega: formatarDataOutput(row[3]),
          dias: row[4] || 0
        });
      }
    }
    
    // Ler aba Em Aberto (a partir da linha 2, pular cabeçalho)
    if (abaAberto && abaAberto.getLastRow() > 1) {
      var dadosAberto = abaAberto.getRange(2, 1, abaAberto.getLastRow() - 1, 7).getValues();
      for (var j = 0; j < dadosAberto.length; j++) {
        var rowA = dadosAberto[j];
        if (!rowA[0] || String(rowA[0]).toLowerCase() === 'ticket') continue;
        
        // Recalcular dias desde criação (hoje - data criação)
        var dataCriacaoAberto = parseData(formatarDataOutput(rowA[2]));
        var diasAtual = dataCriacaoAberto ? calcularDias(dataCriacaoAberto, new Date()) : (rowA[4] || 0);
        
        emAberto.push({
          ticket: String(rowA[0]).trim(),
          titulo: String(rowA[1]).trim(),
          data_criacao: formatarDataOutput(rowA[2]),
          status_atual: String(rowA[3]).trim(),
          dias: diasAtual,
          setor: String(rowA[5] || '').trim(),
          prioridade: String(rowA[6] || '').trim()
        });
      }
    }
    
    // Calcular métricas
    var totalEntregues = entregues.length;
    var totalAberto = emAberto.length;
    var total = totalEntregues + totalAberto;
    var taxaEntrega = total > 0 ? Math.round((totalEntregues / total) * 100) : 0;
    
    // Média dias entregues
    var somaEntregues = 0, countEntregues = 0;
    for (var k = 0; k < entregues.length; k++) {
      var d = Number(entregues[k].dias);
      if (!isNaN(d) && d > 0) { somaEntregues += d; countEntregues++; }
    }
    var mediaEntregues = countEntregues > 0 ? Math.round(somaEntregues / countEntregues) : 0;
    
    // Média dias aberto
    var somaAberto = 0, countAberto = 0;
    for (var l = 0; l < emAberto.length; l++) {
      var da = Number(emAberto[l].dias);
      if (!isNaN(da) && da > 0) { somaAberto += da; countAberto++; }
    }
    var mediaAberto = countAberto > 0 ? Math.round(somaAberto / countAberto) : 0;
    
    // Demandas críticas (>90 dias em aberto)
    var criticas = 0;
    for (var m = 0; m < emAberto.length; m++) {
      if (Number(emAberto[m].dias) > 90) criticas++;
    }
    
    // Sem previsão (Em análise/desenvolvimento)
    var semPrevisao = 0;
    for (var n = 0; n < emAberto.length; n++) {
      var status = emAberto[n].status_atual.toLowerCase();
      if (status.indexOf('an') !== -1 || status.indexOf('desenvolvimento') !== -1) {
        semPrevisao++;
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'success',
        ultima_atualizacao: Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'),
        metricas: {
          total: total,
          entregues: totalEntregues,
          em_aberto: totalAberto,
          taxa_entrega: taxaEntrega,
          media_dias_entrega: mediaEntregues,
          media_dias_aberto: mediaAberto,
          criticas: criticas,
          sem_previsao: semPrevisao
        },
        entregues: entregues,
        em_aberto: emAberto
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Formata valor de célula como string de data dd/mm/yyyy
 * Aceita Date objects ou strings
 */
function formatarDataOutput(valor) {
  if (!valor) return '';
  if (valor instanceof Date) {
    return formatarData(valor);
  }
  return String(valor).trim();
}

// ==================== PROCESSAMENTO PRINCIPAL ====================
function processarDemandas(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaEntregues = getOrCreateSheet(ss, CONFIG.ABA_ENTREGUES);
  var abaAberto = getOrCreateSheet(ss, CONFIG.ABA_ABERTO);
  var abaResumo = getOrCreateSheet(ss, CONFIG.ABA_RESUMO);
  
  var entreguesPDF = payload.entregues || [];
  var abertasPDF = payload.em_aberto || [];
  
  var stats = {
    novasEntregues: 0,
    movidasParaEntregues: 0,
    atualizadasAberto: 0,
    novasAberto: 0
  };
  
  // --- Processar Demandas Entregues ---
  var ticketsEntreguesExistentes = getTicketsExistentes(abaEntregues);
  
  for (var i = 0; i < entreguesPDF.length; i++) {
    var demanda = entreguesPDF[i];
    var ticket = String(demanda.ticket).trim();
    
    if (!ticket) continue;
    
    if (ticketsEntreguesExistentes.indexOf(ticket) === -1) {
      // Verificar se estava na aba "Em Aberto" e mover
      var removidaDeAberto = removerTicketDeAba(abaAberto, ticket);
      if (removidaDeAberto) {
        stats.movidasParaEntregues++;
      } else {
        stats.novasEntregues++;
      }
      
      // Adicionar na aba Entregues
      var dataCriacao = parseData(demanda.data_criacao);
      var dataEntrega = parseData(demanda.data_entrega);
      var diasDesdeCriacao = calcularDias(dataCriacao, dataEntrega);
      
      abaEntregues.appendRow([
        ticket,
        demanda.titulo || '',
        formatarData(dataCriacao),
        formatarData(dataEntrega),
        diasDesdeCriacao
      ]);
    }
  }
  
  // --- Processar Demandas em Aberto ---
  var ticketsAbertoExistentes = getTicketsExistentes(abaAberto);
  
  for (var j = 0; j < abertasPDF.length; j++) {
    var demandaAberta = abertasPDF[j];
    var ticketAberto = String(demandaAberta.ticket).trim();
    
    if (!ticketAberto) continue;
    
    // Verificar se não foi movida para Entregues neste ciclo
    var ticketsEntreguesAtualizado = getTicketsExistentes(abaEntregues);
    if (ticketsEntreguesAtualizado.indexOf(ticketAberto) !== -1) {
      continue; // Já está como entregue, ignorar
    }
    
    var dataCriacaoAberta = parseData(demandaAberta.data_criacao);
    var hoje = new Date();
    var diasDesdeAberta = calcularDias(dataCriacaoAberta, hoje);
    var statusAtual = demandaAberta.status_atual || demandaAberta.data_estimada || 'Em análise';
    var setor = demandaAberta.setor || '';
    var prioridade = demandaAberta.prioridade || '';
    
    if (ticketsAbertoExistentes.indexOf(ticketAberto) !== -1) {
      // Atualizar linha existente
      atualizarLinhaAberto(abaAberto, ticketAberto, {
        titulo: demandaAberta.titulo || '',
        data_criacao: formatarData(dataCriacaoAberta),
        status_atual: statusAtual,
        dias: diasDesdeAberta,
        setor: setor,
        prioridade: prioridade
      });
      stats.atualizadasAberto++;
    } else {
      // Adicionar nova
      abaAberto.appendRow([
        ticketAberto,
        demandaAberta.titulo || '',
        formatarData(dataCriacaoAberta),
        statusAtual,
        diasDesdeAberta,
        setor,
        prioridade
      ]);
      stats.novasAberto++;
    }
  }
  
  // --- Atualizar Resumo Geral ---
  atualizarResumo(ss, abaResumo, abaEntregues, abaAberto);
  
  return stats;
}

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Obtém ou cria uma aba na planilha
 */
function getOrCreateSheet(ss, nome) {
  var sheet = ss.getSheetByName(nome);
  if (!sheet) {
    sheet = ss.insertSheet(nome);
    // Adicionar cabeçalhos
    if (nome === CONFIG.ABA_ENTREGUES) {
      sheet.appendRow(['Ticket', 'Título da Demanda', 'Data de Criação', 'Data de Entrega', 'Dias desde criação']);
      formatarCabecalho(sheet);
    } else if (nome === CONFIG.ABA_ABERTO) {
      sheet.appendRow(['Ticket', 'Título da Demanda', 'Data de Criação', 'Status Atual', 'Dias desde criação', 'Setor', 'Prioridade']);
      formatarCabecalho(sheet);
    }
  }
  return sheet;
}

/**
 * Formata cabeçalho da aba
 */
function formatarCabecalho(sheet) {
  var headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1A2B6B');
  headerRange.setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);
}

/**
 * Retorna array de tickets existentes na coluna A (a partir da linha 2)
 */
function getTicketsExistentes(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  var range = sheet.getRange(2, 1, lastRow - 1, 1);
  var values = range.getValues();
  var tickets = [];
  
  for (var i = 0; i < values.length; i++) {
    var val = String(values[i][0]).trim();
    if (val && val !== '') {
      tickets.push(val);
    }
  }
  
  return tickets;
}

/**
 * Remove um ticket da aba (retorna true se encontrou e removeu)
 */
function removerTicketDeAba(sheet, ticket) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  
  var range = sheet.getRange(2, 1, lastRow - 1, 1);
  var values = range.getValues();
  
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === ticket) {
      sheet.deleteRow(i + 2); // +2 porque começa na linha 2
      return true;
    }
  }
  
  return false;
}

/**
 * Atualiza uma linha existente na aba "Em Aberto"
 */
function atualizarLinhaAberto(sheet, ticket, dados) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  var range = sheet.getRange(2, 1, lastRow - 1, 1);
  var values = range.getValues();
  
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === ticket) {
      var rowNum = i + 2;
      sheet.getRange(rowNum, 2).setValue(dados.titulo);
      sheet.getRange(rowNum, 3).setValue(dados.data_criacao);
      sheet.getRange(rowNum, 4).setValue(dados.status_atual);
      sheet.getRange(rowNum, 5).setValue(dados.dias);
      sheet.getRange(rowNum, 6).setValue(dados.setor);
      sheet.getRange(rowNum, 7).setValue(dados.prioridade);
      return;
    }
  }
}

/**
 * Atualiza a aba "Resumo Geral" com totais e médias
 */
function atualizarResumo(ss, abaResumo, abaEntregues, abaAberto) {
  var totalEntregues = Math.max(0, abaEntregues.getLastRow() - 1);
  var totalAberto = Math.max(0, abaAberto.getLastRow() - 1);
  var totalDemandas = totalEntregues + totalAberto;
  
  // Calcular média de dias das entregues
  var mediaEntregues = 0;
  if (totalEntregues > 0) {
    var diasEntregues = abaEntregues.getRange(2, 5, totalEntregues, 1).getValues();
    var soma = 0;
    var count = 0;
    for (var i = 0; i < diasEntregues.length; i++) {
      var val = Number(diasEntregues[i][0]);
      if (!isNaN(val) && val > 0) {
        soma += val;
        count++;
      }
    }
    mediaEntregues = count > 0 ? Math.round(soma / count) : 0;
  }
  
  // Calcular média de dias das em aberto
  var mediaAberto = 0;
  if (totalAberto > 0) {
    var diasAberto = abaAberto.getRange(2, 5, totalAberto, 1).getValues();
    var somaAberto = 0;
    var countAberto = 0;
    for (var j = 0; j < diasAberto.length; j++) {
      var valAberto = Number(diasAberto[j][0]);
      if (!isNaN(valAberto) && valAberto > 0) {
        somaAberto += valAberto;
        countAberto++;
      }
    }
    mediaAberto = countAberto > 0 ? Math.round(somaAberto / countAberto) : 0;
  }
  
  // Limpar e reescrever resumo
  abaResumo.clear();
  
  // Título
  abaResumo.getRange(1, 1).setValue('RESUMO GERAL DE DEMANDAS');
  abaResumo.getRange(1, 1).setFontSize(14).setFontWeight('bold');
  
  // Data da última atualização
  abaResumo.getRange(2, 1).setValue('Última atualização: ' + Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm'));
  abaResumo.getRange(2, 1).setFontColor('#666666');
  
  // Totais
  abaResumo.getRange(4, 1).setValue('Status');
  abaResumo.getRange(4, 2).setValue('Quantidade');
  abaResumo.getRange(4, 3).setValue('Média de Dias');
  abaResumo.getRange(4, 1, 1, 3).setFontWeight('bold').setBackground('#1A2B6B').setFontColor('#FFFFFF');
  
  abaResumo.getRange(5, 1).setValue('Total de Demandas');
  abaResumo.getRange(5, 2).setValue(totalDemandas);
  abaResumo.getRange(5, 3).setValue('-');
  
  abaResumo.getRange(6, 1).setValue('Entregues');
  abaResumo.getRange(6, 2).setValue(totalEntregues);
  abaResumo.getRange(6, 3).setValue(mediaEntregues + ' dias');
  abaResumo.getRange(6, 1, 1, 3).setBackground('#ECFDF5');
  
  abaResumo.getRange(7, 1).setValue('Em Aberto');
  abaResumo.getRange(7, 2).setValue(totalAberto);
  abaResumo.getRange(7, 3).setValue(mediaAberto + ' dias');
  abaResumo.getRange(7, 1, 1, 3).setBackground('#FFFBEB');
  
  // Ajustar largura das colunas
  abaResumo.autoResizeColumns(1, 3);
}

/**
 * Converte string de data em objeto Date
 * Aceita formatos: dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd
 */
function parseData(str) {
  if (!str) return null;
  str = String(str).trim();
  
  // dd/mm/yyyy ou dd-mm-yyyy
  var match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
  }
  
  // yyyy-mm-dd
  var match2 = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (match2) {
    return new Date(parseInt(match2[1]), parseInt(match2[2]) - 1, parseInt(match2[3]));
  }
  
  // Tentar parse nativo
  var d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  
  return null;
}

/**
 * Formata Date para dd/mm/yyyy
 */
function formatarData(date) {
  if (!date || isNaN(date.getTime())) return '';
  var dd = ('0' + date.getDate()).slice(-2);
  var mm = ('0' + (date.getMonth() + 1)).slice(-2);
  var yyyy = date.getFullYear();
  return dd + '/' + mm + '/' + yyyy;
}

/**
 * Calcula diferença em dias entre duas datas
 */
function calcularDias(dataInicio, dataFim) {
  if (!dataInicio || !dataFim) return 0;
  if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) return 0;
  
  var diff = dataFim.getTime() - dataInicio.getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}


/**
 * Atualiza campos Setor e Prioridade na aba "Em Aberto"
 * Recebe array de {ticket, setor, prioridade}
 */
function atualizarCampos(alteracoes) {
  if (!alteracoes || !alteracoes.length) return { atualizados: 0 };
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var abaAberto = ss.getSheetByName(CONFIG.ABA_ABERTO);
  if (!abaAberto) return { atualizados: 0, erro: 'Aba não encontrada' };
  
  var lastRow = abaAberto.getLastRow();
  if (lastRow < 2) return { atualizados: 0 };
  
  var tickets = abaAberto.getRange(2, 1, lastRow - 1, 1).getValues();
  var atualizados = 0;
  
  for (var i = 0; i < alteracoes.length; i++) {
    var alt = alteracoes[i];
    var ticket = String(alt.ticket).trim();
    if (!ticket) continue;
    
    // Encontrar a linha do ticket
    for (var j = 0; j < tickets.length; j++) {
      if (String(tickets[j][0]).trim() === ticket) {
        var rowNum = j + 2; // +2 porque começa na linha 2
        
        // Atualizar Setor (coluna 6)
        if (alt.setor !== undefined) {
          var setor = alt.setor === '(Sem setor)' ? '' : alt.setor;
          abaAberto.getRange(rowNum, 6).setValue(setor);
        }
        
        // Atualizar Prioridade (coluna 7)
        if (alt.prioridade !== undefined) {
          abaAberto.getRange(rowNum, 7).setValue(alt.prioridade);
        }
        
        atualizados++;
        break;
      }
    }
  }
  
  return { atualizados: atualizados, total: alteracoes.length };
}
