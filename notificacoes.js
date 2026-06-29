// ========= CENTRAL DE NOTIFICAÇÕES =========
// Dependencias: supabase-client.js, escapeHtml(), showModal(), closeModal(),
//               showToast(), currentProfile, closeDrawer()

let _notificacoes = [];
let _notifLeituras = [];
let _notifPendentes = [];
let _notifAllUsers = [];

// ========= INITIALIZATION =========
async function notifInit() {
  await notifLoadPendentes();
  notifUpdateBadge();
  notifUpdateBanner();
}

// ========= LOAD DATA =========
async function notifLoadPendentes() {
  if (!currentProfile || !currentProfile.id) return;
  try {
    // Carregar todas notificações não arquivadas e publicadas
    const now = new Date().toISOString();
    const notifs = await supabase.select('notificacoes', {
      filter: 'arquivado=eq.false&publicado_em=lte.' + now,
      order: 'publicado_em.desc'
    });
    _notificacoes = notifs || [];

    // Carregar leituras do usuário atual
    const leituras = await supabase.select('leituras_notificacoes', {
      filter: 'usuario_id=eq.' + currentProfile.id
    });
    _notifLeituras = leituras || [];

    // Filtrar notificações que se aplicam ao usuário atual
    _notifPendentes = [];
    for (const n of _notificacoes) {
      if (!notifAplicaAoUsuario(n, currentProfile)) continue;
      const leitura = _notifLeituras.find(l => l.notificacao_id === n.id);
      if (!leitura || leitura.status !== 'confirmada') {
        _notifPendentes.push(n);
      }
    }
  } catch (e) { console.warn('notifLoadPendentes error:', e); }
}


// ========= PÚBLICO-ALVO LOGIC =========
function notifAplicaAoUsuario(notif, profile) {
  const pa = notif.publico_alvo || { tipo: 'todos' };
  const tipo = pa.tipo || 'todos';

  if (tipo === 'todos') return true;

  if (tipo === 'todos_exceto') {
    if (pa.excluir_usuarios && pa.excluir_usuarios.includes(profile.id)) return false;
    if (pa.excluir_setores && pa.excluir_setores.includes(profile.setor)) return false;
    if (pa.excluir_sedes && pa.excluir_sedes.includes(profile.sede)) return false;
    return true;
  }

  if (tipo === 'admins') return profile.nivel === 'admin';

  if (tipo === 'setor' && pa.setor) {
    return profile.setor === pa.setor;
  }

  if (tipo === 'sede' && pa.sede_id) {
    return profile.sede === pa.sede_id;
  }

  if (tipo === 'usuarios' && pa.usuario_ids) {
    return pa.usuario_ids.includes(profile.id);
  }

  return true;
}


// ========= BADGE & BANNER =========
function notifUpdateBadge() {
  const bell = document.getElementById('notifBell');
  const badge = document.getElementById('notifBadge');
  if (!bell || !badge) return;
  const count = _notifPendentes.length;
  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : count;
    badge.style.display = '';
    bell.classList.add('has-notif');
  } else {
    badge.style.display = 'none';
    bell.classList.remove('has-notif');
  }
}

function notifUpdateBanner() {
  // Removido: banner não é mais usado. Lembrete persistente fica apenas no sino com badge.
  // O modal ao login garante que o usuário veja pelo menos 1 vez.
  const banner = document.getElementById('notifBanner');
  if (banner) { banner.remove(); }
  document.body.style.paddingTop = '';
}


// ========= MODAL AO LOGIN =========
function notifShowLoginModal() {
  if (_notifPendentes.length === 0) return;
  const n = _notifPendentes[_notifPendentes.length - 1]; // mais antiga pendente
  const dataStr = n.publicado_em ? new Date(n.publicado_em).toLocaleString('pt-BR') : '';

  const modalHtml = '<div style="text-align:left">' +
    '<div style="font-size:.7rem;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:12px;display:flex;align-items:center;gap:6px">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' +
      'Comunicado Importante</div>' +
    '<div style="font-size:1.1rem;font-weight:700;color:var(--text1);margin-bottom:8px">' + escapeHtml(n.titulo) + '</div>' +
    '<div style="font-size:.72rem;color:var(--text3);margin-bottom:16px">' + dataStr + (n.criado_por_nome ? ' · ' + escapeHtml(n.criado_por_nome) : '') + '</div>' +
    '<div style="border-top:1px solid var(--border);padding-top:16px;font-size:.82rem;color:var(--text1);line-height:1.7;white-space:pre-wrap;max-height:300px;overflow-y:auto">' + escapeHtml(n.mensagem) + '</div>' +
  '</div>';

  showModal('', modalHtml, async function() {
    await notifConfirmarLeitura(n.id);
    closeModal();
  }, 'green', 'Confirmar Leitura');
}


// ========= CONFIRMAR LEITURA =========
async function notifConfirmarLeitura(notifId) {
  if (!currentProfile || !currentProfile.id) return;
  try {
    const existing = _notifLeituras.find(l => l.notificacao_id === notifId);
    if (existing) {
      await supabase.update('leituras_notificacoes', {
        status: 'confirmada',
        confirmado_em: new Date().toISOString()
      }, 'notificacao_id=eq.' + notifId + '&usuario_id=eq.' + currentProfile.id);
    } else {
      await supabase.insert('leituras_notificacoes', {
        notificacao_id: notifId,
        usuario_id: currentProfile.id,
        usuario_nome: currentProfile.nome || currentUser || '',
        visualizado_em: new Date().toISOString(),
        confirmado_em: new Date().toISOString(),
        status: 'confirmada'
      });
    }
    // Atualizar estado local
    _notifPendentes = _notifPendentes.filter(n => n.id !== notifId);
    const lIdx = _notifLeituras.findIndex(l => l.notificacao_id === notifId);
    if (lIdx >= 0) { _notifLeituras[lIdx].status = 'confirmada'; }
    else { _notifLeituras.push({ notificacao_id: notifId, usuario_id: currentProfile.id, status: 'confirmada' }); }
    notifUpdateBadge();
    notifUpdateBanner();
    showToast('Leitura confirmada', 'success');
  } catch (e) {
    showToast('Erro ao confirmar: ' + e.message, 'error');
  }
}


// ========= PAINEL LATERAL (DRAWER) =========
function notifOpenPanel() {
  let html = '<div class="drawer-title">Notificacoes</div>';
  html += '<div style="margin-top:16px">';

  if (_notificacoes.length === 0) {
    html += '<div style="text-align:center;padding:40px 20px;color:var(--text3);font-size:.82rem">Nenhuma notificacao</div>';
  } else {
    const notifs = _notificacoes.filter(n => notifAplicaAoUsuario(n, currentProfile));
    notifs.forEach(n => {
      const leitura = _notifLeituras.find(l => l.notificacao_id === n.id);
      const isConfirmada = leitura && leitura.status === 'confirmada';
      const dotHtml = !isConfirmada ? '<span style="width:8px;height:8px;border-radius:50%;background:var(--blue);flex-shrink:0"></span>' : '';
      const statusBadge = isConfirmada
        ? '<span style="font-size:.65rem;font-weight:600;color:var(--green);background:var(--green)15;padding:2px 8px;border-radius:10px">Confirmada</span>'
        : '<span style="font-size:.65rem;font-weight:600;color:var(--amber);background:var(--amber)15;padding:2px 8px;border-radius:10px">Nao lida</span>';
      const dataStr = n.publicado_em ? new Date(n.publicado_em).toLocaleDateString('pt-BR') : '';
      const resumo = (n.mensagem || '').substring(0, 80) + ((n.mensagem || '').length > 80 ? '...' : '');

      html += '<div onclick="notifOpenDetalhe(\'' + n.id + '\')" style="padding:14px;margin-bottom:10px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);cursor:pointer;transition:background .15s" onmouseenter="this.style.background=\'var(--surface)\'" onmouseleave="this.style.background=\'var(--surface-2)\'">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' + dotHtml +
          '<span style="font-size:.82rem;font-weight:600;color:var(--text1);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(n.titulo) + '</span>' +
          statusBadge + '</div>' +
        '<div style="font-size:.75rem;color:var(--text3);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escapeHtml(resumo) + '</div>' +
        '<div style="font-size:.68rem;color:var(--text3)">' + dataStr + (n.criado_por_nome ? ' · ' + escapeHtml(n.criado_por_nome) : '') + '</div>' +
      '</div>';
    });
    html += '<div style="font-size:.72rem;color:var(--text3);text-align:center;margin-top:12px">' + notifs.length + ' notificacao(es)</div>';
  }
  html += '</div>';

  document.getElementById('drawerContent').innerHTML = html;
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}


// ========= DETALHE DA NOTIFICAÇÃO =========
function notifOpenDetalhe(notifId) {
  const n = _notificacoes.find(x => x.id === notifId);
  if (!n) return;
  const leitura = _notifLeituras.find(l => l.notificacao_id === notifId);
  const isConfirmada = leitura && leitura.status === 'confirmada';
  const dataStr = n.publicado_em ? new Date(n.publicado_em).toLocaleString('pt-BR') : '';

  let html = '<div style="margin-bottom:12px"><a href="#" onclick="event.preventDefault();notifOpenPanel()" style="font-size:.75rem;color:var(--text3);text-decoration:none;display:flex;align-items:center;gap:4px">' +
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg> Voltar</a></div>';
  html += '<div style="font-size:1.1rem;font-weight:700;color:var(--text1);margin-bottom:8px">' + escapeHtml(n.titulo) + '</div>';
  html += '<div style="font-size:.72rem;color:var(--text3);margin-bottom:20px">' + dataStr + (n.criado_por_nome ? ' · ' + escapeHtml(n.criado_por_nome) : '') + '</div>';
  html += '<div style="border-top:1px solid var(--border);padding-top:16px;font-size:.82rem;color:var(--text1);line-height:1.8;white-space:pre-wrap">' + escapeHtml(n.mensagem) + '</div>';

  if (!isConfirmada) {
    html += '<div style="margin-top:24px;padding-top:16px;border-top:1px solid var(--border)">' +
      '<button class="btn btn-green" style="width:100%" onclick="notifConfirmarLeitura(\'' + notifId + '\').then(()=>{notifOpenPanel()})">Confirmar Leitura</button>' +
      '<div style="font-size:.68rem;color:var(--text3);text-align:center;margin-top:6px">Somente apos confirmar, esta notificacao sera marcada como lida</div>' +
    '</div>';
  } else {
    html += '<div style="margin-top:20px;text-align:center;font-size:.75rem;color:var(--green);display:flex;align-items:center;justify-content:center;gap:6px">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Leitura confirmada</div>';
  }

  // Registrar visualização se ainda não tem
  if (!leitura) {
    supabase.insert('leituras_notificacoes', {
      notificacao_id: notifId,
      usuario_id: currentProfile.id,
      usuario_nome: currentProfile.nome || currentUser || '',
      visualizado_em: new Date().toISOString(),
      status: 'nao_lida'
    }).catch(function() {});
  }

  document.getElementById('drawerContent').innerHTML = html;
}


// ========= ADMIN: GERENCIAR NOTIFICAÇÕES =========
async function notifAdminLoad() {
  try {
    const all = await supabase.select('notificacoes', { order: 'created_at.desc' });
    _notificacoes = all || [];
    // Load all users for público-alvo selectors
    if (!_notifAllUsers.length) {
      const users = await supabase.select('perfis', { select: 'id,nome,nivel,setor,sede,ativo' });
      _notifAllUsers = users || [];
    }
  } catch (e) { console.warn('notifAdminLoad error:', e); }
}

async function renderNotifAdmin() {
  const container = document.getElementById('notifAdminContainer');
  if (!container) return;
  await notifAdminLoad();

  if (_notificacoes.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3);font-size:.82rem">Nenhuma notificacao criada</div>';
    return;
  }

  // Carregar leituras de todas notificações para contagem
  let allLeituras = [];
  try { allLeituras = await supabase.select('leituras_notificacoes', {}); } catch (e) {}

  let html = '<table><thead><tr><th>Titulo</th><th>Publico</th><th>Data</th><th>Leituras</th><th>Acoes</th></tr></thead><tbody>';
  _notificacoes.forEach(n => {
    const pa = n.publico_alvo || {};
    let publicoLabel = 'Todos';
    if (pa.tipo === 'admins') publicoLabel = 'Admins';
    else if (pa.tipo === 'setor') publicoLabel = 'Setor: ' + (pa.setor || '');
    else if (pa.tipo === 'sede') publicoLabel = 'Sede';
    else if (pa.tipo === 'usuarios') publicoLabel = (pa.usuario_ids || []).length + ' usuarios';
    else if (pa.tipo === 'todos_exceto') publicoLabel = 'Todos exceto...';

    const dataStr = n.publicado_em ? new Date(n.publicado_em).toLocaleDateString('pt-BR') : '—';
    const leituras = allLeituras.filter(l => l.notificacao_id === n.id && l.status === 'confirmada');
    const totalDest = notifContarDestinatarios(n);
    const pct = totalDest > 0 ? Math.round(leituras.length / totalDest * 100) : 0;
    const leiturasStr = leituras.length + '/' + totalDest + ' (' + pct + '%)';
    const isArquivada = n.arquivado;

    html += '<tr style="' + (isArquivada ? 'opacity:.5' : '') + '">' +
      '<td style="font-weight:500;font-size:.82rem">' + escapeHtml(n.titulo) + (isArquivada ? ' <span style="font-size:.65rem;color:var(--text3)">(arquivada)</span>' : '') + '</td>' +
      '<td style="font-size:.75rem;color:var(--text2)">' + publicoLabel + '</td>' +
      '<td style="font-size:.75rem;color:var(--text3)">' + dataStr + '</td>' +
      '<td style="font-size:.78rem;font-weight:500">' + leiturasStr + '</td>' +
      '<td><div style="display:flex;gap:4px">' +
        '<button class="btn btn-sm" onclick="notifAdminVerLeituras(\'' + n.id + '\')" title="Ver quem leu" style="padding:3px 6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>' +
        '<button class="btn btn-sm" onclick="notifAdminEditar(\'' + n.id + '\')" title="Editar" style="padding:3px 6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
        (isArquivada ? '' : '<button class="btn btn-sm" onclick="notifAdminArquivar(\'' + n.id + '\')" title="Arquivar" style="padding:3px 6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg></button>') +
        '<button class="btn btn-sm btn-red" onclick="notifAdminExcluir(\'' + n.id + '\')" title="Excluir" style="padding:3px 6px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
      '</div></td></tr>';
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}


function notifContarDestinatarios(notif) {
  const pa = notif.publico_alvo || { tipo: 'todos' };
  const tipo = pa.tipo || 'todos';
  const ativos = _notifAllUsers.filter(u => u.ativo !== false);

  if (tipo === 'todos') return ativos.length;
  if (tipo === 'admins') return ativos.filter(u => u.nivel === 'admin').length;
  if (tipo === 'setor') return ativos.filter(u => u.setor === pa.setor).length;
  if (tipo === 'sede') return ativos.filter(u => u.sede === pa.sede_id).length;
  if (tipo === 'usuarios') return (pa.usuario_ids || []).length;
  if (tipo === 'todos_exceto') {
    return ativos.filter(u => {
      if (pa.excluir_usuarios && pa.excluir_usuarios.includes(u.id)) return false;
      if (pa.excluir_setores && pa.excluir_setores.includes(u.setor)) return false;
      if (pa.excluir_sedes && pa.excluir_sedes.includes(u.sede)) return false;
      return true;
    }).length;
  }
  return ativos.length;
}

// ========= ADMIN: VER QUEM LEU =========
async function notifAdminVerLeituras(notifId) {
  const n = _notificacoes.find(x => x.id === notifId);
  if (!n) return;
  let leituras = [];
  try { leituras = await supabase.select('leituras_notificacoes', { filter: 'notificacao_id=eq.' + notifId }); } catch (e) {}

  const confirmadas = leituras.filter(l => l.status === 'confirmada');
  const totalDest = notifContarDestinatarios(n);

  let html = '<div style="margin-bottom:12px"><strong style="font-size:.82rem">' + escapeHtml(n.titulo) + '</strong></div>';
  html += '<div style="font-size:.78rem;color:var(--text2);margin-bottom:16px">' + confirmadas.length + ' de ' + totalDest + ' confirmaram (' + (totalDest > 0 ? Math.round(confirmadas.length / totalDest * 100) : 0) + '%)</div>';

  // Listar confirmados
  confirmadas.forEach(l => {
    const dataConf = l.confirmado_em ? new Date(l.confirmado_em).toLocaleString('pt-BR') : '';
    html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">' +
      '<span style="width:8px;height:8px;border-radius:50%;background:var(--green)"></span>' +
      '<span style="flex:1;font-size:.78rem">' + escapeHtml(l.usuario_nome || '—') + '</span>' +
      '<span style="font-size:.7rem;color:var(--text3)">' + dataConf + '</span></div>';
  });

  // Listar pendentes (usuários que deveriam ter recebido mas não confirmaram)
  const confirmIds = new Set(confirmadas.map(l => l.usuario_id));
  const destinatarios = _notifAllUsers.filter(u => u.ativo !== false && notifAplicaAoUsuario(n, u));
  const pendentes = destinatarios.filter(u => !confirmIds.has(u.id));
  pendentes.forEach(u => {
    html += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">' +
      '<span style="width:8px;height:8px;border-radius:50%;background:var(--amber)"></span>' +
      '<span style="flex:1;font-size:.78rem">' + escapeHtml(u.nome || '—') + '</span>' +
      '<span style="font-size:.7rem;color:var(--amber)">Pendente</span></div>';
  });

  showModal('Confirmacoes de Leitura', html, function() { closeModal(); }, 'blue', 'Fechar');
}


// ========= ADMIN: CRIAR/EDITAR NOTIFICAÇÃO =========
function notifAdminNova() {
  notifAdminOpenForm(null);
}

function notifAdminEditar(notifId) {
  const n = _notificacoes.find(x => x.id === notifId);
  notifAdminOpenForm(n);
}

function notifAdminOpenForm(notif) {
  const isEdit = !!notif;
  const title = isEdit ? 'Editar Notificacao' : 'Nova Notificacao';

  // Build user options for multi-select
  const ativos = _notifAllUsers.filter(u => u.ativo !== false);
  const setores = [...new Set(ativos.map(u => u.setor).filter(Boolean))];
  const sedes = [];
  try { _comSedes.forEach(s => { if (s.ativo !== false) sedes.push(s); }); } catch (e) {}

  let userOpts = '';
  ativos.forEach(u => { userOpts += '<option value="' + u.id + '">' + escapeHtml(u.nome || u.id) + '</option>'; });

  let sedeOpts = '';
  sedes.forEach(s => { sedeOpts += '<option value="' + s.id + '">' + escapeHtml(s.nome) + '</option>'; });

  let setorOpts = '';
  setores.forEach(s => { setorOpts += '<option value="' + s + '">' + escapeHtml(s) + '</option>'; });

  const pa = (notif && notif.publico_alvo) || { tipo: 'todos' };

  let html = '<div class="drawer-title">' + title + '</div><div style="margin-top:16px">';
  html += '<div style="margin-bottom:12px"><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Titulo</label><input type="text" id="notif_titulo" value="' + escapeHtml((notif && notif.titulo) || '') + '" placeholder="Titulo do comunicado"></div>';
  html += '<div style="margin-bottom:12px"><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Mensagem</label><textarea id="notif_mensagem" rows="6" style="width:100%;padding:8px 12px;border:1px solid var(--border-strong);border-radius:var(--radius);font-size:.82rem;font-family:var(--font);background:var(--surface);color:var(--text1);resize:vertical" placeholder="Conteudo completo do comunicado...">' + escapeHtml((notif && notif.mensagem) || '') + '</textarea></div>';

  html += '<div style="margin-bottom:12px"><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Publico-alvo</label>';
  html += '<select id="notif_publico_tipo" onchange="notifTogglePublicoFields()" style="margin-bottom:8px">';
  html += '<option value="todos"' + (pa.tipo === 'todos' ? ' selected' : '') + '>Todos os usuarios</option>';
  html += '<option value="admins"' + (pa.tipo === 'admins' ? ' selected' : '') + '>Apenas administradores</option>';
  html += '<option value="setor"' + (pa.tipo === 'setor' ? ' selected' : '') + '>Setor especifico</option>';
  html += '<option value="sede"' + (pa.tipo === 'sede' ? ' selected' : '') + '>Sede especifica</option>';
  html += '<option value="usuarios"' + (pa.tipo === 'usuarios' ? ' selected' : '') + '>Usuarios especificos</option>';
  html += '<option value="todos_exceto"' + (pa.tipo === 'todos_exceto' ? ' selected' : '') + '>Todos exceto...</option>';
  html += '</select>';
  html += '<div id="notif_publico_fields"></div></div>';

  html += '<div style="margin-bottom:12px"><label style="font-size:.72rem;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:4px">Publicacao</label>';
  html += '<select id="notif_publicacao" style="margin-bottom:8px">';
  html += '<option value="agora">Agora (imediata)</option>';
  html += '<option value="agendar">Agendar para data</option>';
  html += '</select>';
  html += '<input type="datetime-local" id="notif_data_agendada" style="display:none;margin-top:6px"></div>';

  html += '<button class="btn btn-green" style="width:100%;margin-top:16px" onclick="notifAdminSalvar(\'' + (isEdit ? notif.id : '') + '\')">' + (isEdit ? 'Salvar Alteracoes' : 'Publicar Notificacao') + '</button>';
  if (isEdit) {
    html += '<div style="font-size:.68rem;color:var(--amber);text-align:center;margin-top:8px">Ao editar, todos os usuarios que ja confirmaram leitura precisarao confirmar novamente.</div>';
  }
  html += '</div>';

  // Store options data for dynamic fields
  window._notifFormData = { userOpts, sedeOpts, setorOpts, pa, ativos, sedes, setores };

  document.getElementById('drawerContent').innerHTML = html;
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
  setTimeout(notifTogglePublicoFields, 50);

  // Show date field if agendar
  document.getElementById('notif_publicacao').onchange = function() {
    document.getElementById('notif_data_agendada').style.display = this.value === 'agendar' ? '' : 'none';
  };
}


function notifTogglePublicoFields() {
  const tipo = (document.getElementById('notif_publico_tipo') || {}).value;
  const el = document.getElementById('notif_publico_fields');
  if (!el) return;
  const fd = window._notifFormData || {};

  if (tipo === 'setor') {
    el.innerHTML = '<select id="notif_publico_setor">' + fd.setorOpts + '</select>';
  } else if (tipo === 'sede') {
    el.innerHTML = '<select id="notif_publico_sede">' + fd.sedeOpts + '</select>';
  } else if (tipo === 'usuarios') {
    el.innerHTML = '<select id="notif_publico_usuarios" multiple size="5" style="width:100%">' + fd.userOpts + '</select><span style="font-size:.68rem;color:var(--text3)">Segure Ctrl para selecionar varios</span>';
  } else if (tipo === 'todos_exceto') {
    el.innerHTML = '<div style="font-size:.72rem;color:var(--text3);margin-bottom:6px">Selecione quem NAO deve receber:</div>' +
      '<div style="margin-bottom:8px"><label style="font-size:.68rem;color:var(--text2)">Excluir usuarios:</label><select id="notif_excluir_usuarios" multiple size="4" style="width:100%">' + fd.userOpts + '</select></div>' +
      '<div style="margin-bottom:8px"><label style="font-size:.68rem;color:var(--text2)">Excluir setores:</label><select id="notif_excluir_setores" multiple size="3" style="width:100%">' + fd.setorOpts + '</select></div>' +
      '<div><label style="font-size:.68rem;color:var(--text2)">Excluir sedes:</label><select id="notif_excluir_sedes" multiple size="3" style="width:100%">' + fd.sedeOpts + '</select></div>' +
      '<span style="font-size:.68rem;color:var(--text3)">Segure Ctrl para selecionar varios. Deixe vazio para nao excluir.</span>';
  } else {
    el.innerHTML = '';
  }
}

async function notifAdminSalvar(editId) {
  const titulo = (document.getElementById('notif_titulo') || {}).value.trim();
  const mensagem = (document.getElementById('notif_mensagem') || {}).value.trim();
  if (!titulo || !mensagem) { showToast('Preencha titulo e mensagem', 'error'); return; }

  const tipoPublico = (document.getElementById('notif_publico_tipo') || {}).value;
  let publico_alvo = { tipo: tipoPublico };

  if (tipoPublico === 'setor') {
    publico_alvo.setor = (document.getElementById('notif_publico_setor') || {}).value;
  } else if (tipoPublico === 'sede') {
    publico_alvo.sede_id = (document.getElementById('notif_publico_sede') || {}).value;
  } else if (tipoPublico === 'usuarios') {
    const sel = document.getElementById('notif_publico_usuarios');
    publico_alvo.usuario_ids = sel ? [...sel.selectedOptions].map(o => o.value) : [];
  } else if (tipoPublico === 'todos_exceto') {
    const selU = document.getElementById('notif_excluir_usuarios');
    const selS = document.getElementById('notif_excluir_setores');
    const selSd = document.getElementById('notif_excluir_sedes');
    publico_alvo.excluir_usuarios = selU ? [...selU.selectedOptions].map(o => o.value) : [];
    publico_alvo.excluir_setores = selS ? [...selS.selectedOptions].map(o => o.value) : [];
    publico_alvo.excluir_sedes = selSd ? [...selSd.selectedOptions].map(o => o.value) : [];
  }

  const pubSelect = (document.getElementById('notif_publicacao') || {}).value;
  let publicado_em = new Date().toISOString();
  if (pubSelect === 'agendar') {
    const dt = (document.getElementById('notif_data_agendada') || {}).value;
    if (dt) publicado_em = new Date(dt).toISOString();
  }

  const data = {
    titulo, mensagem, publico_alvo, publicado_em,
    criado_por: currentProfile ? currentProfile.id : null,
    criado_por_nome: currentProfile ? currentProfile.nome : currentUser || 'admin'
  };

  try {
    if (editId) {
      await supabase.update('notificacoes', data, 'id=eq.' + editId);
      // Resetar todas as confirmações de leitura (usuários precisarão confirmar novamente)
      await supabase.delete('leituras_notificacoes', 'notificacao_id=eq.' + editId);
      showToast('Notificacao atualizada. Leituras resetadas.', 'success');
    } else {
      await supabase.insert('notificacoes', data);
      showToast('Notificacao publicada', 'success');
    }
    closeDrawer();
    renderNotifAdmin();
  } catch (e) { showToast('Erro: ' + e.message, 'error'); }
}


// ========= ADMIN: ARQUIVAR / EXCLUIR =========
async function notifAdminArquivar(notifId) {
  try {
    await supabase.update('notificacoes', { arquivado: true }, 'id=eq.' + notifId);
    showToast('Notificacao arquivada', 'success');
    renderNotifAdmin();
  } catch (e) { showToast('Erro: ' + e.message, 'error'); }
}

async function notifAdminExcluir(notifId) {
  showModal('Excluir Notificacao', '<p>Deseja excluir esta notificacao? As confirmacoes de leitura tambem serao removidas.</p>', async function() {
    closeModal();
    try {
      await supabase.delete('notificacoes', 'id=eq.' + notifId);
      showToast('Notificacao excluida', 'success');
      renderNotifAdmin();
    } catch (e) { showToast('Erro: ' + e.message, 'error'); }
  }, 'red', 'Excluir');
}
// ========= POLLING INTELIGENTE (auto-refresh com visibilidade) =========
let _notifPollingInterval = null;
let _basePollingInterval = null;
const NOTIF_POLL_MS = 2 * 60 * 1000; // 2 minutos
const BASE_POLL_MS = 5 * 60 * 1000;  // 5 minutos

function notifStartPolling() {
  // Limpar intervals anteriores
  if (_notifPollingInterval) { clearInterval(_notifPollingInterval); _notifPollingInterval = null; }
  if (_basePollingInterval) { clearInterval(_basePollingInterval); _basePollingInterval = null; }

  // Polling de notificações (2 min)
  _notifPollingInterval = setInterval(function() {
    if (document.hidden) return; // Tab inativa, não checar
    notifPollCheck();
  }, NOTIF_POLL_MS);

  // Polling de base (5 min)
  _basePollingInterval = setInterval(function() {
    if (document.hidden) return;
    basePollCheck();
  }, BASE_POLL_MS);

  // Checar imediatamente ao voltar à aba
  document.addEventListener('visibilitychange', notifOnVisibilityChange);
}

function notifStopPolling() {
  if (_notifPollingInterval) { clearInterval(_notifPollingInterval); _notifPollingInterval = null; }
  if (_basePollingInterval) { clearInterval(_basePollingInterval); _basePollingInterval = null; }
  document.removeEventListener('visibilitychange', notifOnVisibilityChange);
}

function notifOnVisibilityChange() {
  if (!document.hidden && currentProfile && currentProfile.id) {
    // Usuário voltou à aba — checar tudo imediatamente
    notifPollCheck();
    basePollCheck();
  }
}

async function notifPollCheck() {
  if (!currentProfile || !currentProfile.id) return;
  try {
    const oldCount = _notifPendentes.length;
    await notifLoadPendentes();
    const newCount = _notifPendentes.length;
    notifUpdateBadge();
    notifUpdateBanner();
    // Se apareceu notificação nova, avisar
    if (newCount > oldCount) {
      showToast('Novo comunicado recebido', 'warning');
    }
  } catch (e) { /* silencioso */ }
}

async function basePollCheck() {
  if (!currentProfile || !currentProfile.id) return;
  if (typeof _dataLoadTimestamp === 'undefined' || !_dataLoadTimestamp) return;
  try {
    const rows = await supabase.select('meta_sync', { filter: 'chave=eq.last_save', limit: 1 });
    if (rows && rows.length > 0) {
      const serverTs = new Date(rows[0].valor).getTime();
      if (serverTs > _dataLoadTimestamp) {
        showToast('Base atualizada por ' + (rows[0].usuario || 'outro usuario') + '. Recarregue para ver as mudancas.', 'warning');
        _dataLoadTimestamp = serverTs; // Evitar repetir o aviso
      }
    }
  } catch (e) { /* silencioso */ }
}

// ========= FIM NOTIFICAÇÕES MODULE =========
