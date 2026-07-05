// ========= REGIMENTO INTERNO - FAQ + BUSCA + PDF =========
// Auto Vale Clube de Benefícios - v5.0
// 100% determinístico: FAQ estruturado + busca textual + PDF viewer

// ========= CONFIG =========
const REGIMENTO_PDF_URL = 'https://thchtjwbytdphmviympg.supabase.co/storage/v1/object/public/regimento/REGIMENTO%20INTERNO%20GERAL%20-%2005_2026.pdf';

let _regimentoFAQ = null; // FAQ data loaded from JSON
let _regimentoTab = 'consulta'; // 'consulta' | 'leitura'
let _regimentoCategoria = null; // current category slug
let _regimentoBusca = ''; // search query
let _regimentoPdfPage = 1;


// ========= INIT =========
async function regimentoInit() {
  const container = document.getElementById('regimento_container');
  if (!container) return;
  // Load FAQ JSON
  if (!_regimentoFAQ) {
    try {
      const resp = await fetch('faq-regimento-interno-autovale.json');
      _regimentoFAQ = await resp.json();
    } catch(e) {
      console.error('Erro ao carregar FAQ:', e);
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--red)">Erro ao carregar FAQ do regimento.</div>';
      return;
    }
  }
  regimentoRender();
}

// ========= RENDER PRINCIPAL =========
function regimentoRender() {
  const container = document.getElementById('regimento_container');
  if (!container || !_regimentoFAQ) return;
  const isAdmin = typeof currentProfile !== 'undefined' && currentProfile && currentProfile.nivel === 'admin';
  let html = '';

  // Header
  html += `<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
    <div style="width:44px;height:44px;border-radius:10px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
    </div>
    <div style="flex:1">
      <div style="font-size:1.05rem;font-weight:700;color:var(--text1)">Regimento Interno</div>
      <div style="font-size:.72rem;color:var(--text3)">Auto Vale Clube de Beneficios - ${_regimentoFAQ.total_perguntas} perguntas frequentes</div>
    </div>
    ${isAdmin ? '<button class="btn btn-sm" onclick="regimentoAdminUpload()" style="display:flex;align-items:center;gap:5px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Atualizar</button>' : ''}
  </div>`;

  // Tabs
  html += `<div style="display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:20px">
    <button class="reg-tab ${_regimentoTab==='consulta'?'active':''}" onclick="regimentoSwitchTab('consulta')">Consultar</button>
    <button class="reg-tab ${_regimentoTab==='leitura'?'active':''}" onclick="regimentoSwitchTab('leitura')">Ler Completo</button>
  </div>`;

  if (_regimentoTab === 'consulta') {
    html += regimentoRenderConsulta();
  } else {
    html += regimentoRenderLeitura();
  }
  container.innerHTML = html;
}

function regimentoSwitchTab(tab) { _regimentoTab = tab; _regimentoCategoria = null; _regimentoBusca = ''; regimentoRender(); }


// ========= TAB CONSULTA (FAQ + BUSCA) =========
function regimentoRenderConsulta() {
  let html = '';

  // Search bar
  html += `<div style="margin-bottom:20px;position:relative">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:14px;top:50%;transform:translateY(-50%)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input type="text" id="regimento_busca" value="${escapeHtml(_regimentoBusca)}" placeholder="Buscar duvida no regimento..." oninput="regimentoBuscar(this.value)" style="width:100%;padding:12px 16px 12px 42px;border:1px solid var(--border-strong);border-radius:var(--radius-lg);font-size:.85rem;background:var(--surface);color:var(--text1)">
    ${_regimentoBusca ? '<button onclick="regimentoBuscar(\'\')" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--text3);font-size:1.1rem">&times;</button>' : ''}
  </div>`;

  // If searching, show results
  if (_regimentoBusca.length >= 2) {
    html += regimentoRenderResultados();
    return html;
  }

  // If viewing a category
  if (_regimentoCategoria) {
    html += regimentoRenderCategoria();
    return html;
  }

  // Default: show categories grid
  html += regimentoRenderCategorias();
  return html;
}

// ========= CATEGORIAS GRID =========
function regimentoRenderCategorias() {
  const icons = {
    'associacao-pam-e-regras-gerais': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    'filiacao-cadastro-e-analise': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
    'permanencia-cancelamento-e-exclusao': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    'pagamentos-boletos-e-inadimplencia': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    'planos-de-carros': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    'planos-de-motos': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M12 17h7"/><path d="M5 17l3-9h4l3 9"/></svg>',
    'rastreador-e-monitoramento': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 8a4 4 0 1 0 4 4"/><line x1="21" y1="3" x2="14" y2="10"/></svg>',
    'assistencia-24h-reboque-e-guincho': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'hipoteses-sem-cobertura-ou-negativa': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    'cotas-de-participacao': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };
  const defaultIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';

  let html = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">`;
  _regimentoFAQ.categorias.forEach(cat => {
    const icon = icons[cat.slug_categoria] || defaultIcon;
    html += `<div class="reg-cat-card" onclick="regimentoAbrirCategoria('${cat.slug_categoria}')">
      <div class="reg-cat-icon">${icon}</div>
      <div class="reg-cat-name">${escapeHtml(cat.categoria)}</div>
      <div class="reg-cat-count">${cat.itens.length} perguntas</div>
    </div>`;
  });
  html += `</div>`;
  return html;
}


// ========= CATEGORIA DETAIL =========
function regimentoAbrirCategoria(slug) {
  _regimentoCategoria = slug;
  _regimentoBusca = '';
  regimentoRender();
}

function regimentoRenderCategoria() {
  const cat = _regimentoFAQ.categorias.find(c => c.slug_categoria === _regimentoCategoria);
  if (!cat) return '<div>Categoria nao encontrada.</div>';

  let html = `<button class="btn btn-sm" onclick="_regimentoCategoria=null;regimentoRender()" style="margin-bottom:16px;display:flex;align-items:center;gap:5px">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Voltar
  </button>`;
  html += `<div style="font-size:.95rem;font-weight:700;color:var(--text1);margin-bottom:16px">${escapeHtml(cat.categoria)}</div>`;
  html += `<div style="display:flex;flex-direction:column;gap:10px">`;
  cat.itens.forEach(item => {
    html += regimentoRenderItem(item);
  });
  html += `</div>`;
  return html;
}

// ========= SEARCH RESULTS =========
function regimentoBuscar(query) {
  _regimentoBusca = query;
  _regimentoCategoria = null;
  regimentoRender();
  // Re-focus input
  setTimeout(() => {
    const input = document.getElementById('regimento_busca');
    if (input) { input.focus(); input.setSelectionRange(query.length, query.length); }
  }, 50);
}

function regimentoRenderResultados() {
  const query = _regimentoBusca.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const palavras = query.split(' ').filter(p => p.length >= 2);
  let resultados = [];

  _regimentoFAQ.categorias.forEach(cat => {
    cat.itens.forEach(item => {
      let score = 0;
      const perguntaNorm = item.pergunta_principal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const respostaNorm = item.resposta_curta.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const kwNorm = (item.palavras_chave || []).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      palavras.forEach(p => {
        if (perguntaNorm.includes(p)) score += 5;
        if (kwNorm.includes(p)) score += 3;
        if (respostaNorm.includes(p)) score += 2;
      });
      // Exact match bonus
      if (perguntaNorm.includes(query)) score += 10;

      if (score > 0) resultados.push({ ...item, score, categoria: cat.categoria });
    });
  });

  resultados.sort((a, b) => b.score - a.score);
  const top = resultados.slice(0, 15);

  if (!top.length) {
    return `<div style="text-align:center;padding:30px;color:var(--text3)">
      <div style="font-size:.85rem;margin-bottom:8px">Nenhum resultado para "${escapeHtml(_regimentoBusca)}"</div>
      <div style="font-size:.75rem">Tente outras palavras ou consulte o PDF completo na aba "Ler Completo"</div>
    </div>`;
  }

  let html = `<div style="font-size:.75rem;color:var(--text3);margin-bottom:12px">${top.length} resultado${top.length>1?'s':''} para "${escapeHtml(_regimentoBusca)}"</div>`;
  html += `<div style="display:flex;flex-direction:column;gap:10px">`;
  top.forEach(item => { html += regimentoRenderItem(item); });
  html += `</div>`;
  return html;
}


// ========= FAQ ITEM RENDER =========
function regimentoRenderItem(item) {
  const id = item.id;
  return `<div class="reg-faq-item" id="reg_item_${id}">
    <div class="reg-faq-header" onclick="regimentoToggleItem('${id}')">
      <div class="reg-faq-question">${escapeHtml(item.pergunta_principal)}</div>
      <svg class="reg-faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    <div class="reg-faq-body" id="reg_body_${id}" style="display:none">
      <div class="reg-faq-answer">${escapeHtml(item.resposta_completa || item.resposta_curta)}</div>
      <div class="reg-faq-ref">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        <span>${escapeHtml(item.referencia_regimento || '')}</span>
      </div>
    </div>
  </div>`;
}

function regimentoToggleItem(id) {
  const body = document.getElementById('reg_body_' + id);
  const item = document.getElementById('reg_item_' + id);
  if (!body || !item) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  item.classList.toggle('open', !isOpen);
}

// ========= TAB LEITURA (PDF VIEWER) =========
function regimentoRenderLeitura() {
  const pdfUrl = REGIMENTO_PDF_URL + '#page=' + _regimentoPdfPage;
  return `<div style="border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--border);height:calc(100vh - 280px)"><iframe id="regimento_pdf_viewer" src="${pdfUrl}" style="width:100%;height:100%;border:none" title="Regimento Interno"></iframe></div>`;
}

// ========= ADMIN UPLOAD =========
function regimentoAdminUpload() {
  showModal('Atualizar Regimento',
    '<div style="display:flex;flex-direction:column;gap:14px"><p style="font-size:.82rem;color:var(--text2)">Suba um novo PDF para substituir o regimento atual.</p><input type="file" id="regUploadFile" accept=".pdf" style="font-size:.78rem"><div style="font-size:.72rem;color:var(--text3)">O arquivo sera salvo no bucket "regimento" do Supabase.</div></div>',
    async function() {
      const fileInput = document.getElementById('regUploadFile');
      if (!fileInput||!fileInput.files[0]) { showToast('Selecione um PDF','error'); return; }
      const file = fileInput.files[0];
      if (!file.name.endsWith('.pdf')) { showToast('Apenas PDF','error'); return; }
      showToast('Enviando...','warning');
      try {
        const token = supabase.getToken() || SUPABASE_ANON_KEY;
        const resp = await fetch(SUPABASE_URL+'/storage/v1/object/regimento/'+encodeURIComponent(file.name),{ method:'POST', headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+token,'Content-Type':'application/pdf','x-upsert':'true'}, body:file });
        if (!resp.ok) throw new Error('HTTP '+resp.status);
        closeModal();
        showToast('Regimento atualizado!','success');
      } catch(e) { showToast('Erro: '+e.message,'error'); }
    },'green','Enviar');
}
