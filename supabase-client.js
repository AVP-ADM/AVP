// ========= AVP BASE - SUPABASE CLIENT =========
const SUPABASE_URL = 'https://thchtjwbytdphmviympg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VMEfbrcWX4dHBAZZSsc3yQ_RniWyTz9';

// Supabase client helper (sem SDK externo, usa fetch puro)
const supabase = {
  // ========= AUTH =========
  async signIn(email, password) {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password })
    });
    return resp.json();
  },

  async signUp(email, password, metadata = {}) {
    const resp = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password, data: metadata })
    });
    return resp.json();
  },

  async signOut() {
    const token = supabase.getToken();
    if (!token) return;
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` }
    });
    localStorage.removeItem('avp-supabase-session');
  },

  getToken() {
    try {
      const session = JSON.parse(localStorage.getItem('avp-supabase-session') || 'null');
      return session?.access_token || null;
    } catch { return null; }
  },

  getUser() {
    try {
      const session = JSON.parse(localStorage.getItem('avp-supabase-session') || 'null');
      return session?.user || null;
    } catch { return null; }
  },

  saveSession(data) {
    localStorage.setItem('avp-supabase-session', JSON.stringify(data));
  },

  // ========= DATABASE (REST) =========
  _headers() {
    const token = supabase.getToken();
    const headers = { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  },

  async select(table, options = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=${options.select || '*'}`;
    if (options.filter) url += `&${options.filter}`;
    if (options.order) url += `&order=${options.order}`;
    if (options.limit) url += `&limit=${options.limit}`;
    const resp = await fetch(url, { headers: supabase._headers() });
    if (!resp.ok) throw new Error(`Select ${table} failed: ${resp.status}`);
    return resp.json();
  },

  async insert(table, data, options = {}) {
    const headers = { ...supabase._headers(), 'Prefer': options.upsert ? 'resolution=merge-duplicates' : 'return=minimal' };
    if (options.returnData) headers['Prefer'] = 'return=representation';
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Insert ${table} failed: ${err}`);
    }
    if (options.returnData) return resp.json();
    return true;
  },

  async update(table, data, filter) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
      method: 'PATCH',
      headers: { ...supabase._headers(), 'Prefer': 'return=minimal' },
      body: JSON.stringify(data)
    });
    if (!resp.ok) throw new Error(`Update ${table} failed: ${resp.status}`);
    return true;
  },

  async delete(table, filter) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
      method: 'DELETE',
      headers: supabase._headers()
    });
    if (!resp.ok) throw new Error(`Delete ${table} failed: ${resp.status}`);
    return true;
  },

  async rpc(fnName, params = {}) {
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
      method: 'POST',
      headers: supabase._headers(),
      body: JSON.stringify(params)
    });
    if (!resp.ok) throw new Error(`RPC ${fnName} failed: ${resp.status}`);
    const text = await resp.text();
    return text ? JSON.parse(text) : null;
  },

  // ========= AVP-SPECIFIC FUNCTIONS =========

  // Load all data (categorias + modelos)
  async loadAllData() {
    const [categorias, modelos] = await Promise.all([
      supabase.select('categorias', { filter: 'ativo=eq.true', order: 'nome' }),
      supabase.select('modelos', { select: '*,categorias(nome,tipo_fipe,ano_minimo)' })
    ]);
    return { categorias, modelos };
  },

  // Load history
  async loadHistory(limit = 100) {
    return supabase.select('historico', { order: 'created_at.desc', limit });
  },

  // Save history entry
  async saveHistory(entry) {
    return supabase.insert('historico', entry);
  },

  // Load rules
  async loadRules() {
    const [compat, inclusao] = await Promise.all([
      supabase.select('regras_compatibilidade'),
      supabase.select('regras_inclusao')
    ]);
    return { compat, inclusao };
  },

  // Load temp releases
  async loadTempReleases() {
    return supabase.select('liberacoes_temporarias', { order: 'created_at.desc' });
  },

  // Load pending changes
  async loadPendingChanges() {
    return supabase.select('alteracoes_pendentes', { filter: 'status=eq.pendente', order: 'created_at.desc' });
  },

  // Session control
  async createSession(userId, token) {
    return supabase.rpc('invalidar_sessoes_anteriores', { p_usuario_id: userId, p_novo_token: token });
  },

  async verifySession(userId, token) {
    return supabase.rpc('verificar_sessao', { p_usuario_id: userId, p_token: token });
  },

  // Get user profile
  async getProfile(userId) {
    const data = await supabase.select('perfis', { filter: `id=eq.${userId}` });
    return data?.[0] || null;
  },

  // Save model (insert or update)
  async saveModel(categoriaId, marca, modelo, anoAceitacao) {
    return supabase.insert('modelos', { categoria_id: categoriaId, marca, modelo, ano_aceitacao: anoAceitacao || null }, { upsert: true });
  },

  // Delete model
  async deleteModel(categoriaId, marca, modelo) {
    return supabase.delete('modelos', `categoria_id=eq.${categoriaId}&marca=eq.${encodeURIComponent(marca)}&modelo=eq.${encodeURIComponent(modelo)}`);
  },

  // Bulk insert models for a category
  async bulkInsertModels(models) {
    // models = [{categoria_id, marca, modelo, ano_aceitacao}, ...]
    if (!models.length) return true;
    return supabase.insert('modelos', models, { upsert: true });
  },

  // Save full base (replaces all models for given categories)
  async saveFullBase(rawData, categoriasMap) {
    // rawData = {catName: {brands: {brand: [model1, model2]}}}
    // categoriasMap = {catName: catId}
    const allModels = [];
    for (const [catName, catData] of Object.entries(rawData)) {
      const catId = categoriasMap[catName];
      if (!catId) continue;
      for (const [brand, models] of Object.entries(catData.brands || {})) {
        for (const model of models) {
          allModels.push({ categoria_id: catId, marca: brand, modelo: model });
        }
      }
    }
    // Delete all existing models first
    await supabase.delete('modelos', 'id=neq.00000000-0000-0000-0000-000000000000');
    // Insert all
    // Split into chunks of 500 to avoid payload limits
    const CHUNK = 500;
    for (let i = 0; i < allModels.length; i += CHUNK) {
      await supabase.insert('modelos', allModels.slice(i, i + CHUNK));
    }
    return true;
  }
};
