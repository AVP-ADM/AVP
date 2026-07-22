/* ====== RASTREADORES MODULE v2 — IMPLEMENTAÇÃO COMPLETA ====== */
/* Lê dados de BI_DATA (variável global preenchida pelo BI Associados) */

var RAST_PRESTADORES = [];
var RAST_REGRAS_RISCO = [];
var RAST_CITIES = [];
var RAST_MAP = null;
var RAST_MAP_MARKERS = [];
var RAST_MAP_LAYERS = {registros:[],prestadores:[],raios:[],risco:[]};
var RAST_DRAWER_OPEN = false;
var RAST_GLOBAL_METRICS = null;
var RAST_MAP_FILTER = {tipos:[],situacoes:['Ativo','Suspenso','Novo'],rastreamento:[],riscos:[],ufs:[],cidades:[]};

/* ====== CITY COORDS (~155 cidades + fallback UF) ====== */
var RAST_CITY_RAW = [
["Rio Branco","AC",-9.97,-67.82],["Maceio","AL",-9.67,-35.74],["Macapa","AP",0.03,-51.07],["Manaus","AM",-3.12,-60.02],["Salvador","BA",-12.97,-38.50],["Fortaleza","CE",-3.73,-38.53],["Brasilia","DF",-15.79,-47.88],["Vitoria","ES",-20.32,-40.31],["Goiania","GO",-16.69,-49.26],["Sao Luis","MA",-2.53,-44.31],["Cuiaba","MT",-15.60,-56.10],["Campo Grande","MS",-20.47,-54.62],["Belo Horizonte","MG",-19.92,-43.93],["Belem","PA",-1.46,-48.49],["Joao Pessoa","PB",-7.12,-34.85],["Curitiba","PR",-25.43,-49.27],["Recife","PE",-8.05,-34.88],["Teresina","PI",-5.09,-42.80],["Rio de Janeiro","RJ",-22.91,-43.17],["Natal","RN",-5.79,-35.21],["Porto Alegre","RS",-30.03,-51.22],["Porto Velho","RO",-8.76,-63.90],["Boa Vista","RR",2.82,-60.68],["Florianopolis","SC",-27.59,-48.55],["Sao Paulo","SP",-23.55,-46.63],["Aracaju","SE",-10.95,-37.07],["Palmas","TO",-10.17,-48.33],
["Petrolina","PE",-9.39,-40.50],["Juazeiro","BA",-9.41,-40.50],["Itabuna","BA",-14.79,-39.28],["Juazeiro do Norte","CE",-7.21,-39.32],["Feira de Santana","BA",-12.27,-38.97],["Jaboatao dos Guararapes","PE",-8.11,-35.01],["Carpina","PE",-7.85,-35.25],["Arapiraca","AL",-9.75,-36.66],["Senhor do Bonfim","BA",-10.46,-40.19],["Caruaru","PE",-8.28,-35.98],["Garanhuns","PE",-8.88,-36.50],["Serra Talhada","PE",-7.99,-38.29],["Salgueiro","PE",-8.07,-39.12],["Ouricuri","PE",-7.88,-40.08],["Araripina","PE",-7.58,-40.50],
["Alagoinhas","BA",-12.14,-38.42],["Barreiras","BA",-12.15,-45.00],["Vitoria da Conquista","BA",-14.86,-40.84],["Ilheus","BA",-14.79,-39.05],["Teixeira de Freitas","BA",-17.54,-39.74],["Camacari","BA",-12.70,-38.32],["Lauro de Freitas","BA",-12.89,-38.32],["Paulo Afonso","BA",-9.41,-38.22],["Jequie","BA",-13.86,-40.08],["Guanambi","BA",-14.22,-42.78],["Irece","BA",-11.30,-41.86],["Jacobina","BA",-11.18,-40.51],["Serrinha","BA",-11.66,-39.01],["Remanso","BA",-9.62,-42.08],["Casa Nova","BA",-9.16,-40.97],
["Campina Grande","PB",-7.23,-35.88],["Patos","PB",-7.02,-37.28],["Cajazeiras","PB",-6.89,-38.56],["Sousa","PB",-6.76,-38.23],["Mossoro","RN",-5.19,-37.34],["Parnamirim","RN",-5.92,-35.26],["Sobral","CE",-3.69,-40.35],["Crato","CE",-7.23,-39.41],["Iguatu","CE",-6.36,-39.30],["Caucaia","CE",-3.74,-38.65],["Maracanau","CE",-3.88,-38.63],["Russas","CE",-4.94,-37.98],["Morada Nova","CE",-5.11,-38.37],["Queimada Nova","PI",-8.58,-41.41],
["Batalha","AL",-9.68,-37.13],["Delmiro Gouveia","AL",-9.39,-38.00],["Palmeira dos Indios","AL",-9.41,-36.63],["Penedo","AL",-10.29,-36.57],
["Guarulhos","SP",-23.46,-46.53],["Campinas","SP",-22.91,-47.06],["Sao Bernardo do Campo","SP",-23.69,-46.57],["Santo Andre","SP",-23.66,-46.53],["Osasco","SP",-23.53,-46.79],["Ribeirao Preto","SP",-21.17,-47.81],["Sorocaba","SP",-23.50,-47.45],["Sao Jose dos Campos","SP",-23.22,-45.90],["Santos","SP",-23.96,-46.33],["Bauru","SP",-22.31,-49.06],
["Niteroi","RJ",-22.88,-43.10],["Duque de Caxias","RJ",-22.79,-43.31],["Nova Iguacu","RJ",-22.76,-43.46],["Sao Goncalo","RJ",-22.83,-43.05],
["Uberlandia","MG",-18.91,-48.28],["Contagem","MG",-19.93,-44.05],["Juiz de Fora","MG",-21.76,-43.35],["Betim","MG",-19.97,-44.20],["Montes Claros","MG",-16.74,-43.86],["Governador Valadares","MG",-18.85,-41.95],["Uberaba","MG",-19.75,-47.93],["Ipatinga","MG",-19.47,-42.54],["Sete Lagoas","MG",-19.46,-44.25],["Divinopolis","MG",-20.14,-44.88],["Pocos de Caldas","MG",-21.79,-46.56],["Nova Lima","MG",-19.99,-43.85],
["Londrina","PR",-23.31,-51.16],["Maringa","PR",-23.43,-51.94],["Ponta Grossa","PR",-25.09,-50.16],["Cascavel","PR",-24.96,-53.46],["Foz do Iguacu","PR",-25.55,-54.59],["Campo Largo","PR",-25.46,-49.53],
["Joinville","SC",-26.30,-48.84],["Blumenau","SC",-26.92,-49.07],["Chapeco","SC",-27.10,-52.62],
["Aparecida de Goiania","GO",-16.82,-49.24],["Anapolis","GO",-16.33,-48.95],["Rio Verde","GO",-17.80,-50.92],["Itumbiara","GO",-18.42,-49.22],
["Imperatriz","MA",-5.53,-47.48],["Caxias","MA",-4.86,-43.36],["Timon","MA",-5.09,-42.84],
["Parauapebas","PA",-6.07,-49.90],["Santarem","PA",-2.44,-54.70],["Maraba","PA",-5.37,-49.12],
["Estancia","SE",-11.27,-37.44],["Itabaiana","SE",-10.69,-37.43],["Lagarto","SE",-10.92,-37.67]
];

var RAST_UF_CENTROIDS = {AC:[-9.05,-70.53],AL:[-9.57,-36.78],AP:[1.41,-51.79],AM:[-4.15,-63.18],BA:[-12.58,-41.70],CE:[-5.50,-39.32],DF:[-15.80,-47.86],ES:[-19.18,-40.31],GO:[-15.83,-49.84],MA:[-4.96,-45.27],MT:[-12.68,-56.92],MS:[-20.77,-54.79],MG:[-18.51,-44.56],PA:[-3.90,-52.48],PB:[-7.24,-36.78],PR:[-24.89,-51.55],PE:[-8.81,-36.95],PI:[-7.72,-42.73],RJ:[-22.91,-43.21],RN:[-5.40,-36.95],RS:[-30.03,-53.20],RO:[-11.51,-63.58],RR:[2.00,-61.33],SC:[-27.24,-50.22],SP:[-22.50,-48.50],SE:[-10.57,-37.39],TO:[-10.18,-48.30]};

var RAST_COORDS_MAP = {};
(function(){
  for(var i=0;i<RAST_CITY_RAW.length;i++){
    var r=RAST_CITY_RAW[i];
    var key=r[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()+'__'+r[1].toLowerCase();
    RAST_COORDS_MAP[key]=[r[2],r[3]];
  }
})();

function rastLookupCoords(cidade,uf){
  var key=(cidade||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()+'__'+(uf||'').toLowerCase();
  if(RAST_COORDS_MAP[key])return RAST_COORDS_MAP[key];
  var centroid=RAST_UF_CENTROIDS[(uf||'').toUpperCase()];
  return centroid||null;
}
function rastHasExactCoords(cidade,uf){
  var key=(cidade||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim()+'__'+(uf||'').toLowerCase();
  return !!RAST_COORDS_MAP[key];
}


/* ====== CLASSIFICAÇÃO DE TIPO DE VEÍCULO ====== */
var RAST_MOTO_KW=['motocicleta','moto','honda','yamaha','shineray','avelloz','bajaj','elite 125','fluo 125','neo','pcx','nmax','adv','xmax'];
var RAST_CAMINHAO_KW=['truck','caminhao','caminhão','carreta','agregado'];
var RAST_CARRO_KW=['automovel','passeio','suv','caminhonete','utilitario','eletrico','hibrido','importado','nacional','premium','start'];

function rastClassifyTipo(categoria){
  if(!categoria)return'nao_classificado';
  var c=categoria.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  for(var i=0;i<RAST_MOTO_KW.length;i++){if(c.indexOf(RAST_MOTO_KW[i])>=0)return'moto';}
  for(var i=0;i<RAST_CAMINHAO_KW.length;i++){if(c.indexOf(RAST_CAMINHAO_KW[i])>=0)return'caminhao';}
  for(var i=0;i<RAST_CARRO_KW.length;i++){if(c.indexOf(RAST_CARRO_KW[i])>=0)return'carro';}
  if(c.indexOf('atividade remunerada (suv')>=0||c.indexOf('atividade remunerada (veiculo')>=0)return'carro';
  if(c.indexOf('atividade remunerada (motocicleta')>=0)return'moto';
  return'nao_classificado';
}

function rastClassifySituacao(s){
  var n=(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if(n.indexOf('ativo')>=0)return'Ativo';
  if(n.indexOf('suspens')>=0)return'Suspenso';
  if(n.indexOf('cancel')>=0)return'Cancelado';
  if(n.indexOf('novo')>=0)return'Novo';
  return'outro';
}

var RAST_INVALID_TRACKERS=['','0','n/a','na','sem','naopossui','nao','null','undefined','-'];
function rastHasValidTracker(raw){
  var n=(raw||'').toString().toLowerCase().replace(/\s+/g,'');
  if(!n||RAST_INVALID_TRACKERS.indexOf(n)>=0)return false;
  if(/^0+$/.test(n))return false;
  if(n.length<3)return false;
  return true;
}

/* ====== PROCESSAMENTO DOS DADOS ====== */
function rastIsOperacional(situacao){
  var s=(situacao||'').toLowerCase();
  return s==='ativo'||s==='suspenso'||s==='novo';
}

function rastGetAssociados(){
  if(!BI_DATA||BI_DATA.length===0)return[];
  return BI_DATA.map(function(r){
    var tipo=rastClassifyTipo(r.categoria);
    var sit=r.situacao||'';
    var operacional=rastIsOperacional(sit);
    var temRastreador=rastHasValidTracker(r.numero_rastreador);
    return{
      nome:r.nome||'',placa:r.placa||'',cidade:r.cidade||'',uf:r.uf||'',
      situacao:sit,situacaoNorm:rastClassifySituacao(sit),categoria:r.categoria||'',categoriaOriginal:r.categoria||'',
      tipo:tipo,temRastreador:temRastreador,operacional:operacional,
      numeroRastreador:r.numero_rastreador||'',valorFipe:r.valor_fipe||0,
      consultor:r.consultor||'',plano:r.plano||'',valorMensal:r.valor_mensal||0,
      dataAtivacao:r.data_ativacao||'',dataCancelamento:r.data_cancelamento||''
    };
  });
}

function rastHaversineKm(lat1,lng1,lat2,lng2){
  var R=6371,toRad=function(v){return v*Math.PI/180;};
  var dLat=toRad(lat2-lat1),dLng=toRad(lng2-lng1);
  var a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)*Math.sin(dLng/2);
  return 2*R*Math.asin(Math.min(1,Math.sqrt(a)));
}


/* ====== COMPUTE GLOBAL METRICS ====== */
function rastComputeGlobal(assocs,filtroTipo){
  var m={total:0,operacionais:0,comRastreador:0,semRastreador:0,cobertura:0,
    canceladosComRastreador:0,motos:0,carros:0,caminhoes:0,naoClass:0,ativos:0,suspensos:0,cancelados:0,novos:0};
  for(var i=0;i<assocs.length;i++){
    var a=assocs[i];
    if(filtroTipo!=='todos'&&a.tipo!==filtroTipo)continue;
    m.total++;
    if(a.situacaoNorm==='Ativo')m.ativos++;
    else if(a.situacaoNorm==='Suspenso')m.suspensos++;
    else if(a.situacaoNorm==='Cancelado')m.cancelados++;
    else if(a.situacaoNorm==='Novo')m.novos++;
    if(a.operacional){
      m.operacionais++;
      if(a.temRastreador)m.comRastreador++;else m.semRastreador++;
    }else if(a.situacaoNorm==='Cancelado'&&a.temRastreador){m.canceladosComRastreador++;}
    if(a.tipo==='moto')m.motos++;else if(a.tipo==='carro')m.carros++;else if(a.tipo==='caminhao')m.caminhoes++;else m.naoClass++;
  }
  m.cobertura=m.operacionais>0?m.comRastreador/m.operacionais:0;
  return m;
}

/* ====== COMPUTE CITIES (score refinado) ====== */
function rastComputeCities(assocs,filtroTipo){
  var map={};
  for(var i=0;i<assocs.length;i++){
    var a=assocs[i];
    if(filtroTipo!=='todos'&&a.tipo!==filtroTipo)continue;
    if(!a.cidade)continue;
    var key=(a.cidade+'__'+a.uf).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(!map[key])map[key]={cidade:a.cidade,uf:a.uf,chave:key,total:0,operacionais:0,
      comRastreador:0,semRastreador:0,cobertura:0,canceladosComRastreador:0,
      motos:0,carros:0,caminhoes:0,naoClass:0,ativos:0,suspensos:0,cancelados:0,
      prestadoresAtivos:0,prestadoresNecessarios:0,deficit:0,
      score:0,prioridade:'baixo',lat:null,lng:null};
    var c=map[key];
    c.total++;
    if(a.operacional){
      c.operacionais++;
      if(a.temRastreador)c.comRastreador++;else c.semRastreador++;
      if(a.tipo==='moto')c.motos++;else if(a.tipo==='carro')c.carros++;else if(a.tipo==='caminhao')c.caminhoes++;else c.naoClass++;
      if(a.situacaoNorm==='Ativo')c.ativos++;else if(a.situacaoNorm==='Suspenso')c.suspensos++;
    }else if(a.situacaoNorm==='Cancelado'&&a.temRastreador){c.canceladosComRastreador++;}
  }
  var list=Object.values(map);
  // Coords
  for(var i=0;i<list.length;i++){
    var coords=rastLookupCoords(list[i].cidade,list[i].uf);
    if(coords){list[i].lat=coords[0];list[i].lng=coords[1];}
  }
  // Prestadores por cidade
  for(var p=0;p<RAST_PRESTADORES.length;p++){
    var pr=RAST_PRESTADORES[p];
    if(pr.status!=='ativo')continue;
    var pk=(pr.cidade+'__'+pr.uf).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if(map[pk])map[pk].prestadoresAtivos++;
  }
  // Cobertura
  for(var i=0;i<list.length;i++){list[i].cobertura=list[i].operacionais>0?list[i].comRastreador/list[i].operacionais:0;}
  // Score refinado (baseado no projeto original)
  var semRastSorted=list.slice().sort(function(a,b){return b.semRastreador-a.semRastreador;});
  var top20Set={};
  for(var i=0;i<Math.min(20,semRastSorted.length);i++){top20Set[semRastSorted[i].chave]=true;}
  var maxSem=semRastSorted.length>0?semRastSorted[0].semRastreador:1;
  var maxCanc=1;
  for(var i=0;i<list.length;i++){if(list[i].canceladosComRastreador>maxCanc)maxCanc=list[i].canceladosComRastreador;}
  var ratioAlta=50,ratioNormal=100,motoBoost=1.3;
  for(var i=0;i<list.length;i++){
    var c=list[i];
    var ratio=top20Set[c.chave]?ratioAlta:ratioNormal;
    var necess=c.semRastreador/ratio;
    if(c.operacionais>0&&c.motos/c.operacionais>0.5)necess*=motoBoost;
    c.prestadoresNecessarios=Math.ceil(necess);
    c.deficit=Math.max(c.prestadoresNecessarios-c.prestadoresAtivos,0);
    // Score OPERACIONAL
    var score=0;
    if(top20Set[c.chave])score+=40;
    score+=Math.min(30,(c.semRastreador/maxSem)*30);
    score+=Math.min(15,(c.canceladosComRastreador/maxCanc)*15);
    if(c.deficit>0)score+=Math.min(15,c.deficit*3);
    c.score=Math.round(score);
    if(score>=80)c.prioridade='critico';
    else if(score>=60)c.prioridade='alto';
    else if(score>=40)c.prioridade='medio';
    else c.prioridade='baixo';
  }
  list.sort(function(a,b){return b.score-a.score;});
  return list;
}


/* ====== REFRESH ALL ====== */
function rastRefreshAll(){
  var assocs=rastGetAssociados();
  var filtroTipo=(document.getElementById('rastFiltroTipo')||{}).value||'todos';
  if(assocs.length===0){
    var biLoading=(typeof BI_LOADING!=='undefined'&&BI_LOADING);
    var biEmptyEl=document.getElementById('biEmpty');
    var isLoadingFromCache=biEmptyEl&&biEmptyEl.style.display!=='none'&&biEmptyEl.innerHTML.indexOf('spin')>=0;
    var loadingHtml='<div class="bi-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="animation:spin 1s linear infinite;width:48px;height:48px;margin-bottom:12px;opacity:.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg><p style="color:var(--text2)">Carregando base do servidor...</p><p style="font-size:.72rem;color:var(--text3);margin-top:4px">Aguarde, os dados aparecerão automaticamente</p></div>';
    var nodataHtml='<div class="bi-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;margin-bottom:12px;opacity:.4"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4"/></svg><p>Carregue a base no <strong>BI Associados</strong> primeiro.</p><button class="btn btn-green" onclick="goPanel(\'bi-base\')" style="margin-top:12px">Ir para BI Associados</button></div>';
    var html=(biLoading||isLoadingFromCache)?loadingHtml:nodataHtml;
    ['rastVisaoNodata','rastPriorNodata','rastMapaNodata','rastQualNodata'].forEach(function(id){var el=document.getElementById(id);if(el){el.style.display='flex';el.innerHTML=html;}});
    ['rastVisaoContent','rastPriorContent','rastMapaContent','rastQualContent'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='none';});
    return;
  }
  ['rastVisaoNodata','rastPriorNodata','rastMapaNodata','rastQualNodata'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='none';});
  ['rastVisaoContent','rastPriorContent','rastMapaContent','rastQualContent'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='block';});
  RAST_GLOBAL_METRICS=rastComputeGlobal(assocs,filtroTipo);
  RAST_CITIES=rastComputeCities(assocs,filtroTipo);
  rastRenderVisao(RAST_GLOBAL_METRICS);
  rastRenderPriorizacao();
  rastRenderQualidade(assocs);
}

/* ====== VISÃO GERAL ====== */
function rastRenderVisao(m){
  var cidadesCriticas=RAST_CITIES.filter(function(c){return c.prioridade==='critico'||c.prioridade==='alto';}).length;
  var prestNecess=0,prestAtivos=0;
  for(var i=0;i<RAST_CITIES.length;i++){prestNecess+=RAST_CITIES[i].prestadoresNecessarios;prestAtivos+=RAST_CITIES[i].prestadoresAtivos;}
  var deficit=prestNecess-prestAtivos;
  var html='';
  html+='<div class="bi-kpi bi-blue"><div class="bi-kpi-val">'+biFormatNum(m.operacionais)+'</div><div class="bi-kpi-label">Operacionais</div><div class="bi-kpi-pct">Ativo+Suspenso+Novo</div></div>';
  html+='<div class="bi-kpi bi-green"><div class="bi-kpi-val">'+biFormatNum(m.comRastreador)+'</div><div class="bi-kpi-label">Com Rastreador</div><div class="bi-kpi-pct">'+(m.cobertura*100).toFixed(1)+'% cobertura</div></div>';
  html+='<div class="bi-kpi bi-red"><div class="bi-kpi-val">'+biFormatNum(m.semRastreador)+'</div><div class="bi-kpi-label">Sem Rastreador</div><div class="bi-kpi-pct">'+(m.operacionais>0?((m.semRastreador/m.operacionais)*100).toFixed(1):'0')+'%</div></div>';
  html+='<div class="bi-kpi bi-amber"><div class="bi-kpi-val">'+biFormatNum(m.canceladosComRastreador)+'</div><div class="bi-kpi-label">Cancelados c/ Rastr.</div><div class="bi-kpi-pct">Recuperar equip.</div></div>';
  html+='<div class="bi-kpi bi-purple"><div class="bi-kpi-val">'+biFormatNum(m.motos)+'</div><div class="bi-kpi-label">Motos</div></div>';
  html+='<div class="bi-kpi" style="border-left:3px solid var(--blue)"><div class="bi-kpi-val" style="color:var(--blue)">'+biFormatNum(m.carros)+'</div><div class="bi-kpi-label">Carros</div></div>';
  html+='<div class="bi-kpi" style="border-left:3px solid #06b6d4"><div class="bi-kpi-val" style="color:#06b6d4">'+biFormatNum(m.caminhoes)+'</div><div class="bi-kpi-label">Caminhões</div></div>';
  html+='<div class="bi-kpi" style="border-left:3px solid #f97316"><div class="bi-kpi-val" style="color:#f97316">'+cidadesCriticas+'</div><div class="bi-kpi-label">Cidades Críticas/Altas</div></div>';
  html+='<div class="bi-kpi" style="border-left:3px solid var(--accent)"><div class="bi-kpi-val" style="color:var(--accent)">'+prestAtivos+'/'+prestNecess+'</div><div class="bi-kpi-label">Prestadores Ativos/Necess.</div><div class="bi-kpi-pct">Déficit: '+deficit+'</div></div>';
  document.getElementById('rastKpis').innerHTML=html;
  rastRenderChartTipo();rastRenderChartCidades();rastRenderChartPrioridade();rastRenderChartRecuperar();rastRenderChartUF();rastRenderChartOperacionais();
}

function rastRenderChartTipo(){
  var assocs=rastGetAssociados();
  var tipos={moto:{op:0,rastr:0},carro:{op:0,rastr:0},caminhao:{op:0,rastr:0}};
  for(var i=0;i<assocs.length;i++){var a=assocs[i];if(!a.operacional)continue;if(tipos[a.tipo]){tipos[a.tipo].op++;if(a.temRastreador)tipos[a.tipo].rastr++;}}
  var html='',labels={moto:'Motos',carro:'Carros',caminhao:'Caminhões'},colors={moto:'fill-purple',carro:'fill-blue',caminhao:'fill-amber'};
  ['moto','carro','caminhao'].forEach(function(t){var pct=tipos[t].op>0?Math.round((tipos[t].rastr/tipos[t].op)*100):0;html+='<div class="bi-bar-row"><span class="bi-bar-label">'+labels[t]+'</span><div class="bi-bar-track"><div class="bi-bar-fill '+colors[t]+'" style="width:'+pct+'%"></div></div><span class="bi-bar-value">'+pct+'% ('+biFormatNum(tipos[t].rastr)+'/'+biFormatNum(tipos[t].op)+')</span></div>';});
  document.getElementById('rastChartTipo').innerHTML=html;
}
function rastRenderChartCidades(){
  var top=RAST_CITIES.slice(0,15);var maxVal=top.length>0?top[0].semRastreador:1;var html='';
  for(var i=0;i<top.length;i++){var c=top[i];var pct=Math.round((c.semRastreador/maxVal)*100);var color=c.prioridade==='critico'?'fill-red':c.prioridade==='alto'?'fill-amber':'fill-blue';html+='<div class="bi-bar-row"><span class="bi-bar-label">'+c.cidade+' - '+c.uf+'</span><div class="bi-bar-track"><div class="bi-bar-fill '+color+'" style="width:'+pct+'%"></div></div><span class="bi-bar-value">'+biFormatNum(c.semRastreador)+'</span></div>';}
  document.getElementById('rastChartCidades').innerHTML=html||'<p style="font-size:.72rem;color:var(--text3)">Sem dados</p>';
}
function rastRenderChartPrioridade(){
  var counts={critico:0,alto:0,medio:0,baixo:0};
  for(var i=0;i<RAST_CITIES.length;i++)counts[RAST_CITIES[i].prioridade]++;
  var html='<div style="display:flex;gap:12px;flex-wrap:wrap;padding:10px 0">';
  var labels={critico:'Crítica',alto:'Alta',medio:'Média',baixo:'Baixa'},colors={critico:'var(--red)',alto:'var(--amber)',medio:'var(--blue)',baixo:'var(--green)'};
  ['critico','alto','medio','baixo'].forEach(function(p){html+='<div style="flex:1;min-width:80px;text-align:center;padding:12px;border-radius:var(--radius);background:var(--surface-2)"><div style="font-size:1.4rem;font-weight:800;color:'+colors[p]+'">'+counts[p]+'</div><div style="font-size:.62rem;font-weight:600;color:var(--text3);text-transform:uppercase">'+labels[p]+'</div></div>';});
  html+='</div>';document.getElementById('rastChartPrioridade').innerHTML=html;
}
function rastRenderChartRecuperar(){
  var assocs=rastGetAssociados();var cidades={};
  for(var i=0;i<assocs.length;i++){var a=assocs[i];if(a.situacaoNorm!=='Cancelado'||!a.temRastreador)continue;cidades[a.cidade||'N/D']=(cidades[a.cidade||'N/D']||0)+1;}
  var sorted=Object.entries(cidades).sort(function(a,b){return b[1]-a[1];}).slice(0,10);
  if(sorted.length===0){document.getElementById('rastChartRecuperar').innerHTML='<p style="font-size:.72rem;color:var(--text3)">Nenhum cancelado com rastreador</p>';return;}
  var maxVal=sorted[0][1];var html='';
  for(var i=0;i<sorted.length;i++){var pct=Math.round((sorted[i][1]/maxVal)*100);html+='<div class="bi-bar-row"><span class="bi-bar-label">'+sorted[i][0]+'</span><div class="bi-bar-track"><div class="bi-bar-fill fill-red" style="width:'+pct+'%"></div></div><span class="bi-bar-value">'+sorted[i][1]+'</span></div>';}
  document.getElementById('rastChartRecuperar').innerHTML=html;
}
function rastRenderChartUF(){
  var assocs=rastGetAssociados();var ufs={};
  for(var i=0;i<assocs.length;i++){var a=assocs[i];if(!a.operacional||!a.uf)continue;if(!ufs[a.uf])ufs[a.uf]={op:0,rastr:0};ufs[a.uf].op++;if(a.temRastreador)ufs[a.uf].rastr++;}
  var sorted=Object.entries(ufs).sort(function(a,b){return b[1].op-a[1].op;}).slice(0,12);
  var html='';
  for(var i=0;i<sorted.length;i++){var u=sorted[i];var pct=u[1].op>0?Math.round((u[1].rastr/u[1].op)*100):0;html+='<div class="bi-bar-row"><span class="bi-bar-label">'+u[0]+'</span><div class="bi-bar-track"><div class="bi-bar-fill fill-green" style="width:'+pct+'%"></div></div><span class="bi-bar-value">'+pct+'% ('+biFormatNum(u[1].rastr)+'/'+biFormatNum(u[1].op)+')</span></div>';}
  var el=document.getElementById('rastChartUF');if(el)el.innerHTML=html||'<p style="font-size:.72rem;color:var(--text3)">Sem dados</p>';
}
function rastRenderChartOperacionais(){
  var top=RAST_CITIES.slice().sort(function(a,b){return b.operacionais-a.operacionais;}).slice(0,15);
  var maxVal=top.length>0?top[0].operacionais:1;var html='';
  for(var i=0;i<top.length;i++){var c=top[i];var pct=Math.round((c.operacionais/maxVal)*100);html+='<div class="bi-bar-row"><span class="bi-bar-label">'+c.cidade+' - '+c.uf+'</span><div class="bi-bar-track"><div class="bi-bar-fill fill-blue" style="width:'+pct+'%"></div></div><span class="bi-bar-value">'+biFormatNum(c.operacionais)+'</span></div>';}
  var el=document.getElementById('rastChartOperacionais');if(el)el.innerHTML=html||'<p style="font-size:.72rem;color:var(--text3)">Sem dados</p>';
}


/* ====== PRIORIZAÇÃO (filtros completos) ====== */
function rastRenderPriorizacao(){
  var filtro=(document.getElementById('rastPriorFiltro')||{}).value||'';
  var busca=(document.getElementById('rastPriorBusca')||{}).value||'';busca=busca.toLowerCase();
  var ufFiltro=(document.getElementById('rastPriorUF')||{}).value||'';
  var filtered=RAST_CITIES.filter(function(c){
    if(filtro&&c.prioridade!==filtro)return false;
    if(busca&&(c.cidade+' '+c.uf).toLowerCase().indexOf(busca)<0)return false;
    if(ufFiltro&&c.uf!==ufFiltro)return false;
    return true;
  });
  // Badges
  var counts={critico:0,alto:0,medio:0,baixo:0};
  for(var i=0;i<RAST_CITIES.length;i++)counts[RAST_CITIES[i].prioridade]++;
  var badgesHtml='',labels={critico:'Crítica',alto:'Alta',medio:'Média',baixo:'Baixa'};
  ['critico','alto','medio','baixo'].forEach(function(p){
    var active=filtro===p?' style="box-shadow:0 0 0 2px currentColor"':'';
    badgesHtml+='<span class="rast-badge rast-'+p+'"'+active+' onclick="document.getElementById(\'rastPriorFiltro\').value=\''+(filtro===p?'':p)+'\';rastRenderPriorizacao()">'+labels[p]+': '+counts[p]+'</span>';
  });
  document.getElementById('rastPriorBadges').innerHTML=badgesHtml;
  // Populate UF filter
  var ufSel=document.getElementById('rastPriorUF');
  if(ufSel&&ufSel.options.length<=1){var ufs={};for(var i=0;i<RAST_CITIES.length;i++)ufs[RAST_CITIES[i].uf]=1;Object.keys(ufs).sort().forEach(function(u){var o=document.createElement('option');o.value=u;o.textContent=u;ufSel.appendChild(o);});}
  // Table
  var html='';
  for(var i=0;i<filtered.length;i++){
    var c=filtered[i];var cob=(c.cobertura*100).toFixed(1)+'%';
    html+='<tr class="row-acomp" onclick="rastToggleCityDetail(this,\''+c.chave.replace(/'/g,"\\'")+'\')" style="cursor:pointer">';
    html+='<td class="col-pos" style="padding-left:24px;position:relative"><svg class="expand-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'+(i+1)+'</td>';
    html+='<td class="col-gestor">'+c.cidade+'</td><td class="col-sede">'+c.uf+'</td>';
    html+='<td class="col-num">'+biFormatNum(c.operacionais)+'</td>';
    html+='<td class="col-num" style="color:var(--green)">'+biFormatNum(c.comRastreador)+'</td>';
    html+='<td class="col-num" style="color:var(--red);font-weight:700">'+biFormatNum(c.semRastreador)+'</td>';
    html+='<td class="col-num">'+cob+'</td>';
    html+='<td class="col-num">'+c.prestadoresAtivos+'</td>';
    html+='<td class="col-num">'+c.prestadoresNecessarios+'</td>';
    html+='<td class="col-num" style="color:'+(c.deficit>0?'var(--red)':'var(--green)')+'">'+c.deficit+'</td>';
    html+='<td class="col-num">'+c.score+'</td>';
    html+='<td><span class="rast-prio-dot '+c.prioridade+'"></span> <span class="rast-nivel-tag '+c.prioridade+'">'+labels[c.prioridade]+'</span></td>';
    html+='</tr>';
    html+='<tr class="rast-expand-row" id="rast-city-'+i+'"><td colspan="12"></td></tr>';
  }
  document.getElementById('tbodyRastPrior').innerHTML=html||'<tr><td colspan="12" style="text-align:center;color:var(--text3);padding:40px">Nenhuma cidade encontrada</td></tr>';
  var infoEl=document.getElementById('rastPriorInfo');
  if(infoEl)infoEl.textContent=filtered.length+' cidade(s) • Total sem rastreador: '+biFormatNum(filtered.reduce(function(s,c){return s+c.semRastreador;},0));
}

function rastToggleCityDetail(row,chave){
  var nextRow=row.nextElementSibling;
  if(!nextRow||!nextRow.classList.contains('rast-expand-row'))return;
  if(row.classList.contains('expanded')){row.classList.remove('expanded');nextRow.classList.remove('visible');return;}
  row.classList.add('expanded');nextRow.classList.add('visible');
  var city=RAST_CITIES.find(function(c){return c.chave===chave;});
  if(!city){nextRow.querySelector('td').innerHTML='<div class="rast-expand-inner"><p style="color:var(--text3)">Sem dados</p></div>';return;}
  var assocs=rastGetAssociados();
  var filtroTipo=(document.getElementById('rastFiltroTipo')||{}).value||'todos';
  var cityAssocs=assocs.filter(function(a){
    if(filtroTipo!=='todos'&&a.tipo!==filtroTipo)return false;
    var aKey=(a.cidade+'__'+a.uf).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    return a.operacional&&!a.temRastreador&&aKey===chave;
  });
  cityAssocs.sort(function(a,b){return a.nome.localeCompare(b.nome);});
  var ehtml='<div class="rast-expand-inner">';
  ehtml+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">';
  ehtml+='<h4 style="font-size:.8rem;font-weight:700;color:var(--accent)">'+city.cidade+' - '+city.uf+' — '+cityAssocs.length+' sem rastreador</h4>';
  ehtml+='<div style="font-size:.68rem;color:var(--text3)">Motos: '+city.motos+' | Carros: '+city.carros+' | Caminhões: '+city.caminhoes+' | Prestadores: '+city.prestadoresAtivos+'/'+city.prestadoresNecessarios+'</div>';
  ehtml+='</div>';
  if(cityAssocs.length>0){
    var showMax=Math.min(cityAssocs.length,50);
    ehtml+='<div style="overflow-x:auto;max-height:300px;overflow-y:auto"><table class="equipe-table"><thead><tr><th>#</th><th>Nome</th><th>Tipo</th><th>Categoria</th><th>Plano</th><th>Consultor</th><th>Valor FIPE</th></tr></thead><tbody>';
    for(var j=0;j<showMax;j++){var a=cityAssocs[j];var tipoLabel=a.tipo==='moto'?'Moto':a.tipo==='carro'?'Carro':a.tipo==='caminhao'?'Caminhão':'N/C';ehtml+='<tr><td class="col-pos">'+(j+1)+'</td><td style="font-weight:500">'+a.nome+'</td><td>'+tipoLabel+'</td><td style="font-size:.68rem">'+(a.categoria||'-')+'</td><td>'+(a.plano||'-')+'</td><td>'+(a.consultor||'-')+'</td><td class="col-money">R$ '+(a.valorFipe||0).toFixed(0)+'</td></tr>';}
    ehtml+='</tbody></table></div>';
    if(cityAssocs.length>showMax)ehtml+='<p style="font-size:.68rem;color:var(--text3);margin-top:6px">Mostrando '+showMax+' de '+cityAssocs.length+'</p>';
  }else{ehtml+='<p style="color:var(--text3);font-size:.78rem">Nenhum associado sem rastreador nesta cidade.</p>';}
  ehtml+='</div>';
  nextRow.querySelector('td').innerHTML=ehtml;
}

function rastExportPriorizacaoCSV(){
  if(!RAST_CITIES.length){alert('Sem dados');return;}
  var rows=[['#','Cidade','UF','Operacionais','Com Rastr.','Sem Rastr.','Cobertura %','Prest. Ativos','Prest. Necess.','Déficit','Score','Prioridade']];
  RAST_CITIES.forEach(function(c,i){rows.push([i+1,c.cidade,c.uf,c.operacionais,c.comRastreador,c.semRastreador,(c.cobertura*100).toFixed(1)+'%',c.prestadoresAtivos,c.prestadoresNecessarios,c.deficit,c.score,c.prioridade]);});
  var ws=XLSX.utils.aoa_to_sheet(rows);
  var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Priorizacao');
  XLSX.writeFile(wb,'Rastreadores_Priorizacao_'+new Date().toISOString().split('T')[0]+'.xlsx');
}


/* ====== MAPA COMPLETO (filtros + camadas + drawer) ====== */
function rastRenderMapa(){
  var container=document.getElementById('rastMapaContainer');if(!container)return;
  // Ensure data is computed
  if(RAST_CITIES.length===0&&BI_DATA&&BI_DATA.length>0){
    var assocs=rastGetAssociados();
    var filtroTipo=(document.getElementById('rastFiltroTipo')||{}).value||'todos';
    RAST_CITIES=rastComputeCities(assocs,filtroTipo);
  }
  var metrica=(document.getElementById('rastMapaMetrica')||{}).value||'semRastreador';
  var showRegistros=document.getElementById('rastLayerRegistros')?document.getElementById('rastLayerRegistros').checked:true;
  var showPrest=document.getElementById('rastLayerPrestadores')?document.getElementById('rastLayerPrestadores').checked:true;
  var showRaios=document.getElementById('rastLayerRaios')?document.getElementById('rastLayerRaios').checked:false;
  var showRisco=document.getElementById('rastLayerRisco')?document.getElementById('rastLayerRisco').checked:true;

  if(!RAST_MAP){RAST_MAP=L.map(container).setView([-15.8,-47.9],4);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:18}).addTo(RAST_MAP);}
  // Clear all layers
  Object.keys(RAST_MAP_LAYERS).forEach(function(k){RAST_MAP_LAYERS[k].forEach(function(l){RAST_MAP.removeLayer(l);});RAST_MAP_LAYERS[k]=[];});

  // Map priority filter
  var prioFiltro=(document.getElementById('rastMapaPrioridade')||{}).value||'';

  // Layer: Registros (city bubbles)
  if(showRegistros){
    for(var i=0;i<RAST_CITIES.length;i++){
      var c=RAST_CITIES[i];if(!c.lat||!c.lng)continue;
      if(prioFiltro&&c.prioridade!==prioFiltro)continue;
      var val,radius;
      if(metrica==='semRastreador'){val=c.semRastreador;radius=Math.max(5,Math.min(40,Math.sqrt(val)*1.5));}
      else if(metrica==='operacionais'){val=c.operacionais;radius=Math.max(5,Math.min(40,Math.sqrt(val)*1.2));}
      else if(metrica==='cobertura'){val=c.cobertura;radius=20;}
      else{val=c.score;radius=Math.max(5,Math.min(35,val/3));}
      var color=c.prioridade==='critico'?'#DC2626':c.prioridade==='alto'?'#D97706':c.prioridade==='medio'?'#2563EB':'#16A34A';
      var marker=L.circleMarker([c.lat,c.lng],{radius:radius,fillColor:color,color:color,weight:1,opacity:0.8,fillOpacity:0.4}).addTo(RAST_MAP);
      marker.bindPopup('<b>'+c.cidade+' - '+c.uf+'</b><br>Operacionais: '+biFormatNum(c.operacionais)+'<br>Com Rastr.: '+biFormatNum(c.comRastreador)+'<br><b style="color:'+color+'">Sem Rastr.: '+biFormatNum(c.semRastreador)+'</b><br>Cobertura: '+(c.cobertura*100).toFixed(1)+'%<br>Score: '+c.score+' ('+c.prioridade+')<br>Prestadores: '+c.prestadoresAtivos+'/'+c.prestadoresNecessarios);
      marker.on('click',function(cc){return function(){rastOpenDrawer('cidade',cc);};}(c));
      RAST_MAP_LAYERS.registros.push(marker);
    }
  }
  // Layer: Prestadores
  if(showPrest){
    for(var i=0;i<RAST_PRESTADORES.length;i++){
      var p=RAST_PRESTADORES[i];if(p.status!=='ativo')continue;
      var coords=rastLookupCoords(p.cidade,p.uf);if(!coords)continue;
      var pMarker=L.marker(coords,{icon:L.divIcon({className:'',html:'<div style="background:#7C3AED;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3)">P</div>',iconSize:[24,24],iconAnchor:[12,12]})}).addTo(RAST_MAP);
      pMarker.bindPopup('<b>'+p.nome+'</b><br>'+p.cidade+'/'+p.uf+'<br>Raio: '+(p.raio_km||30)+'km<br>Tipos: '+(p.tipos_atendidos||[]).join(', '));
      RAST_MAP_LAYERS.prestadores.push(pMarker);
      // Raio
      if(showRaios){var circle=L.circle(coords,{radius:(p.raio_km||30)*1000,fillColor:'#7C3AED',color:'#7C3AED',weight:1,opacity:0.3,fillOpacity:0.05}).addTo(RAST_MAP);RAST_MAP_LAYERS.raios.push(circle);}
    }
  }
  // Layer: Áreas de Risco
  if(showRisco){
    var nivelColors={critico:'#DC2626',alto:'#D97706',medio:'#2563EB',baixo:'#16A34A'};
    for(var i=0;i<RAST_REGRAS_RISCO.length;i++){
      var r=RAST_REGRAS_RISCO[i];if(r.status!=='ativa')continue;
      var coords=rastLookupCoords(r.cidade,r.uf);if(!coords)continue;
      var rColor=nivelColors[r.nivel_risco]||'#9ca3af';
      var rCircle=L.circle(coords,{radius:(r.raio_km||50)*1000,fillColor:rColor,color:rColor,weight:2,opacity:0.6,fillOpacity:0.08,dashArray:'5,5'}).addTo(RAST_MAP);
      rCircle.bindPopup('<b>⚠️ '+r.nome+'</b><br>Nível: '+r.nivel_risco+'<br>Política: '+r.politica+'<br>Raio: '+r.raio_km+'km<br>Motivo: '+(r.motivo||'-'));
      RAST_MAP_LAYERS.risco.push(rCircle);
    }
  }
  // Legend
  var cidadesNoMapa=RAST_CITIES.filter(function(c){return c.lat&&c.lng;}).length;
  var legendHtml='<span><span class="rast-prio-dot critico"></span> Crítica</span><span><span class="rast-prio-dot alto"></span> Alta</span><span><span class="rast-prio-dot medio"></span> Média</span><span><span class="rast-prio-dot baixo"></span> Baixa</span>';
  legendHtml+='<span style="margin-left:8px;color:var(--purple)">● Prestador</span>';
  legendHtml+='<span style="margin-left:8px">⚠️ Área de Risco</span>';
  legendHtml+='<span style="margin-left:auto;font-weight:600">'+cidadesNoMapa+' cidades no mapa (total: '+RAST_CITIES.length+')</span>';
  document.getElementById('rastMapaLegend').innerHTML=legendHtml;
}

function rastOpenDrawer(tipo,data){
  var drawer=document.getElementById('rastMapaDrawer');if(!drawer)return;
  drawer.style.display='block';RAST_DRAWER_OPEN=true;
  var html='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><h3 style="font-size:.95rem;font-weight:700">';
  if(tipo==='cidade'){
    var c=data;
    html+=c.cidade+' - '+c.uf+'</h3><button class="btn btn-outline" style="padding:4px 8px;font-size:.7rem" onclick="rastCloseDrawer()">✕</button></div>';
    // KPI cards
    html+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">';
    html+='<div style="background:var(--surface-2);border-radius:var(--radius);padding:10px;text-align:center"><div style="font-size:1.1rem;font-weight:800;color:var(--green)">'+biFormatNum(c.comRastreador)+'</div><div style="font-size:.6rem;color:var(--text3);text-transform:uppercase">Com Rastr.</div></div>';
    html+='<div style="background:var(--surface-2);border-radius:var(--radius);padding:10px;text-align:center"><div style="font-size:1.1rem;font-weight:800;color:var(--red)">'+biFormatNum(c.semRastreador)+'</div><div style="font-size:.6rem;color:var(--text3);text-transform:uppercase">Sem Rastr.</div></div>';
    html+='<div style="background:var(--surface-2);border-radius:var(--radius);padding:10px;text-align:center"><div style="font-size:1.1rem;font-weight:800;color:var(--blue)">'+(c.cobertura*100).toFixed(1)+'%</div><div style="font-size:.6rem;color:var(--text3);text-transform:uppercase">Cobertura</div></div>';
    html+='</div>';
    // Info
    html+='<div style="font-size:.72rem;color:var(--text2);margin-bottom:6px;line-height:1.8">';
    html+='<b>Score:</b> '+c.score+' (<span class="rast-nivel-tag '+c.prioridade+'" style="font-size:.58rem">'+c.prioridade+'</span>)<br>';
    html+='<b>Operacionais:</b> '+biFormatNum(c.operacionais)+' | <b>Total:</b> '+biFormatNum(c.total)+'<br>';
    html+='<b>Motos:</b> '+c.motos+' | <b>Carros:</b> '+c.carros+' | <b>Caminhões:</b> '+c.caminhoes+'<br>';
    html+='<b>Prestadores:</b> '+c.prestadoresAtivos+' ativos / '+c.prestadoresNecessarios+' necessários<br>';
    html+='<b>Déficit:</b> <span style="color:'+(c.deficit>0?'var(--red)':'var(--green)')+'">'+c.deficit+'</span><br>';
    html+='<b>Cancelados com rastr.:</b> '+c.canceladosComRastreador+'</div>';
    // Associados sem rastreador (lista)
    var assocs=rastGetAssociados();
    var cityAssocs=assocs.filter(function(a){
      var aKey=(a.cidade+'__'+a.uf).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      return a.operacional&&!a.temRastreador&&aKey===c.chave;
    }).slice(0,30);
    if(cityAssocs.length>0){
      html+='<div style="margin-top:10px;font-size:.72rem;font-weight:700;color:var(--text1);margin-bottom:6px">Sem rastreador ('+biFormatNum(c.semRastreador)+'):</div>';
      html+='<div style="max-height:200px;overflow-y:auto"><table class="equipe-table"><thead><tr><th>Nome</th><th>Tipo</th><th>Plano</th></tr></thead><tbody>';
      for(var j=0;j<cityAssocs.length;j++){var a=cityAssocs[j];var tl=a.tipo==='moto'?'Moto':a.tipo==='carro'?'Carro':a.tipo==='caminhao'?'Caminhão':'N/C';html+='<tr><td style="font-size:.68rem">'+a.nome+'</td><td style="font-size:.68rem">'+tl+'</td><td style="font-size:.68rem">'+(a.plano||'-')+'</td></tr>';}
      html+='</tbody></table></div>';
      if(c.semRastreador>30)html+='<p style="font-size:.62rem;color:var(--text3);margin-top:4px">Mostrando 30 de '+c.semRastreador+'</p>';
    }
  }
  drawer.innerHTML=html;
}
function rastCloseDrawer(){var d=document.getElementById('rastMapaDrawer');if(d)d.style.display='none';RAST_DRAWER_OPEN=false;}

function rastMapaFiltroChanged(){
  // Sync tipo filter with the global one and re-compute
  var tipo=(document.getElementById('rastMapaTipo')||{}).value||'todos';
  var globalFiltro=document.getElementById('rastFiltroTipo');
  if(globalFiltro)globalFiltro.value=tipo;
  rastRefreshAll();
  setTimeout(function(){rastRenderMapa();},100);
}

function rastExportMapaXLSX(){
  if(!RAST_CITIES.length){alert('Sem dados');return;}
  var wb=XLSX.utils.book_new();
  // Sheet: Cidades
  var cityRows=RAST_CITIES.map(function(c){return{cidade:c.cidade,uf:c.uf,operacionais:c.operacionais,com_rastreador:c.comRastreador,sem_rastreador:c.semRastreador,cobertura:(c.cobertura*100).toFixed(1)+'%',motos:c.motos,carros:c.carros,caminhoes:c.caminhoes,cancelados_com_rast:c.canceladosComRastreador,prestadores_ativos:c.prestadoresAtivos,prestadores_necess:c.prestadoresNecessarios,deficit:c.deficit,score:c.score,prioridade:c.prioridade};});
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(cityRows),'Cidades');
  // Sheet: Registros sem rastreador
  var assocs=rastGetAssociados().filter(function(a){return a.operacional&&!a.temRastreador;});
  var regRows=assocs.map(function(a){return{nome:a.nome,placa:a.placa,cidade:a.cidade,uf:a.uf,tipo:a.tipo,categoria:a.categoria,plano:a.plano,consultor:a.consultor,valor_fipe:a.valorFipe};});
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(regRows),'Sem Rastreador');
  // Sheet: Resumo
  var m=RAST_GLOBAL_METRICS||{};
  var resumo=[{chave:'total_registros',valor:m.total},{chave:'operacionais',valor:m.operacionais},{chave:'com_rastreador',valor:m.comRastreador},{chave:'sem_rastreador',valor:m.semRastreador},{chave:'cobertura',valor:(m.cobertura*100).toFixed(1)+'%'},{chave:'cancelados_com_rastreador',valor:m.canceladosComRastreador},{chave:'total_cidades',valor:RAST_CITIES.length},{chave:'cidades_criticas',valor:RAST_CITIES.filter(function(c){return c.prioridade==='critico';}).length},{chave:'exportado_em',valor:new Date().toISOString()}];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(resumo),'Resumo');
  XLSX.writeFile(wb,'Rastreadores_Mapa_'+new Date().toISOString().split('T')[0]+'.xlsx');
}


/* ====== PRESTADORES (CRUD + KPIs + Import/Export) ====== */
async function rastLoadPrestadores(){
  try{var r=await sbFetch('rastreadores_prestadores?select=*&order=nome.asc');if(r.ok){RAST_PRESTADORES=await r.json();}else{RAST_PRESTADORES=[];}}catch(e){RAST_PRESTADORES=[];}
  rastRenderPrestadores();
}
function rastRenderPrestadores(){
  var busca=(document.getElementById('rastPrestBusca')||{}).value||'';busca=busca.toLowerCase();
  var status=(document.getElementById('rastPrestStatus')||{}).value||'';
  var filtered=RAST_PRESTADORES.filter(function(p){if(status&&p.status!==status)return false;if(busca&&(p.nome+' '+p.cidade+' '+p.uf).toLowerCase().indexOf(busca)<0)return false;return true;});
  // KPIs
  var totalAtivos=RAST_PRESTADORES.filter(function(p){return p.status==='ativo';}).length;
  var totalNecess=0,totalDeficit=0;
  for(var i=0;i<RAST_CITIES.length;i++){totalNecess+=RAST_CITIES[i].prestadoresNecessarios;totalDeficit+=RAST_CITIES[i].deficit;}
  var kpiEl=document.getElementById('rastPrestKpis');
  if(kpiEl)kpiEl.innerHTML='<div class="bi-kpi bi-green" style="padding:12px"><div class="bi-kpi-val" style="font-size:1.3rem">'+totalAtivos+'</div><div class="bi-kpi-label">Ativos</div></div><div class="bi-kpi bi-blue" style="padding:12px"><div class="bi-kpi-val" style="font-size:1.3rem">'+totalNecess+'</div><div class="bi-kpi-label">Necessários</div></div><div class="bi-kpi bi-red" style="padding:12px"><div class="bi-kpi-val" style="font-size:1.3rem">'+totalDeficit+'</div><div class="bi-kpi-label">Déficit</div></div><div class="bi-kpi" style="padding:12px;border-left:3px solid var(--purple)"><div class="bi-kpi-val" style="font-size:1.3rem;color:var(--purple)">'+RAST_PRESTADORES.length+'</div><div class="bi-kpi-label">Total Cadastrados</div></div>';
  var html='';
  for(var i=0;i<filtered.length;i++){
    var p=filtered[i];var tipos=(p.tipos_atendidos||[]).join(', ')||'-';
    html+='<tr><td class="col-pos">'+(i+1)+'</td><td class="col-gestor">'+p.nome+'</td><td>'+( p.cidade||'-')+'</td><td>'+(p.uf||'-')+'</td><td class="col-num">'+tipos+'</td><td class="col-num">'+(p.raio_km||30)+'</td><td class="col-num">'+(p.capacidade_mensal||'-')+'</td><td><span class="rast-status-tag '+p.status+'">'+p.status+'</span></td><td class="col-actions"><button class="btn-hide" onclick="rastPrestadorEdit(\''+p.id+'\')" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button> <button class="btn-hide" onclick="rastPrestadorDel(\''+p.id+'\')" title="Excluir"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button></td></tr>';
  }
  document.getElementById('tbodyRastPrest').innerHTML=html||'<tr><td colspan="9" style="text-align:center;color:var(--text3);padding:40px">Nenhum prestador cadastrado</td></tr>';
  document.getElementById('rastPrestInfo').textContent=filtered.length+' prestador(es)';
}
function rastPrestadorAdd(){rastPrestadorForm(null);}
function rastPrestadorEdit(id){var p=RAST_PRESTADORES.find(function(x){return x.id===id;});rastPrestadorForm(p);}
function rastPrestadorForm(existing){
  var isEdit=!!existing;var overlay=document.createElement('div');overlay.className='rast-form-overlay';overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
  var html='<div class="rast-form-panel" onclick="event.stopPropagation()"><h3 style="font-size:1rem;font-weight:700;margin-bottom:16px">'+(isEdit?'Editar':'Novo')+' Prestador</h3><div class="rast-form-grid">';
  html+='<div class="rast-form-group full"><label>Nome</label><input id="rpfNome" value="'+(existing?existing.nome:'')+'"></div>';
  html+='<div class="rast-form-group"><label>Cidade</label><input id="rpfCidade" value="'+(existing?existing.cidade:'')+'"></div>';
  html+='<div class="rast-form-group"><label>UF</label><input id="rpfUf" value="'+(existing?existing.uf:'') +'" maxlength="2" style="text-transform:uppercase"></div>';
  html+='<div class="rast-form-group"><label>Raio (km)</label><input type="number" id="rpfRaio" value="'+(existing?existing.raio_km:30)+'"></div>';
  html+='<div class="rast-form-group"><label>Capacidade Mensal</label><input type="number" id="rpfCap" value="'+(existing&&existing.capacidade_mensal?existing.capacidade_mensal:'')+'"></div>';
  html+='<div class="rast-form-group"><label>Tipos Atendidos</label><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px"><label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:.78rem"><input type="checkbox" id="rpfTipoMoto" value="moto"'+(existing&&existing.tipos_atendidos&&existing.tipos_atendidos.indexOf('moto')>=0?' checked':'')+' style="accent-color:var(--accent)"> Moto</label><label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:.78rem"><input type="checkbox" id="rpfTipoCarro" value="carro"'+(existing&&existing.tipos_atendidos&&existing.tipos_atendidos.indexOf('carro')>=0?' checked':'')+' style="accent-color:var(--accent)"> Carro</label><label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;font-size:.78rem"><input type="checkbox" id="rpfTipoCaminhao" value="caminhao"'+(existing&&existing.tipos_atendidos&&existing.tipos_atendidos.indexOf('caminhao')>=0?' checked':'')+' style="accent-color:var(--accent)"> Caminhão</label></div></div>';
  html+='<div class="rast-form-group"><label>Status</label><select id="rpfStatus"><option value="ativo"'+(existing&&existing.status==='ativo'?' selected':'')+'>Ativo</option><option value="pendente"'+(existing&&existing.status==='pendente'?' selected':'')+'>Pendente</option><option value="inativo"'+(existing&&existing.status==='inativo'?' selected':'')+'>Inativo</option></select></div>';
  html+='</div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><button class="btn btn-outline" onclick="this.closest(\'.rast-form-overlay\').remove()">Cancelar</button><button class="btn btn-green" onclick="rastPrestadorSave(\''+(existing?existing.id:'')+'\')">Salvar</button></div></div>';
  overlay.innerHTML=html;document.body.appendChild(overlay);
}
async function rastPrestadorSave(id){
  var nome=document.getElementById('rpfNome').value.trim();if(!nome){alert('Nome obrigatório');return;}
  var tipos=[];if(document.getElementById('rpfTipoMoto').checked)tipos.push('moto');if(document.getElementById('rpfTipoCarro').checked)tipos.push('carro');if(document.getElementById('rpfTipoCaminhao').checked)tipos.push('caminhao');
  var body={nome:nome,cidade:document.getElementById('rpfCidade').value.trim(),uf:document.getElementById('rpfUf').value.trim().toUpperCase(),raio_km:parseInt(document.getElementById('rpfRaio').value)||30,capacidade_mensal:parseInt(document.getElementById('rpfCap').value)||null,tipos_atendidos:tipos,status:document.getElementById('rpfStatus').value};
  try{if(id){await sbFetch('rastreadores_prestadores?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body),headers:{'Prefer':'return=minimal'}});}else{await sbFetch('rastreadores_prestadores',{method:'POST',body:JSON.stringify(body),headers:{'Prefer':'return=minimal'}});}document.querySelector('.rast-form-overlay').remove();await rastLoadPrestadores();}catch(e){alert('Erro: '+e.message);}
}
async function rastPrestadorDel(id){if(!confirm('Excluir este prestador?'))return;try{await sbFetch('rastreadores_prestadores?id=eq.'+id,{method:'DELETE',headers:{'Prefer':'return=minimal'}});await rastLoadPrestadores();}catch(e){alert('Erro: '+e.message);}}
function rastPrestadorImport(){
  var input=document.createElement('input');input.type='file';input.accept='.csv,.xlsx,.xls';
  input.onchange=async function(e){
    var file=e.target.files[0];if(!file)return;
    var buf=await file.arrayBuffer();var wb=XLSX.read(buf,{type:'array'});var ws=wb.Sheets[wb.SheetNames[0]];var rows=XLSX.utils.sheet_to_json(ws);
    var list=rows.map(function(r){return{nome:String(r.nome||r.Nome||''),cidade:String(r.cidade||r.Cidade||''),uf:String(r.uf||r.UF||'').toUpperCase(),raio_km:parseInt(r.raio||r.raio_km||30)||30,capacidade_mensal:parseInt(r.capacidade||r.capacidade_mensal)||null,tipos_atendidos:(String(r.tipos||r.tipos_atendidos||'moto,carro')).split(/[|,;]/).map(function(t){return t.trim().toLowerCase();}),status:'ativo'};}).filter(function(p){return p.nome;});
    if(!list.length){alert('Nenhum prestador válido no arquivo');return;}
    if(!confirm('Importar '+list.length+' prestador(es)?'))return;
    try{await sbFetch('rastreadores_prestadores',{method:'POST',body:JSON.stringify(list),headers:{'Prefer':'return=minimal'}});alert(list.length+' prestador(es) importado(s)!');await rastLoadPrestadores();}catch(e){alert('Erro: '+e.message);}
  };input.click();
}
function rastPrestadorExportModelo(){
  var rows=[['nome','cidade','uf','raio_km','capacidade_mensal','tipos_atendidos','status'],['Exemplo Oficina','São Paulo','SP',30,100,'moto,carro','ativo']];
  var ws=XLSX.utils.aoa_to_sheet(rows);var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Modelo');XLSX.writeFile(wb,'modelo_prestadores.xlsx');
}


/* ====== ÁREAS DE RISCO (CRUD + Import/Export + auto lat/lng) ====== */
async function rastLoadRisco(){
  try{var r=await sbFetch('rastreadores_areas_risco?select=*&order=nivel_risco.desc,nome.asc');if(r.ok){RAST_REGRAS_RISCO=await r.json();}else{RAST_REGRAS_RISCO=[];}}catch(e){RAST_REGRAS_RISCO=[];}
  rastRenderRisco();
}
function rastRenderRisco(){
  var busca=(document.getElementById('rastRiscoBusca')||{}).value||'';busca=busca.toLowerCase();
  var nivel=(document.getElementById('rastRiscoNivel')||{}).value||'';
  var filtered=RAST_REGRAS_RISCO.filter(function(r){if(nivel&&r.nivel_risco!==nivel)return false;if(busca&&(r.nome+' '+r.cidade+' '+r.uf).toLowerCase().indexOf(busca)<0)return false;return true;});
  var politicaLabels={aceita_normalmente:'Aceita normal',aceita_somente_com_rastreador:'Só c/ rastreador',aceita_com_vistoria:'C/ vistoria',nao_aceita_moto:'Não aceita moto',nao_aceita:'Não aceita'};
  var html='';
  for(var i=0;i<filtered.length;i++){var r=filtered[i];html+='<tr><td class="col-pos">'+(i+1)+'</td><td class="col-gestor">'+(r.nome||'-')+'</td><td>'+(r.cidade||'-')+'</td><td>'+(r.uf||'-')+'</td><td style="text-align:center"><span class="rast-nivel-tag '+r.nivel_risco+'">'+(r.nivel_risco||'-')+'</span></td><td style="font-size:.7rem">'+(politicaLabels[r.politica]||r.politica||'-')+'</td><td class="col-num">'+(r.raio_km||'-')+'</td><td style="font-size:.7rem">'+(r.tipo_veiculo||'todos')+'</td><td style="font-size:.7rem">'+(r.bairro||'-')+'</td><td><span class="rast-status-tag '+(r.status||'ativa')+'">'+(r.status||'ativa')+'</span></td><td class="col-actions"><button class="btn-hide" onclick="rastRiscoEdit(\''+r.id+'\')" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button> <button class="btn-hide" onclick="rastRiscoDel(\''+r.id+'\')" title="Excluir"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button></td></tr>';}
  document.getElementById('tbodyRastRisco').innerHTML=html||'<tr><td colspan="11" style="text-align:center;color:var(--text3);padding:40px">Nenhuma área de risco cadastrada</td></tr>';
  document.getElementById('rastRiscoInfo').textContent=filtered.length+' área(s) de risco';
}
function rastRiscoAdd(){rastRiscoForm(null);}
function rastRiscoEdit(id){var r=RAST_REGRAS_RISCO.find(function(x){return x.id===id;});rastRiscoForm(r);}
function rastRiscoForm(existing){
  var isEdit=!!existing;var overlay=document.createElement('div');overlay.className='rast-form-overlay';overlay.onclick=function(e){if(e.target===overlay)overlay.remove();};
  var html='<div class="rast-form-panel" onclick="event.stopPropagation()"><h3 style="font-size:1rem;font-weight:700;margin-bottom:16px">'+(isEdit?'Editar':'Nova')+' Área de Risco</h3><div class="rast-form-grid">';
  html+='<div class="rast-form-group full"><label>Nome</label><input id="rrfNome" value="'+(existing?existing.nome:'')+'"></div>';
  html+='<div class="rast-form-group"><label>Cidade</label><input id="rrfCidade" value="'+(existing?existing.cidade:'')+'"></div>';
  html+='<div class="rast-form-group"><label>UF</label><input id="rrfUf" value="'+(existing?existing.uf:'')+'" maxlength="2" style="text-transform:uppercase"></div>';
  html+='<div class="rast-form-group"><label>Bairro</label><input id="rrfBairro" value="'+(existing?existing.bairro||'':'')+'"></div>';
  html+='<div class="rast-form-group"><label>Nível de Risco</label><select id="rrfNivel"><option value="baixo"'+(existing&&existing.nivel_risco==='baixo'?' selected':'')+'>Baixo</option><option value="medio"'+(existing&&existing.nivel_risco==='medio'?' selected':'')+'>Médio</option><option value="alto"'+(existing&&existing.nivel_risco==='alto'?' selected':'')+'>Alto</option><option value="critico"'+(existing&&existing.nivel_risco==='critico'?' selected':'')+'>Crítico</option></select></div>';
  html+='<div class="rast-form-group"><label>Política</label><select id="rrfPolitica"><option value="aceita_normalmente"'+(existing&&existing.politica==='aceita_normalmente'?' selected':'')+'>Aceita normalmente</option><option value="aceita_somente_com_rastreador"'+(existing&&existing.politica==='aceita_somente_com_rastreador'?' selected':'')+'>Só com rastreador</option><option value="aceita_com_vistoria"'+(existing&&existing.politica==='aceita_com_vistoria'?' selected':'')+'>Com vistoria</option><option value="nao_aceita_moto"'+(existing&&existing.politica==='nao_aceita_moto'?' selected':'')+'>Não aceita moto</option><option value="nao_aceita"'+(existing&&existing.politica==='nao_aceita'?' selected':'')+'>Não aceita</option></select></div>';
  html+='<div class="rast-form-group"><label>Raio (km)</label><input type="number" id="rrfRaio" value="'+(existing?existing.raio_km:50)+'"></div>';
  html+='<div class="rast-form-group"><label>Tipo Veículo</label><select id="rrfTipo"><option value="todos"'+(existing&&existing.tipo_veiculo==='todos'?' selected':'')+'>Todos</option><option value="moto"'+(existing&&existing.tipo_veiculo==='moto'?' selected':'')+'>Moto</option><option value="carro"'+(existing&&existing.tipo_veiculo==='carro'?' selected':'')+'>Carro</option><option value="caminhao"'+(existing&&existing.tipo_veiculo==='caminhao'?' selected':'')+'>Caminhão</option></select></div>';
  html+='<div class="rast-form-group full"><label>Motivo</label><input id="rrfMotivo" value="'+(existing?existing.motivo||'':'')+'"></div>';
  html+='<div class="rast-form-group"><label>Status</label><select id="rrfStatus"><option value="ativa"'+(existing&&existing.status==='ativa'?' selected':'')+'>Ativa</option><option value="inativa"'+(existing&&existing.status==='inativa'?' selected':'')+'>Inativa</option></select></div>';
  // Auto coords info
  var coordsInfo='';if(existing&&existing.cidade){var c=rastLookupCoords(existing.cidade,existing.uf);coordsInfo=c?'<span style="color:var(--green);font-size:.65rem">✓ Coordenadas encontradas</span>':'<span style="color:var(--amber);font-size:.65rem">⚠ Usando centroide do estado</span>';}
  html+='<div class="rast-form-group"><label>Coordenadas</label><div style="font-size:.72rem;color:var(--text3);padding:8px 0">Auto-preenchidas pela cidade/UF '+coordsInfo+'</div></div>';
  html+='</div><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px"><button class="btn btn-outline" onclick="this.closest(\'.rast-form-overlay\').remove()">Cancelar</button><button class="btn btn-green" onclick="rastRiscoSave(\''+(existing?existing.id:'')+'\')">Salvar</button></div></div>';
  overlay.innerHTML=html;document.body.appendChild(overlay);
}
async function rastRiscoSave(id){
  var nome=document.getElementById('rrfNome').value.trim();if(!nome){alert('Nome obrigatório');return;}
  var cidade=document.getElementById('rrfCidade').value.trim();var uf=document.getElementById('rrfUf').value.trim().toUpperCase();
  var coords=rastLookupCoords(cidade,uf);
  var body={nome:nome,cidade:cidade,uf:uf,bairro:document.getElementById('rrfBairro').value.trim()||null,nivel_risco:document.getElementById('rrfNivel').value,politica:document.getElementById('rrfPolitica').value,raio_km:parseInt(document.getElementById('rrfRaio').value)||50,tipo_veiculo:document.getElementById('rrfTipo').value,motivo:document.getElementById('rrfMotivo').value.trim(),status:document.getElementById('rrfStatus').value,lat_central:coords?coords[0]:null,lng_central:coords?coords[1]:null};
  try{if(id){await sbFetch('rastreadores_areas_risco?id=eq.'+id,{method:'PATCH',body:JSON.stringify(body),headers:{'Prefer':'return=minimal'}});}else{await sbFetch('rastreadores_areas_risco',{method:'POST',body:JSON.stringify(body),headers:{'Prefer':'return=minimal'}});}document.querySelector('.rast-form-overlay').remove();await rastLoadRisco();}catch(e){alert('Erro: '+e.message);}
}
async function rastRiscoDel(id){if(!confirm('Excluir esta área de risco?'))return;try{await sbFetch('rastreadores_areas_risco?id=eq.'+id,{method:'DELETE',headers:{'Prefer':'return=minimal'}});await rastLoadRisco();}catch(e){alert('Erro: '+e.message);}}
function rastRiscoImport(){
  var input=document.createElement('input');input.type='file';input.accept='.csv,.xlsx,.xls';
  input.onchange=async function(e){
    var file=e.target.files[0];if(!file)return;
    var buf=await file.arrayBuffer();var wb=XLSX.read(buf,{type:'array'});var ws=wb.Sheets[wb.SheetNames[0]];var rows=XLSX.utils.sheet_to_json(ws);
    var list=rows.map(function(r){var cidade=String(r.cidade||r.Cidade||'');var uf=String(r.uf||r.UF||'').toUpperCase();var coords=rastLookupCoords(cidade,uf);return{nome:String(r.nome||r.Nome||cidade+'/'+uf),cidade:cidade,uf:uf,bairro:String(r.bairro||r.Bairro||'')||null,nivel_risco:String(r.nivelRisco||r.nivel_risco||r.nivel||'medio').toLowerCase(),politica:String(r.politica||r.Politica||'aceita_somente_com_rastreador'),raio_km:parseInt(r.raioKm||r.raio_km||r.raio||50)||50,tipo_veiculo:String(r.tipoVeiculo||r.tipo_veiculo||r.tipo||'todos').toLowerCase(),motivo:String(r.motivo||r.Motivo||''),status:'ativa',lat_central:coords?coords[0]:null,lng_central:coords?coords[1]:null};}).filter(function(r){return r.cidade;});
    if(!list.length){alert('Nenhuma área válida');return;}
    if(!confirm('Importar '+list.length+' área(s) de risco?'))return;
    try{await sbFetch('rastreadores_areas_risco',{method:'POST',body:JSON.stringify(list),headers:{'Prefer':'return=minimal'}});alert(list.length+' área(s) importada(s)!');await rastLoadRisco();}catch(e){alert('Erro: '+e.message);}
  };input.click();
}
function rastRiscoExportModelo(){
  var rows=[['nome','cidade','uf','bairro','nivel_risco','politica','raio_km','tipo_veiculo','motivo'],['Zona Norte','São Paulo','SP','','alto','aceita_somente_com_rastreador',30,'moto','Alta incidência']];
  var ws=XLSX.utils.aoa_to_sheet(rows);var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Modelo');XLSX.writeFile(wb,'modelo_areas_risco.xlsx');
}
function rastRiscoExportAll(){
  if(!RAST_REGRAS_RISCO.length){alert('Sem dados');return;}
  var rows=RAST_REGRAS_RISCO.map(function(r){return{nome:r.nome,cidade:r.cidade,uf:r.uf,bairro:r.bairro||'',nivel_risco:r.nivel_risco,politica:r.politica,raio_km:r.raio_km,tipo_veiculo:r.tipo_veiculo,motivo:r.motivo||'',status:r.status};});
  var ws=XLSX.utils.json_to_sheet(rows);var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Areas de Risco');XLSX.writeFile(wb,'areas_risco_'+new Date().toISOString().split('T')[0]+'.xlsx');
}


/* ====== QUALIDADE (completa: situação fora padrão + categorias NC agrupadas + export) ====== */
function rastRenderQualidade(assocs){
  if(!assocs||assocs.length===0)return;
  var issues=rastComputeQuality(assocs);
  var unclassified=rastComputeUnclassifiedGroups(assocs);
  var totalIssues=0;for(var i=0;i<issues.length;i++)totalIssues+=issues[i].quantidade;
  var html='';
  html+='<div class="bi-kpi bi-blue"><div class="bi-kpi-val">'+biFormatNum(assocs.length)+'</div><div class="bi-kpi-label">Total Registros</div></div>';
  html+='<div class="bi-kpi bi-red"><div class="bi-kpi-val">'+biFormatNum(totalIssues)+'</div><div class="bi-kpi-label">Total Problemas</div></div>';
  html+='<div class="bi-kpi bi-green"><div class="bi-kpi-val">'+(assocs.length>0?((1-Math.min(1,totalIssues/assocs.length))*100).toFixed(1):'100')+'%</div><div class="bi-kpi-label">Saúde da Base</div></div>';
  html+='<div class="bi-kpi bi-amber"><div class="bi-kpi-val">'+unclassified.length+'</div><div class="bi-kpi-label">Categorias N/C</div></div>';
  document.getElementById('rastQualKpis').innerHTML=html;
  // Issues cards
  var cardsHtml='';
  for(var i=0;i<issues.length;i++){
    var issue=issues[i];if(issue.quantidade===0)continue;
    var color=issue.quantidade>1000?'var(--red)':issue.quantidade>100?'var(--amber)':'var(--blue)';
    cardsHtml+='<div class="rast-qual-card" onclick="this.classList.toggle(\'open\')"><div class="rast-qual-card-header"><div class="rast-qual-card-title"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="'+color+'" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> '+issue.descricao+'</div><div class="rast-qual-card-count" style="color:'+color+'">'+biFormatNum(issue.quantidade)+'</div></div><div class="rast-qual-card-body">';
    if(issue.registros.length>0){cardsHtml+='<table class="equipe-table"><thead><tr><th>Nome</th><th>Placa</th><th>Cidade</th><th>Detalhe</th></tr></thead><tbody>';var showMax=Math.min(issue.registros.length,30);for(var j=0;j<showMax;j++){var r=issue.registros[j];cardsHtml+='<tr><td>'+(r.nome||'-')+'</td><td>'+(r.placa||'-')+'</td><td>'+(r.cidade||'-')+'</td><td style="font-size:.68rem">'+(r.valor||'-')+'</td></tr>';}cardsHtml+='</tbody></table>';if(issue.registros.length>showMax)cardsHtml+='<p style="font-size:.68rem;color:var(--text3);margin-top:6px">Mostrando '+showMax+' de '+issue.quantidade+'</p>';}
    cardsHtml+='</div></div>';
  }
  // Categorias não classificadas (agrupadas)
  if(unclassified.length>0){
    cardsHtml+='<div class="card" style="margin-top:16px"><div class="card-title">Categorias Não Classificadas (agrupadas)</div>';
    cardsHtml+='<div style="overflow-x:auto"><table class="equipe-table"><thead><tr><th>Categoria Original</th><th>Total</th><th>Operacionais</th><th>Ativos</th><th>Suspensos</th><th>Cancelados</th><th>Motivo</th></tr></thead><tbody>';
    for(var i=0;i<unclassified.length;i++){var g=unclassified[i];cardsHtml+='<tr><td style="font-weight:500">'+g.categoriaOriginal+'</td><td class="col-num">'+g.total+'</td><td class="col-num">'+g.operacionais+'</td><td class="col-num">'+g.ativos+'</td><td class="col-num">'+g.suspensos+'</td><td class="col-num">'+g.cancelados+'</td><td style="font-size:.68rem;color:var(--text3)">'+g.motivo+'</td></tr>';}
    cardsHtml+='</tbody></table></div></div>';
  }
  document.getElementById('rastQualIssues').innerHTML=cardsHtml||'<p style="color:var(--text3)">Base limpa!</p>';
}
function rastComputeQuality(assocs){
  var placaVazia=[],rastVazio=[],cidadeVazia=[],categoriaNC=[],fipeInv=[],situacaoFora=[];
  var placas={},rasts={};
  for(var i=0;i<assocs.length;i++){
    var a=assocs[i];var reg={nome:a.nome,placa:a.placa,cidade:a.cidade,uf:a.uf,valor:''};
    if(!a.placa)placaVazia.push(reg);else{if(!placas[a.placa])placas[a.placa]=[];placas[a.placa].push(reg);}
    if(a.operacional&&!a.temRastreador)rastVazio.push(Object.assign({},reg,{valor:a.numeroRastreador||'(vazio)'}));
    else if(a.temRastreador&&a.numeroRastreador){if(!rasts[a.numeroRastreador])rasts[a.numeroRastreador]=[];rasts[a.numeroRastreador].push(reg);}
    if(!a.cidade||!a.uf)cidadeVazia.push(Object.assign({},reg,{valor:a.cidade+'/'+a.uf}));
    if(a.tipo==='nao_classificado')categoriaNC.push(Object.assign({},reg,{valor:a.categoria||'(vazio)'}));
    if(a.valorFipe==null||a.valorFipe<=0)fipeInv.push(Object.assign({},reg,{valor:String(a.valorFipe||'')}));
    if(a.situacaoNorm==='outro')situacaoFora.push(Object.assign({},reg,{valor:a.situacao}));
  }
  var placaDup=[];Object.keys(placas).forEach(function(p){if(placas[p].length>1)for(var j=0;j<placas[p].length;j++)placaDup.push(Object.assign({},placas[p][j],{valor:placas[p].length+' ocorrências'}));});
  var rastDup=[];Object.keys(rasts).forEach(function(r){if(rasts[r].length>1)for(var j=0;j<rasts[r].length;j++)rastDup.push(Object.assign({},rasts[r][j],{valor:r+' ('+rasts[r].length+'x)'}));});
  return[
    {tipo:'placa_vazia',descricao:'Placa vazia',quantidade:placaVazia.length,registros:placaVazia.slice(0,100)},
    {tipo:'placa_duplicada',descricao:'Placa duplicada',quantidade:placaDup.length,registros:placaDup.slice(0,100)},
    {tipo:'rastreador_ausente',descricao:'Operacional sem rastreador',quantidade:rastVazio.length,registros:rastVazio.slice(0,100)},
    {tipo:'rastreador_duplicado',descricao:'Rastreador duplicado',quantidade:rastDup.length,registros:rastDup.slice(0,100)},
    {tipo:'cidade_vazia',descricao:'Cidade/UF vazia',quantidade:cidadeVazia.length,registros:cidadeVazia.slice(0,100)},
    {tipo:'categoria_nc',descricao:'Categoria não classificada',quantidade:categoriaNC.length,registros:categoriaNC.slice(0,100)},
    {tipo:'situacao_fora',descricao:'Situação fora do padrão',quantidade:situacaoFora.length,registros:situacaoFora.slice(0,100)},
    {tipo:'fipe_invalido',descricao:'Valor FIPE ausente/inválido',quantidade:fipeInv.length,registros:fipeInv.slice(0,100)}
  ];
}
function rastComputeUnclassifiedGroups(assocs){
  var groups={};
  for(var i=0;i<assocs.length;i++){var a=assocs[i];if(a.tipo!=='nao_classificado')continue;var key=(a.categoriaOriginal||'(vazio)').trim()||'(vazio)';if(!groups[key])groups[key]={categoriaOriginal:key,total:0,operacionais:0,ativos:0,suspensos:0,cancelados:0,motivo:''};var g=groups[key];g.total++;if(a.operacional)g.operacionais++;if(a.situacaoNorm==='Ativo')g.ativos++;else if(a.situacaoNorm==='Suspenso')g.suspensos++;else if(a.situacaoNorm==='Cancelado')g.cancelados++;}
  var ADMIN=['rastreamento monitoramento comodato','inativado','teste'];
  var list=Object.values(groups);
  for(var i=0;i<list.length;i++){var g=list[i];var norm=g.categoriaOriginal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();if(ADMIN.indexOf(norm)>=0)g.motivo='Categoria administrativa/produto/teste';else if(!g.categoriaOriginal||g.categoriaOriginal==='(vazio)')g.motivo='Categoria vazia';else g.motivo='Fora do mapeamento oficial';}
  list.sort(function(a,b){return b.total-a.total;});return list;
}
function rastExportQualidadeXLSX(){
  var assocs=rastGetAssociados();if(!assocs.length){alert('Sem dados');return;}
  var issues=rastComputeQuality(assocs);var wb=XLSX.utils.book_new();
  for(var i=0;i<issues.length;i++){var issue=issues[i];if(issue.quantidade===0)continue;var rows=issue.registros.map(function(r){return{nome:r.nome,placa:r.placa,cidade:r.cidade,uf:r.uf,detalhe:r.valor};});var sheetName=issue.tipo.substring(0,28);XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),sheetName);}
  var unclass=rastComputeUnclassifiedGroups(assocs);if(unclass.length){XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(unclass),'Categorias NC');}
  XLSX.writeFile(wb,'Rastreadores_Qualidade_'+new Date().toISOString().split('T')[0]+'.xlsx');
}


/* ====== INIT RASTREADORES ====== */
var _origGoPanel=goPanel;
goPanel=function(panelId){
  _origGoPanel(panelId);
  if(panelId.indexOf('rast-')===0){
    if(panelId==='rast-visao'||panelId==='rast-priorizacao'||panelId==='rast-qualidade'){rastRefreshAll();rastStartPolling();}
    else if(panelId==='rast-mapa'){rastRefreshAll();rastStartPolling();setTimeout(function(){if(RAST_CITIES.length>0){rastRenderMapa();}if(RAST_MAP)RAST_MAP.invalidateSize();},300);}
    else if(panelId==='rast-prestadores'){rastLoadPrestadores();}
    else if(panelId==='rast-risco'){rastLoadRisco();}
  }
};
var _rastPollTimer=null;
function rastStartPolling(){
  if(_rastPollTimer)return;if(BI_DATA&&BI_DATA.length>0)return;
  _rastPollTimer=setInterval(function(){
    if(BI_DATA&&BI_DATA.length>0){clearInterval(_rastPollTimer);_rastPollTimer=null;rastRefreshAll();var mapPanel=document.getElementById('panel-rast-mapa');if(mapPanel&&mapPanel.classList.contains('active'))setTimeout(function(){rastRenderMapa();if(RAST_MAP)RAST_MAP.invalidateSize();},200);}
  },2000);
}
(async function(){await rastLoadPrestadores();await rastLoadRisco();})();
