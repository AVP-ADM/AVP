/* ====== RASTREADORES MODULE ====== */
/* Lê dados de BI_DATA (variável global preenchida pelo BI Associados) */

var RAST_PRESTADORES = [];
var RAST_REGRAS_RISCO = [];
var RAST_CITIES = [];
var RAST_MAP = null;
var RAST_MAP_MARKERS = [];


/* ====== CLASSIFICAÇÃO DE TIPO DE VEÍCULO ====== */
var RAST_MOTO_KEYWORDS = ['motocicleta','moto','honda','yamaha','shineray','avelloz','bajaj','elite 125','fluo 125','neo','pcx','nmax','adv','xmax'];
var RAST_CAMINHAO_KEYWORDS = ['truck','caminhao','caminhão','carreta','agregado'];

function rastClassifyTipo(categoria) {
  if (!categoria) return 'nao_classificado';
  var c = categoria.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  for (var i = 0; i < RAST_MOTO_KEYWORDS.length; i++) {
    if (c.indexOf(RAST_MOTO_KEYWORDS[i]) >= 0) return 'moto';
  }
  for (var i = 0; i < RAST_CAMINHAO_KEYWORDS.length; i++) {
    if (c.indexOf(RAST_CAMINHAO_KEYWORDS[i]) >= 0) return 'caminhao';
  }
  if (c.indexOf('automovel') >= 0 || c.indexOf('passeio') >= 0 || c.indexOf('suv') >= 0 ||
      c.indexOf('caminhonete') >= 0 || c.indexOf('utilitario') >= 0 || c.indexOf('eletrico') >= 0 ||
      c.indexOf('hibrido') >= 0 || c.indexOf('importado') >= 0 || c.indexOf('nacional') >= 0 ||
      c.indexOf('premium') >= 0 || c.indexOf('start') >= 0 || c.indexOf('atividade remunerada (suv') >= 0 ||
      c.indexOf('atividade remunerada (veiculo') >= 0) return 'carro';
  return 'nao_classificado';
}


/* ====== PROCESSAMENTO DOS DADOS ====== */
function rastIsOperacional(situacao) {
  var s = (situacao || '').toLowerCase();
  return s === 'ativo' || s === 'suspenso' || s === 'novo';
}

function rastHasTracker(r) { return r.rastreador === 1; }

function rastGetAssociados() {
  if (!BI_DATA || BI_DATA.length === 0) return [];
  return BI_DATA.map(function(r) {
    var tipo = rastClassifyTipo(r.categoria);
    var operacional = rastIsOperacional(r.situacao);
    return {
      nome: r.nome, placa: r.placa, cidade: r.cidade || '', uf: r.uf || '',
      situacao: r.situacao, categoria: r.categoria, tipo: tipo,
      temRastreador: rastHasTracker(r), operacional: operacional,
      numeroRastreador: r.numero_rastreador || '', valorFipe: r.valor_fipe,
      consultor: r.consultor, plano: r.plano
    };
  });
}

function rastComputeGlobal(assocs, filtroTipo) {
  var m = {total:0,operacionais:0,comRastreador:0,semRastreador:0,cobertura:0,
    canceladosComRastreador:0,motos:0,carros:0,caminhoes:0,naoClass:0,ativos:0,suspensos:0,cancelados:0};
  for (var i = 0; i < assocs.length; i++) {
    var a = assocs[i];
    if (filtroTipo !== 'todos' && a.tipo !== filtroTipo) continue;
    m.total++;
    if (a.situacao === 'Ativo') m.ativos++;
    else if (a.situacao === 'Suspenso') m.suspensos++;
    else if (a.situacao === 'Cancelado') m.cancelados++;
    if (a.operacional) {
      m.operacionais++;
      if (a.temRastreador) m.comRastreador++;
      else m.semRastreador++;
    } else if ((a.situacao||'').toLowerCase() === 'cancelado' && a.temRastreador) {
      m.canceladosComRastreador++;
    }
    if (a.tipo === 'moto') m.motos++;
    else if (a.tipo === 'carro') m.carros++;
    else if (a.tipo === 'caminhao') m.caminhoes++;
    else m.naoClass++;
  }
  m.cobertura = m.operacionais > 0 ? m.comRastreador / m.operacionais : 0;
  return m;
}


function rastComputeCities(assocs, filtroTipo) {
  var map = {};
  for (var i = 0; i < assocs.length; i++) {
    var a = assocs[i];
    if (filtroTipo !== 'todos' && a.tipo !== filtroTipo) continue;
    if (!a.cidade) continue;
    var key = (a.cidade + '__' + a.uf).toLowerCase();
    if (!map[key]) map[key] = {cidade:a.cidade,uf:a.uf,chave:key,total:0,operacionais:0,
      comRastreador:0,semRastreador:0,cobertura:0,canceladosComRastreador:0,
      motos:0,carros:0,caminhoes:0,score:0,prioridade:'baixo'};
    var c = map[key];
    c.total++;
    if (a.operacional) {
      c.operacionais++;
      if (a.temRastreador) c.comRastreador++;
      else c.semRastreador++;
      if (a.tipo === 'moto') c.motos++;
      else if (a.tipo === 'carro') c.carros++;
      else if (a.tipo === 'caminhao') c.caminhoes++;
    } else if ((a.situacao||'').toLowerCase() === 'cancelado' && a.temRastreador) {
      c.canceladosComRastreador++;
    }
  }
  var list = Object.values(map);
  // Compute cobertura
  for (var i = 0; i < list.length; i++) {
    list[i].cobertura = list[i].operacionais > 0 ? list[i].comRastreador / list[i].operacionais : 0;
  }
  // Compute prioridade based on semRastreador count
  for (var i = 0; i < list.length; i++) {
    var sr = list[i].semRastreador;
    if (sr > 500) { list[i].prioridade = 'critico'; list[i].score = 90; }
    else if (sr >= 200) { list[i].prioridade = 'alto'; list[i].score = 70; }
    else if (sr >= 50) { list[i].prioridade = 'medio'; list[i].score = 45; }
    else { list[i].prioridade = 'baixo'; list[i].score = 20; }
  }
  list.sort(function(a,b) { return b.semRastreador - a.semRastreador; });
  return list;
}


/* ====== REFRESH ALL RASTREADORES VIEWS ====== */
function rastRefreshAll() {
  var assocs = rastGetAssociados();
  var filtroTipo = (document.getElementById('rastFiltroTipo') || {}).value || 'todos';
  if (assocs.length === 0) {
    // Check if BI is currently loading (BI_LOADING flag or biEmpty shows spinner)
    var biLoading = (typeof BI_LOADING !== 'undefined' && BI_LOADING);
    var biEmptyEl = document.getElementById('biEmpty');
    var isLoadingFromCache = biEmptyEl && biEmptyEl.style.display !== 'none' && biEmptyEl.innerHTML.indexOf('spin') >= 0;

    if (biLoading || isLoadingFromCache) {
      // Show loading state
      var loadingHtml = '<div class="bi-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="animation:spin 1s linear infinite;width:48px;height:48px;margin-bottom:12px;opacity:.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg><p style="color:var(--text2)">Carregando base do servidor...</p><p style="font-size:.72rem;color:var(--text3);margin-top:4px">Aguarde, os dados aparecerão automaticamente</p></div>';
      ['rastVisaoNodata','rastPriorNodata','rastMapaNodata','rastQualNodata'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.style.display = 'flex'; el.innerHTML = loadingHtml; }
      });
    } else {
      // Show "carregue a base" state
      var nodataHtml = '<div class="bi-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;margin-bottom:12px;opacity:.4"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4"/></svg><p>Carregue a base no <strong>BI Associados</strong> primeiro.</p><button class="btn btn-green" onclick="goPanel(\'bi-base\')" style="margin-top:12px">Ir para BI Associados</button></div>';
      ['rastVisaoNodata','rastPriorNodata','rastMapaNodata','rastQualNodata'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.style.display = 'flex'; el.innerHTML = nodataHtml; }
      });
    }
    document.getElementById('rastVisaoContent').style.display = 'none';
    document.getElementById('rastPriorContent').style.display = 'none';
    document.getElementById('rastMapaContent').style.display = 'none';
    document.getElementById('rastQualContent').style.display = 'none';
    return;
  }
  document.getElementById('rastVisaoNodata').style.display = 'none';
  document.getElementById('rastVisaoContent').style.display = 'block';
  document.getElementById('rastPriorNodata').style.display = 'none';
  document.getElementById('rastPriorContent').style.display = 'block';
  document.getElementById('rastMapaNodata').style.display = 'none';
  document.getElementById('rastMapaContent').style.display = 'block';
  document.getElementById('rastQualNodata').style.display = 'none';
  document.getElementById('rastQualContent').style.display = 'block';

  var metrics = rastComputeGlobal(assocs, filtroTipo);
  RAST_CITIES = rastComputeCities(assocs, filtroTipo);
  rastRenderVisao(metrics);
  rastRenderPriorizacao();
  rastRenderQualidade(assocs);
}


/* ====== VISÃO GERAL ====== */
function rastRenderVisao(m) {
  var html = '';
  html += '<div class="bi-kpi bi-blue"><div class="bi-kpi-val">' + biFormatNum(m.operacionais) + '</div><div class="bi-kpi-label">Operacionais</div><div class="bi-kpi-pct">Ativo + Suspenso + Novo</div></div>';
  html += '<div class="bi-kpi bi-green"><div class="bi-kpi-val">' + biFormatNum(m.comRastreador) + '</div><div class="bi-kpi-label">Com Rastreador</div><div class="bi-kpi-pct">' + (m.cobertura * 100).toFixed(1) + '% cobertura</div></div>';
  html += '<div class="bi-kpi bi-red"><div class="bi-kpi-val">' + biFormatNum(m.semRastreador) + '</div><div class="bi-kpi-label">Sem Rastreador</div><div class="bi-kpi-pct">' + (m.operacionais > 0 ? ((m.semRastreador/m.operacionais)*100).toFixed(1) : '0') + '% descobertos</div></div>';
  html += '<div class="bi-kpi bi-amber"><div class="bi-kpi-val">' + biFormatNum(m.canceladosComRastreador) + '</div><div class="bi-kpi-label">Cancelados c/ Rastr.</div><div class="bi-kpi-pct">Recuperar equipamento</div></div>';
  html += '<div class="bi-kpi bi-purple"><div class="bi-kpi-val">' + biFormatNum(m.motos) + '</div><div class="bi-kpi-label">Motos</div></div>';
  html += '<div class="bi-kpi" style="border-left:3px solid var(--blue)"><div class="bi-kpi-val" style="color:var(--blue)">' + biFormatNum(m.carros) + '</div><div class="bi-kpi-label">Carros</div></div>';
  html += '<div class="bi-kpi" style="border-left:3px solid #06b6d4"><div class="bi-kpi-val" style="color:#06b6d4">' + biFormatNum(m.caminhoes) + '</div><div class="bi-kpi-label">Caminhões</div></div>';
  html += '<div class="bi-kpi" style="border-left:3px solid var(--text3)"><div class="bi-kpi-val" style="color:var(--text3)">' + biFormatNum(m.naoClass) + '</div><div class="bi-kpi-label">Não Classif.</div></div>';
  document.getElementById('rastKpis').innerHTML = html;

  // Chart: cobertura por tipo
  rastRenderChartTipo();
  // Chart: top cidades sem rastreador
  rastRenderChartCidades();
  // Chart: distribuição por prioridade
  rastRenderChartPrioridade();
  // Chart: cancelados com rastreador
  rastRenderChartRecuperar();
}


function rastRenderChartTipo() {
  var assocs = rastGetAssociados();
  var tipos = {moto:{op:0,rastr:0},carro:{op:0,rastr:0},caminhao:{op:0,rastr:0}};
  for (var i = 0; i < assocs.length; i++) {
    var a = assocs[i];
    if (!a.operacional) continue;
    if (tipos[a.tipo]) { tipos[a.tipo].op++; if (a.temRastreador) tipos[a.tipo].rastr++; }
  }
  var html = '';
  var labels = {moto:'Motos',carro:'Carros',caminhao:'Caminhões'};
  var colors = {moto:'fill-purple',carro:'fill-blue',caminhao:'fill-amber'};
  ['moto','carro','caminhao'].forEach(function(t) {
    var pct = tipos[t].op > 0 ? Math.round((tipos[t].rastr/tipos[t].op)*100) : 0;
    html += '<div class="bi-bar-row"><span class="bi-bar-label">' + labels[t] + '</span>';
    html += '<div class="bi-bar-track"><div class="bi-bar-fill ' + colors[t] + '" style="width:' + pct + '%"></div></div>';
    html += '<span class="bi-bar-value">' + pct + '% (' + biFormatNum(tipos[t].rastr) + '/' + biFormatNum(tipos[t].op) + ')</span></div>';
  });
  document.getElementById('rastChartTipo').innerHTML = html;
}

function rastRenderChartCidades() {
  var top10 = RAST_CITIES.slice(0, 10);
  var maxVal = top10.length > 0 ? top10[0].semRastreador : 1;
  var html = '';
  for (var i = 0; i < top10.length; i++) {
    var c = top10[i];
    var pct = Math.round((c.semRastreador / maxVal) * 100);
    var color = c.prioridade === 'critico' ? 'fill-red' : c.prioridade === 'alto' ? 'fill-amber' : 'fill-blue';
    html += '<div class="bi-bar-row"><span class="bi-bar-label">' + c.cidade + ' - ' + c.uf + '</span>';
    html += '<div class="bi-bar-track"><div class="bi-bar-fill ' + color + '" style="width:' + pct + '%"></div></div>';
    html += '<span class="bi-bar-value">' + biFormatNum(c.semRastreador) + '</span></div>';
  }
  document.getElementById('rastChartCidades').innerHTML = html || '<p style="font-size:.72rem;color:var(--text3)">Sem dados</p>';
}


function rastRenderChartPrioridade() {
  var counts = {critico:0,alto:0,medio:0,baixo:0};
  for (var i = 0; i < RAST_CITIES.length; i++) counts[RAST_CITIES[i].prioridade]++;
  var html = '<div style="display:flex;gap:12px;flex-wrap:wrap;padding:10px 0">';
  var labels = {critico:'Crítica (>500)',alto:'Alta (200-500)',medio:'Média (50-200)',baixo:'Baixa (<50)'};
  var colors = {critico:'var(--red)',alto:'var(--amber)',medio:'var(--blue)',baixo:'var(--green)'};
  ['critico','alto','medio','baixo'].forEach(function(p) {
    html += '<div style="flex:1;min-width:80px;text-align:center;padding:12px;border-radius:var(--radius);background:var(--surface-2)">';
    html += '<div style="font-size:1.4rem;font-weight:800;color:' + colors[p] + '">' + counts[p] + '</div>';
    html += '<div style="font-size:.62rem;font-weight:600;color:var(--text3);text-transform:uppercase">' + labels[p] + '</div>';
    html += '</div>';
  });
  html += '</div>';
  document.getElementById('rastChartPrioridade').innerHTML = html;
}

function rastRenderChartRecuperar() {
  var assocs = rastGetAssociados();
  var cidades = {};
  for (var i = 0; i < assocs.length; i++) {
    var a = assocs[i];
    if ((a.situacao||'').toLowerCase() !== 'cancelado' || !a.temRastreador) continue;
    var key = a.cidade || 'N/D';
    cidades[key] = (cidades[key] || 0) + 1;
  }
  var sorted = Object.entries(cidades).sort(function(a,b){return b[1]-a[1]}).slice(0,8);
  if (sorted.length === 0) { document.getElementById('rastChartRecuperar').innerHTML = '<p style="font-size:.72rem;color:var(--text3)">Nenhum cancelado com rastreador</p>'; return; }
  var maxVal = sorted[0][1];
  var html = '';
  for (var i = 0; i < sorted.length; i++) {
    var pct = Math.round((sorted[i][1] / maxVal) * 100);
    html += '<div class="bi-bar-row"><span class="bi-bar-label">' + sorted[i][0] + '</span>';
    html += '<div class="bi-bar-track"><div class="bi-bar-fill fill-red" style="width:' + pct + '%"></div></div>';
    html += '<span class="bi-bar-value">' + sorted[i][1] + '</span></div>';
  }
  document.getElementById('rastChartRecuperar').innerHTML = html;
}


/* ====== PRIORIZAÇÃO ====== */
function rastRenderPriorizacao() {
  var filtro = (document.getElementById('rastPriorFiltro') || {}).value || '';
  var busca = (document.getElementById('rastPriorBusca') || {}).value || '';
  busca = busca.toLowerCase();

  var filtered = RAST_CITIES.filter(function(c) {
    if (filtro && c.prioridade !== filtro) return false;
    if (busca && (c.cidade + ' ' + c.uf).toLowerCase().indexOf(busca) < 0) return false;
    return true;
  });

  // Badges
  var counts = {critico:0,alto:0,medio:0,baixo:0};
  for (var i = 0; i < RAST_CITIES.length; i++) counts[RAST_CITIES[i].prioridade]++;
  var badgesHtml = '';
  var labels = {critico:'Crítica',alto:'Alta',medio:'Média',baixo:'Baixa'};
  ['critico','alto','medio','baixo'].forEach(function(p) {
    var active = filtro === p ? ' style="box-shadow:0 0 0 2px currentColor"' : '';
    badgesHtml += '<span class="rast-badge rast-' + p + '"' + active + ' onclick="document.getElementById(\'rastPriorFiltro\').value=\'' + (filtro===p?'':p) + '\';rastRenderPriorizacao()">' + labels[p] + ': ' + counts[p] + '</span>';
  });
  document.getElementById('rastPriorBadges').innerHTML = badgesHtml;

  // Table
  var html = '';
  for (var i = 0; i < filtered.length; i++) {
    var c = filtered[i];
    var cob = (c.cobertura * 100).toFixed(1) + '%';
    html += '<tr class="row-acomp" onclick="rastToggleCityDetail(this,\'' + c.chave.replace(/'/g,"\\'") + '\')" style="cursor:pointer">';
    html += '<td class="col-pos" style="padding-left:24px;position:relative"><svg class="expand-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>' + (i+1) + '</td>';
    html += '<td class="col-gestor">' + c.cidade + '</td>';
    html += '<td class="col-sede">' + c.uf + '</td>';
    html += '<td class="col-num">' + biFormatNum(c.operacionais) + '</td>';
    html += '<td class="col-num" style="color:var(--green)">' + biFormatNum(c.comRastreador) + '</td>';
    html += '<td class="col-num" style="color:var(--red);font-weight:700">' + biFormatNum(c.semRastreador) + '</td>';
    html += '<td class="col-num">' + cob + '</td>';
    html += '<td class="col-num">' + c.score + '</td>';
    html += '<td><span class="rast-prio-dot ' + c.prioridade + '"></span> <span class="rast-nivel-tag ' + c.prioridade + '">' + labels[c.prioridade] + '</span></td>';
    html += '</tr>';
    html += '<tr class="rast-expand-row" id="rast-city-' + i + '"><td colspan="9"></td></tr>';
  }
  document.getElementById('tbodyRastPrior').innerHTML = html || '<tr><td colspan="9" style="text-align:center;color:var(--text3);padding:40px">Nenhuma cidade encontrada</td></tr>';
}


function rastToggleCityDetail(row, chave) {
  var nextRow = row.nextElementSibling;
  if (!nextRow || !nextRow.classList.contains('rast-expand-row')) return;
  var isOpen = row.classList.contains('expanded');
  if (isOpen) { row.classList.remove('expanded'); nextRow.classList.remove('visible'); return; }
  row.classList.add('expanded'); nextRow.classList.add('visible');

  var city = RAST_CITIES.find(function(c){return c.chave===chave});
  if (!city) { nextRow.querySelector('td').innerHTML = '<div class="rast-expand-inner"><p style="color:var(--text3)">Sem dados</p></div>'; return; }

  // Show individual associados for this city
  var assocs = rastGetAssociados();
  var filtroTipo = (document.getElementById('rastFiltroTipo') || {}).value || 'todos';
  var cityAssocs = assocs.filter(function(a) {
    if (filtroTipo !== 'todos' && a.tipo !== filtroTipo) return false;
    return a.operacional && !a.temRastreador && (a.cidade + '__' + a.uf).toLowerCase() === chave;
  });
  // Sort by tipo and name
  cityAssocs.sort(function(a,b) { return a.nome.localeCompare(b.nome); });

  var ehtml = '<div class="rast-expand-inner">';
  ehtml += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">';
  ehtml += '<h4 style="font-size:.8rem;font-weight:700;color:var(--accent)">' + city.cidade + ' - ' + city.uf + ' — ' + cityAssocs.length + ' sem rastreador</h4>';
  ehtml += '<div style="font-size:.68rem;color:var(--text3)">Motos: ' + city.motos + ' | Carros: ' + city.carros + ' | Caminhões: ' + city.caminhoes + '</div>';
  ehtml += '</div>';
  if (cityAssocs.length > 0) {
    var showMax = Math.min(cityAssocs.length, 50);
    ehtml += '<div style="overflow-x:auto;max-height:300px;overflow-y:auto"><table class="equipe-table"><thead><tr><th>#</th><th>Nome</th><th>Tipo</th><th>Categoria</th><th>Plano</th><th>Consultor</th></tr></thead><tbody>';
    for (var j = 0; j < showMax; j++) {
      var a = cityAssocs[j];
      var tipoLabel = a.tipo === 'moto' ? 'Moto' : a.tipo === 'carro' ? 'Carro' : a.tipo === 'caminhao' ? 'Caminhão' : 'N/C';
      ehtml += '<tr><td class="col-pos">' + (j+1) + '</td><td style="font-weight:500">' + a.nome + '</td><td>' + tipoLabel + '</td><td style="font-size:.68rem">' + (a.categoria||'-') + '</td><td>' + (a.plano||'-') + '</td><td>' + (a.consultor||'-') + '</td></tr>';
    }
    ehtml += '</tbody></table></div>';
    if (cityAssocs.length > showMax) ehtml += '<p style="font-size:.68rem;color:var(--text3);margin-top:6px">Mostrando ' + showMax + ' de ' + cityAssocs.length + '</p>';
  } else { ehtml += '<p style="color:var(--text3);font-size:.78rem">Nenhum associado sem rastreador nesta cidade.</p>'; }
  ehtml += '</div>';
  nextRow.querySelector('td').innerHTML = ehtml;
}


/* ====== MAPA (Leaflet) ====== */
var RAST_CITY_COORDS = {
  'belo horizonte':[-19.92,-43.94],'sao paulo':[-23.55,-46.63],'rio de janeiro':[-22.91,-43.17],
  'curitiba':[-25.43,-49.27],'porto alegre':[-30.03,-51.23],'brasilia':[-15.79,-47.88],
  'salvador':[-12.97,-38.51],'fortaleza':[-3.72,-38.54],'recife':[-8.05,-34.87],
  'goiania':[-16.69,-49.25],'manaus':[-3.12,-60.02],'belem':[-1.46,-48.50],
  'campinas':[-22.91,-47.06],'guarulhos':[-23.45,-46.53],'sao bernardo do campo':[-23.69,-46.56],
  'uberlandia':[-18.92,-48.28],'contagem':[-19.93,-44.05],'juiz de fora':[-21.76,-43.35],
  'betim':[-19.97,-44.20],'ribeirao preto':[-21.18,-47.81],'londrina':[-23.31,-51.16],
  'sorocaba':[-23.50,-47.46],'joinville':[-26.30,-48.84],'florianopolis':[-27.59,-48.55],
  'campo grande':[-20.44,-54.65],'osasco':[-23.53,-46.79],'santo andre':[-23.66,-46.54],
  'sao jose dos campos':[-23.18,-45.88],'natal':[-5.79,-35.21],'joao pessoa':[-7.12,-34.86],
  'maceio':[-9.67,-35.74],'teresina':[-5.09,-42.80],'sao luis':[-2.53,-44.28],
  'cuiaba':[-15.60,-56.10],'aracaju':[-10.91,-37.07],'vitoria':[-20.32,-40.34],
  'campo largo':[-25.46,-49.53],'maringa':[-23.43,-51.94],'ponta grossa':[-25.09,-50.16],
  'cascavel':[-24.96,-53.46],'foz do iguacu':[-25.55,-54.59],
  'nova lima':[-19.99,-43.85],'ipatinga':[-19.47,-42.54],'governador valadares':[-18.85,-41.95],
  'montes claros':[-16.74,-43.86],'uberaba':[-19.75,-47.93],'divinopolis':[-20.14,-44.88],
  'sete lagoas':[-19.46,-44.25],'pocos de caldas':[-21.79,-46.56],
  'anapolis':[-16.33,-48.95],'aparecida de goiania':[-16.82,-49.24],
  'rio verde':[-17.80,-50.92],'itumbiara':[-18.42,-49.22]
};

function rastGetCityCoords(cidade, uf) {
  var key = (cidade || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
  return RAST_CITY_COORDS[key] || null;
}

function rastRenderMapa() {
  var container = document.getElementById('rastMapaContainer');
  if (!container) return;
  var metrica = (document.getElementById('rastMapaMetrica') || {}).value || 'semRastreador';

  // Init map if needed
  if (!RAST_MAP) {
    RAST_MAP = L.map(container).setView([-15.8, -47.9], 4);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 18
    }).addTo(RAST_MAP);
  }

  // Clear markers
  for (var i = 0; i < RAST_MAP_MARKERS.length; i++) RAST_MAP.removeLayer(RAST_MAP_MARKERS[i]);
  RAST_MAP_MARKERS = [];

  // Add bubbles for cities
  for (var i = 0; i < RAST_CITIES.length; i++) {
    var c = RAST_CITIES[i];
    var coords = rastGetCityCoords(c.cidade, c.uf);
    if (!coords) continue;
    var val, radius, color;
    if (metrica === 'semRastreador') { val = c.semRastreador; radius = Math.max(5, Math.min(40, Math.sqrt(val) * 1.5)); }
    else if (metrica === 'operacionais') { val = c.operacionais; radius = Math.max(5, Math.min(40, Math.sqrt(val) * 1.2)); }
    else if (metrica === 'cobertura') { val = c.cobertura; radius = Math.max(8, 25); }
    else { val = c.score; radius = Math.max(5, Math.min(35, val / 3)); }

    if (c.prioridade === 'critico') color = '#DC2626';
    else if (c.prioridade === 'alto') color = '#D97706';
    else if (c.prioridade === 'medio') color = '#2563EB';
    else color = '#16A34A';

    var valLabel = metrica === 'cobertura' ? (val * 100).toFixed(0) + '%' : biFormatNum(val);
    var marker = L.circleMarker(coords, {
      radius: radius, fillColor: color, color: color, weight: 1, opacity: 0.8, fillOpacity: 0.4
    }).addTo(RAST_MAP);
    marker.bindPopup('<b>' + c.cidade + ' - ' + c.uf + '</b><br>Operacionais: ' + biFormatNum(c.operacionais) + '<br>Com Rastr.: ' + biFormatNum(c.comRastreador) + '<br>Sem Rastr.: ' + biFormatNum(c.semRastreador) + '<br>Cobertura: ' + (c.cobertura*100).toFixed(1) + '%<br>Prioridade: ' + c.prioridade.charAt(0).toUpperCase() + c.prioridade.slice(1));
    RAST_MAP_MARKERS.push(marker);
  }

  // Legend
  var legendHtml = '<span><span class="rast-prio-dot critico"></span> Crítica</span>';
  legendHtml += '<span><span class="rast-prio-dot alto"></span> Alta</span>';
  legendHtml += '<span><span class="rast-prio-dot medio"></span> Média</span>';
  legendHtml += '<span><span class="rast-prio-dot baixo"></span> Baixa</span>';
  legendHtml += '<span style="margin-left:auto">Tamanho = ' + metrica + '</span>';
  document.getElementById('rastMapaLegend').innerHTML = legendHtml;
}


/* ====== PRESTADORES (CRUD Supabase) ====== */
async function rastLoadPrestadores() {
  try {
    var r = await sbFetch('rastreadores_prestadores?select=*&order=nome.asc');
    if (r.ok) { RAST_PRESTADORES = await r.json(); } else { RAST_PRESTADORES = []; }
  } catch(e) { RAST_PRESTADORES = []; }
  rastRenderPrestadores();
}

function rastRenderPrestadores() {
  var busca = (document.getElementById('rastPrestBusca') || {}).value || '';
  busca = busca.toLowerCase();
  var status = (document.getElementById('rastPrestStatus') || {}).value || '';
  var filtered = RAST_PRESTADORES.filter(function(p) {
    if (status && p.status !== status) return false;
    if (busca && (p.nome + ' ' + p.cidade + ' ' + p.uf).toLowerCase().indexOf(busca) < 0) return false;
    return true;
  });
  var html = '';
  for (var i = 0; i < filtered.length; i++) {
    var p = filtered[i];
    var tipos = (p.tipos_atendidos || []).join(', ') || '-';
    html += '<tr>';
    html += '<td class="col-pos">' + (i+1) + '</td>';
    html += '<td class="col-gestor">' + p.nome + '</td>';
    html += '<td>' + (p.cidade||'-') + '</td>';
    html += '<td>' + (p.uf||'-') + '</td>';
    html += '<td class="col-num">' + tipos + '</td>';
    html += '<td class="col-num">' + (p.raio_km||30) + '</td>';
    html += '<td class="col-num">' + (p.capacidade_mensal||'-') + '</td>';
    html += '<td><span class="rast-status-tag ' + p.status + '">' + p.status + '</span></td>';
    html += '<td class="col-actions"><button class="btn-hide" onclick="rastPrestadorEdit(\'' + p.id + '\')" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button> <button class="btn-hide" onclick="rastPrestadorDel(\'' + p.id + '\')" title="Excluir"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button></td>';
    html += '</tr>';
  }
  document.getElementById('tbodyRastPrest').innerHTML = html || '<tr><td colspan="9" style="text-align:center;color:var(--text3);padding:40px">Nenhum prestador cadastrado</td></tr>';
  document.getElementById('rastPrestInfo').textContent = filtered.length + ' prestador(es) encontrado(s)';
}

function rastPrestadorAdd() { rastPrestadorForm(null); }
function rastPrestadorEdit(id) {
  var p = RAST_PRESTADORES.find(function(x){return x.id===id});
  rastPrestadorForm(p);
}


function rastPrestadorForm(existing) {
  var isEdit = !!existing;
  var overlay = document.createElement('div');
  overlay.className = 'rast-form-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  var html = '<div class="rast-form-panel" onclick="event.stopPropagation()">';
  html += '<h3 style="font-size:1rem;font-weight:700;margin-bottom:16px">' + (isEdit ? 'Editar' : 'Novo') + ' Prestador</h3>';
  html += '<div class="rast-form-grid">';
  html += '<div class="rast-form-group full"><label>Nome</label><input id="rpfNome" value="' + (existing?existing.nome:'') + '"></div>';
  html += '<div class="rast-form-group"><label>Cidade</label><input id="rpfCidade" value="' + (existing?existing.cidade:'') + '"></div>';
  html += '<div class="rast-form-group"><label>UF</label><input id="rpfUf" value="' + (existing?existing.uf:'') + '" maxlength="2" style="text-transform:uppercase"></div>';
  html += '<div class="rast-form-group"><label>Raio (km)</label><input type="number" id="rpfRaio" value="' + (existing?existing.raio_km:30) + '"></div>';
  html += '<div class="rast-form-group"><label>Capacidade Mensal</label><input type="number" id="rpfCap" value="' + (existing&&existing.capacidade_mensal?existing.capacidade_mensal:'') + '"></div>';
  html += '<div class="rast-form-group"><label>Tipos Atendidos</label><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px"><label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:.78rem;transition:all .15s"><input type="checkbox" id="rpfTipoMoto" value="moto"' + (existing&&existing.tipos_atendidos&&existing.tipos_atendidos.indexOf('moto')>=0?' checked':'') + ' style="accent-color:var(--accent)"> Moto</label><label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:.78rem;transition:all .15s"><input type="checkbox" id="rpfTipoCarro" value="carro"' + (existing&&existing.tipos_atendidos&&existing.tipos_atendidos.indexOf('carro')>=0?' checked':'') + ' style="accent-color:var(--accent)"> Carro</label><label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:.78rem;transition:all .15s"><input type="checkbox" id="rpfTipoCaminhao" value="caminhao"' + (existing&&existing.tipos_atendidos&&existing.tipos_atendidos.indexOf('caminhao')>=0?' checked':'') + ' style="accent-color:var(--accent)"> Caminhão</label></div></div>';
  html += '<div class="rast-form-group"><label>Status</label><select id="rpfStatus"><option value="ativo"' + (existing&&existing.status==='ativo'?' selected':'') + '>Ativo</option><option value="pendente"' + (existing&&existing.status==='pendente'?' selected':'') + '>Pendente</option><option value="inativo"' + (existing&&existing.status==='inativo'?' selected':'') + '>Inativo</option></select></div>';
  html += '</div>';
  html += '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">';
  html += '<button class="btn btn-outline" onclick="this.closest(\'.rast-form-overlay\').remove()">Cancelar</button>';
  html += '<button class="btn btn-green" onclick="rastPrestadorSave(\'' + (existing?existing.id:'') + '\')">Salvar</button>';
  html += '</div></div>';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}

async function rastPrestadorSave(id) {
  var nome = document.getElementById('rpfNome').value.trim();
  if (!nome) { alert('Nome é obrigatório'); return; }
  var tipos = [];
  if (document.getElementById('rpfTipoMoto').checked) tipos.push('moto');
  if (document.getElementById('rpfTipoCarro').checked) tipos.push('carro');
  if (document.getElementById('rpfTipoCaminhao').checked) tipos.push('caminhao');
  var body = {
    nome: nome,
    cidade: document.getElementById('rpfCidade').value.trim(),
    uf: document.getElementById('rpfUf').value.trim().toUpperCase(),
    raio_km: parseInt(document.getElementById('rpfRaio').value) || 30,
    capacidade_mensal: parseInt(document.getElementById('rpfCap').value) || null,
    tipos_atendidos: tipos,
    status: document.getElementById('rpfStatus').value
  };
  try {
    if (id) {
      await sbFetch('rastreadores_prestadores?id=eq.' + id, {method:'PATCH',body:JSON.stringify(body),headers:{'Prefer':'return=minimal'}});
    } else {
      await sbFetch('rastreadores_prestadores', {method:'POST',body:JSON.stringify(body),headers:{'Prefer':'return=minimal'}});
    }
    document.querySelector('.rast-form-overlay').remove();
    await rastLoadPrestadores();
  } catch(e) { alert('Erro: ' + e.message); }
}

async function rastPrestadorDel(id) {
  if (!confirm('Excluir este prestador?')) return;
  try {
    await sbFetch('rastreadores_prestadores?id=eq.' + id, {method:'DELETE',headers:{'Prefer':'return=minimal'}});
    await rastLoadPrestadores();
  } catch(e) { alert('Erro: ' + e.message); }
}


/* ====== ÁREAS DE RISCO (CRUD Supabase) ====== */
async function rastLoadRisco() {
  try {
    var r = await sbFetch('rastreadores_areas_risco?select=*&order=nivel_risco.desc,nome.asc');
    if (r.ok) { RAST_REGRAS_RISCO = await r.json(); } else { RAST_REGRAS_RISCO = []; }
  } catch(e) { RAST_REGRAS_RISCO = []; }
  rastRenderRisco();
}

function rastRenderRisco() {
  var busca = (document.getElementById('rastRiscoBusca') || {}).value || '';
  busca = busca.toLowerCase();
  var nivel = (document.getElementById('rastRiscoNivel') || {}).value || '';
  var filtered = RAST_REGRAS_RISCO.filter(function(r) {
    if (nivel && r.nivel_risco !== nivel) return false;
    if (busca && (r.nome + ' ' + r.cidade + ' ' + r.uf).toLowerCase().indexOf(busca) < 0) return false;
    return true;
  });
  var politicaLabels = {aceita_normalmente:'Aceita normal',aceita_somente_com_rastreador:'Só c/ rastreador',aceita_com_vistoria:'C/ vistoria',nao_aceita_moto:'Não aceita moto',nao_aceita:'Não aceita'};
  var html = '';
  for (var i = 0; i < filtered.length; i++) {
    var r = filtered[i];
    html += '<tr>';
    html += '<td class="col-pos">' + (i+1) + '</td>';
    html += '<td class="col-gestor">' + (r.nome||'-') + '</td>';
    html += '<td>' + (r.cidade||'-') + '</td>';
    html += '<td>' + (r.uf||'-') + '</td>';
    html += '<td style="text-align:center"><span class="rast-nivel-tag ' + r.nivel_risco + '">' + (r.nivel_risco||'-') + '</span></td>';
    html += '<td style="font-size:.7rem">' + (politicaLabels[r.politica]||r.politica||'-') + '</td>';
    html += '<td class="col-num">' + (r.raio_km||'-') + '</td>';
    html += '<td style="font-size:.7rem">' + (r.tipo_veiculo||'todos') + '</td>';
    html += '<td><span class="rast-status-tag ' + (r.status||'ativa') + '">' + (r.status||'ativa') + '</span></td>';
    html += '<td class="col-actions"><button class="btn-hide" onclick="rastRiscoEdit(\'' + r.id + '\')" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button> <button class="btn-hide" onclick="rastRiscoDel(\'' + r.id + '\')" title="Excluir"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button></td>';
    html += '</tr>';
  }
  document.getElementById('tbodyRastRisco').innerHTML = html || '<tr><td colspan="10" style="text-align:center;color:var(--text3);padding:40px">Nenhuma área de risco cadastrada</td></tr>';
  document.getElementById('rastRiscoInfo').textContent = filtered.length + ' área(s) de risco encontrada(s)';
}

function rastRiscoAdd() { rastRiscoForm(null); }
function rastRiscoEdit(id) {
  var r = RAST_REGRAS_RISCO.find(function(x){return x.id===id});
  rastRiscoForm(r);
}


function rastRiscoForm(existing) {
  var isEdit = !!existing;
  var overlay = document.createElement('div');
  overlay.className = 'rast-form-overlay';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  var html = '<div class="rast-form-panel" onclick="event.stopPropagation()">';
  html += '<h3 style="font-size:1rem;font-weight:700;margin-bottom:16px">' + (isEdit ? 'Editar' : 'Nova') + ' Área de Risco</h3>';
  html += '<div class="rast-form-grid">';
  html += '<div class="rast-form-group full"><label>Nome</label><input id="rrfNome" value="' + (existing?existing.nome:'') + '"></div>';
  html += '<div class="rast-form-group"><label>Cidade</label><input id="rrfCidade" value="' + (existing?existing.cidade:'') + '"></div>';
  html += '<div class="rast-form-group"><label>UF</label><input id="rrfUf" value="' + (existing?existing.uf:'') + '" maxlength="2" style="text-transform:uppercase"></div>';
  html += '<div class="rast-form-group"><label>Nível de Risco</label><select id="rrfNivel"><option value="baixo"' + (existing&&existing.nivel_risco==='baixo'?' selected':'') + '>Baixo</option><option value="medio"' + (existing&&existing.nivel_risco==='medio'?' selected':'') + '>Médio</option><option value="alto"' + (existing&&existing.nivel_risco==='alto'?' selected':'') + '>Alto</option><option value="critico"' + (existing&&existing.nivel_risco==='critico'?' selected':'') + '>Crítico</option></select></div>';
  html += '<div class="rast-form-group"><label>Política</label><select id="rrfPolitica"><option value="aceita_normalmente"' + (existing&&existing.politica==='aceita_normalmente'?' selected':'') + '>Aceita normalmente</option><option value="aceita_somente_com_rastreador"' + (existing&&existing.politica==='aceita_somente_com_rastreador'?' selected':'') + '>Só com rastreador</option><option value="aceita_com_vistoria"' + (existing&&existing.politica==='aceita_com_vistoria'?' selected':'') + '>Com vistoria</option><option value="nao_aceita_moto"' + (existing&&existing.politica==='nao_aceita_moto'?' selected':'') + '>Não aceita moto</option><option value="nao_aceita"' + (existing&&existing.politica==='nao_aceita'?' selected':'') + '>Não aceita</option></select></div>';
  html += '<div class="rast-form-group"><label>Raio (km)</label><input type="number" id="rrfRaio" value="' + (existing?existing.raio_km:50) + '"></div>';
  html += '<div class="rast-form-group"><label>Tipo Veículo</label><select id="rrfTipo"><option value="todos"' + (existing&&existing.tipo_veiculo==='todos'?' selected':'') + '>Todos</option><option value="moto"' + (existing&&existing.tipo_veiculo==='moto'?' selected':'') + '>Moto</option><option value="carro"' + (existing&&existing.tipo_veiculo==='carro'?' selected':'') + '>Carro</option><option value="caminhao"' + (existing&&existing.tipo_veiculo==='caminhao'?' selected':'') + '>Caminhão</option></select></div>';
  html += '<div class="rast-form-group full"><label>Motivo</label><input id="rrfMotivo" value="' + (existing?existing.motivo||'':'') + '"></div>';
  html += '<div class="rast-form-group"><label>Status</label><select id="rrfStatus"><option value="ativa"' + (existing&&existing.status==='ativa'?' selected':'') + '>Ativa</option><option value="inativa"' + (existing&&existing.status==='inativa'?' selected':'') + '>Inativa</option></select></div>';
  html += '</div>';
  html += '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">';
  html += '<button class="btn btn-outline" onclick="this.closest(\'.rast-form-overlay\').remove()">Cancelar</button>';
  html += '<button class="btn btn-green" onclick="rastRiscoSave(\'' + (existing?existing.id:'') + '\')">Salvar</button>';
  html += '</div></div>';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
}

async function rastRiscoSave(id) {
  var nome = document.getElementById('rrfNome').value.trim();
  if (!nome) { alert('Nome é obrigatório'); return; }
  var body = {
    nome: nome,
    cidade: document.getElementById('rrfCidade').value.trim(),
    uf: document.getElementById('rrfUf').value.trim().toUpperCase(),
    nivel_risco: document.getElementById('rrfNivel').value,
    politica: document.getElementById('rrfPolitica').value,
    raio_km: parseInt(document.getElementById('rrfRaio').value) || 50,
    tipo_veiculo: document.getElementById('rrfTipo').value,
    motivo: document.getElementById('rrfMotivo').value.trim(),
    status: document.getElementById('rrfStatus').value
  };
  try {
    if (id) {
      await sbFetch('rastreadores_areas_risco?id=eq.' + id, {method:'PATCH',body:JSON.stringify(body),headers:{'Prefer':'return=minimal'}});
    } else {
      await sbFetch('rastreadores_areas_risco', {method:'POST',body:JSON.stringify(body),headers:{'Prefer':'return=minimal'}});
    }
    document.querySelector('.rast-form-overlay').remove();
    await rastLoadRisco();
  } catch(e) { alert('Erro: ' + e.message); }
}

async function rastRiscoDel(id) {
  if (!confirm('Excluir esta área de risco?')) return;
  try {
    await sbFetch('rastreadores_areas_risco?id=eq.' + id, {method:'DELETE',headers:{'Prefer':'return=minimal'}});
    await rastLoadRisco();
  } catch(e) { alert('Erro: ' + e.message); }
}


/* ====== QUALIDADE ====== */
function rastRenderQualidade(assocs) {
  if (!assocs || assocs.length === 0) return;
  var issues = rastComputeQuality(assocs);
  // KPIs
  var totalIssues = 0;
  for (var i = 0; i < issues.length; i++) totalIssues += issues[i].quantidade;
  var html = '';
  html += '<div class="bi-kpi bi-blue"><div class="bi-kpi-val">' + biFormatNum(assocs.length) + '</div><div class="bi-kpi-label">Total Registros</div></div>';
  html += '<div class="bi-kpi bi-red"><div class="bi-kpi-val">' + biFormatNum(totalIssues) + '</div><div class="bi-kpi-label">Total Problemas</div></div>';
  html += '<div class="bi-kpi bi-green"><div class="bi-kpi-val">' + (assocs.length > 0 ? ((1 - totalIssues/assocs.length) * 100).toFixed(1) : '100') + '%</div><div class="bi-kpi-label">Saúde da Base</div></div>';
  document.getElementById('rastQualKpis').innerHTML = html;

  // Issues cards
  var cardsHtml = '';
  for (var i = 0; i < issues.length; i++) {
    var issue = issues[i];
    if (issue.quantidade === 0) continue;
    var color = issue.quantidade > 1000 ? 'var(--red)' : issue.quantidade > 100 ? 'var(--amber)' : 'var(--blue)';
    cardsHtml += '<div class="rast-qual-card" onclick="this.classList.toggle(\'open\')">';
    cardsHtml += '<div class="rast-qual-card-header">';
    cardsHtml += '<div class="rast-qual-card-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ' + issue.descricao + '</div>';
    cardsHtml += '<div class="rast-qual-card-count" style="color:' + color + '">' + biFormatNum(issue.quantidade) + '</div>';
    cardsHtml += '</div>';
    cardsHtml += '<div class="rast-qual-card-body">';
    if (issue.registros.length > 0) {
      cardsHtml += '<table class="equipe-table"><thead><tr><th>Nome</th><th>Placa</th><th>Cidade</th><th>Valor</th></tr></thead><tbody>';
      var showMax = Math.min(issue.registros.length, 30);
      for (var j = 0; j < showMax; j++) {
        var r = issue.registros[j];
        cardsHtml += '<tr><td>' + (r.nome||'-') + '</td><td>' + (r.placa||'-') + '</td><td>' + (r.cidade||'-') + '</td><td style="font-size:.68rem">' + (r.valor||'-') + '</td></tr>';
      }
      cardsHtml += '</tbody></table>';
      if (issue.registros.length > showMax) cardsHtml += '<p style="font-size:.68rem;color:var(--text3);margin-top:6px">Mostrando ' + showMax + ' de ' + issue.quantidade + '</p>';
    }
    cardsHtml += '</div></div>';
  }
  document.getElementById('rastQualIssues').innerHTML = cardsHtml || '<p style="color:var(--text3)">Nenhum problema detectado. Base limpa!</p>';
}


function rastComputeQuality(assocs) {
  var placaVazia = [], rastVazio = [], cidadeVazia = [], categoriaNC = [], fipeInv = [];
  var placas = {}, rasts = {};

  for (var i = 0; i < assocs.length; i++) {
    var a = assocs[i];
    var reg = {nome:a.nome,placa:a.placa,cidade:a.cidade,uf:a.uf,valor:''};
    // Placa vazia
    if (!a.placa) { placaVazia.push(reg); }
    else {
      if (!placas[a.placa]) placas[a.placa] = [];
      placas[a.placa].push(reg);
    }
    // Operacional sem rastreador válido
    if (a.operacional && !a.temRastreador) {
      rastVazio.push(Object.assign({},reg,{valor:a.numeroRastreador||'(vazio)'}));
    } else if (a.temRastreador && a.numeroRastreador) {
      if (!rasts[a.numeroRastreador]) rasts[a.numeroRastreador] = [];
      rasts[a.numeroRastreador].push(reg);
    }
    // Cidade/UF vazia
    if (!a.cidade || !a.uf) { cidadeVazia.push(Object.assign({},reg,{valor:a.cidade+'/'+a.uf})); }
    // Categoria não classificada
    if (a.tipo === 'nao_classificado') { categoriaNC.push(Object.assign({},reg,{valor:a.categoria||'(vazio)'})); }
    // FIPE inválido
    if (a.valorFipe == null || a.valorFipe <= 0) { fipeInv.push(Object.assign({},reg,{valor:String(a.valorFipe||'')})); }
  }

  // Placa duplicada
  var placaDup = [];
  Object.keys(placas).forEach(function(p) {
    if (placas[p].length > 1) {
      for (var j = 0; j < placas[p].length; j++) {
        placaDup.push(Object.assign({},placas[p][j],{valor:placas[p].length + ' ocorrências'}));
      }
    }
  });

  // Rastreador duplicado
  var rastDup = [];
  Object.keys(rasts).forEach(function(r) {
    if (rasts[r].length > 1) {
      for (var j = 0; j < rasts[r].length; j++) {
        rastDup.push(Object.assign({},rasts[r][j],{valor:r + ' (' + rasts[r].length + 'x)'}));
      }
    }
  });

  return [
    {tipo:'placa_vazia',descricao:'Placa vazia',quantidade:placaVazia.length,registros:placaVazia.slice(0,100)},
    {tipo:'placa_duplicada',descricao:'Placa duplicada',quantidade:placaDup.length,registros:placaDup.slice(0,100)},
    {tipo:'rastreador_ausente',descricao:'Operacional sem rastreador',quantidade:rastVazio.length,registros:rastVazio.slice(0,100)},
    {tipo:'rastreador_duplicado',descricao:'Rastreador duplicado',quantidade:rastDup.length,registros:rastDup.slice(0,100)},
    {tipo:'cidade_vazia',descricao:'Cidade/UF vazia',quantidade:cidadeVazia.length,registros:cidadeVazia.slice(0,100)},
    {tipo:'categoria_nc',descricao:'Categoria não classificada',quantidade:categoriaNC.length,registros:categoriaNC.slice(0,100)},
    {tipo:'fipe_invalido',descricao:'Valor FIPE ausente/inválido',quantidade:fipeInv.length,registros:fipeInv.slice(0,100)}
  ];
}


/* ====== INIT RASTREADORES ====== */
// Hook into panel navigation
var _origGoPanel = goPanel;
goPanel = function(panelId) {
  _origGoPanel(panelId);
  if (panelId.indexOf('rast-') === 0) {
    // Refresh data when navigating to rastreadores panels
    if (panelId === 'rast-visao' || panelId === 'rast-priorizacao' || panelId === 'rast-qualidade') {
      rastRefreshAll();
      rastStartPolling();
    } else if (panelId === 'rast-mapa') {
      rastRefreshAll();
      rastStartPolling();
      setTimeout(function() {
        rastRenderMapa();
        if (RAST_MAP) RAST_MAP.invalidateSize();
      }, 200);
    } else if (panelId === 'rast-prestadores') {
      rastLoadPrestadores();
    } else if (panelId === 'rast-risco') {
      rastLoadRisco();
    }
  }
};

// Polling: if BI_DATA is empty but loading, check every 2s until data arrives
var _rastPollTimer = null;
function rastStartPolling() {
  if (_rastPollTimer) return;
  if (BI_DATA && BI_DATA.length > 0) return; // already have data
  _rastPollTimer = setInterval(function() {
    if (BI_DATA && BI_DATA.length > 0) {
      clearInterval(_rastPollTimer);
      _rastPollTimer = null;
      rastRefreshAll();
      // If map panel is active, also render map
      var mapPanel = document.getElementById('panel-rast-mapa');
      if (mapPanel && mapPanel.classList.contains('active')) {
        setTimeout(function() { rastRenderMapa(); if (RAST_MAP) RAST_MAP.invalidateSize(); }, 200);
      }
    }
  }, 2000);
}

// Load prestadores and areas on init
(async function() {
  await rastLoadPrestadores();
  await rastLoadRisco();
})();
