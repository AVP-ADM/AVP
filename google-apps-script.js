const SPREADSHEET_ID = '1_bDu-fBMSX0cOM22oVDe_nIZR-b4wVfldSmOawDcufk';

function doGet(e) {
  var action = e.parameter.action;
  var result;
  try {
    if (action === 'load') {
      result = loadData();
    } else if (action === 'loadHistory') {
      result = loadHistory();
    } else if (action === 'validateLogin') {
      result = validateLogin(e.parameter.user, e.parameter.pass);
    } else if (action === 'getTimestamp') {
      result = getLastModifiedTimestamp();
    } else if (action === 'loadTempReleases') {
      result = loadTempReleases();
    } else {
      result = { success: false, error: 'Acao nao reconhecida' };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var action = data.action;
  var result;
  try {
    if (action === 'save') {
      result = saveData(data.payload);
    } else if (action === 'saveHistory') {
      result = saveHistory(data.payload);
    } else if (action === 'init') {
      result = initializeSheet(data.payload);
    } else if (action === 'acquireLock') {
      result = acquireLock(data.user);
    } else if (action === 'releaseLock') {
      result = releaseLock(data.user);
    } else if (action === 'updateTimestamp') {
      result = updateTimestamp(data.user);
    } else if (action === 'saveTempReleases') {
      result = saveTempReleases(data.payload);
    } else {
      result = { success: false, error: 'Acao nao reconhecida' };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function formatarAbaDados(sheet, totalRows) {
  var header = sheet.getRange(1, 1, 1, 4);
  header.setFontWeight('bold');
  header.setBackground('#1a1a2e');
  header.setFontColor('#ffffff');
  header.setHorizontalAlignment('center');
  header.setFontSize(11);
  if (totalRows > 0) {
    var allData = sheet.getRange(1, 1, totalRows + 1, 4);
    allData.setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
  }
  sheet.setColumnWidth(1, 280);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 450);
  sheet.setColumnWidth(4, 180);
  sheet.setFrozenRows(1);
  if (totalRows > 0) {
    var range = sheet.getRange(1, 1, totalRows + 1, 4);
    range.createFilter();
    for (var i = 2; i <= totalRows + 1; i++) {
      if (i % 2 === 0) {
        sheet.getRange(i, 1, 1, 4).setBackground('#f8f9fa');
      } else {
        sheet.getRange(i, 1, 1, 4).setBackground('#ffffff');
      }
    }
  }
}

function formatarAbaHistorico(sheet, totalRows) {
  var header = sheet.getRange(1, 1, 1, 6);
  header.setFontWeight('bold');
  header.setBackground('#0d2137');
  header.setFontColor('#ffffff');
  header.setHorizontalAlignment('center');
  header.setFontSize(11);
  if (totalRows > 0) {
    var allData = sheet.getRange(1, 1, totalRows + 1, 6);
    allData.setBorder(true, true, true, true, true, true, '#cccccc', SpreadsheetApp.BorderStyle.SOLID);
  }
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 180);
  sheet.setColumnWidth(4, 400);
  sheet.setColumnWidth(5, 250);
  sheet.setColumnWidth(6, 250);
  sheet.setFrozenRows(1);
}

function initializeSheet(payload) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheetDados = ss.getSheetByName('Dados');
  if (!sheetDados) {
    sheetDados = ss.insertSheet('Dados');
  } else {
    sheetDados.clear();
    var existingFilter = sheetDados.getFilter();
    if (existingFilter) existingFilter.remove();
  }
  sheetDados.getRange(1, 1, 1, 4).setValues([['Categoria', 'Marca', 'Modelo', 'Ano de Aceitacao']]);
  var rows = [];
  var rawData = JSON.parse(payload);
  var cats = Object.keys(rawData);
  for (var i = 0; i < cats.length; i++) {
    var cat = cats[i];
    var brands = Object.keys(rawData[cat].brands);
    for (var j = 0; j < brands.length; j++) {
      var brand = brands[j];
      var models = rawData[cat].brands[brand];
      for (var k = 0; k < models.length; k++) {
        rows.push([cat, brand, models[k], 'Ano da categoria']);
      }
    }
  }
  if (rows.length > 0) {
    sheetDados.getRange(2, 1, rows.length, 4).setValues(rows);
  }
  formatarAbaDados(sheetDados, rows.length);
  var sheetHist = ss.getSheetByName('Historico');
  if (!sheetHist) {
    sheetHist = ss.insertSheet('Historico');
    sheetHist.getRange(1, 1, 1, 6).setValues([['Data/Hora', 'Tipo', 'Marca', 'Modelo', 'Cat. Origem', 'Cat. Destino']]);
    formatarAbaHistorico(sheetHist, 0);
  }
  return { success: true, message: 'Planilha inicializada com ' + rows.length + ' registros' };
}

function loadData() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Dados');
  if (!sheet) {
    // Fallback: read from category sheets (each sheet = one category)
    var raw = {};
    var anos = {};
    var sheets = ss.getSheets();
    var excludeNames = ['Historico', 'Usuarios', '_Control', 'Liberacoes_Temporarias'];
    for (var s = 0; s < sheets.length; s++) {
      var sheetName = sheets[s].getName();
      if (excludeNames.indexOf(sheetName) >= 0) continue;
      var catSheet = sheets[s];
      var lastRow = catSheet.getLastRow();
      if (lastRow < 3) continue;
      // Header is on row 2 (row 1 is blank in this format)
      var header = catSheet.getRange(2, 1, 1, 3).getValues()[0];
      // Check if it looks like a category sheet (Marca | Modelo | Ano)
      var h0 = (header[0] || '').toString().toLowerCase();
      var h1 = (header[1] || '').toString().toLowerCase();
      if (h0.indexOf('marca') < 0 && h1.indexOf('modelo') < 0) continue;
      var values = catSheet.getRange(3, 1, lastRow - 2, 3).getValues();
      var cat = sheetName;
      if (!raw[cat]) raw[cat] = { total: 0, brands: {} };
      for (var i = 0; i < values.length; i++) {
        var brand = values[i][0];
        var modelo = values[i][1];
        var ano = values[i][2] || 'Ano da categoria';
        if (!brand || !modelo) continue;
        if (!raw[cat].brands[brand]) raw[cat].brands[brand] = [];
        raw[cat].brands[brand].push(modelo);
        raw[cat].total++;
        var key = cat + '|||' + brand + '|||' + modelo;
        anos[key] = ano;
      }
    }
    if (Object.keys(raw).length > 0) {
      return { success: true, data: raw, anos: anos };
    }
    return { success: true, data: {}, anos: {} };
  }
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { success: true, data: {}, anos: {} };
  }
  var values = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  var raw = {};
  var anos = {};
  for (var i = 0; i < values.length; i++) {
    var cat = values[i][0];
    var brand = values[i][1];
    var modelo = values[i][2];
    var ano = values[i][3] || 'Ano da categoria';
    if (!cat || !brand || !modelo) continue;
    if (!raw[cat]) raw[cat] = { total: 0, brands: {} };
    if (!raw[cat].brands[brand]) raw[cat].brands[brand] = [];
    raw[cat].brands[brand].push(modelo);
    raw[cat].total++;
    var key = cat + '|||' + brand + '|||' + modelo;
    anos[key] = ano;
  }
  return { success: true, data: raw, anos: anos };
}

function saveData(payload) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var rawData = JSON.parse(payload);
  var cats = Object.keys(rawData);
  
  // Check if using category-based sheets (no "Dados" sheet or has category sheets)
  var hasCategorySheets = false;
  var excludeNames = ['Historico', 'Usuarios', '_Control', 'Dados', 'Liberacoes_Temporarias'];
  var sheets = ss.getSheets();
  for (var s = 0; s < sheets.length; s++) {
    var name = sheets[s].getName();
    if (excludeNames.indexOf(name) < 0 && sheets[s].getLastRow() > 2) {
      var h = sheets[s].getRange(2, 1).getValue();
      if (h && h.toString().toLowerCase().indexOf('marca') >= 0) {
        hasCategorySheets = true;
        break;
      }
    }
  }
  
  if (hasCategorySheets) {
    // Save to category-based sheets (one sheet per category)
    // Also delete "Dados" sheet if it exists (not needed in category mode)
    var dadosSheet = ss.getSheetByName('Dados');
    if (dadosSheet) { try{ ss.deleteSheet(dadosSheet); }catch(e){} }
    for (var i = 0; i < cats.length; i++) {
      var cat = cats[i];
      var sheet = ss.getSheetByName(cat);
      if (!sheet) {
        sheet = ss.insertSheet(cat);
      } else {
        // Preserve history columns (E, F, G) if they exist
        var lastCol = sheet.getLastColumn();
        var historyData = null;
        if (lastCol >= 5) {
          var lastRow = sheet.getLastRow();
          if (lastRow > 0) {
            historyData = sheet.getRange(1, 5, lastRow, lastCol - 4).getValues();
          }
        }
        // Clear data columns (A-C) only
        var lastRow = sheet.getLastRow();
        if (lastRow > 0) {
          sheet.getRange(1, 1, lastRow, 4).clear();
        }
        // Restore history if it existed
        if (historyData && historyData.length > 0) {
          sheet.getRange(1, 5, historyData.length, historyData[0].length).setValues(historyData);
        }
      }
      // Write header on row 2 (row 1 blank)
      sheet.getRange(2, 1, 1, 3).setValues([['Marca', 'Modelo', 'Ano de Aceitacao']]);
      // Build rows
      var rows = [];
      var brands = Object.keys(rawData[cat].brands || {});
      for (var j = 0; j < brands.length; j++) {
        var brand = brands[j];
        var models = rawData[cat].brands[brand];
        for (var k = 0; k < models.length; k++) {
          rows.push([brand, models[k], 'Ano da categoria']);
        }
      }
      if (rows.length > 0) {
        sheet.getRange(3, 1, rows.length, 3).setValues(rows);
      }
      // Format header
      var header = sheet.getRange(2, 1, 1, 3);
      header.setFontWeight('bold');
      header.setBackground('#1a1a2e');
      header.setFontColor('#ffffff');
      header.setHorizontalAlignment('center');
    }
    // Remove sheets for categories that no longer exist
    var existingSheets = ss.getSheets();
    for (var s = 0; s < existingSheets.length; s++) {
      var name = existingSheets[s].getName();
      if (excludeNames.indexOf(name) < 0 && cats.indexOf(name) < 0) {
        // Check if it's a category sheet before deleting
        if (existingSheets[s].getLastRow() > 1) {
          var h = existingSheets[s].getRange(2, 1).getValue();
          if (h && h.toString().toLowerCase().indexOf('marca') >= 0) {
            ss.deleteSheet(existingSheets[s]);
          }
        }
      }
    }
    return { success: true, message: cats.length + ' categorias salvas' };
  }
  
  // Fallback: save to single "Dados" sheet
  var sheet = ss.getSheetByName('Dados');
  if (!sheet) {
    sheet = ss.insertSheet('Dados');
  }
  var existingYears = {};
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var oldValues = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    for (var i = 0; i < oldValues.length; i++) {
      var key = oldValues[i][0] + '|||' + oldValues[i][1] + '|||' + oldValues[i][2];
      existingYears[key] = oldValues[i][3] || 'Ano da categoria';
    }
  }
  sheet.clear();
  var existingFilter = sheet.getFilter();
  if (existingFilter) existingFilter.remove();
  sheet.getRange(1, 1, 1, 4).setValues([['Categoria', 'Marca', 'Modelo', 'Ano de Aceitacao']]);
  var rows = [];
  for (var i = 0; i < cats.length; i++) {
    var cat = cats[i];
    var brands = Object.keys(rawData[cat].brands);
    for (var j = 0; j < brands.length; j++) {
      var brand = brands[j];
      var models = rawData[cat].brands[brand];
      for (var k = 0; k < models.length; k++) {
        var key = cat + '|||' + brand + '|||' + models[k];
        var ano = existingYears[key] || 'Ano da categoria';
        rows.push([cat, brand, models[k], ano]);
      }
    }
  }
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 4).setValues(rows);
  }
  formatarAbaDados(sheet, rows.length);
  return { success: true, message: rows.length + ' registros salvos' };
}

function loadHistory() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Historico');
  if (!sheet) {
    return { success: true, data: [] };
  }
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { success: true, data: [] };
  }
  var values = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  var history = [];
  for (var i = 0; i < values.length; i++) {
    history.push({
      timestamp: values[i][0],
      type: values[i][1],
      marca: values[i][2],
      modelo: values[i][3],
      catFrom: values[i][4] || null,
      catTo: values[i][5] || null
    });
  }
  return { success: true, data: history };
}

function saveHistory(payload) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Historico');
  if (!sheet) {
    sheet = ss.insertSheet('Historico');
    sheet.getRange(1, 1, 1, 6).setValues([['Data/Hora', 'Tipo', 'Marca', 'Modelo', 'Cat. Origem', 'Cat. Destino']]);
    formatarAbaHistorico(sheet, 0);
  }
  var entries = JSON.parse(payload);
  if (entries.length === 0) return { success: true, message: 'Nenhum registro para salvar' };
  var rows = [];
  for (var i = 0; i < entries.length; i++) {
    rows.push([entries[i].timestamp, entries[i].type, entries[i].marca, entries[i].modelo, entries[i].catFrom || '', entries[i].catTo || '']);
  }
  // Insert at row 2 (after header) so most recent are first
  sheet.insertRowsAfter(1, rows.length);
  sheet.getRange(2, 1, rows.length, 6).setValues(rows);
  formatarAbaHistorico(sheet, sheet.getLastRow() - 1);
  
  // Also save to category-specific history (columns E, F, G of category sheet)
  var excludeNames = ['Historico', 'Usuarios', '_Control', 'Dados', 'Liberacoes_Temporarias'];
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var catNames = [];
    if (e.catFrom) catNames.push(e.catFrom);
    if (e.catTo && e.catTo !== e.catFrom) catNames.push(e.catTo);
    for (var c = 0; c < catNames.length; c++) {
      var catSheet = ss.getSheetByName(catNames[c]);
      if (!catSheet) continue;
      if (excludeNames.indexOf(catNames[c]) >= 0) continue;
      // Find next empty row in history columns (E, F, G)
      // Row 1: "HISTÓRICO DA CATEGORIA" header (merged)
      // Row 2: sub-headers (Data/Hora | Tipo | Detalhe)
      // Row 3+: history entries
      var histCol = 5; // Column E
      var lastHistRow = 2; // Start after sub-headers
      var histValues = catSheet.getRange(3, histCol, Math.max(1, catSheet.getLastRow() - 2), 1).getValues();
      for (var h = 0; h < histValues.length; h++) {
        if (histValues[h][0]) lastHistRow = h + 3;
      }
      var newRow = lastHistRow + 1;
      // Check if header exists
      var headerCheck = catSheet.getRange(1, 5).getValue();
      if (!headerCheck) {
        catSheet.getRange(1, 5).setValue('HISTÓRICO DA CATEGORIA');
        catSheet.getRange(1, 5).setFontWeight('bold').setBackground('#0d2137').setFontColor('#ffffff').setHorizontalAlignment('center');
        catSheet.getRange(2, 5, 1, 3).setValues([['Data/Hora', 'Tipo', 'Detalhe']]);
        catSheet.getRange(2, 5, 1, 3).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff').setHorizontalAlignment('center');
        newRow = 3;
      }
      var detalhe = (e.marca || '') + ' | ' + (e.modelo || '') + ' | ' + (e.type || '');
      catSheet.getRange(newRow, 5, 1, 3).setValues([[e.timestamp || '', e.type || '', detalhe]]);
    }
  }
  
  return { success: true, message: rows.length + ' registros de historico salvos' };
}



// ========= LOGIN VALIDATION =========
function validateLogin(user, pass) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Usuarios');
  if (!sheet) {
    // Create Usuarios sheet with default admin user
    sheet = ss.insertSheet('Usuarios');
    sheet.getRange(1, 1, 1, 3).setValues([['Usuario', 'Senha', 'Perfil']]);
    sheet.getRange(2, 1, 1, 3).setValues([['admin', 'admin123', 'Administrador']]);
    // Format header
    var header = sheet.getRange(1, 1, 1, 3);
    header.setFontWeight('bold');
    header.setBackground('#1a1a2e');
    header.setFontColor('#ffffff');
    sheet.hideSheet();
  }
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { success: true, valid: false };
  }
  var values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === user && values[i][1] === pass) {
      return { success: true, valid: true, perfil: values[i][2] || 'Usuario' };
    }
  }
  return { success: true, valid: false };
}



// ========= CONCURRENCY CONTROL =========
function getControlSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('_Control');
  if (!sheet) {
    sheet = ss.insertSheet('_Control');
    sheet.getRange(1, 1, 1, 4).setValues([['Key', 'Value', 'User', 'Date']]);
    sheet.getRange(2, 1, 2, 4).setValues([
      ['lock', '', '', ''],
      ['lastModified', '', '', '']
    ]);
    sheet.hideSheet();
  }
  return sheet;
}

function acquireLock(user) {
  var sheet = getControlSheet();
  var lockCell = sheet.getRange(2, 2);
  var lockUser = sheet.getRange(2, 3);
  var lockDate = sheet.getRange(2, 4);
  var currentLock = lockCell.getValue();
  var currentUser = lockUser.getValue();
  var currentDate = lockDate.getValue();
  
  // Check if lock exists and is recent (within 30 seconds)
  if (currentLock && currentDate) {
    var lockTime = new Date(currentDate).getTime();
    var now = new Date().getTime();
    if (now - lockTime < 30000 && currentUser !== user) {
      return { success: false, lockedBy: currentUser };
    }
  }
  
  // Acquire lock
  lockCell.setValue('locked');
  lockUser.setValue(user);
  lockDate.setValue(new Date().toISOString());
  return { success: true };
}

function releaseLock(user) {
  var sheet = getControlSheet();
  sheet.getRange(2, 2).setValue('');
  sheet.getRange(2, 3).setValue('');
  sheet.getRange(2, 4).setValue('');
  return { success: true };
}

function getLastModifiedTimestamp() {
  var sheet = getControlSheet();
  var ts = sheet.getRange(3, 2).getValue();
  var user = sheet.getRange(3, 3).getValue();
  var date = sheet.getRange(3, 4).getValue();
  return { 
    success: true, 
    timestamp: ts ? new Date(ts).getTime() : 0,
    lastUser: user || '',
    lastDate: date || ''
  };
}

function updateTimestamp(user) {
  var sheet = getControlSheet();
  var now = new Date();
  sheet.getRange(3, 2).setValue(now.toISOString());
  sheet.getRange(3, 3).setValue(user);
  sheet.getRange(3, 4).setValue(now.toLocaleString('pt-BR'));
  return { success: true };
}


// ========= TEMPORARY RELEASES =========
function loadTempReleases() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Liberacoes_Temporarias');
  if (!sheet) {
    return { success: true, data: [] };
  }
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { success: true, data: [] };
  }
  var values = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
  var releases = [];
  for (var i = 0; i < values.length; i++) {
    releases.push({
      marca: values[i][0],
      modelo: values[i][1],
      categoria: values[i][2],
      motivo: values[i][3],
      dataCriacao: values[i][4],
      usuario: values[i][5],
      status: values[i][6] || 'Ativa',
      dataFinalizada: values[i][7] || '',
      usuarioFinalizado: values[i][8] || ''
    });
  }
  return { success: true, data: releases };
}

function saveTempReleases(payload) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Liberacoes_Temporarias');
  if (!sheet) {
    sheet = ss.insertSheet('Liberacoes_Temporarias');
  } else {
    sheet.clear();
  }
  sheet.getRange(1, 1, 1, 9).setValues([['Marca', 'Modelo', 'Categoria', 'Motivo', 'Data Criação', 'Usuário', 'Status', 'Data Finalização', 'Usuário Finalização']]);
  // Format header
  var header = sheet.getRange(1, 1, 1, 9);
  header.setFontWeight('bold');
  header.setBackground('#78350f');
  header.setFontColor('#ffffff');
  header.setHorizontalAlignment('center');
  
  var entries = JSON.parse(payload);
  if (entries.length === 0) return { success: true, message: 'Nenhuma liberação' };
  var rows = [];
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    rows.push([e.marca, e.modelo, e.categoria, e.motivo, e.dataCriacao, e.usuario, e.status, e.dataFinalizada || '', e.usuarioFinalizado || '']);
  }
  sheet.getRange(2, 1, rows.length, 9).setValues(rows);
  return { success: true, message: rows.length + ' liberações salvas' };
}
