const SPREADSHEET_ID = '1_bDu-fBMSX0cOM22oVDe_nIZR-b4wVfldSmOawDcufk';

function doGet(e) {
  var action = e.parameter.action;
  var result;
  try {
    if (action === 'load') {
      result = loadData();
    } else if (action === 'loadHistory') {
      result = loadHistory();
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
    return { success: false, error: 'Aba Dados nao encontrada. Inicialize primeiro.' };
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
  var rawData = JSON.parse(payload);
  var rows = [];
  var cats = Object.keys(rawData);
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
  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, rows.length, 6).setValues(rows);
  formatarAbaHistorico(sheet, sheet.getLastRow() - 1);
  return { success: true, message: rows.length + ' registros de historico salvos' };
}
