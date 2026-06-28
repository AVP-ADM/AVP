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
  await comLoadSedes();
  await comLoadOperacoes();
  comRenderKpis();
  comRenderResumoFinanceiro();
  comRenderRankings();
  comRenderTable();
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


// ========= KPIs =========
function comRenderKpis() {
  const el = document.getElementById('comKpis');
  if (!el) return;

  const totalOps = _comOperacoes.length;
  const adesoes = _comOperacoes.filter(o => o.tipo === 'adesao');
  const trocaTit = _comOperacoes.filter(o => o.tipo === 'troca_titularidade');
  const trocaPlaca = _comOperacoes.filter(o => o.tipo === 'troca_placa');
  const trocaPlano = _comOperacoes.filter(o => o.tipo === 'troca_plano');
  const confirmadas = _comOperacoes.filter(o => o.status === 'confirmado');
  const pendentes = _comOperacoes.filter(o => o.status !== 'confirmado');

  el.innerHTML = comKpiCard('Total Operacoes', totalOps, 'var(--blue)') +
    comKpiCard('Adesoes', adesoes.length, 'var(--green)') +
    comKpiCard('Troca Titular', trocaTit.length, 'var(--amber)') +
    comKpiCard('Troca Placa', trocaPlaca.length, 'var(--text2)') +
    comKpiCard('Troca Plano', trocaPlano.length, 'var(--text2)') +
    comKpiCard('Confirmadas', confirmadas.length, 'var(--green)') +
    comKpiCard('Pendentes', pendentes.length, 'var(--amber)');
}

function comKpiCard(label, value, color) {
  return '<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;text-align:center">' +
    '<div style="font-size:1.4rem;font-weight:700;color:' + color + '">' + value + '</div>' +
    '<div style="font-size:.7rem;color:var(--text3);margin-top:2px">' + label + '</div></div>';
}


// ========= RESUMO FINANCEIRO =========
function comRenderResumoFinanceiro() {
  const el = document.getElementById('comResumoFinanceiro');
  if (!el) return;

  const comissionaveis = _comOperacoes.filter(o => o.tipo === 'adesao' || o.tipo === 'troca_titularidade');
  const totalGerado = comissionaveis.reduce((s, o) => { const d = o.dados || {}; return s + (parseFloat(d.valor) || parseFloat(o.valor) || 0); }, 0);
  const totalComissoes = comCalcularTotalComissoes(comissionaveis);
  const liquidoAVP = totalGerado - totalComissoes;

  el.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;padding:16px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius)">' +
    '<div style="text-align:center"><div style="font-size:.7rem;color:var(--text3);text-transform:uppercase;letter-spacing:.3px">Total Gerado</div><div style="font-size:1.2rem;font-weight:700;color:var(--green)">R$ ' + comFormatMoney(totalGerado) + '</div></div>' +
    '<div style="text-align:center"><div style="font-size:.7rem;color:var(--text3);text-transform:uppercase;letter-spacing:.3px">Total Comissoes</div><div style="font-size:1.2rem;font-weight:700;color:var(--amber)">R$ ' + comFormatMoney(totalComissoes) + '</div></div>' +
    '<div style="text-align:center"><div style="font-size:.7rem;color:var(--text3);text-transform:uppercase;letter-spacing:.3px">Liquido AVP</div><div style="font-size:1.2rem;font-weight:700;color:var(--blue)">R$ ' + comFormatMoney(liquidoAVP) + '</div></div>' +
    '</div>';
}

function comFormatMoney(val) {
  return (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


// ========= CALCULOS DE COMISSAO =========
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


// ========= RANKINGS (admin only) =========
function comRenderRankings() {
  const el = document.getElementById('comRankings');
  if (!el) return;
  if (!currentProfile || currentProfile.nivel !== 'admin') {
    el.style.display = 'none';
    return;
  }
  el.style.display = '';

  // Group by user
  const comissionaveis = _comOperacoes.filter(o => o.tipo === 'adesao' || o.tipo === 'troca_titularidade');
  const byUser = {};
  comissionaveis.forEach(o => {
    if (!byUser[o.usuario_id]) byUser[o.usuario_id] = { ops: 0, total: 0, comissao: 0 };
    const d = o.dados || {};
    byUser[o.usuario_id].ops++;
    byUser[o.usuario_id].total += parseFloat(d.valor) || parseFloat(o.valor) || 0;
    byUser[o.usuario_id].comissao += comCalcularComissao(o);
  });

  const ranked = Object.entries(byUser).map(([uid, data]) => {
    const user = _comUsersCache.find(u => u.id === uid);
    return { nome: user ? user.nome : 'Desconhecido', ...data };
  }).sort((a, b) => b.total - a.total);


  // Ranking by volume
  let rankHtml = '<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px">' +
    '<div style="font-size:.78rem;font-weight:600;color:var(--text1);margin-bottom:10px">Ranking por Faturamento</div>';
  if (ranked.length === 0) {
    rankHtml += '<div style="font-size:.75rem;color:var(--text3);text-align:center;padding:12px">Sem dados</div>';
  } else {
    ranked.slice(0, 5).forEach((r, i) => {
      rankHtml += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">' +
        '<span style="font-size:.7rem;font-weight:700;color:var(--text3);width:18px">' + (i + 1) + '.</span>' +
        '<span style="flex:1;font-size:.78rem;font-weight:500">' + escapeHtml(r.nome) + '</span>' +
        '<span style="font-size:.75rem;color:var(--green);font-weight:600">R$ ' + comFormatMoney(r.total) + '</span></div>';
    });
  }
  rankHtml += '</div>';

  // Ranking by commission
  const rankedCom = [...ranked].sort((a, b) => b.comissao - a.comissao);
  let comHtml = '<div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px">' +
    '<div style="font-size:.78rem;font-weight:600;color:var(--text1);margin-bottom:10px">Ranking por Comissao</div>';
  if (rankedCom.length === 0) {
    comHtml += '<div style="font-size:.75rem;color:var(--text3);text-align:center;padding:12px">Sem dados</div>';
  } else {
    rankedCom.slice(0, 5).forEach((r, i) => {
      comHtml += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">' +
        '<span style="font-size:.7rem;font-weight:700;color:var(--text3);width:18px">' + (i + 1) + '.</span>' +
        '<span style="flex:1;font-size:.78rem;font-weight:500">' + escapeHtml(r.nome) + '</span>' +
        '<span style="font-size:.75rem;color:var(--amber);font-weight:600">R$ ' + comFormatMoney(r.comissao) + '</span></div>';
    });
  }
  comHtml += '</div>';

  el.innerHTML = rankHtml + comHtml;
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
  html += mkField('novaOp_sede', 'Sede', 'select_sede', '', false);


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


async function comSalvarNovaOperacao() {
  const tipo = (document.getElementById('novaOp_tipo') || {}).value;
  const sedeId = (document.getElementById('novaOp_sede') || {}).value || null;
  const gv = (id) => (document.getElementById(id) || {}).value || '';

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

  try {
    await supabase.insert('operacoes', insertData);
    showToast('Operacao registrada com sucesso!', 'success');
    closeDrawer();
    comRender();
  } catch (e) {
    showToast('Erro ao salvar: ' + e.message, 'error');
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
  showModal('Editar Sede', '<div style="display:flex;flex-direction:column;gap:12px">' +
    '<div><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Nome</label><input id="sede_nome" value="' + (s.nome || '').replace(/"/g, '&quot;') + '"></div>' +
    '<div><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Cidade</label><input id="sede_cidade" value="' + (s.cidade || '').replace(/"/g, '&quot;') + '"></div>' +
    '<div><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Estado</label><input id="sede_estado" value="' + (s.estado || '').replace(/"/g, '&quot;') + '" maxlength="2"></div>' +
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
  if (!_comOperacoes.length) { showToast('Sem dados para exportar', 'error'); return; }

  const mesLabel = (document.getElementById('comMesFilter') || {}).selectedOptions
    ? document.getElementById('comMesFilter').selectedOptions[0].text : 'Periodo';

  // Prepare data
  const rows = _comOperacoes.map(o => {
    const user = _comUsersCache.find(u => u.id === o.usuario_id);
    const d = o.dados || {};
    const sede = _comSedes.find(s => s.id === (d.sede_id || o.sede_id));
    const tipoLabels = { adesao: 'Adesao', troca_titularidade: 'Troca Titularidade', troca_placa: 'Troca Placa', troca_plano: 'Troca Plano' };
    return {
      'Tipo': tipoLabels[o.tipo] || o.tipo,
      'Associado': d.associado || o.associado || d.novo_titular || '',
      'Placa': d.placa || o.placa || d.placa_nova || '',
      'Valor (R$)': (o.tipo === 'adesao' || o.tipo === 'troca_titularidade') ? (parseFloat(d.valor) || parseFloat(o.valor) || 0) : '',
      'Comissao (R$)': (o.tipo === 'adesao' || o.tipo === 'troca_titularidade') ? comCalcularComissao(o) : '',
      'Colaborador': user ? user.nome : (d.usuario_nome || ''),
      'Sede': sede ? sede.nome : '',
      'Data': o.created_at ? new Date(o.created_at).toLocaleDateString('pt-BR') : '',
      'Status': (d.status || 'pendente') === 'confirmado' ? 'Confirmado' : 'Pendente'
    };
  });


  const comissionaveis2 = _comOperacoes.filter(o => o.tipo === 'adesao' || o.tipo === 'troca_titularidade');
  const totalGerado2 = comissionaveis2.reduce((s, o) => { const d2 = o.dados || {}; return s + (parseFloat(d2.valor) || parseFloat(o.valor) || 0); }, 0);
  const totalComissoes2 = comCalcularTotalComissoes(comissionaveis2);
  rows.push({});
  rows.push({ 'Tipo': 'RESUMO', 'Associado': '', 'Placa': '', 'Valor (R$)': totalGerado2, 'Comissao (R$)': totalComissoes2, 'Colaborador': '', 'Sede': '', 'Data': '', 'Status': 'Liquido AVP: R$ ' + comFormatMoney(totalGerado2 - totalComissoes2) });

  try {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comissoes');

    // Auto width
    const colWidths = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length + 2, 14) }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, 'AVP_Comissoes_' + mesLabel.replace(/\s/g, '_') + '.xlsx');
    showToast('Exportacao concluida!', 'success');
  } catch (e) { showToast('Erro na exportacao: ' + e.message, 'error'); }
}


// ========= LINK EXTERNO CONFIRMACAO FINANCEIRO =========
async function comGerarLinkConfirmacao(operacaoId) {
  try {
    const token = crypto.randomUUID ? crypto.randomUUID() : 'tok_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

  try {
    const rows = await supabase.select('confirmacao_tokens', { filter: 'token=eq.' + token + '&usado=eq.false' });
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
