// ========= MIGRACOES MODULE =========
// Dependencias: supabase-client.js, escapeHtml(), showModal(), closeModal(),
//               showToast(), currentProfile, closeDrawer()

let _migConsultores = [];
let _migRegistros = [];
let _migAutorizacoes = [];
let _migConfig = { limite_percentual: 30, migracoes_para_alerta: 10 };
let _migAutPage = 1;
const _migAutPageSize = 15;
let _migInitialized = false;

// ========= INITIALIZATION =========
async function migInit() {
  if (!_migInitialized) {
    await migLoadConfig();
    _migInitialized = true;
  }
  await Promise.all([migLoadConsultores(), migLoadRegistros(), migLoadAutorizacoes()]);
  migRenderKpis();
  migRenderAlerts();
  migRenderAutorizacoes();
  migRenderConsultores();
}


// ========= DATA LOADING =========
async function migLoadConfig() {
  try {
    const rows = await supabase.select('migracoes_config', { limit: 1 });
    if (rows && rows.length > 0) {
      _migConfig = rows[0];
    }
    // Sync UI inputs if on settings page
    const limEl = document.getElementById('migConfigLimite');
    const alertEl = document.getElementById('migConfigAlerta');
    if (limEl) limEl.value = _migConfig.limite_percentual || 30;
    if (alertEl) alertEl.value = _migConfig.migracoes_para_alerta || 10;
  } catch (e) { console.warn('migLoadConfig error:', e); }
}

async function migLoadConsultores() {
  try {
    const rows = await supabase.select('migracoes_consultores', { order: 'nome.asc' });
    _migConsultores = (rows || []).filter(c => c.ativo !== false);
  } catch (e) { console.warn('migLoadConsultores error:', e); _migConsultores = []; }
}

async function migLoadRegistros() {
  try {
    const rows = await supabase.select('migracoes_registros', { order: 'created_at.desc' });
    _migRegistros = rows || [];
  } catch (e) { console.warn('migLoadRegistros error:', e); _migRegistros = []; }
}

async function migLoadAutorizacoes() {
  try {
    const rows = await supabase.select('migracoes_autorizacoes', { order: 'created_at.desc' });
    _migAutorizacoes = rows || [];
  } catch (e) { console.warn('migLoadAutorizacoes error:', e); _migAutorizacoes = []; }
}


// ========= CONFIG (Settings) =========
async function migSalvarConfig() {
  const limite = parseFloat(document.getElementById('migConfigLimite').value) || 30;
  const alerta = parseInt(document.getElementById('migConfigAlerta').value) || 10;
  try {
    if (_migConfig.id) {
      await supabase.update('migracoes_config', { limite_percentual: limite, migracoes_para_alerta: alerta, updated_at: new Date().toISOString() }, 'id=eq.' + _migConfig.id);
    } else {
      await supabase.insert('migracoes_config', { limite_percentual: limite, migracoes_para_alerta: alerta });
    }
    _migConfig.limite_percentual = limite;
    _migConfig.migracoes_para_alerta = alerta;
    showToast('Configuracoes de migracoes salvas!', 'success');
  } catch (e) {
    showToast('Erro ao salvar: ' + e.message, 'error');
  }
}


// ========= CALCULADORA =========
function migCalc() {
  const placaEl = document.getElementById('migPlaca');
  const avpEl = document.getElementById('migValorAVP');
  const concEl = document.getElementById('migValorConc');
  const resEl = document.getElementById('migResultado');
  const copyEl = document.getElementById('migCopyBlock');

  const placa = (placaEl ? placaEl.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : '');
  const avp = migParseMoneyInput(avpEl ? avpEl.value : '');
  const conc = migParseMoneyInput(concEl ? concEl.value : '');

  if (!avp || !conc || avp <= 0) {
    if (resEl) resEl.style.display = 'none';
    if (copyEl) copyEl.style.display = 'none';
    return;
  }

  const desconto = avp - conc;
  const percentual = (desconto / avp) * 100;
  const limite = parseFloat(_migConfig.limite_percentual) || 30;

  if (resEl) resEl.style.display = 'block';

  // Update values
  const descEl = document.getElementById('migResDesconto');
  const pctEl = document.getElementById('migResPercentual');
  const statusEl = document.getElementById('migResStatus');

  if (descEl) descEl.textContent = 'R$ ' + migFormatMoney(desconto);

  if (pctEl) {
    pctEl.textContent = percentual.toFixed(1) + '%';
    if (percentual <= 20) { pctEl.style.color = 'var(--green)'; }
    else if (percentual <= limite) { pctEl.style.color = 'var(--amber)'; }
    else { pctEl.style.color = 'var(--red)'; }
  }

  if (statusEl) {
    if (percentual <= limite) {
      statusEl.innerHTML = '<span style="font-size:.78rem;font-weight:600;padding:4px 12px;border-radius:20px;background:var(--green-light);color:var(--green)">&#10003; Permitida</span>';
    } else {
      statusEl.innerHTML = '<span style="font-size:.78rem;font-weight:600;padding:4px 12px;border-radius:20px;background:var(--red-light);color:var(--red)">&#9888; Acima do limite (' + limite + '%)</span><div style="font-size:.68rem;color:var(--text3);margin-top:4px">Necessaria autorizacao da diretoria</div>';
    }
  }

  // Copy block
  if (copyEl && placa && conc > 0) {
    copyEl.style.display = 'block';
    const txt = placa + ' - De R$ ' + migFormatMoney(avp) + ' por R$ ' + migFormatMoney(conc);
    document.getElementById('migCopyText').textContent = txt;
  } else if (copyEl) {
    copyEl.style.display = 'none';
  }
}


// ========= COPY TO CLIPBOARD =========
function migCopyTexto() {
  const txt = document.getElementById('migCopyText');
  if (!txt) return;
  const text = txt.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const block = document.getElementById('migCopyBlock');
    if (block) {
      block.style.borderColor = 'var(--green)';
      block.style.background = 'var(--green-light)';
      const original = txt.textContent;
      txt.innerHTML = '<span style="color:var(--green);font-weight:600">&#10003; Copiado!</span>';
      setTimeout(() => {
        txt.textContent = original;
        block.style.borderColor = 'var(--border-strong)';
        block.style.background = 'var(--surface-2)';
      }, 1500);
    }
    showToast('Texto copiado!', 'success');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Texto copiado!', 'success');
  });
}

function migCopyFromRow(placa, avp, conc) {
  const text = placa + ' - De R$ ' + migFormatMoney(avp) + ' por R$ ' + migFormatMoney(conc);
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copiado: ' + text, 'success');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Copiado: ' + text, 'success');
  });
}


// ========= KPI CARDS =========
function migRenderKpis() {
  const el = document.getElementById('migKpiCards');
  if (!el) return;

  const totalMigracoes = _migRegistros.length;
  const totalAutorizacoes = _migAutorizacoes.length;
  const totalGeral = totalMigracoes + totalAutorizacoes;

  // Total desconto concedido (monitorados)
  const totalDesconto = _migRegistros.reduce((s, r) => s + (parseFloat(r.valor_desconto) || 0), 0);

  // Media geral dos monitorados
  const mediaGeral = totalMigracoes > 0
    ? _migRegistros.reduce((s, r) => s + (parseFloat(r.percentual_desconto) || 0), 0) / totalMigracoes
    : 0;

  const limite = parseFloat(_migConfig.limite_percentual) || 30;
  const mediaColor = mediaGeral <= 20 ? 'var(--green)' : mediaGeral <= limite ? 'var(--amber)' : 'var(--red)';
  const mediaStatus = mediaGeral <= limite ? '&#10003;' : '&#9888;';

  // Alertas ativos
  const alertas = migGetAlertas();

  const iconMig = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3l5 5-5 5"/><path d="M21 8H9"/><path d="M8 21l-5-5 5-5"/><path d="M3 16h12"/></svg>';
  const iconMoney = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
  const iconPct = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>';
  const iconAlert = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

  const card = (icon, value, label, insight, borderColor) => {
    return '<div style="background:var(--surface-2);border:1px solid var(--border);border-left:4px solid ' + borderColor + ';border-radius:var(--radius);padding:20px;transition:transform .2s,box-shadow .2s;cursor:default" onmouseenter="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,.15)\'" onmouseleave="this.style.transform=\'\';this.style.boxShadow=\'\'">' +
      '<div style="color:' + borderColor + ';opacity:.7;margin-bottom:12px">' + icon + '</div>' +
      '<div style="font-size:1.4rem;font-weight:700;color:var(--text1);margin-bottom:4px">' + value + '</div>' +
      '<div style="font-size:.72rem;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px">' + label + '</div>' +
      '<div style="font-size:.7rem;color:var(--text3)">' + insight + '</div>' +
    '</div>';
  };

  el.innerHTML =
    card(iconMig, String(totalGeral), 'Total Migracoes', totalMigracoes + ' monitoradas, ' + totalAutorizacoes + ' pontuais', 'var(--blue)') +
    card(iconMoney, 'R$ ' + migFormatMoney(totalDesconto), 'Desc. Concedido', 'Consultores monitorados', 'var(--green)') +
    card(iconPct, mediaGeral.toFixed(1) + '%', 'Media Desconto', '<span style="color:' + mediaColor + '">' + mediaStatus + ' Limite: ' + limite + '%</span>', mediaColor) +
    card(iconAlert, String(alertas.length), 'Alertas Ativos', alertas.length > 0 ? 'Consultores acima do limite' : 'Nenhum alerta', alertas.length > 0 ? 'var(--red)' : 'var(--text3)');
}


// ========= ALERTS =========
function migGetAlertas() {
  const limite = parseFloat(_migConfig.limite_percentual) || 30;
  const minMig = parseInt(_migConfig.migracoes_para_alerta) || 10;
  const alertas = [];

  _migConsultores.forEach(c => {
    const regs = _migRegistros.filter(r => r.consultor_id === c.id);
    if (regs.length >= minMig) {
      const media = regs.reduce((s, r) => s + (parseFloat(r.percentual_desconto) || 0), 0) / regs.length;
      if (media > limite) {
        alertas.push({ consultor: c, media: media, totalMig: regs.length });
      }
    }
  });

  return alertas;
}

function migRenderAlerts() {
  const banner = document.getElementById('migAlertBanner');
  const textEl = document.getElementById('migAlertText');
  if (!banner || !textEl) return;

  const alertas = migGetAlertas();
  const badge = document.getElementById('badgeMigracoes');

  if (alertas.length === 0) {
    banner.style.display = 'none';
    if (badge) badge.style.display = 'none';
    return;
  }

  banner.style.display = 'flex';
  if (badge) { badge.style.display = ''; badge.textContent = alertas.length; }

  if (alertas.length === 1) {
    const a = alertas[0];
    textEl.innerHTML = escapeHtml(a.consultor.nome) + ' — media ' + a.media.toFixed(1) + '% em ' + a.totalMig + ' migracoes (limite: ' + (_migConfig.limite_percentual || 30) + '%)';
  } else {
    textEl.innerHTML = alertas.length + ' consultores com media acima do limite de ' + (_migConfig.limite_percentual || 30) + '%';
  }
}


// ========= TABS INTERNAS =========
function migSwitchTab(tab) {
  const tabs = ['autorizacoes', 'monitorados'];
  tabs.forEach(t => {
    const panel = document.getElementById('migPanel_' + t);
    const btn = document.getElementById('migTab_' + t);
    if (panel) panel.style.display = (t === tab) ? '' : 'none';
    if (btn) {
      btn.style.color = (t === tab) ? 'var(--accent)' : 'var(--text2)';
      btn.style.borderBottomColor = (t === tab) ? 'var(--accent)' : 'transparent';
    }
  });
}

// ========= AUTORIZACOES PONTUAIS =========
function migRenderAutorizacoes() {
  const tbody = document.getElementById('migAutTableBody');
  if (!tbody) return;

  const search = (document.getElementById('migAutSearch') || {}).value || '';
  let filtered = _migAutorizacoes;

  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(a =>
      (a.placa || '').toLowerCase().includes(s) ||
      (a.consultor_nome || '').toLowerCase().includes(s) ||
      (a.autorizado_por || '').toLowerCase().includes(s)
    );
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / _migAutPageSize));
  if (_migAutPage > totalPages) _migAutPage = totalPages;
  const start = (_migAutPage - 1) * _migAutPageSize;
  const pageItems = filtered.slice(start, start + _migAutPageSize);

  if (pageItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text3)">Nenhuma autorizacao registrada</td></tr>';
  } else {
    tbody.innerHTML = pageItems.map(a => {
      const pct = parseFloat(a.percentual_desconto) || 0;
      const pctColor = pct > 30 ? 'var(--red)' : pct > 20 ? 'var(--amber)' : 'var(--green)';
      const dataStr = a.created_at ? new Date(a.created_at).toLocaleDateString('pt-BR') : '—';
      return '<tr>' +
        '<td style="font-weight:500;font-family:monospace;font-size:.82rem">' + escapeHtml(a.placa || '') + '</td>' +
        '<td>' + escapeHtml(a.consultor_nome || '') + '</td>' +
        '<td>R$ ' + migFormatMoney(parseFloat(a.valor_autovale) || 0) + '</td>' +
        '<td>R$ ' + migFormatMoney(parseFloat(a.valor_concorrente) || 0) + '</td>' +
        '<td>R$ ' + migFormatMoney(parseFloat(a.valor_desconto) || 0) + '</td>' +
        '<td style="font-weight:600;color:' + pctColor + '">' + pct.toFixed(1) + '%</td>' +
        '<td>' + escapeHtml(a.autorizado_por || '') + '</td>' +
        '<td style="font-size:.75rem;color:var(--text3)">' + dataStr + '</td>' +
        '<td style="text-align:center"><button onclick="migCopyFromRow(\'' + escapeHtml(a.placa || '') + '\',' + (parseFloat(a.valor_autovale)||0) + ',' + (parseFloat(a.valor_concorrente)||0) + ')" style="background:none;border:none;cursor:pointer;color:var(--text3);padding:4px" title="Copiar texto"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></td>' +
      '</tr>';
    }).join('');
  }

  // Pagination
  const pagEl = document.getElementById('migAutPagination');
  if (pagEl) {
    if (totalPages <= 1) { pagEl.innerHTML = ''; }
    else {
      let html = '<span style="font-size:.72rem;color:var(--text3)">' + total + ' registro(s)</span><div style="display:flex;gap:4px">';
      if (_migAutPage > 1) html += '<button class="btn btn-sm" onclick="_migAutPage--;migRenderAutorizacoes()">Anterior</button>';
      html += '<span style="font-size:.75rem;padding:4px 8px">' + _migAutPage + ' / ' + totalPages + '</span>';
      if (_migAutPage < totalPages) html += '<button class="btn btn-sm" onclick="_migAutPage++;migRenderAutorizacoes()">Proximo</button>';
      html += '</div>';
      pagEl.innerHTML = html;
    }
  }
}


// ========= NOVA AUTORIZACAO PONTUAL (Drawer) =========
async function migOpenNovaAutorizacao() {
  // Pre-load autorizadores if empty
  if (_autorizadoresCache.length === 0) {
    try { const rows = await supabase.select('autorizadores', { filter: 'ativo=eq.true', order: 'nome.asc' }); _autorizadoresCache = rows || []; } catch(e) {}
  }

  const content = document.getElementById('drawerContent');
  if (!content) return;

  const autorizadores = _migGetAutorizadores();
  const autOpts = autorizadores.map(a => '<option value="' + escapeHtml(a) + '">' + escapeHtml(a) + '</option>').join('');

  content.innerHTML = '<div class="drawer-title">Registrar Migracao Autorizada</div>' +
    '<div style="font-size:.75rem;color:var(--text3);margin-bottom:20px">Registre uma migracao com desconto acima do limite que foi autorizada pela diretoria.</div>' +
    '<div style="display:grid;gap:14px">' +
      '<div><label style="font-size:.72rem;font-weight:600;color:var(--text3);display:block;margin-bottom:4px">Nome do Consultor</label><input id="migAut_consultor" placeholder="Nome do consultor" style="width:100%"></div>' +
      '<div><label style="font-size:.72rem;font-weight:600;color:var(--text3);display:block;margin-bottom:4px">Placa</label><input id="migAut_placa" placeholder="ABC1234" maxlength="7" style="width:100%;text-transform:uppercase"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        '<div><label style="font-size:.72rem;font-weight:600;color:var(--text3);display:block;margin-bottom:4px">Mensalidade AutoVale</label><input id="migAut_avp" placeholder="R$ 0,00" oninput="migAutCalcPreview()" inputmode="decimal" style="width:100%"></div>' +
        '<div><label style="font-size:.72rem;font-weight:600;color:var(--text3);display:block;margin-bottom:4px">Mensalidade Concorrente</label><input id="migAut_conc" placeholder="R$ 0,00" oninput="migAutCalcPreview()" inputmode="decimal" style="width:100%"></div>' +
      '</div>' +
      '<div id="migAut_preview" style="display:none;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px">' +
        '<div style="display:flex;gap:16px;align-items:center"><span style="font-size:.72rem;color:var(--text3)">Desconto:</span><span id="migAut_descVal" style="font-size:.82rem;font-weight:600">—</span><span style="font-size:.72rem;color:var(--text3);margin-left:12px">Percentual:</span><span id="migAut_pctVal" style="font-size:.82rem;font-weight:600">—</span></div>' +
      '</div>' +
      '<div><label style="font-size:.72rem;font-weight:600;color:var(--text3);display:block;margin-bottom:4px">Autorizado por</label>' +
        '<select id="migAut_autorizado" style="width:100%"><option value="">Selecione...</option>' + autOpts + '<option value="__outro__">Outro (digitar)</option></select>' +
        '<input id="migAut_autorizadoOutro" placeholder="Nome de quem autorizou" style="width:100%;margin-top:8px;display:none">' +
      '</div>' +
      '<div><label style="font-size:.72rem;font-weight:600;color:var(--text3);display:block;margin-bottom:4px">Anexo - Print da Autorizacao (opcional)</label>' +
        '<input type="file" id="migAut_anexo" accept="image/*" style="font-size:.78rem">' +
        '<span style="font-size:.68rem;color:var(--text3);display:block;margin-top:4px">Imagem sera comprimida automaticamente.</span>' +
      '</div>' +
      '<div style="margin-top:16px;display:flex;gap:10px">' +
        '<button class="btn btn-green" onclick="migSalvarAutorizacao()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><polyline points="20 6 9 17 4 12"/></svg> Salvar</button>' +
        '<button class="btn" onclick="closeDrawer()">Cancelar</button>' +
      '</div>' +
    '</div>';

  // Auto-show "outro" input
  const selAut = document.getElementById('migAut_autorizado');
  if (selAut) {
    selAut.onchange = function() {
      const outroInput = document.getElementById('migAut_autorizadoOutro');
      if (outroInput) outroInput.style.display = this.value === '__outro__' ? '' : 'none';
    };
  }

  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}


function migAutCalcPreview() {
  const avp = migParseMoneyInput(document.getElementById('migAut_avp') ? document.getElementById('migAut_avp').value : '');
  const conc = migParseMoneyInput(document.getElementById('migAut_conc') ? document.getElementById('migAut_conc').value : '');
  const previewEl = document.getElementById('migAut_preview');
  if (!avp || !conc || avp <= 0) { if (previewEl) previewEl.style.display = 'none'; return; }

  const desc = avp - conc;
  const pct = (desc / avp) * 100;
  if (previewEl) previewEl.style.display = '';
  const descEl = document.getElementById('migAut_descVal');
  const pctEl = document.getElementById('migAut_pctVal');
  if (descEl) descEl.textContent = 'R$ ' + migFormatMoney(desc);
  if (pctEl) {
    pctEl.textContent = pct.toFixed(1) + '%';
    pctEl.style.color = pct > 30 ? 'var(--red)' : pct > 20 ? 'var(--amber)' : 'var(--green)';
  }
}

async function migSalvarAutorizacao() {
  const consultor = (document.getElementById('migAut_consultor') || {}).value || '';
  const placa = (document.getElementById('migAut_placa') || {}).value || '';
  const avp = migParseMoneyInput((document.getElementById('migAut_avp') || {}).value || '');
  const conc = migParseMoneyInput((document.getElementById('migAut_conc') || {}).value || '');
  const selAut = document.getElementById('migAut_autorizado');
  let autorizado = selAut ? selAut.value : '';
  if (autorizado === '__outro__') {
    autorizado = (document.getElementById('migAut_autorizadoOutro') || {}).value || '';
  }

  if (!consultor.trim()) { showToast('Informe o nome do consultor', 'error'); return; }
  if (!placa.trim()) { showToast('Informe a placa', 'error'); return; }
  if (!avp || !conc) { showToast('Informe os valores', 'error'); return; }
  if (!autorizado.trim()) { showToast('Informe quem autorizou', 'error'); return; }

  const desconto = avp - conc;
  const percentual = (desconto / avp) * 100;

  showToast('Salvando...', 'warning');

  // Upload anexo if present
  let anexoUrl = null;
  const fileInput = document.getElementById('migAut_anexo');
  if (fileInput && fileInput.files && fileInput.files[0]) {
    anexoUrl = await migUploadAnexo(fileInput.files[0]);
  }

  const record = {
    consultor_nome: consultor.trim(),
    placa: placa.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''),
    valor_autovale: avp,
    valor_concorrente: conc,
    valor_desconto: desconto,
    percentual_desconto: Math.round(percentual * 100) / 100,
    autorizado_por: autorizado.trim(),
    anexo_url: anexoUrl,
    registrado_por: currentProfile ? currentProfile.id : null,
    registrado_por_nome: currentProfile ? currentProfile.nome : null,
    created_at: new Date().toISOString()
  };

  try {
    await supabase.insert('migracoes_autorizacoes', record);
    _migAutorizacoes.unshift(record);
    closeDrawer();
    showToast('Autorizacao registrada com sucesso!', 'success');
    migRenderAutorizacoes();
    migRenderKpis();

    // Show copy block in a modal
    const copyText = record.placa + ' - De R$ ' + migFormatMoney(avp) + ' por R$ ' + migFormatMoney(conc);
    showModal('Migracao Registrada', '<div style="text-align:center;padding:16px 0"><div style="font-size:.82rem;color:var(--text3);margin-bottom:12px">Texto para o financeiro:</div><div style="cursor:pointer;border:1px dashed var(--border-strong);border-radius:var(--radius);padding:12px 16px;background:var(--surface-2);font-family:monospace;font-size:.88rem;font-weight:500" onclick="migCopyFromRow(\'' + escapeHtml(record.placa) + '\',' + avp + ',' + conc + ');closeModal()">' + escapeHtml(copyText) + ' <span style="color:var(--text3);margin-left:8px">&#128203;</span></div><div style="font-size:.65rem;color:var(--text3);margin-top:8px">Clique para copiar</div></div>', function() { closeModal(); }, 'green', 'Fechar');
  } catch (e) {
    showToast('Erro ao salvar: ' + e.message, 'error');
  }
}


// ========= CONSULTORES MONITORADOS =========
function migRenderConsultores() {
  const cardsEl = document.getElementById('migConsultoresCards');
  const emptyEl = document.getElementById('migConsultoresEmpty');
  if (!cardsEl) return;

  if (_migConsultores.length === 0) {
    cardsEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = '';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  const limite = parseFloat(_migConfig.limite_percentual) || 30;
  const minMig = parseInt(_migConfig.migracoes_para_alerta) || 10;

  let html = '';
  _migConsultores.forEach(c => {
    const regs = _migRegistros.filter(r => r.consultor_id === c.id);
    const totalRegs = regs.length;
    const media = totalRegs > 0 ? regs.reduce((s, r) => s + (parseFloat(r.percentual_desconto) || 0), 0) / totalRegs : 0;
    const totalDesconto = regs.reduce((s, r) => s + (parseFloat(r.valor_desconto) || 0), 0);
    const emAlerta = totalRegs >= minMig && media > limite;
    const barWidth = Math.min((media / (limite * 1.3)) * 100, 100);
    const barColor = media <= 20 ? 'var(--green)' : media <= limite ? 'var(--amber)' : 'var(--red)';
    const dataAut = c.data_autorizacao ? new Date(c.data_autorizacao).toLocaleDateString('pt-BR') : '—';

    html += '<div style="background:var(--surface-2);border:1px solid ' + (emAlerta ? 'var(--amber)' : 'var(--border)') + ';border-radius:var(--radius-lg);padding:20px;margin-bottom:16px;transition:all .2s' + (emAlerta ? ';box-shadow:0 0 0 1px var(--amber)' : '') + '">';

    // Header
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">';
    html += '<div style="display:flex;align-items:center;gap:10px"><div style="width:36px;height:36px;border-radius:50%;background:' + (emAlerta ? 'var(--amber-light)' : 'var(--primary-light)') + ';display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:' + (emAlerta ? 'var(--amber)' : 'var(--primary)') + '">' + escapeHtml(c.nome.charAt(0).toUpperCase()) + '</div>';
    html += '<div><div style="font-size:.88rem;font-weight:600;color:var(--text1)">' + escapeHtml(c.nome) + '</div>';
    html += '<div style="font-size:.68rem;color:var(--text3)">Autorizado por: ' + escapeHtml(c.autorizado_por) + ' | Desde: ' + dataAut + '</div></div></div>';

    // Actions
    html += '<div style="display:flex;gap:6px">';
    html += '<button class="btn btn-sm" onclick="migRemoveConsultor(\'' + c.id + '\')" style="padding:5px 8px;color:var(--red);border-color:var(--red-light)" title="Remover"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>';
    html += '</div></div>';

    // Stats row
    html += '<div style="display:flex;align-items:center;gap:20px;margin-bottom:12px">';
    html += '<div><span style="font-size:.68rem;color:var(--text3)">Migracoes:</span> <span style="font-size:.88rem;font-weight:700;color:var(--text1)">' + totalRegs + '</span></div>';
    html += '<div><span style="font-size:.68rem;color:var(--text3)">Media:</span> <span style="font-size:.88rem;font-weight:700;color:' + barColor + '">' + media.toFixed(1) + '%</span></div>';
    html += '<div><span style="font-size:.68rem;color:var(--text3)">Total desc.:</span> <span style="font-size:.82rem;font-weight:600;color:var(--text1)">R$ ' + migFormatMoney(totalDesconto) + '</span></div>';
    html += '</div>';

    // Progress bar
    html += '<div style="position:relative;height:8px;background:var(--border);border-radius:4px;overflow:visible;margin-bottom:6px">';
    html += '<div style="height:100%;width:' + barWidth + '%;background:' + barColor + ';border-radius:4px;transition:width .5s"></div>';
    html += '<div style="position:absolute;left:' + Math.min((limite / (limite * 1.3)) * 100, 100) + '%;top:-3px;bottom:-3px;width:2px;background:var(--red);border-radius:1px" title="Limite ' + limite + '%"></div>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;font-size:.62rem;color:var(--text3)"><span>0%</span><span style="color:var(--red)">Limite ' + limite + '%</span></div>';

    // Alert message
    if (emAlerta) {
      html += '<div style="margin-top:12px;padding:10px 14px;background:var(--amber-bg);border:1px solid var(--amber-light);border-radius:var(--radius);display:flex;align-items:center;gap:8px">';
      html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      html += '<span style="font-size:.75rem;color:var(--amber);font-weight:500">Media excedeu ' + limite + '% apos ' + totalRegs + ' migracoes. Comunicar diretoria.</span>';
      html += '</div>';
    }

    // Toggle registros
    html += '<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:12px">';
    html += '<button class="btn btn-sm" onclick="migToggleRegistros(\'' + c.id + '\')" style="font-size:.72rem;padding:5px 12px" id="migToggleBtn_' + c.id + '">Ver registros &#8595;</button>';
    html += '<div id="migRegs_' + c.id + '" style="display:none;margin-top:12px">';

    if (totalRegs > 0) {
      html += '<div class="table-wrap"><table><thead><tr><th>Placa</th><th>Mens. AVP</th><th>Mens. Conc.</th><th>Desconto</th><th>%</th><th>Data</th><th></th></tr></thead><tbody>';
      regs.slice(0, 20).forEach(r => {
        const pctColor = (parseFloat(r.percentual_desconto)||0) > limite ? 'var(--red)' : (parseFloat(r.percentual_desconto)||0) > 20 ? 'var(--amber)' : 'var(--green)';
        const d = r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : '—';
        html += '<tr><td style="font-family:monospace;font-size:.78rem;font-weight:500">' + escapeHtml(r.placa||'') + '</td>';
        html += '<td>R$ ' + migFormatMoney(parseFloat(r.valor_autovale)||0) + '</td>';
        html += '<td>R$ ' + migFormatMoney(parseFloat(r.valor_concorrente)||0) + '</td>';
        html += '<td>R$ ' + migFormatMoney(parseFloat(r.valor_desconto)||0) + '</td>';
        html += '<td style="font-weight:600;color:' + pctColor + '">' + (parseFloat(r.percentual_desconto)||0).toFixed(1) + '%</td>';
        html += '<td style="font-size:.75rem;color:var(--text3)">' + d + '</td>';
        html += '<td><button onclick="migCopyFromRow(\'' + escapeHtml(r.placa||'') + '\',' + (parseFloat(r.valor_autovale)||0) + ',' + (parseFloat(r.valor_concorrente)||0) + ')" style="background:none;border:none;cursor:pointer;color:var(--text3);padding:4px" title="Copiar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></td></tr>';
      });
      html += '</tbody></table></div>';
      if (totalRegs > 20) html += '<div style="font-size:.68rem;color:var(--text3);text-align:center;margin-top:8px">Mostrando 20 de ' + totalRegs + ' registros</div>';

      // Summary
      const maior = Math.max(...regs.map(r => parseFloat(r.percentual_desconto) || 0));
      const menor = Math.min(...regs.map(r => parseFloat(r.percentual_desconto) || 0));
      html += '<div style="display:flex;gap:16px;margin-top:12px;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);font-size:.72rem;color:var(--text3)">';
      html += '<span>Total desconto: <strong style="color:var(--text1)">R$ ' + migFormatMoney(totalDesconto) + '</strong></span>';
      html += '<span>Media: <strong style="color:' + barColor + '">' + media.toFixed(1) + '%</strong></span>';
      html += '<span>Maior: <strong style="color:var(--red)">' + maior.toFixed(1) + '%</strong></span>';
      html += '<span>Menor: <strong style="color:var(--green)">' + menor.toFixed(1) + '%</strong></span>';
      html += '</div>';
    } else {
      html += '<div style="text-align:center;padding:20px;color:var(--text3);font-size:.78rem">Nenhuma migracao registrada ainda</div>';
    }

    html += '</div></div>'; // end registros toggle
    html += '</div>'; // end card
  });

  cardsEl.innerHTML = html;
}

function migToggleRegistros(consultorId) {
  const el = document.getElementById('migRegs_' + consultorId);
  const btn = document.getElementById('migToggleBtn_' + consultorId);
  if (!el) return;
  const visible = el.style.display !== 'none';
  el.style.display = visible ? 'none' : '';
  if (btn) btn.innerHTML = visible ? 'Ver registros &#8595;' : 'Ocultar registros &#8593;';
}


// ========= NOVO CONSULTOR MONITORADO (Drawer) =========
async function migOpenNovoConsultor() {
  // Pre-load autorizadores if empty
  if (_autorizadoresCache.length === 0) {
    try { const rows = await supabase.select('autorizadores', { filter: 'ativo=eq.true', order: 'nome.asc' }); _autorizadoresCache = rows || []; } catch(e) {}
  }

  const content = document.getElementById('drawerContent');
  if (!content) return;

  const autorizadores = _migGetAutorizadores();
  const autOpts = autorizadores.map(a => '<option value="' + escapeHtml(a) + '">' + escapeHtml(a) + '</option>').join('');

  content.innerHTML = '<div class="drawer-title">Novo Consultor Monitorado</div>' +
    '<div style="font-size:.75rem;color:var(--text3);margin-bottom:20px">Cadastre um consultor pre-autorizado pela diretoria para acompanhar suas migracoes.</div>' +
    '<div style="display:grid;gap:14px">' +
      '<div><label style="font-size:.72rem;font-weight:600;color:var(--text3);display:block;margin-bottom:4px">Nome do Consultor</label><input id="migCons_nome" placeholder="Nome completo" style="width:100%"></div>' +
      '<div><label style="font-size:.72rem;font-weight:600;color:var(--text3);display:block;margin-bottom:4px">Autorizado por</label>' +
        '<select id="migCons_autorizado" style="width:100%"><option value="">Selecione...</option>' + autOpts + '<option value="__outro__">Outro (digitar)</option></select>' +
        '<input id="migCons_autorizadoOutro" placeholder="Nome de quem autorizou" style="width:100%;margin-top:8px;display:none">' +
      '</div>' +
      '<div><label style="font-size:.72rem;font-weight:600;color:var(--text3);display:block;margin-bottom:4px">Data da Autorizacao</label><input type="date" id="migCons_data" style="width:100%"></div>' +
      '<div><label style="font-size:.72rem;font-weight:600;color:var(--text3);display:block;margin-bottom:4px">Observacao (opcional)</label><textarea id="migCons_obs" rows="3" placeholder="Ex: Autorizado por tempo indeterminado" style="width:100%;padding:8px 12px;border:1px solid var(--border-strong);border-radius:var(--radius);font-size:.82rem;font-family:var(--font);background:var(--surface);color:var(--text1);resize:vertical"></textarea></div>' +
      '<div style="margin-top:16px;display:flex;gap:10px">' +
        '<button class="btn btn-green" onclick="migSalvarConsultor()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><polyline points="20 6 9 17 4 12"/></svg> Salvar</button>' +
        '<button class="btn" onclick="closeDrawer()">Cancelar</button>' +
      '</div>' +
    '</div>';

  // Set default date to today
  const dataInput = document.getElementById('migCons_data');
  if (dataInput) dataInput.value = new Date().toISOString().split('T')[0];

  // Auto-show "outro" input
  const selAut = document.getElementById('migCons_autorizado');
  if (selAut) {
    selAut.onchange = function() {
      const outroInput = document.getElementById('migCons_autorizadoOutro');
      if (outroInput) outroInput.style.display = this.value === '__outro__' ? '' : 'none';
    };
  }

  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}

async function migSalvarConsultor() {
  const nome = (document.getElementById('migCons_nome') || {}).value || '';
  const selAut = document.getElementById('migCons_autorizado');
  let autorizado = selAut ? selAut.value : '';
  if (autorizado === '__outro__') {
    autorizado = (document.getElementById('migCons_autorizadoOutro') || {}).value || '';
  }
  const data = (document.getElementById('migCons_data') || {}).value || new Date().toISOString().split('T')[0];
  const obs = (document.getElementById('migCons_obs') || {}).value || '';

  if (!nome.trim()) { showToast('Informe o nome do consultor', 'error'); return; }
  if (!autorizado.trim()) { showToast('Informe quem autorizou', 'error'); return; }

  const record = {
    nome: nome.trim(),
    autorizado_por: autorizado.trim(),
    data_autorizacao: data,
    observacao: obs.trim() || null,
    ativo: true,
    created_at: new Date().toISOString()
  };

  try {
    const result = await supabase.insert('migracoes_consultores', record, { returnData: true });
    if (result && result.length > 0) record.id = result[0].id;
    _migConsultores.push(record);
    closeDrawer();
    showToast('Consultor "' + escapeHtml(nome.trim()) + '" adicionado!', 'success');
    migRenderConsultores();
    migRenderKpis();
  } catch (e) {
    showToast('Erro ao salvar: ' + e.message, 'error');
  }
}


// ========= NOVA MIGRACAO (para consultor monitorado) =========
function migOpenNovaMigracao() {
  const content = document.getElementById('drawerContent');
  if (!content) return;

  if (_migConsultores.length === 0) {
    showToast('Cadastre um consultor monitorado primeiro', 'error');
    return;
  }

  const consOpts = _migConsultores.map(c => '<option value="' + c.id + '">' + escapeHtml(c.nome) + '</option>').join('');

  content.innerHTML = '<div class="drawer-title">Registrar Migracao</div>' +
    '<div style="font-size:.75rem;color:var(--text3);margin-bottom:20px">Registre uma migracao de um consultor monitorado.</div>' +
    '<div style="display:grid;gap:14px">' +
      '<div><label style="font-size:.72rem;font-weight:600;color:var(--text3);display:block;margin-bottom:4px">Consultor</label><select id="migReg_consultor" style="width:100%">' + consOpts + '</select></div>' +
      '<div><label style="font-size:.72rem;font-weight:600;color:var(--text3);display:block;margin-bottom:4px">Placa</label><input id="migReg_placa" placeholder="ABC1234" maxlength="7" style="width:100%;text-transform:uppercase"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        '<div><label style="font-size:.72rem;font-weight:600;color:var(--text3);display:block;margin-bottom:4px">Mensalidade AutoVale</label><input id="migReg_avp" placeholder="R$ 0,00" oninput="migRegCalcPreview()" inputmode="decimal" style="width:100%"></div>' +
        '<div><label style="font-size:.72rem;font-weight:600;color:var(--text3);display:block;margin-bottom:4px">Mensalidade Concorrente</label><input id="migReg_conc" placeholder="R$ 0,00" oninput="migRegCalcPreview()" inputmode="decimal" style="width:100%"></div>' +
      '</div>' +
      '<div id="migReg_preview" style="display:none;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:10px 14px">' +
        '<div style="display:flex;gap:16px;align-items:center"><span style="font-size:.72rem;color:var(--text3)">Desconto:</span><span id="migReg_descVal" style="font-size:.82rem;font-weight:600">—</span><span style="font-size:.72rem;color:var(--text3);margin-left:12px">Percentual:</span><span id="migReg_pctVal" style="font-size:.82rem;font-weight:600">—</span></div>' +
      '</div>' +
      '<div style="margin-top:16px;display:flex;gap:10px">' +
        '<button class="btn btn-green" onclick="migSalvarRegistro()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><polyline points="20 6 9 17 4 12"/></svg> Salvar</button>' +
        '<button class="btn" onclick="closeDrawer()">Cancelar</button>' +
      '</div>' +
    '</div>';

  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}

function migRegCalcPreview() {
  const avp = migParseMoneyInput(document.getElementById('migReg_avp') ? document.getElementById('migReg_avp').value : '');
  const conc = migParseMoneyInput(document.getElementById('migReg_conc') ? document.getElementById('migReg_conc').value : '');
  const previewEl = document.getElementById('migReg_preview');
  if (!avp || !conc || avp <= 0) { if (previewEl) previewEl.style.display = 'none'; return; }

  const desc = avp - conc;
  const pct = (desc / avp) * 100;
  if (previewEl) previewEl.style.display = '';
  const descEl = document.getElementById('migReg_descVal');
  const pctEl = document.getElementById('migReg_pctVal');
  if (descEl) descEl.textContent = 'R$ ' + migFormatMoney(desc);
  if (pctEl) {
    pctEl.textContent = pct.toFixed(1) + '%';
    const limite = parseFloat(_migConfig.limite_percentual) || 30;
    pctEl.style.color = pct > limite ? 'var(--red)' : pct > 20 ? 'var(--amber)' : 'var(--green)';
  }
}


async function migSalvarRegistro() {
  const consultorId = (document.getElementById('migReg_consultor') || {}).value || '';
  const placa = (document.getElementById('migReg_placa') || {}).value || '';
  const avp = migParseMoneyInput((document.getElementById('migReg_avp') || {}).value || '');
  const conc = migParseMoneyInput((document.getElementById('migReg_conc') || {}).value || '');

  if (!consultorId) { showToast('Selecione o consultor', 'error'); return; }
  if (!placa.trim()) { showToast('Informe a placa', 'error'); return; }
  if (!avp || !conc) { showToast('Informe os valores', 'error'); return; }

  const consultor = _migConsultores.find(c => c.id === consultorId);
  const desconto = avp - conc;
  const percentual = (desconto / avp) * 100;

  const record = {
    consultor_id: consultorId,
    consultor_nome: consultor ? consultor.nome : '',
    placa: placa.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''),
    valor_autovale: avp,
    valor_concorrente: conc,
    valor_desconto: desconto,
    percentual_desconto: Math.round(percentual * 100) / 100,
    created_at: new Date().toISOString()
  };

  try {
    await supabase.insert('migracoes_registros', record);
    _migRegistros.unshift(record);
    closeDrawer();
    showToast('Migracao registrada!', 'success');
    migRenderConsultores();
    migRenderKpis();
    migRenderAlerts();

    // Show copy block
    const copyText = record.placa + ' - De R$ ' + migFormatMoney(avp) + ' por R$ ' + migFormatMoney(conc);
    showModal('Migracao Registrada', '<div style="text-align:center;padding:16px 0"><div style="font-size:.82rem;color:var(--text3);margin-bottom:12px">Texto para o financeiro:</div><div style="cursor:pointer;border:1px dashed var(--border-strong);border-radius:var(--radius);padding:12px 16px;background:var(--surface-2);font-family:monospace;font-size:.88rem;font-weight:500" onclick="migCopyFromRow(\'' + escapeHtml(record.placa) + '\',' + avp + ',' + conc + ');closeModal()">' + escapeHtml(copyText) + ' <span style="color:var(--text3);margin-left:8px">&#128203;</span></div><div style="font-size:.65rem;color:var(--text3);margin-top:8px">Clique para copiar</div></div>', function() { closeModal(); }, 'green', 'Fechar');
  } catch (e) {
    showToast('Erro ao salvar: ' + e.message, 'error');
  }
}

// ========= REMOVE CONSULTOR =========
function migRemoveConsultor(id) {
  const c = _migConsultores.find(x => x.id === id);
  if (!c) return;
  showModal('Remover Consultor', '<p style="font-size:.82rem">Deseja remover <strong>' + escapeHtml(c.nome) + '</strong> dos consultores monitorados?</p><p style="font-size:.72rem;color:var(--text3);margin-top:8px">Os registros de migracoes existentes serao mantidos.</p>', async function() {
    closeModal();
    try {
      await supabase.update('migracoes_consultores', { ativo: false }, 'id=eq.' + id);
      _migConsultores = _migConsultores.filter(x => x.id !== id);
      showToast('Consultor removido', 'success');
      migRenderConsultores();
      migRenderKpis();
      migRenderAlerts();
    } catch (e) {
      showToast('Erro: ' + e.message, 'error');
    }
  }, 'red', 'Remover');
}


// ========= UPLOAD ANEXO =========
async function migUploadAnexo(file) {
  try {
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) { showToast('Arquivo muito grande. Max: 10MB', 'error'); return null; }
    if (!file.type.startsWith('image/')) { showToast('Envie apenas imagens', 'error'); return null; }

    // Compress
    const compressed = await compressImage(file);
    const fileName = 'mig_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '.jpg';
    const resp = await fetch(SUPABASE_URL + '/storage/v1/object/migracoes/' + fileName, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + (supabase.getToken() || SUPABASE_ANON_KEY), 'Content-Type': 'image/jpeg' },
      body: compressed
    });
    if (!resp.ok) {
      // Try creating bucket first time
      if (resp.status === 404 || resp.status === 400) {
        // Bucket may not exist, try without storage
        console.warn('Upload failed (bucket may not exist):', resp.status);
        return null;
      }
      throw new Error('Upload failed: ' + resp.status);
    }
    return SUPABASE_URL + '/storage/v1/object/public/migracoes/' + fileName;
  } catch (e) {
    console.warn('migUploadAnexo error:', e);
    return null;
  }
}

// ========= HELPERS =========
function migFormatMoney(val) {
  return (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function migParseMoneyInput(str) {
  if (!str) return 0;
  // Remove "R$", spaces, dots (thousands), replace comma with dot
  let clean = str.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

function _migGetAutorizadores() {
  // Try to get from existing autorizadores cache (from Liberacoes module)
  const list = [];
  try {
    const tbody = document.getElementById('autorizadoresTableBody');
    if (tbody) {
      tbody.querySelectorAll('tr').forEach(tr => {
        const cells = tr.querySelectorAll('td');
        if (cells.length >= 1) {
          const nome = cells[0].textContent.trim();
          if (nome && nome !== 'Carregando...') list.push(nome);
        }
      });
    }
  } catch (e) {}

  // Fallback: try loading from TEMP_RELEASES autorizador names
  if (list.length === 0 && typeof TEMP_RELEASES !== 'undefined') {
    const names = new Set();
    TEMP_RELEASES.forEach(r => { if (r.autorizador_nome) names.add(r.autorizador_nome); });
    names.forEach(n => list.push(n));
  }

  // Try supabase direct (async won't work here, so use cached)
  if (list.length === 0 && typeof _autorizadoresCache !== 'undefined' && _autorizadoresCache.length > 0) {
    _autorizadoresCache.forEach(a => { if (a.nome) list.push(a.nome); });
  }

  return list;
}
