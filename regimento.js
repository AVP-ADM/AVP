// ========= REGIMENTO INTERNO - CONSULTA IA + LEITURA =========
// Auto Vale Clube de Benefícios - v3.0
// PDF armazenado no Supabase Storage, texto extraído via pdf.js

// ========= CONFIG =========
const _dk = [103,115,107,95,49,54,86,111,71,104,48,70,117,51,90,89,53,84,86,115,77,56,79,70,87,71,100,121,98,51,70,89,87,110,113,89,99,49,115,65,72,78,89,108,56,75,97,107,82,98,119,115,67,105,50,49].map(c=>String.fromCharCode(c)).join('');
let GEMINI_API_KEY = localStorage.getItem('avp-gemini-key') || _dk;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const REGIMENTO_PDF_URL = 'https://thchtjwbytdphmviympg.supabase.co/storage/v1/object/public/regimento/REGIMENTO%20INTERNO%20GERAL%20-%2005_2026.pdf';

let _regimentoMessages = [];
let _regimentoLoading = false;
let _regimentoTab = 'consulta';
let _regimentoHistory = [];
let _regimentoTexto = ''; // Texto extraído do PDF
let _regimentoTextoCarregado = false;

const REGIMENTO_FAQ_CHIPS = [
  'Quais sao os planos disponiveis?',
  'O que cobre o Plano VIP?',
  'Como funciona o reboque?',
  'Quando perco os beneficios?',
  'Como funciona a cota de participacao?',
  'O que nao e coberto pelo PAM?',
  'Como cancelar minha filiacao?',
  'Como funciona o rastreador?'
];


// ========= PDF LOADING (via pdf.js CDN) =========
async function regimentoCarregarPDF() {
  if (_regimentoTextoCarregado && _regimentoTexto) return _regimentoTexto;
  try {
    // Load pdf.js from CDN if not loaded
    if (!window.pdfjsLib) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
    // Check localStorage cache first
    const cached = localStorage.getItem('avp-regimento-texto');
    const cachedVersion = localStorage.getItem('avp-regimento-version');
    if (cached && cachedVersion === REGIMENTO_PDF_URL) {
      _regimentoTexto = cached;
      _regimentoTextoCarregado = true;
      return _regimentoTexto;
    }
    // Load and extract PDF
    const pdf = await pdfjsLib.getDocument(REGIMENTO_PDF_URL).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += pageText + '\n\n';
    }
    _regimentoTexto = fullText.trim();
    _regimentoTextoCarregado = true;
    // Cache in localStorage
    try {
      localStorage.setItem('avp-regimento-texto', _regimentoTexto);
      localStorage.setItem('avp-regimento-version', REGIMENTO_PDF_URL);
    } catch(e) { /* localStorage full, ok */ }
    return _regimentoTexto;
  } catch(err) {
    console.error('Erro ao carregar PDF do regimento:', err);
    _regimentoTexto = '';
    return '';
  }
}

// ========= INIT =========
function regimentoInit() {
  const container = document.getElementById('regimento_container');
  if (!container) return;
  GEMINI_API_KEY = localStorage.getItem('avp-gemini-key') || _dk;
  _regimentoHistory = JSON.parse(localStorage.getItem('avp-regimento-history') || '[]');
  regimentoRender();
  // Start loading PDF in background
  regimentoCarregarPDF().then(() => {
    // Re-render leitura tab if it's active
    if (_regimentoTab === 'leitura') regimentoRender();
  });
}


// ========= RENDER PRINCIPAL =========
function regimentoRender() {
  const container = document.getElementById('regimento_container');
  if (!container) return;
  const isAdmin = typeof currentProfile !== 'undefined' && currentProfile && currentProfile.nivel === 'admin';
  let html = '';

  // Header
  html += `<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
    <div style="width:44px;height:44px;border-radius:10px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
    </div>
    <div style="flex:1">
      <div style="font-size:1.05rem;font-weight:700;color:var(--text1)">Regimento Interno</div>
      <div style="font-size:.72rem;color:var(--text3)">Auto Vale Clube de Beneficios</div>
    </div>
    ${isAdmin ? '<button class="btn btn-sm" onclick="regimentoAdminUpload()" style="display:flex;align-items:center;gap:5px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Atualizar</button>' : ''}
  </div>`;

  // Tabs
  html += `<div style="display:flex;gap:0;border-bottom:2px solid var(--border);margin-bottom:20px">
    <button class="reg-tab ${_regimentoTab==='consulta'?'active':''}" onclick="regimentoSwitchTab('consulta')">Consulta</button>
    <button class="reg-tab ${_regimentoTab==='leitura'?'active':''}" onclick="regimentoSwitchTab('leitura')">Ler Completo</button>
  </div>`;

  if (_regimentoTab === 'consulta') {
    html += regimentoRenderConsulta();
  } else {
    html += regimentoRenderLeitura();
  }
  container.innerHTML = html;
  if (_regimentoTab === 'consulta') regimentoRenderMessages();
}

function regimentoSwitchTab(tab) { _regimentoTab = tab; regimentoRender(); }


// ========= TAB CONSULTA =========
function regimentoRenderConsulta() {
  let html = '';
  // FAQ Chips
  html += `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px" id="regimento_chips">`;
  REGIMENTO_FAQ_CHIPS.forEach(chip => {
    html += `<button class="regimento-chip" onclick="regimentoAsk('${chip.replace(/'/g, "\\'")}')">${chip}</button>`;
  });
  html += `</div>`;
  // Recent searches
  if (_regimentoHistory.length > 0 && _regimentoMessages.length === 0) {
    const recentes = _regimentoHistory.slice(0, 5);
    html += `<div style="margin-bottom:16px"><div style="font-size:.68rem;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Pesquisas recentes</div><div style="display:flex;flex-wrap:wrap;gap:6px">`;
    recentes.forEach(h => {
      const shortQ = h.question.length > 35 ? h.question.substring(0, 35) + '...' : h.question;
      html += `<button class="regimento-chip" style="background:var(--surface-2);border-color:var(--border-light);font-size:.7rem" onclick="regimentoAsk('${h.question.replace(/'/g, "\\'")}')">${escapeHtml(shortQ)}</button>`;
    });
    html += `</div></div>`;
  }
  // Messages
  html += `<div id="regimento_messages" class="regimento-messages"></div>`;
  // Loading
  html += `<div id="regimento_loading" class="regimento-loading" style="display:none">
    <div class="regimento-loading-dots"><span></span><span></span><span></span></div>
    <span style="font-size:.78rem;color:var(--text3)">Consultando o regimento...</span>
    <span id="regimento_timer" style="font-size:.72rem;color:var(--text3);margin-left:6px;font-variant-numeric:tabular-nums;display:none"></span>
  </div>`;
  // Input
  html += `<div class="regimento-input-area">
    <div class="regimento-input-wrap">
      <input type="text" id="regimento_input" placeholder="Digite sua pergunta sobre o regimento..." autocomplete="off" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();regimentoSend()}">
      <button class="regimento-send-btn" onclick="regimentoSend()" title="Enviar" id="regimento_sendBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
    <div style="font-size:.62rem;color:var(--text3);margin-top:6px;text-align:center">Respostas geradas por IA com base no Regimento Interno. Consulte o documento oficial para decisoes importantes.</div>
  </div>`;
  return html;
}

// ========= TAB LEITURA COMPLETA (texto do PDF) =========
function regimentoRenderLeitura() {
  let html = '';
  if (!_regimentoTextoCarregado) {
    html += `<div style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto 12px"></div><div style="font-size:.82rem;color:var(--text3)">Carregando regimento...</div></div>`;
    return html;
  }
  if (!_regimentoTexto) {
    html += `<div style="text-align:center;padding:40px;color:var(--text3)">Nao foi possivel carregar o regimento. Tente recarregar a pagina.</div>`;
    return html;
  }
  // Search
  html += `<div style="margin-bottom:16px"><input type="text" id="regimento_search" placeholder="Buscar no regimento..." oninput="regimentoFilterLeitura()" style="width:100%;padding:10px 14px;border:1px solid var(--border-strong);border-radius:var(--radius-lg);font-size:.82rem;background:var(--surface);color:var(--text1)"></div>`;
  // Full text with highlighting
  html += `<div id="regimento_texto_completo" style="max-height:calc(100vh - 320px);overflow-y:auto;padding:16px 20px;background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius-lg);font-size:.8rem;line-height:1.8;color:var(--text1);white-space:pre-wrap;word-wrap:break-word">${regimentoFormatTextoCompleto(_regimentoTexto)}</div>`;
  return html;
}

function regimentoFormatTextoCompleto(texto) {
  if (!texto) return '';
  let html = escapeHtml(texto);
  // Highlight article references
  html = html.replace(/(Art\.\s*\d+[º°]?\s*[-–]?\s*[A-Z]?)/gi, '<strong style="color:var(--primary)">$1</strong>');
  // Highlight section titles
  html = html.replace(/^(\d+\.\s+[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ\s]+)$/gm, '<div style="font-size:.92rem;font-weight:700;color:var(--text1);margin:20px 0 8px;padding:8px 0;border-bottom:1px solid var(--border)">$1</div>');
  return html;
}

function regimentoFilterLeitura() {
  const query = (document.getElementById('regimento_search') || {}).value.toLowerCase().trim();
  const el = document.getElementById('regimento_texto_completo');
  if (!el) return;
  if (!query) {
    el.innerHTML = regimentoFormatTextoCompleto(_regimentoTexto);
    return;
  }
  // Highlight search matches
  let html = regimentoFormatTextoCompleto(_regimentoTexto);
  const regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  html = html.replace(regex, '<mark style="background:var(--amber-light);padding:1px 3px;border-radius:2px">$1</mark>');
  el.innerHTML = html;
  // Scroll to first match
  const firstMark = el.querySelector('mark');
  if (firstMark) firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
}


// ========= MESSAGES RENDER =========
function regimentoRenderMessages() {
  const el = document.getElementById('regimento_messages');
  if (!el) return;
  if (_regimentoMessages.length === 0) {
    el.innerHTML = `<div class="regimento-welcome">
      <div style="width:48px;height:48px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      </div>
      <div style="font-size:.85rem;font-weight:600;color:var(--text1);margin-bottom:4px">Como posso ajudar?</div>
      <div style="font-size:.75rem;color:var(--text3);max-width:340px;margin:0 auto">Selecione uma pergunta acima ou digite sua duvida sobre o Regimento Interno.</div>
    </div>`;
    return;
  }
  let html = '';
  _regimentoMessages.forEach((msg, idx) => {
    if (msg.role === 'user') {
      html += `<div class="regimento-msg regimento-msg-user"><div class="regimento-msg-bubble regimento-msg-user-bubble">${escapeHtml(msg.content)}</div></div>`;
    } else {
      html += `<div class="regimento-msg regimento-msg-assistant">
        <div class="regimento-msg-avatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
        <div class="regimento-msg-bubble regimento-msg-assistant-bubble">
          <div class="regimento-msg-content">${regimentoFormatResponse(msg.content)}</div>
          ${regimentoRenderFontes(msg.content)}
          <div class="regimento-msg-footer">
            <span style="font-size:.65rem;color:var(--text3)">${msg.time ? msg.time + 's' : ''}</span>
            <div class="regimento-msg-feedback" data-idx="${idx}">
              <button class="regimento-feedback-btn" onclick="regimentoFeedback(${idx},'util')" title="Util"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg></button>
              <button class="regimento-feedback-btn" onclick="regimentoFeedback(${idx},'nao_util')" title="Nao util"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg></button>
            </div>
          </div>
        </div>
      </div>`;
    }
  });
  el.innerHTML = html;
  el.scrollTop = el.scrollHeight;
}

// ========= FONTES - Navega para "Ler Completo" =========
function regimentoRenderFontes(text) {
  const artigos = [];
  const matches = text.matchAll(/\(Art\.\s*(\d+[º°]?(?:-[A-Z])?)\)/g);
  for (const m of matches) {
    const ref = 'Art. ' + m[1];
    if (!artigos.includes(ref)) artigos.push(ref);
  }
  if (!artigos.length) return '';
  let html = `<div class="reg-sources">
    <button class="reg-sources-toggle" onclick="this.parentElement.classList.toggle('open')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      <span>Fontes (${artigos.length} ${artigos.length === 1 ? 'artigo' : 'artigos'})</span>
      <svg class="reg-sources-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    <div class="reg-sources-body">`;
  artigos.forEach(ref => {
    html += `<div class="reg-source-item" style="cursor:pointer" onclick="regimentoNavigateToArt('${ref.replace(/'/g, "\\'")}')">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span class="reg-source-ref">${escapeHtml(ref)}</span>
        <span style="font-size:.65rem;color:var(--blue);font-weight:500">Ver no regimento →</span>
      </div>
    </div>`;
  });
  html += `</div></div>`;
  return html;
}

function regimentoNavigateToArt(artRef) {
  // Switch to Ler Completo tab
  _regimentoTab = 'leitura';
  regimentoRender();
  // Wait for render, then search and scroll
  setTimeout(() => {
    const searchInput = document.getElementById('regimento_search');
    if (searchInput) {
      searchInput.value = artRef;
      regimentoFilterLeitura();
    }
  }, 300);
}


// ========= SEND / API =========
function regimentoAsk(question) {
  const input = document.getElementById('regimento_input');
  if (input) input.value = question;
  regimentoSend();
}

async function regimentoSend() {
  const input = document.getElementById('regimento_input');
  if (!input) return;
  const question = input.value.trim();
  if (!question || _regimentoLoading) return;
  if (!GEMINI_API_KEY) { showToast('API Key nao configurada.', 'error'); return; }

  // Ensure PDF is loaded
  if (!_regimentoTextoCarregado) await regimentoCarregarPDF();

  _regimentoMessages.push({ role: 'user', content: question });
  input.value = '';
  regimentoRenderMessages();
  const chips = document.getElementById('regimento_chips');
  if (chips) chips.style.display = 'none';

  _regimentoLoading = true;
  const startTime = Date.now();
  const loadingEl = document.getElementById('regimento_loading');
  if (loadingEl) loadingEl.style.display = 'flex';
  const timerEl = document.getElementById('regimento_timer');
  if (timerEl) timerEl.style.display = 'inline';
  let timerInterval = setInterval(() => {
    if (timerEl) timerEl.textContent = ((Date.now() - startTime) / 1000).toFixed(0) + 's';
  }, 1000);
  const sendBtn = document.getElementById('regimento_sendBtn');
  if (sendBtn) { sendBtn.disabled = true; sendBtn.style.opacity = '.5'; }

  try {
    const response = await regimentoCallAPI(question);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    _regimentoMessages.push({ role: 'assistant', content: response, time: elapsed });
    regimentoSaveHistory(question, response);
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    _regimentoMessages.push({ role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente.\n\nErro: ' + err.message, time: elapsed });
  }

  clearInterval(timerInterval);
  _regimentoLoading = false;
  if (loadingEl) loadingEl.style.display = 'none';
  if (timerEl) timerEl.style.display = 'none';
  if (sendBtn) { sendBtn.disabled = false; sendBtn.style.opacity = ''; }
  regimentoRenderMessages();
}

async function regimentoCallAPI(question) {
  // Build system prompt with PDF text (truncated to fit context)
  const textoParaPrompt = _regimentoTexto ? _regimentoTexto.substring(0, 28000) : 'Regimento nao carregado.';
  const systemPrompt = `Voce e um assistente da AUTO VALE CLUBE DE BENEFICIOS. Responda APENAS em portugues brasileiro.

REGRAS:
1. NUNCA responda em ingles.
2. Seja BREVE e DIRETO - maximo 3-5 frases por topico.
3. Cite o artigo relevante entre parenteses. Ex: (Art. 81)
4. Use bullet points para listar.
5. Nunca invente informacoes que nao estejam no documento.

REGIMENTO INTERNO COMPLETO:
${textoParaPrompt}`;

  const messages = [{ role: 'system', content: systemPrompt }];
  if (_regimentoMessages.length > 1) {
    _regimentoMessages.slice(0, -1).slice(-4).forEach(m => {
      messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content });
    });
  }
  messages.push({ role: 'user', content: question });

  const resp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GEMINI_API_KEY },
    body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.3, max_tokens: 800 })
  });
  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error((errData.error && errData.error.message) || 'HTTP ' + resp.status);
  }
  const data = await resp.json();
  if (data.choices && data.choices[0] && data.choices[0].message) return data.choices[0].message.content;
  throw new Error('Resposta vazia');
}


// ========= UTILS =========
function regimentoFormatResponse(text) {
  if (!text) return '';
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gm, '<li style="margin-bottom:3px">$1</li>')
    .replace(/\n\n/g, '</p><p style="margin:6px 0">')
    .replace(/\n/g, '<br>');
  html = html.replace(/(<li[^>]*>.*?<\/li>(\s*<br>)?)+/g, match =>
    '<ul style="padding-left:16px;margin:6px 0">' + match.replace(/<br>/g,'') + '</ul>');
  html = html.replace(/\(Art\.\s*(\d+[º°]?(?:-[A-Z])?)\)/g,
    '<strong style="color:var(--primary)">(Art. $1)</strong>');
  return '<p style="margin:6px 0">' + html + '</p>';
}

function regimentoFeedback(msgIdx, type) {
  const el = document.querySelector(`.regimento-msg-feedback[data-idx="${msgIdx}"]`);
  if (!el) return;
  el.innerHTML = `<span style="font-size:.65rem;color:var(--text3)">${type==='util'?'Obrigado!':'Vamos melhorar!'}</span>`;
}

function regimentoSaveHistory(question, answer) {
  const entry = { question, answer: answer.substring(0,150), date: new Date().toISOString() };
  _regimentoHistory.unshift(entry);
  if (_regimentoHistory.length > 50) _regimentoHistory = _regimentoHistory.slice(0,50);
  localStorage.setItem('avp-regimento-history', JSON.stringify(_regimentoHistory));
  try {
    if (typeof supabase!=='undefined' && supabase.insert) {
      supabase.insert('regimento_historico', {
        usuario_id: currentProfile ? currentProfile.id : null,
        usuario_nome: currentUser || 'anonimo',
        pergunta: question,
        resposta_resumo: answer.substring(0,200),
        created_at: new Date().toISOString()
      });
    }
  } catch(e) {}
}

function regimentoAdminUpload() {
  showModal('Atualizar Regimento',
    `<div style="display:flex;flex-direction:column;gap:14px">
      <p style="font-size:.82rem;color:var(--text2)">Suba um novo PDF para substituir o regimento atual no Supabase Storage.</p>
      <input type="file" id="regUploadFile" accept=".pdf" style="font-size:.78rem">
      <div style="font-size:.72rem;color:var(--text3)">O arquivo sera salvo no bucket "regimento" do Supabase e substituira o atual.</div>
    </div>`,
    async function() {
      const fileInput = document.getElementById('regUploadFile');
      if (!fileInput||!fileInput.files[0]) { showToast('Selecione um PDF','error'); return; }
      const file = fileInput.files[0];
      if (!file.name.endsWith('.pdf')) { showToast('Apenas arquivos PDF','error'); return; }
      showToast('Enviando...','warning');
      try {
        const token = supabase.getToken() || SUPABASE_ANON_KEY;
        const resp = await fetch(SUPABASE_URL+'/storage/v1/object/regimento/'+encodeURIComponent(file.name),{
          method:'POST', headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+token,'Content-Type':'application/pdf','x-upsert':'true'}, body:file
        });
        if (!resp.ok) throw new Error('HTTP '+resp.status);
        // Clear cache
        localStorage.removeItem('avp-regimento-texto');
        localStorage.removeItem('avp-regimento-version');
        closeModal();
        showToast('Regimento atualizado! Recarregue a pagina.','success');
      } catch(e) { showToast('Erro: '+e.message,'error'); }
    },'green','Enviar');
}
