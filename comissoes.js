// ========= COMISSOES & ADESOES MODULE =========
// Dependencias: supabase-client.js, escapeHtml(), showModal(), closeModal(),
//               showToast(), currentProfile, closeDrawer()

let _comOperacoes = [];
let _comConfig = null;
let _comConfigEspecificas = [];
let _comSedes = [];
let _comPage = 1;
const _comPageSize = 20;
let _comUsersCache = [];

// ========= INITIALIZATION =========
function comInit() {
  comPopulateMonthFilter();
  comLoadConfig();
  comRender();
}

async function comLoadUsersCache() {
  if (_comUsersCache.length) return;
  try {
    const users = await supabase.select('perfis', { select: 'id,nome,sede,ativo' });
    _comUsersCache = users || [];
  } catch (e) { console.warn('comLoadUsersCache error:', e); }
}

function comPopulateMonthFilter() {
  const sel = document.getElementById('comMesFilter');
  if (!sel) return;
  const now = new Date();
  let opts = '';
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const label = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    opts += '<option value="' + val + '"' + (i === 0 ? ' selected' : '') + '>' + label.charAt(0).toUpperCase() + label.slice(1) + '</option>';
  }
  sel.innerHTML = opts;
}

async function comLoadConfig() {
  try {
    const rows = await supabase.select('comissao_config', { filter: 'tipo=eq.geral' });
    if (rows && rows.length > 0) {
      _comConfig = rows[0];
      const inp = document.getElementById('comissaoGeralInput');
      if (inp) inp.value = _comConfig.percentual || 20;
    }

    const especificas = await supabase.select('comissao_config', { filter: 'tipo=eq.especifica' });
    _comConfigEspecificas = especificas || [];
  } catch (e) { console.warn('comLoadConfig error:', e); }
}

async function comLoadSedes() {
  try {
    const rows = await supabase.select('sedes', { order: 'nome.asc' });
    _comSedes = rows || [];
    // Populate sede filter
    const sel = document.getElementById('comSedeFilter');
    if (sel) {
      let opts = '<option value="">Todas sedes</option>';
      _comSedes.filter(s => s.ativo !== false).forEach(s => {
        opts += '<option value="' + s.id + '">' + escapeHtml(s.nome) + '</option>';
      });
      sel.innerHTML = opts;
    }
  } catch (e) { console.warn('comLoadSedes error:', e); }
}


// ========= MAIN RENDER =========
async function comRender() {
  _comPage = 1;
  await comLoadSedes();
  await comLoadOperacoes();
  comRenderKpiCards();
  comRenderChips();
  comRenderMiddleSection();
  comRenderTable();
  comApplyVisibility();
}

// ========= VISIBILITY (admin vs operador) =========
function comApplyVisibility() {
  const isAdmin = currentProfile && currentProfile.nivel === 'admin';
  // Subtitle
  const sub = document.getElementById('comSubtitle');
  if (sub) sub.textContent = isAdmin ? 'Visao geral do periodo' : 'Suas operacoes no periodo';
  // Sede filter (operador usa a dele)
  const sedeFilter = document.getElementById('comSedeFilter');
  if (sedeFilter) sedeFilter.style.display = isAdmin ? '' : 'none';
  // Export button
  const exportBtn = document.querySelector('#panel-comissoes .btn[onclick*="comExportXLSX"]');
  if (exportBtn) exportBtn.style.display = isAdmin ? '' : 'none';
  // Middle section (rankings + sedes)
  const middle = document.getElementById('comMiddleSection');
  if (middle) middle.style.display = isAdmin ? '' : 'none';
  // Table title
  const tTitle = document.getElementById('comTableTitle');
  if (tTitle) tTitle.textContent = isAdmin ? 'Operacoes Recentes' : 'Suas Operacoes Recentes';
}

// ========= KPI CARDS PRINCIPAIS =========
function comRenderKpiCards() {
  const el = document.getElementById('comKpiCards');
  if (!el) return;

  const isAdmin = currentProfile && currentProfile.nivel === 'admin';
  const comissionaveis = _comOperacoes.filter(o => o.tipo === 'adesao' || o.tipo === 'troca_titularidade');
  const totalGerado = comissionaveis.reduce((s, o) => { const d = o.dados || {}; return s + (parseFloat(d.valor) || parseFloat(o.valor) || 0); }, 0);
  const totalComissoes = comCalcularTotalComissoes(comissionaveis);
  const liquidoAVP = totalGerado - totalComissoes;
  const totalOps = _comOperacoes.length;
  const adesoes = _comOperacoes.filter(o => o.tipo === 'adesao').length;
  const trocas = totalOps - adesoes;

  // Insights contextuais
  const pctComissao = totalGerado > 0 ? Math.round(totalComissoes / totalGerado * 100) : 0;
  const pctMargem = totalGerado > 0 ? Math.round(liquidoAVP / totalGerado * 100) : 0;
  const opsDetail = adesoes + ' ades.' + (trocas > 0 ? ' ' + trocas + ' troc.' : '');

  // Labels baseados no nível
  const lblGerado = isAdmin ? 'Total Gerado' : 'Voce Gerou';
  const lblComissao = isAdmin ? 'Comissoes' : 'Sua Comissao';
  const lblOps = isAdmin ? 'Operacoes' : 'Suas Operacoes';

  // Icon SVGs (feather style)
  const iconTrending = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>';
  const iconPercent = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>';
  const iconBank = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>';
  const iconFile = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';

  const card = (icon, value, label, insight, borderColor) => {
    return '<div style="background:var(--surface-2);border:1px solid var(--border);border-left:4px solid ' + borderColor + ';border-radius:var(--radius);padding:20px;transition:transform .2s,box-shadow .2s;cursor:default" onmouseenter="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,.15)\'" onmouseleave="this.style.transform=\'\';this.style.boxShadow=\'\'">' +
      '<div style="color:' + borderColor + ';opacity:.7;margin-bottom:12px">' + icon + '</div>' +
      '<div style="font-size:1.4rem;font-weight:700;color:var(--text1);margin-bottom:4px">' + value + '</div>' +
      '<div style="font-size:.72rem;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px">' + label + '</div>' +
      '<div style="font-size:.7rem;color:var(--text3)">' + insight + '</div>' +
    '</div>';
  };

  // Insight para "Total Gerado" — comparação com mês anterior (se tiver dados)
  let insightGerado = 'Primeiro periodo com dados';
  // TODO: Quando implementar query do mês anterior, calcular variação aqui

  el.innerHTML =
    card(iconTrending, 'R$ ' + comFormatMoney(totalGerado), lblGerado, insightGerado, 'var(--green)') +
    card(iconPercent, 'R$ ' + comFormatMoney(totalComissoes), lblComissao, pctComissao + '% do faturamento', 'var(--amber)') +
    card(iconBank, 'R$ ' + comFormatMoney(liquidoAVP), 'Liquido AVP', pctMargem + '% margem', 'var(--blue)') +
    card(iconFile, String(totalOps), lblOps, opsDetail, 'var(--text3)');
}

// ========= CHIPS SECUNDÁRIOS =========
function comRenderChips() {
  const el = document.getElementById('comChips');
  if (!el) return;

  const adesoes = _comOperacoes.filter(o => o.tipo === 'adesao').length;
  const trocaTit = _comOperacoes.filter(o => o.tipo === 'troca_titularidade').length;
  const trocaPlaca = _comOperacoes.filter(o => o.tipo === 'troca_placa').length;
  const trocaPlano = _comOperacoes.filter(o => o.tipo === 'troca_plano').length;
  const confirmadas = _comOperacoes.filter(o => o.status === 'confirmado').length;
  const pendentes = _comOperacoes.filter(o => o.status !== 'confirmado').length;

  const chip = (val, label) => {
    const op = val > 0 ? '1' : '0.4';
    return '<span style="font-size:.72rem;font-weight:600;padding:4px 12px;border-radius:20px;background:var(--surface);border:1px solid var(--border);color:var(--text2);opacity:' + op + '">' + val + ' ' + label + '</span>';
  };

  const dotChip = (val, label, dotColor) => {
    const op = val > 0 ? '1' : '0.4';
    return '<span style="display:inline-flex;align-items:center;gap:5px;font-size:.72rem;font-weight:600;padding:4px 12px;border-radius:20px;background:var(--surface);border:1px solid var(--border);color:var(--text2);opacity:' + op + '"><span style="width:6px;height:6px;border-radius:50%;background:' + dotColor + '"></span>' + val + ' ' + label + '</span>';
  };

  el.innerHTML =
    chip(adesoes, 'Adesoes') +
    chip(trocaTit, 'Troca Tit.') +
    chip(trocaPlaca, 'Troca Placa') +
    chip(trocaPlano, 'Troca Plano') +
    '<span style="width:1px;height:16px;background:var(--border);margin:0 4px"></span>' +
    dotChip(confirmadas, 'Confirmada' + (confirmadas !== 1 ? 's' : ''), 'var(--green)') +
    dotChip(pendentes, 'Pendente' + (pendentes !== 1 ? 's' : ''), 'var(--amber)');
}

// ========= MIDDLE SECTION (Top Colaboradores + Por Sede) =========
function comRenderMiddleSection() {
  const el = document.getElementById('comMiddleSection');
  if (!el) return;
  if (!currentProfile || currentProfile.nivel !== 'admin') {
    el.style.display = 'none';
    return;
  }
  el.style.display = '';

  // === TOP COLABORADORES ===
  const comissionaveis = _comOperacoes.filter(o => o.tipo === 'adesao' || o.tipo === 'troca_titularidade');
  const byUser = {};
  comissionaveis.forEach(o => {
    if (!byUser[o.usuario_id]) byUser[o.usuario_id] = { ops: 0, total: 0 };
    const d = o.dados || {};
    byUser[o.usuario_id].ops++;
    byUser[o.usuario_id].total += parseFloat(d.valor) || parseFloat(o.valor) || 0;
  });

  const ranked = Object.entries(byUser).map(([uid, data]) => {
    const user = _comUsersCache.find(u => u.id === uid);
    return { nome: user ? user.nome : 'Desconhecido', ops: data.ops, total: data.total, ticket: data.ops > 0 ? data.total / data.ops : 0 };
  }).sort((a, b) => b.total - a.total).slice(0, 5);

  let colabHtml = '<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:20px">' +
    '<div style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.4px;margin-bottom:14px">Top Colaboradores</div>';

  if (ranked.length === 0) {
    colabHtml += '<div style="text-align:center;padding:20px;font-size:.78rem;color:var(--text3)">Sem movimentacao no periodo</div>';
  } else {
    // Table header
    colabHtml += '<div style="display:grid;grid-template-columns:24px 1fr 40px 90px 80px;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:4px">' +
      '<span style="font-size:.65rem;color:var(--text3);font-weight:600">#</span>' +
      '<span style="font-size:.65rem;color:var(--text3);font-weight:600">Nome</span>' +
      '<span style="font-size:.65rem;color:var(--text3);font-weight:600;text-align:center">Ops</span>' +
      '<span style="font-size:.65rem;color:var(--text3);font-weight:600;text-align:right">Faturado</span>' +
      '<span style="font-size:.65rem;color:var(--text3);font-weight:600;text-align:right">Ticket Med.</span>' +
    '</div>';
    ranked.forEach((r, i) => {
      colabHtml += '<div style="display:grid;grid-template-columns:24px 1fr 40px 90px 80px;gap:8px;padding:8px 0;align-items:center' + (i < ranked.length - 1 ? ';border-bottom:1px solid var(--border)' : '') + '">' +
        '<span style="font-size:.75rem;font-weight:700;color:var(--text3)">' + (i + 1) + '</span>' +
        '<span style="font-size:.78rem;font-weight:500;color:var(--text1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(r.nome) + '</span>' +
        '<span style="font-size:.78rem;color:var(--text2);text-align:center">' + r.ops + '</span>' +
        '<span style="font-size:.78rem;font-weight:600;color:var(--green);text-align:right">R$ ' + comFormatMoney(r.total) + '</span>' +
        '<span style="font-size:.75rem;color:var(--text2);text-align:right">R$ ' + comFormatMoney(r.ticket) + '</span>' +
      '</div>';
    });
  }
  colabHtml += '</div>';

  // === POR SEDE ===
  const bySede = {};
  _comOperacoes.forEach(o => {
    const sid = o.sede_id || (o.dados && o.dados.sede_id) || '_sem';
    if (!bySede[sid]) bySede[sid] = { ops: 0, total: 0, comissao: 0 };
    bySede[sid].ops++;
    if (o.tipo === 'adesao' || o.tipo === 'troca_titularidade') {
      const d = o.dados || {};
      bySede[sid].total += parseFloat(d.valor) || parseFloat(o.valor) || 0;
      bySede[sid].comissao += comCalcularComissao(o);
    }
  });

  const sedeRows = Object.entries(bySede).map(([sid, data]) => {
    const sede = _comSedes.find(s => s.id === sid);
    return { nome: sede ? sede.nome : 'Sem sede', ...data, liquido: data.total - data.comissao };
  }).sort((a, b) => b.total - a.total);

  let sedeHtml = '<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:20px">' +
    '<div style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.4px;margin-bottom:14px">Por Sede</div>';

  if (sedeRows.length === 0) {
    sedeHtml += '<div style="text-align:center;padding:20px;font-size:.78rem;color:var(--text3)">Sem dados</div>';
  } else {
    sedeHtml += '<div style="display:grid;grid-template-columns:1fr 40px 90px 90px;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);margin-bottom:4px">' +
      '<span style="font-size:.65rem;color:var(--text3);font-weight:600">Sede</span>' +
      '<span style="font-size:.65rem;color:var(--text3);font-weight:600;text-align:center">Ops</span>' +
      '<span style="font-size:.65rem;color:var(--text3);font-weight:600;text-align:right">Faturado</span>' +
      '<span style="font-size:.65rem;color:var(--text3);font-weight:600;text-align:right">Liquido</span>' +
    '</div>';
    sedeRows.forEach((r, i) => {
      sedeHtml += '<div style="display:grid;grid-template-columns:1fr 40px 90px 90px;gap:8px;padding:8px 0;align-items:center' + (i < sedeRows.length - 1 ? ';border-bottom:1px solid var(--border)' : '') + '">' +
        '<span style="font-size:.78rem;font-weight:500;color:var(--text1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(r.nome) + '</span>' +
        '<span style="font-size:.78rem;color:var(--text2);text-align:center">' + r.ops + '</span>' +
        '<span style="font-size:.78rem;font-weight:600;color:var(--green);text-align:right">R$ ' + comFormatMoney(r.total) + '</span>' +
        '<span style="font-size:.78rem;font-weight:500;color:var(--blue);text-align:right">R$ ' + comFormatMoney(r.liquido) + '</span>' +
      '</div>';
    });
  }
  sedeHtml += '</div>';

  el.innerHTML = colabHtml + sedeHtml;
}

async function comLoadOperacoes() {
  const mes = document.getElementById('comMesFilter');
  const mesVal = mes ? mes.value : '';
  const sede = document.getElementById('comSedeFilter');
  const sedeVal = sede ? sede.value : '';

  let filter = '';
  if (mesVal) {
    const [year, month] = mesVal.split('-');
    const start = year + '-' + month + '-01';
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    const end = year + '-' + month + '-' + String(endDate.getDate()).padStart(2, '0');
    filter = 'created_at=gte.' + start + 'T00:00:00&created_at=lte.' + end + 'T23:59:59';
  }


  // Visibility: operador sees only their own
  if (currentProfile && currentProfile.nivel !== 'admin') {
    const uid = currentProfile.id;
    filter += (filter ? '&' : '') + 'usuario_id=eq.' + uid;
  }

  if (sedeVal) {
    filter += (filter ? '&' : '') + 'sede_id=eq.' + sedeVal;
  }

  try {
    const rows = await supabase.select('operacoes', {
      filter: filter || undefined,
      order: 'created_at.desc'
    });
    _comOperacoes = rows || [];
  } catch (e) {
    console.warn('comLoadOperacoes error:', e);
    _comOperacoes = [];
  }

  // Load users cache for names
  if (!_comUsersCache.length) {
    try {
      const users = await supabase.select('perfis', { select: 'id,nome,sede' });
      _comUsersCache = users || [];
    } catch (e) { console.warn('loadUsers error:', e); }
  }
}


// ========= CALCULOS DE COMISSAO =========
function comFormatMoney(val) {
  return (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function comGetPercentual(usuarioId) {
  // Check specific rules first
  const especifica = _comConfigEspecificas.find(r => r.usuario_id === usuarioId);
  if (especifica) return parseFloat(especifica.percentual) || 20;
  // Default
  return _comConfig ? (parseFloat(_comConfig.percentual) || 20) : 20;
}

function comCalcularComissao(operacao) {
  if (operacao.tipo !== 'adesao' && operacao.tipo !== 'troca_titularidade') return 0;
  const percentual = comGetPercentual(operacao.usuario_id);
  const d = operacao.dados || {};
  const valor = parseFloat(d.valor) || parseFloat(operacao.valor) || 0;
  return valor * (percentual / 100);
}

function comCalcularTotalComissoes(operacoes) {
  return operacoes.reduce((sum, o) => sum + comCalcularComissao(o), 0);
}


// ========= TABLE RENDER =========
function comRenderTable() {
  const tbody = document.getElementById('comTableBody');
  if (!tbody) return;

  const search = (document.getElementById('comSearch') || {}).value || '';
  const tipoFilter = (document.getElementById('comTipoFilter') || {}).value || '';
  const statusFilter = (document.getElementById('comStatusFilter') || {}).value || '';

  let filtered = _comOperacoes;
  if (tipoFilter) filtered = filtered.filter(o => o.tipo === tipoFilter);
  if (statusFilter) {
    filtered = filtered.filter(o => {
      const st = (o.dados && o.dados.status) || o.status || 'pendente';
      return statusFilter === 'confirmado' ? st === 'confirmado' : st !== 'confirmado';
    });
  }
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(o => {
      const d = o.dados || {};
      return (d.associado || o.associado || '').toLowerCase().includes(s) ||
        (d.placa || o.placa || '').toLowerCase().includes(s) ||
        (d.placa_nova || '').toLowerCase().includes(s) ||
        (d.novo_titular || '').toLowerCase().includes(s);
    });
  }

  // Pagination
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / _comPageSize));
  if (_comPage > totalPages) _comPage = totalPages;
  const start = (_comPage - 1) * _comPageSize;
  const pageItems = filtered.slice(start, start + _comPageSize);


  // Helper to get field - direct column or fallback to dados JSONB
  const g = (o, field) => o[field] !== undefined && o[field] !== null ? o[field] : (o.dados && o.dados[field]);

  if (pageItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text3)">Nenhuma operacao encontrada</td></tr>';
  } else {
    tbody.innerHTML = pageItems.map(o => {
      const user = _comUsersCache.find(u => u.id === o.usuario_id);
      const userName = user ? escapeHtml(user.nome) : '—';
      const tipoLabels = { adesao: 'Adesao', troca_titularidade: 'Troca Titular', troca_placa: 'Troca Placa', troca_plano: 'Troca Plano' };
      const tipoColors = { adesao: 'var(--green)', troca_titularidade: 'var(--amber)', troca_placa: 'var(--blue)', troca_plano: 'var(--purple,#8b5cf6)' };
      const tipoLabel = tipoLabels[o.tipo] || o.tipo;
      const tipoColor = tipoColors[o.tipo] || 'var(--text2)';
      const assocName = escapeHtml(g(o, 'associado') || '—');
      const placa = escapeHtml(g(o, 'placa') || '—');
      const valor = (o.tipo === 'adesao' || o.tipo === 'troca_titularidade') ? 'R$ ' + comFormatMoney(parseFloat(g(o, 'valor')) || 0) : '—';
      const dataStr = o.created_at ? new Date(o.created_at).toLocaleDateString('pt-BR') : '—';
      const opStatus = g(o, 'status') || 'pendente';
      const statusHtml = opStatus === 'confirmado'
        ? '<span style="font-size:.7rem;font-weight:600;color:var(--green);background:var(--green)15;padding:2px 8px;border-radius:10px">Confirmado</span>'
        : '<span style="font-size:.7rem;font-weight:600;color:var(--amber);background:var(--amber)15;padding:2px 8px;border-radius:10px">Pendente</span>';

      return '<tr onclick="comOpenDetalhe(\'' + o.id + '\')" style="cursor:pointer">' +
        '<td><span style="font-size:.7rem;font-weight:600;color:' + tipoColor + ';background:' + tipoColor + '15;padding:2px 8px;border-radius:10px">' + tipoLabel + '</span></td>' +
        '<td style="font-weight:500;font-size:.82rem">' + assocName + '</td>' +
        '<td style="font-size:.78rem;color:var(--text2)">' + placa + '</td>' +
        '<td style="font-size:.82rem;font-weight:500">' + valor + '</td>' +
        '<td style="font-size:.78rem">' + userName + '</td>' +
        '<td style="font-size:.75rem;color:var(--text3)">' + dataStr + '</td>' +
        '<td>' + statusHtml + '</td></tr>';
    }).join('');
  }

  // Pagination
  comRenderPagination(total, totalPages);
}


function comRenderPagination(total, totalPages) {
  const el = document.getElementById('comPagination');
  if (!el) return;
  if (totalPages <= 1) { el.innerHTML = ''; return; }
  let html = '<span style="font-size:.72rem;color:var(--text3)">' + total + ' registro(s)</span><div style="display:flex;gap:4px">';
  if (_comPage > 1) html += '<button class="btn btn-sm" onclick="_comPage--;comRenderTable()">Anterior</button>';
  html += '<span style="font-size:.75rem;padding:4px 8px">' + _comPage + ' / ' + totalPages + '</span>';
  if (_comPage < totalPages) html += '<button class="btn btn-sm" onclick="_comPage++;comRenderTable()">Proximo</button>';
  html += '</div>';
  el.innerHTML = html;
}


// ========= DETALHE OPERACAO =========
function comOpenDetalhe(id) {
  const op = _comOperacoes.find(o => o.id === id);
  if (!op) return;
  const user = _comUsersCache.find(u => u.id === op.usuario_id);
  const tipoLabels = { adesao: 'Adesao', troca_titularidade: 'Troca Titularidade', troca_placa: 'Troca de Placa', troca_plano: 'Troca de Plano' };
  const d = op.dados || {};

  let detailHtml = '<div class="drawer-title">' + (tipoLabels[op.tipo] || op.tipo) + '</div>';
  detailHtml += '<div style="display:grid;gap:10px;margin-top:16px">';

  const field = (label, val) => '<div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--surface-2);border-radius:var(--radius);border:1px solid var(--border)"><span style="font-size:.72rem;color:var(--text3);font-weight:500">' + label + '</span><span style="font-size:.82rem;font-weight:500">' + escapeHtml(val || '—') + '</span></div>';

  detailHtml += field('Colaborador', user ? user.nome : (d.usuario_nome || '—'));
  detailHtml += field('Data', op.created_at ? new Date(op.created_at).toLocaleString('pt-BR') : '—');
  detailHtml += field('Status', (d.status || 'pendente') === 'confirmado' ? 'Confirmado' : 'Pendente');


  if (op.tipo === 'adesao') {
    const d = op.dados || {};
    detailHtml += field('Associado', op.associado);
    detailHtml += field('Placa', op.placa);
    detailHtml += field('Data Ativacao', d.data_ativacao);
    detailHtml += field('Origem Lead', d.origem_lead);
    detailHtml += field('Valor Adesao', 'R$ ' + comFormatMoney(parseFloat(d.valor_adesao) || 0));
    detailHtml += field('Valor Mensalidade', 'R$ ' + comFormatMoney(parseFloat(d.valor_mensalidade) || 0));
    detailHtml += field('Comissao (' + comGetPercentual(op.usuario_id) + '%)', 'R$ ' + comFormatMoney(comCalcularComissao(op)));
  } else if (op.tipo === 'troca_titularidade') {
    const d = op.dados || {};
    detailHtml += field('Placa', op.placa);
    detailHtml += field('Antigo Titular', d.antigo_titular);
    detailHtml += field('Novo Titular', d.novo_titular);
    detailHtml += field('Data Efetuado', d.data_efetuado);
    detailHtml += field('Data Pagamento', d.data_pagamento);
    detailHtml += field('Valor', 'R$ ' + comFormatMoney(parseFloat(op.valor) || 0));
    detailHtml += field('Situacao', d.situacao);
    detailHtml += field('Comissao (' + comGetPercentual(op.usuario_id) + '%)', 'R$ ' + comFormatMoney(comCalcularComissao(op)));
  } else if (op.tipo === 'troca_placa') {
    const d = op.dados || {};
    detailHtml += field('Associado', op.associado);
    detailHtml += field('Placa Antiga', d.placa_antiga);
    detailHtml += field('Placa Nova', d.placa_nova);
    detailHtml += field('Data Vencimento', d.data_vencimento);
    detailHtml += field('Valor Antigo Veiculo', 'R$ ' + comFormatMoney(parseFloat(d.valor_antigo_veiculo) || 0));
    detailHtml += field('Valor Novo Veiculo', 'R$ ' + comFormatMoney(parseFloat(d.valor_novo_veiculo) || 0));
    detailHtml += field('Solicitado por', d.solicitado_por);
  } else if (op.tipo === 'troca_plano') {
    const d = op.dados || {};
    detailHtml += field('Associado', op.associado);
    detailHtml += field('Plano Antigo', d.plano_antigo);
    detailHtml += field('Plano Novo', d.plano_novo);
    detailHtml += field('Valor Antigo', 'R$ ' + comFormatMoney(parseFloat(d.valor_antigo_mensalidade) || 0));
    detailHtml += field('Valor Novo', 'R$ ' + comFormatMoney(parseFloat(d.valor_novo_mensalidade) || 0));
    detailHtml += field('Solicitado por', d.solicitado_por);
  }


  detailHtml += '</div>';

  // Action buttons (admin only)
  if (currentProfile && currentProfile.nivel === 'admin') {
    detailHtml += '<div style="display:flex;gap:8px;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">';
    if (op.status !== 'confirmado') {
      detailHtml += '<button class="btn btn-green btn-sm" onclick="comConfirmarOperacao(\'' + op.id + '\')">Confirmar Pagamento</button>';
    }
    detailHtml += '<button class="btn btn-red btn-sm" onclick="comExcluirOperacao(\'' + op.id + '\')">Excluir</button>';
    detailHtml += '</div>';
  }

  document.getElementById('drawerContent').innerHTML = detailHtml;
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}

async function comConfirmarOperacao(id) {
  try {
    await supabase.update('operacoes', { status: 'confirmado', confirmado_at: new Date().toISOString() }, 'id=eq.' + id);
    showToast('Operacao confirmada', 'success');
    closeDrawer();
    comRender();
  } catch (e) { showToast('Erro: ' + e.message, 'error'); }
}

async function comExcluirOperacao(id) {
  showModal('Excluir Operacao', '<p>Deseja excluir esta operacao? Esta acao nao pode ser desfeita.</p>', async function () {
    closeModal();
    try {
      await supabase.delete('operacoes', 'id=eq.' + id);
      showToast('Operacao excluida', 'success');
      closeDrawer();
      comRender();
    } catch (e) { showToast('Erro: ' + e.message, 'error'); }
  }, 'red', 'Excluir');
}


// ========= NOVA OPERACAO (DRAWER) =========
function openNovaOperacao() {
  let html = '<div class="drawer-title">Nova Operacao</div>';
  html += '<div style="margin-top:16px">';
  html += '<label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:6px">Tipo de Operacao</label>';
  html += '<select id="novaOp_tipo" onchange="comRenderFormFields()" style="width:100%;margin-bottom:16px">';
  html += '<option value="adesao">Adesao</option>';
  html += '<option value="troca_titularidade">Troca de Titularidade</option>';
  html += '<option value="troca_placa">Troca de Placa</option>';
  html += '<option value="troca_plano">Troca de Plano</option>';
  html += '</select>';
  html += '<div id="novaOp_fields"></div>';
  html += '<button class="btn btn-green" style="width:100%;margin-top:20px" onclick="comSalvarNovaOperacao()">Salvar Operacao</button>';
  html += '</div>';

  document.getElementById('drawerContent').innerHTML = html;
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
  setTimeout(comRenderFormFields, 50);
}


function comRenderFormFields() {
  const tipo = (document.getElementById('novaOp_tipo') || {}).value || 'adesao';
  const el = document.getElementById('novaOp_fields');
  if (!el) return;

  const mkField = (id, label, type, placeholder, required, maxlength) => {
    const req = required ? ' required' : '';
    const maxl = maxlength ? ' maxlength="' + maxlength + '"' : '';
    if (type === 'select_sede') {
      let opts = '<option value="">Selecione...</option>';
      _comSedes.filter(s => s.ativo !== false).forEach(s => { opts += '<option value="' + s.id + '">' + escapeHtml(s.nome) + '</option>'; });
      return '<div style="margin-bottom:12px"><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">' + label + '</label><select id="' + id + '"' + req + '>' + opts + '</select></div>';
    }
    return '<div style="margin-bottom:12px"><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">' + label + '</label><input type="' + (type || 'text') + '" id="' + id + '" placeholder="' + (placeholder || '') + '"' + req + maxl + '></div>';
  };

  let html = '';
  // Só admin vê o campo sede (operador puxa do cadastro automaticamente)
  if (currentProfile && currentProfile.nivel === 'admin') {
    html += mkField('novaOp_sede', 'Sede', 'select_sede', '', false);
  }


  if (tipo === 'adesao') {
    html += mkField('novaOp_associado', 'Nome do Associado', 'text', 'Nome completo', true);
    html += mkField('novaOp_placa', 'Placa', 'text', 'ABC1D23', true, 7);
    html += mkField('novaOp_data_ativacao', 'Data de Ativacao', 'date', '', true);
    html += mkField('novaOp_origem_lead', 'Origem do Lead', 'text', 'Ex: Indicacao, Instagram...', false);
    html += mkField('novaOp_valor_adesao', 'Valor da Adesao (R$)', 'number', '0.00', true);
    html += mkField('novaOp_valor_mensalidade', 'Valor Mensalidade (R$)', 'number', '0.00', false);
  } else if (tipo === 'troca_titularidade') {
    html += mkField('novaOp_placa', 'Placa', 'text', 'ABC1D23', true, 7);
    html += mkField('novaOp_antigo_titular', 'Antigo Titular', 'text', 'Nome completo', true);
    html += mkField('novaOp_novo_titular', 'Novo Titular', 'text', 'Nome completo', true);
    html += mkField('novaOp_data_efetuado', 'Data Efetuado', 'date', '', true);
    html += mkField('novaOp_data_pagamento', 'Data Pagamento', 'date', '', false);
    html += mkField('novaOp_valor', 'Valor (R$)', 'number', '0.00', true);
    html += mkField('novaOp_situacao', 'Situacao', 'text', 'Ex: Concluido, Pendente', false);
  } else if (tipo === 'troca_placa') {
    html += mkField('novaOp_associado', 'Associado', 'text', 'Nome completo', true);
    html += mkField('novaOp_placa_antiga', 'Placa Antiga', 'text', 'ABC1D23', true, 7);
    html += mkField('novaOp_placa_nova', 'Placa Nova', 'text', 'ABC1D23', true, 7);
    html += mkField('novaOp_data_vencimento', 'Data de Vencimento', 'date', '', false);
    html += mkField('novaOp_valor_antigo_veiculo', 'Valor Antigo Veiculo (R$)', 'number', '0.00', false);
    html += mkField('novaOp_valor_novo_veiculo', 'Valor Novo Veiculo (R$)', 'number', '0.00', false);
    html += mkField('novaOp_solicitado_por', 'Solicitado por', 'text', '', false);
  } else if (tipo === 'troca_plano') {
    html += mkField('novaOp_associado', 'Associado', 'text', 'Nome completo', true);
    html += mkField('novaOp_plano_antigo', 'Plano Antigo', 'text', 'Ex: Basico', true);
    html += mkField('novaOp_plano_novo', 'Plano Novo', 'text', 'Ex: Premium', true);
    html += mkField('novaOp_valor_antigo_mensalidade', 'Valor Antigo Mensalidade (R$)', 'number', '0.00', false);
    html += mkField('novaOp_valor_novo_mensalidade', 'Valor Novo Mensalidade (R$)', 'number', '0.00', false);
    html += mkField('novaOp_solicitado_por', 'Solicitado por', 'text', '', false);
  }

  el.innerHTML = html;
}


let _comSaving = false; // Bug 6 fix: guard contra double-click

async function comSalvarNovaOperacao() {
  if (_comSaving) return; // Bug 6: prevenir duplo submit
  const tipo = (document.getElementById('novaOp_tipo') || {}).value;
  // Admin pode escolher sede no select; operador usa a sede do próprio cadastro
  let sedeId = null;
  if (currentProfile && currentProfile.nivel === 'admin') {
    sedeId = (document.getElementById('novaOp_sede') || {}).value || null;
  } else {
    // Puxar sede do perfil do operador
    sedeId = (currentProfile && currentProfile.sede) || null;
  }
  const gv = (id) => (document.getElementById(id) || {}).value || '';

  // Operador DEVE ter sede no cadastro
  if (!sedeId && currentProfile && currentProfile.nivel !== 'admin') {
    showToast('Sua conta nao tem sede vinculada. Peca ao admin para configurar.', 'error'); return;
  }

  // Montar todos os campos no JSONB 'dados' para evitar erros de coluna inexistente
  let dados = {
    usuario_nome: currentProfile ? currentProfile.nome : null,
    sede_id: sedeId,
    status: 'pendente'
  };

  if (tipo === 'adesao') {
    if (!gv('novaOp_associado') || !gv('novaOp_placa') || !gv('novaOp_data_ativacao') || !gv('novaOp_valor_adesao')) {
      showToast('Preencha os campos obrigatorios', 'error'); return;
    }
    dados.associado = gv('novaOp_associado');
    dados.placa = gv('novaOp_placa').toUpperCase();
    dados.valor = parseFloat(gv('novaOp_valor_adesao')) || 0;
    dados.data_ativacao = gv('novaOp_data_ativacao');
    dados.origem_lead = gv('novaOp_origem_lead');
    dados.valor_adesao = parseFloat(gv('novaOp_valor_adesao')) || 0;
    dados.valor_mensalidade = parseFloat(gv('novaOp_valor_mensalidade')) || 0;
  } else if (tipo === 'troca_titularidade') {
    if (!gv('novaOp_placa') || !gv('novaOp_antigo_titular') || !gv('novaOp_novo_titular') || !gv('novaOp_valor')) {
      showToast('Preencha os campos obrigatorios', 'error'); return;
    }
    dados.placa = gv('novaOp_placa').toUpperCase();
    dados.associado = gv('novaOp_novo_titular');
    dados.valor = parseFloat(gv('novaOp_valor')) || 0;
    dados.antigo_titular = gv('novaOp_antigo_titular');
    dados.novo_titular = gv('novaOp_novo_titular');
    dados.data_efetuado = gv('novaOp_data_efetuado');
    dados.data_pagamento = gv('novaOp_data_pagamento');
    dados.situacao = gv('novaOp_situacao');
  } else if (tipo === 'troca_placa') {
    if (!gv('novaOp_associado') || !gv('novaOp_placa_antiga') || !gv('novaOp_placa_nova')) {
      showToast('Preencha os campos obrigatorios', 'error'); return;
    }
    dados.associado = gv('novaOp_associado');
    dados.placa = gv('novaOp_placa_nova').toUpperCase();
    dados.valor = 0;
    dados.placa_antiga = gv('novaOp_placa_antiga').toUpperCase();
    dados.placa_nova = gv('novaOp_placa_nova').toUpperCase();
    dados.data_vencimento = gv('novaOp_data_vencimento');
    dados.valor_antigo_veiculo = parseFloat(gv('novaOp_valor_antigo_veiculo')) || 0;
    dados.valor_novo_veiculo = parseFloat(gv('novaOp_valor_novo_veiculo')) || 0;
    dados.solicitado_por = gv('novaOp_solicitado_por');
  } else if (tipo === 'troca_plano') {
    if (!gv('novaOp_associado') || !gv('novaOp_plano_antigo') || !gv('novaOp_plano_novo')) {
      showToast('Preencha os campos obrigatorios', 'error'); return;
    }
    dados.associado = gv('novaOp_associado');
    dados.placa = '';
    dados.valor = 0;
    dados.plano_antigo = gv('novaOp_plano_antigo');
    dados.plano_novo = gv('novaOp_plano_novo');
    dados.valor_antigo_mensalidade = parseFloat(gv('novaOp_valor_antigo_mensalidade')) || 0;
    dados.valor_novo_mensalidade = parseFloat(gv('novaOp_valor_novo_mensalidade')) || 0;
    dados.solicitado_por = gv('novaOp_solicitado_por');
  }

  // Insert usando colunas diretas da tabela operacoes
  const insertData = {
    tipo: tipo,
    usuario_id: currentProfile ? currentProfile.id : null,
    usuario_nome: currentProfile ? currentProfile.nome : null,
    sede_id: dados.sede_id || null,
    associado: dados.associado || null,
    placa: dados.placa || null,
    valor: dados.valor || 0,
    status: 'pendente',
    dados: dados
  };

  // Bug 6 fix: desabilitar botão durante save
  _comSaving = true;
  const saveBtn = document.querySelector('#novaOp_fields ~ .btn-green, #novaOp_fields + .btn-green');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Salvando...'; }

  try {
    await supabase.insert('operacoes', insertData);
    showToast('Operacao registrada com sucesso!', 'success');
    closeDrawer();
    comRender();
  } catch (e) {
    showToast('Erro ao salvar: ' + e.message, 'error');
  } finally {
    _comSaving = false;
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Salvar Operacao'; }
  }
}


// ========= CRUD SEDES =========
async function renderSedes() {
  const tbody = document.getElementById('sedesTableBody');
  if (!tbody) return;
  if (!currentProfile || currentProfile.nivel !== 'admin') {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text3)">Apenas administradores podem gerenciar sedes.</td></tr>';
    return;
  }
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px"><div class="spinner" style="margin:0 auto"></div></td></tr>';
  try {
    const rows = await supabase.select('sedes', { order: 'nome.asc' });
    _comSedes = rows || [];
    if (!_comSedes.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text3)">Nenhuma sede cadastrada.</td></tr>';
      return;
    }
    tbody.innerHTML = _comSedes.map(s => {
      const statusHtml = s.ativo !== false
        ? '<span style="color:var(--green);font-weight:500;font-size:.75rem">Ativa</span>'
        : '<span style="color:var(--red);font-weight:500;font-size:.75rem">Inativa</span>';
      return '<tr style="' + (s.ativo === false ? 'opacity:.5' : '') + '">' +
        '<td style="font-weight:500">' + escapeHtml(s.nome) + '</td>' +
        '<td style="font-size:.78rem;color:var(--text2)">' + escapeHtml(s.cidade || '—') + '</td>' +
        '<td style="font-size:.78rem;color:var(--text2)">' + escapeHtml(s.estado || '—') + '</td>' +
        '<td>' + statusHtml + '</td>' +
        '<td><div style="display:flex;gap:4px">' +
          '<button class="btn btn-sm" onclick="openEditSede(\'' + s.id + '\')" title="Editar" style="padding:3px 6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
          '<button class="btn btn-sm ' + (s.ativo !== false ? 'btn-red' : '') + '" onclick="toggleSedeStatus(\'' + s.id + '\',' + (s.ativo !== false ? 'false' : 'true') + ')" title="' + (s.ativo !== false ? 'Desativar' : 'Reativar') + '" style="padding:3px 6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (s.ativo !== false ? '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>' : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>') + '</svg></button>' +
        '</div></td></tr>';
    }).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--red)">Erro: ' + e.message + '</td></tr>';
  }
}


function openCreateSede() {
  showModal('Nova Sede', '<div style="display:flex;flex-direction:column;gap:12px">' +
    '<div><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Nome</label><input id="sede_nome" placeholder="Nome da sede"></div>' +
    '<div><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Cidade</label><input id="sede_cidade" placeholder="Cidade"></div>' +
    '<div><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Estado</label><input id="sede_estado" placeholder="Ex: SP, RJ, MG" maxlength="2"></div>' +
    '</div>', async function () {
    const nome = document.getElementById('sede_nome').value.trim();
    if (!nome) { showToast('Informe o nome da sede', 'error'); return; }
    closeModal();
    try {
      await supabase.insert('sedes', {
        nome,
        cidade: document.getElementById('sede_cidade').value.trim() || null,
        estado: document.getElementById('sede_estado').value.trim().toUpperCase() || null
      });
      showToast('Sede criada com sucesso', 'success');
      renderSedes();
    } catch (e) { showToast('Erro: ' + e.message, 'error'); }
  }, 'green', 'Criar');
}


function openEditSede(id) {
  const s = _comSedes.find(x => x.id === id);
  if (!s) return;
  // Bug 9 fix: usar escapeHtml completo em vez de só escapar aspas duplas
  const safeNome = escapeHtml(s.nome || '');
  const safeCidade = escapeHtml(s.cidade || '');
  const safeEstado = escapeHtml(s.estado || '');
  showModal('Editar Sede', '<div style="display:flex;flex-direction:column;gap:12px">' +
    '<div><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Nome</label><input id="sede_nome" value="' + safeNome + '"></div>' +
    '<div><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Cidade</label><input id="sede_cidade" value="' + safeCidade + '"></div>' +
    '<div><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Estado</label><input id="sede_estado" value="' + safeEstado + '" maxlength="2"></div>' +
    '</div>', async function () {
    const nome = document.getElementById('sede_nome').value.trim();
    if (!nome) { showToast('Informe o nome', 'error'); return; }
    closeModal();
    try {
      await supabase.update('sedes', {
        nome,
        cidade: document.getElementById('sede_cidade').value.trim() || null,
        estado: document.getElementById('sede_estado').value.trim().toUpperCase() || null
      }, 'id=eq.' + id);
      showToast('Sede atualizada', 'success');
      renderSedes();
    } catch (e) { showToast('Erro: ' + e.message, 'error'); }
  }, 'blue', 'Salvar');
}

async function toggleSedeStatus(id, newStatus) {
  try {
    await supabase.update('sedes', { ativo: newStatus }, 'id=eq.' + id);
    showToast(newStatus ? 'Sede reativada' : 'Sede desativada', 'success');
    renderSedes();
  } catch (e) { showToast('Erro: ' + e.message, 'error'); }
}


// ========= COMISSAO CONFIG =========
async function salvarComissaoGeral() {
  const inp = document.getElementById('comissaoGeralInput');
  const val = parseFloat(inp ? inp.value : 20) || 20;
  try {
    if (_comConfig && _comConfig.id) {
      await supabase.update('comissao_config', { percentual: val }, 'id=eq.' + _comConfig.id);
    } else {
      await supabase.insert('comissao_config', { tipo: 'geral', percentual: val });
    }
    _comConfig = _comConfig || {};
    _comConfig.percentual = val;
    showToast('Comissao geral salva: ' + val + '%', 'success');
  } catch (e) { showToast('Erro: ' + e.message, 'error'); }
}

async function renderComissaoEspecificas() {
  const tbody = document.getElementById('comissaoEspecificaBody');
  if (!tbody) return;
  try {
    const rows = await supabase.select('comissao_config', { filter: 'tipo=eq.especifica', order: 'created_at.desc' });
    _comConfigEspecificas = rows || [];
    if (!_comConfigEspecificas.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text3)">Nenhuma regra especifica</td></tr>';
      return;
    }
    tbody.innerHTML = _comConfigEspecificas.map(r => {
      const user = _comUsersCache.find(u => u.id === r.usuario_id);
      const sede = _comSedes.find(s => s.id === r.sede_id);
      return '<tr>' +
        '<td style="font-weight:500;font-size:.82rem">' + escapeHtml(user ? user.nome : r.usuario_id || '—') + '</td>' +
        '<td style="font-size:.78rem;color:var(--text2)">' + escapeHtml(sede ? sede.nome : '—') + '</td>' +
        '<td style="font-size:.82rem;font-weight:600">' + (r.percentual || 20) + '%</td>' +
        '<td><div style="display:flex;gap:4px">' +
          '<button class="btn btn-sm" onclick="openEditComissaoEspecifica(\'' + r.id + '\')" style="padding:3px 6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
          '<button class="btn btn-sm btn-red" onclick="deleteComissaoEspecifica(\'' + r.id + '\')" style="padding:3px 6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
        '</div></td></tr>';
    }).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--red)">Erro: ' + e.message + '</td></tr>';
  }
}


function openCreateComissaoEspecifica() {
  // Build user options
  let userOpts = '<option value="">Selecione colaborador...</option>';
  _comUsersCache.filter(u => u.ativo !== false).forEach(u => {
    userOpts += '<option value="' + u.id + '">' + escapeHtml(u.nome) + '</option>';
  });
  let sedeOpts = '<option value="">Todas sedes</option>';
  _comSedes.filter(s => s.ativo !== false).forEach(s => {
    sedeOpts += '<option value="' + s.id + '">' + escapeHtml(s.nome) + '</option>';
  });

  showModal('Nova Regra de Comissao', '<div style="display:flex;flex-direction:column;gap:12px">' +
    '<div><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Colaborador</label><select id="comEsp_user">' + userOpts + '</select></div>' +
    '<div><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Sede (opcional)</label><select id="comEsp_sede">' + sedeOpts + '</select></div>' +
    '<div><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Percentual de Comissao (%)</label><input id="comEsp_pct" type="number" min="0" max="100" step="0.5" value="20"></div>' +
    '</div>', async function () {
    const userId = document.getElementById('comEsp_user').value;
    const sedeId = document.getElementById('comEsp_sede').value || null;
    const pct = parseFloat(document.getElementById('comEsp_pct').value) || 20;
    if (!userId) { showToast('Selecione um colaborador', 'error'); return; }
    closeModal();
    try {
      await supabase.insert('comissao_config', { tipo: 'especifica', usuario_id: userId, sede_id: sedeId, percentual: pct });
      showToast('Regra criada', 'success');
      renderComissaoEspecificas();
      comLoadConfig();
    } catch (e) { showToast('Erro: ' + e.message, 'error'); }
  }, 'green', 'Criar');
}


function openEditComissaoEspecifica(id) {
  const r = _comConfigEspecificas.find(x => x.id === id);
  if (!r) return;
  showModal('Editar Regra', '<div style="display:flex;flex-direction:column;gap:12px">' +
    '<div><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Percentual de Comissao (%)</label><input id="comEsp_pct" type="number" min="0" max="100" step="0.5" value="' + (r.percentual || 20) + '"></div>' +
    '</div>', async function () {
    const pct = parseFloat(document.getElementById('comEsp_pct').value) || 20;
    closeModal();
    try {
      await supabase.update('comissao_config', { percentual: pct }, 'id=eq.' + id);
      showToast('Regra atualizada', 'success');
      renderComissaoEspecificas();
      comLoadConfig();
    } catch (e) { showToast('Erro: ' + e.message, 'error'); }
  }, 'blue', 'Salvar');
}

async function deleteComissaoEspecifica(id) {
  showModal('Excluir Regra', '<p>Excluir esta regra de comissao especifica?</p>', async function () {
    closeModal();
    try {
      await supabase.delete('comissao_config', 'id=eq.' + id);
      showToast('Regra excluida', 'success');
      renderComissaoEspecificas();
      comLoadConfig();
    } catch (e) { showToast('Erro: ' + e.message, 'error'); }
  }, 'red', 'Excluir');
}


// ========= EXPORTACAO XLSX =========
function comExportXLSX() {
  if (typeof XLSX === 'undefined') {
    showToast('Biblioteca de exportacao nao carregou. Recarregue a pagina e tente novamente.', 'error');
    return;
  }
  if (!_comOperacoes.length) { showToast('Sem dados para exportar', 'error'); return; }

  const mesLabel = (document.getElementById('comMesFilter') || {}).selectedOptions
    ? document.getElementById('comMesFilter').selectedOptions[0].text : 'Periodo';

  // === STYLES ===
  var S = {
    title: { font: { bold: true, sz: 13, color: { rgb: '1B2A4A' } } },
    sub: { font: { sz: 9, color: { rgb: '6B7280' }, italic: true } },
    sec: { font: { bold: true, sz: 9, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1B2A4A' } }, alignment: { vertical: 'center' } },
    hd: { font: { bold: true, sz: 8, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4B5563' } }, alignment: { horizontal: 'center', vertical: 'center' } },
    lbl: { font: { bold: true, sz: 8, color: { rgb: '6B7280' } }, alignment: { horizontal: 'right' } },
    vGr: { font: { bold: true, sz: 11, color: { rgb: '16A34A' } }, numFmt: '#,##0.00' },
    vAm: { font: { bold: true, sz: 11, color: { rgb: 'D97706' } }, numFmt: '#,##0.00' },
    vBl: { font: { bold: true, sz: 11, color: { rgb: '2563EB' } }, numFmt: '#,##0.00' },
    vBd: { font: { bold: true, sz: 10, color: { rgb: '1F2937' } } },
    c: { font: { sz: 9, color: { rgb: '374151' } } },
    cc: { font: { sz: 9, color: { rgb: '374151' } }, alignment: { horizontal: 'center' } },
    m: { font: { sz: 9, color: { rgb: '374151' } }, numFmt: '#,##0.00', alignment: { horizontal: 'right' } },
    mb: { font: { bold: true, sz: 9, color: { rgb: '1F2937' } }, numFmt: '#,##0.00', alignment: { horizontal: 'right' } },
    ok: { font: { bold: true, sz: 8, color: { rgb: '16A34A' } }, alignment: { horizontal: 'center' } },
    pn: { font: { bold: true, sz: 8, color: { rgb: 'D97706' } }, alignment: { horizontal: 'center' } },
    ft: { font: { sz: 7, color: { rgb: '9CA3AF' }, italic: true } }
  };

  var g = function(o, f) { return (o[f] != null) ? o[f] : (o.dados && o.dados[f]) || null; };
  var tipoL = { adesao: 'Adesao', troca_titularidade: 'Troca Titularidade', troca_placa: 'Troca Placa', troca_plano: 'Troca Plano' };

  // === DATA ===
  var coms = _comOperacoes.filter(function(o) { return o.tipo === 'adesao' || o.tipo === 'troca_titularidade'; });
  var totG = coms.reduce(function(s, o) { return s + (parseFloat(g(o, 'valor')) || 0); }, 0);
  var totC = comCalcularTotalComissoes(coms);
  var liq = totG - totC;
  var nOps = _comOperacoes.length;
  var nAd = _comOperacoes.filter(function(o) { return o.tipo === 'adesao'; }).length;
  var nConf = _comOperacoes.filter(function(o) { return (g(o, 'status') || 'pendente') === 'confirmado'; }).length;

  // Group by sede
  var bySede = {};
  _comOperacoes.forEach(function(o) {
    var sid = g(o, 'sede_id') || '_sem';
    if (!bySede[sid]) bySede[sid] = [];
    bySede[sid].push(o);
  });

  // Ranking
  var byU = {};
  coms.forEach(function(o) {
    var uid = o.usuario_id || 'x';
    if (!byU[uid]) byU[uid] = { nome: '', total: 0, com: 0, ops: 0 };
    var u = _comUsersCache.find(function(x) { return x.id === uid; });
    byU[uid].nome = u ? u.nome : (g(o, 'usuario_nome') || '—');
    byU[uid].total += parseFloat(g(o, 'valor')) || 0;
    byU[uid].com += comCalcularComissao(o);
    byU[uid].ops++;
  });
  var rank = Object.values(byU).sort(function(a, b) { return b.total - a.total; });

  try {
    var wb = XLSX.utils.book_new();

    // ========== DASHBOARD ==========
    var D = [];
    D.push([{v:'AVP - Relatorio de Comissoes',s:S.title},'','','','']);
    D.push([{v:mesLabel+' | '+new Date().toLocaleDateString('pt-BR')+' '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),s:S.sub}]);
    D.push([{v:'RESUMO FINANCEIRO',s:S.sec},{v:'',s:S.sec},{v:'',s:S.sec},{v:'',s:S.sec},{v:'',s:S.sec}]);
    D.push([{v:'Total Gerado:',s:S.lbl},{v:totG,s:S.vGr},{v:'Comissoes:',s:S.lbl},{v:totC,s:S.vAm},{v:''}]);
    D.push([{v:'Liquido AVP:',s:S.lbl},{v:liq,s:S.vBl},{v:'Margem:',s:S.lbl},{v:totG>0?Math.round(liq/totG*100)+'%':'—',s:S.vBd},{v:''}]);
    D.push([{v:'Operacoes: '+nOps,s:S.c},{v:'Adesoes: '+nAd,s:S.c},{v:'Confirmadas: '+nConf,s:S.c},{v:'Pendentes: '+(nOps-nConf),s:S.c},{v:''}]);
    D.push([{v:'RANKING',s:S.sec},{v:'',s:S.sec},{v:'',s:S.sec},{v:'',s:S.sec},{v:'',s:S.sec}]);
    D.push([{v:'#',s:S.hd},{v:'Colaborador',s:S.hd},{v:'Ops',s:S.hd},{v:'Faturamento',s:S.hd},{v:'Comissao',s:S.hd}]);
    rank.forEach(function(r, i) {
      D.push([{v:i+1,s:S.cc},{v:r.nome,s:S.c},{v:r.ops,s:S.cc},{v:r.total,s:S.m},{v:r.com,s:S.m}]);
    });
    if(!rank.length) D.push([{v:'',s:S.cc},{v:'Sem dados no periodo',s:S.c},{v:'',s:S.cc},{v:'',s:S.m},{v:'',s:S.m}]);
    D.push([{v:'POR SEDE',s:S.sec},{v:'',s:S.sec},{v:'',s:S.sec},{v:'',s:S.sec},{v:'',s:S.sec}]);
    D.push([{v:'Sede',s:S.hd},{v:'Ops',s:S.hd},{v:'Faturamento',s:S.hd},{v:'Comissoes',s:S.hd},{v:'Liquido',s:S.hd}]);
    Object.entries(bySede).forEach(function(entry) {
      var sid=entry[0], ops=entry[1];
      var sede=_comSedes.find(function(x){return x.id===sid;});
      var nm=sede?sede.nome:'Sem sede';
      var sc=ops.filter(function(o){return o.tipo==='adesao'||o.tipo==='troca_titularidade';});
      var sg=sc.reduce(function(s,o){return s+(parseFloat(g(o,'valor'))||0);},0);
      var scom=comCalcularTotalComissoes(sc);
      D.push([{v:nm,s:S.c},{v:ops.length,s:S.cc},{v:sg,s:S.m},{v:scom,s:S.m},{v:sg-scom,s:S.mb}]);
    });
    D.push([{v:'AutoVale Prevencoes - Documento confidencial',s:S.ft}]);

    var wD=XLSX.utils.aoa_to_sheet(D);
    wD['!cols']=[{wch:18},{wch:20},{wch:14},{wch:14},{wch:13}];
    XLSX.utils.book_append_sheet(wb,wD,'Dashboard');

    // ========== ABAS POR SEDE ==========
    Object.entries(bySede).forEach(function(entry) {
      var sid=entry[0], ops=entry[1];
      var sede=_comSedes.find(function(x){return x.id===sid;});
      var nm=sede?sede.nome:'Sem sede';
      var sn=nm.substring(0,28);
      var sc=ops.filter(function(o){return o.tipo==='adesao'||o.tipo==='troca_titularidade';});
      var sg=sc.reduce(function(s,o){return s+(parseFloat(g(o,'valor'))||0);},0);
      var scom=comCalcularTotalComissoes(sc);

      var R=[];
      R.push([{v:nm+' — '+mesLabel,s:S.title},'','','','','','','']);
      R.push([{v:'Faturamento:',s:S.lbl},{v:sg,s:S.vGr},{v:'Comissoes:',s:S.lbl},{v:scom,s:S.vAm},{v:'Liquido:',s:S.lbl},{v:sg-scom,s:S.vBl},{v:'Ops:',s:S.lbl},{v:ops.length,s:S.vBd}]);
      R.push([{v:'Tipo',s:S.hd},{v:'Associado',s:S.hd},{v:'Placa',s:S.hd},{v:'Valor',s:S.hd},{v:'Comissao',s:S.hd},{v:'Colaborador',s:S.hd},{v:'Data',s:S.hd},{v:'Status',s:S.hd}]);
      ops.forEach(function(o) {
        var u=_comUsersCache.find(function(x){return x.id===o.usuario_id;});
        var st=g(o,'status')||'pendente';
        var val=(o.tipo==='adesao'||o.tipo==='troca_titularidade')?(parseFloat(g(o,'valor'))||0):0;
        R.push([
          {v:tipoL[o.tipo]||o.tipo,s:S.cc},
          {v:g(o,'associado')||'—',s:S.c},
          {v:g(o,'placa')||'—',s:S.cc},
          {v:val,s:S.m},
          {v:comCalcularComissao(o),s:S.m},
          {v:u?u.nome:(g(o,'usuario_nome')||'—'),s:S.c},
          {v:o.created_at?new Date(o.created_at).toLocaleDateString('pt-BR'):'—',s:S.cc},
          {v:st==='confirmado'?'Confirmado':'Pendente',s:st==='confirmado'?S.ok:S.pn}
        ]);
      });
      R.push([{v:'',s:S.c},{v:'',s:S.c},{v:'TOTAL',s:S.hd},{v:sg,s:S.mb},{v:scom,s:S.mb},{v:'',s:S.c},{v:'',s:S.c},{v:'',s:S.c}]);

      var ws=XLSX.utils.aoa_to_sheet(R);
      ws['!cols']=[{wch:16},{wch:20},{wch:9},{wch:12},{wch:12},{wch:18},{wch:10},{wch:11}];
      XLSX.utils.book_append_sheet(wb,ws,sn);
    });

    XLSX.writeFile(wb,'AVP_Comissoes_'+mesLabel.replace(/\s/g,'_')+'.xlsx');
    showToast('Exportacao concluida!','success');
  } catch(e) { showToast('Erro na exportacao: '+e.message,'error'); }
}


// ========= LINK EXTERNO CONFIRMACAO FINANCEIRO =========
async function comGerarLinkConfirmacao(operacaoId) {
  try {
    // Bug 7 fix: fallback criptograficamente seguro quando crypto.randomUUID não existe
    let token;
    if (crypto.randomUUID) {
      token = crypto.randomUUID();
    } else {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      token = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
      token = token.slice(0,8)+'-'+token.slice(8,12)+'-'+token.slice(12,16)+'-'+token.slice(16,20)+'-'+token.slice(20);
    }
    await supabase.insert('confirmacao_tokens', {
      operacao_id: operacaoId,
      token: token,
      usado: false,
      expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    const baseUrl = window.location.origin + window.location.pathname;
    const link = baseUrl + '?confirmar=' + token;
    // Copy to clipboard
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(link);
      showToast('Link copiado para a area de transferencia!', 'success');
    } else {
      prompt('Copie este link e envie ao financeiro:', link);
    }
    return link;
  } catch (e) {
    showToast('Erro ao gerar link: ' + e.message, 'error');
    return null;
  }
}

// Check URL for confirmation token on page load
async function comCheckConfirmacaoToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('confirmar');
  if (!token) return;

  // Bug 4 fix: Validar formato do token antes de usar no filtro REST (previne injection)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const tokRegex = /^tok_\d+_[a-z0-9]+$/i;
  if (!uuidRegex.test(token) && !tokRegex.test(token)) {
    showToast('Link invalido', 'error');
    window.history.replaceState({}, '', window.location.pathname);
    return;
  }

  try {
    const rows = await supabase.select('confirmacao_tokens', { filter: 'token=eq.' + encodeURIComponent(token) + '&usado=eq.false' });
    if (!rows || rows.length === 0) {
      showToast('Link invalido ou ja utilizado', 'error');
      return;
    }
    const tokenData = rows[0];
    // Check expiration
    if (tokenData.expira_em && new Date(tokenData.expira_em) < new Date()) {
      showToast('Link expirado', 'error');
      return;
    }
    // Confirm the operation
    await supabase.update('operacoes', { status: 'confirmado', confirmado_at: new Date().toISOString() }, 'id=eq.' + tokenData.operacao_id);
    await supabase.update('confirmacao_tokens', { usado: true }, 'id=eq.' + tokenData.id);
    showToast('Pagamento confirmado com sucesso!', 'success');
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
  } catch (e) {
    showToast('Erro ao confirmar: ' + e.message, 'error');
  }
}
// ========= FIM COMISSOES MODULE =========
