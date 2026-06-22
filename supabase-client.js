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

  getRefreshToken() {
    try {
      const session = JSON.parse(localStorage.getItem('avp-supabase-session') || 'null');
      return session?.refresh_token || null;
    } catch { return null; }
  },

  async refreshSession() {
    const refreshToken = supabase.getRefreshToken();
    if (!refreshToken) return false;
    try {
      const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      const data = await resp.json();
      if (data.access_token) {
        supabase.saveSession(data);
        return true;
      }
    } catch(e) { console.warn('Token refresh failed:', e); }
    return false;
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

  _serviceHeaders() {
    // Kept for potential server-side use; browser operations use _headers() with user token
    return supabase._headers();
  },

  async select(table, options = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=${options.select || '*'}`;
    if (options.filter) url += `&${options.filter}`;
    if (options.order) url += `&order=${options.order}`;
    if (options.limit) url += `&limit=${options.limit}`;
    let resp = await fetch(url, { headers: supabase._headers() });
    // Auto-refresh token on 401
    if (resp.status === 401) {
      const refreshed = await supabase.refreshSession();
      if (refreshed) {
        resp = await fetch(url, { headers: supabase._headers() });
      }
    }
    if (!resp.ok) throw new Error(`Select ${table} failed: ${resp.status}`);
    return resp.json();
  },

  async selectPaginated(table, options = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?select=${options.select || '*'}`;
    if (options.filter) url += `&${options.filter}`;
    if (options.order) url += `&order=${options.order}`;
    if (options.limit) url += `&limit=${options.limit}`;
    if (options.offset) url += `&offset=${options.offset}`;
    let resp = await fetch(url, { headers: supabase._headers() });
    if (resp.status === 401) {
      const refreshed = await supabase.refreshSession();
      if (refreshed) {
        resp = await fetch(url, { headers: supabase._headers() });
      }
    }
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

  // Load all data (categorias + modelos) - handles pagination for large datasets
  async loadAllData() {
    const categorias = await supabase.select('categorias', { filter: 'ativo=eq.true', order: 'nome' });
    
    // Load all modelos with pagination (Supabase limits to 1000 per request)
    let allModelos = [];
    let offset = 0;
    const PAGE_SIZE = 1000;
    while(true) {
      const chunk = await supabase.selectPaginated('modelos', {
        select: '*,categorias(nome,tipo_fipe,ano_minimo)',
        limit: PAGE_SIZE,
        offset: offset
      });
      allModelos = allModelos.concat(chunk);
      if(chunk.length < PAGE_SIZE) break; // Last page
      offset += PAGE_SIZE;
    }
    
    return { categorias, modelos: allModelos };
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

  // Divergências ignoradas
  async loadDivergenciasIgnoradas() {
    return supabase.select('divergencias_ignoradas');
  },

  async ignorarDivergencia(marca, modelo, catOrigem, catDestino, usuario) {
    return supabase.insert('divergencias_ignoradas', {
      marca, modelo, categoria_origem: catOrigem, categoria_destino: catDestino, usuario
    });
  },

  async desigNorarDivergencia(marca, modelo, catOrigem, catDestino) {
    return supabase.delete('divergencias_ignoradas',
      `marca=eq.${encodeURIComponent(marca)}&modelo=eq.${encodeURIComponent(modelo)}&categoria_origem=eq.${encodeURIComponent(catOrigem)}&categoria_destino=eq.${encodeURIComponent(catDestino)}`
    );
  },

  // ========= FIPE CACHE (cross-device) =========

  // Save FIPE base to Supabase cache (brands + models + metadata)
  async saveFipeCache(fipeBase) {
    // Save metadata (lastUpdate, totalBrands, totalModels)
    const metadata = {
      lastUpdate: fipeBase.lastUpdate,
      totalBrands: fipeBase.totalBrands,
      totalModels: fipeBase.totalModels
    };
    await supabase.upsertFipeCacheKey('fipe_metadata', metadata);

    // Save brands array
    await supabase.upsertFipeCacheKey('fipe_brands', fipeBase.brands);

    // Save models in chunks (each brand's models as a separate key to avoid payload limits)
    // Group by chunks of ~50 brand codes to stay under Supabase payload limits
    const modelKeys = Object.keys(fipeBase.models);
    const CHUNK_SIZE = 50;
    // First, save a manifest of chunk keys
    const chunkManifest = [];
    for (let i = 0; i < modelKeys.length; i += CHUNK_SIZE) {
      const chunkIdx = Math.floor(i / CHUNK_SIZE);
      const chunkKey = `fipe_models_chunk_${chunkIdx}`;
      const chunkData = {};
      const sliceKeys = modelKeys.slice(i, i + CHUNK_SIZE);
      for (const k of sliceKeys) {
        chunkData[k] = fipeBase.models[k];
      }
      await supabase.upsertFipeCacheKey(chunkKey, chunkData);
      chunkManifest.push(chunkKey);
    }
    await supabase.upsertFipeCacheKey('fipe_models_manifest', chunkManifest);

    // Clean up old chunks that are no longer needed
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/fipe_cache?select=chave`, { headers: supabase._serviceHeaders() });
      const allCache = resp.ok ? await resp.json() : [];
      const validKeys = new Set(['fipe_metadata', 'fipe_brands', 'fipe_models_manifest', 'fipe_requests', ...chunkManifest]);
      for (const row of allCache) {
        if (row.chave.startsWith('fipe_models_chunk_') && !validKeys.has(row.chave)) {
          await fetch(`${SUPABASE_URL}/rest/v1/fipe_cache?chave=eq.${encodeURIComponent(row.chave)}`, {
            method: 'DELETE', headers: supabase._serviceHeaders()
          });
        }
      }
    } catch(e) { console.warn('[FIPE Cache] Cleanup old chunks:', e); }

    return true;
  },

  // Load FIPE base from Supabase cache (uses service_role for guaranteed access)
  async loadFipeCache() {
    try {
      const svcHeaders = supabase._serviceHeaders();
      const fetchCache = async (filter) => {
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/fipe_cache?select=chave,valor&${filter}`, { headers: svcHeaders });
        if (!resp.ok) return [];
        return resp.json();
      };

      // Load metadata
      const metaRows = await fetchCache('chave=eq.fipe_metadata');
      if (!metaRows || metaRows.length === 0) return null; // No cache exists

      const metadata = metaRows[0].valor;
      if (!metadata || !metadata.lastUpdate) return null;

      // Load brands
      const brandsRows = await fetchCache('chave=eq.fipe_brands');
      if (!brandsRows || brandsRows.length === 0) return null;
      const brands = brandsRows[0].valor;

      // Load models manifest
      const manifestRows = await fetchCache('chave=eq.fipe_models_manifest');
      if (!manifestRows || manifestRows.length === 0) return null;
      const manifest = manifestRows[0].valor;

      // Load all model chunks
      const models = {};
      for (const chunkKey of manifest) {
        const chunkRows = await fetchCache(`chave=eq.${encodeURIComponent(chunkKey)}`);
        if (chunkRows && chunkRows.length > 0) {
          Object.assign(models, chunkRows[0].valor);
        }
      }

      return {
        brands: brands,
        models: models,
        lastUpdate: metadata.lastUpdate,
        totalBrands: metadata.totalBrands,
        totalModels: metadata.totalModels
      };
    } catch(e) {
      console.warn('[FIPE Cache] Load from Supabase failed:', e);
      return null;
    }
  },

  // Save FIPE requests counter to Supabase
  async saveFipeRequestsCache(requests) {
    return supabase.upsertFipeCacheKey('fipe_requests', requests);
  },

  // Load FIPE requests counter from Supabase
  async loadFipeRequestsCache() {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/fipe_cache?select=valor&chave=eq.fipe_requests`, { headers: supabase._serviceHeaders() });
      if (!resp.ok) return null;
      const rows = await resp.json();
      if (rows && rows.length > 0) return rows[0].valor;
      return null;
    } catch(e) { return null; }
  },

  // Upsert a single key in fipe_cache table (uses service_role for write access)
  async upsertFipeCacheKey(chave, valor) {
    const headers = { ...supabase._serviceHeaders(), 'Prefer': 'resolution=merge-duplicates' };
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/fipe_cache`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ chave, valor, updated_at: new Date().toISOString() })
    });
    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Upsert fipe_cache [${chave}] failed: ${err}`);
    }
    return true;
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
