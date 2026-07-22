import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const AEASY_URL = "https://aeasy.autovaleprevencoes.org";
const AEASY_LOGIN = "57975250899";
const AEASY_PASS = "Avp9768#";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, session_cookie, tipo_data, data_inicial, data_final, ordenar, retornar_lider, gestores } = body;

    // ACTION: LOGIN
    if (action === "login") {
      const loginResp = await fetch(`${AEASY_URL}/conta/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ UsuariosLogin: AEASY_LOGIN, UsuariosSenha: AEASY_PASS }),
      });
      const setCookie = loginResp.headers.get("set-cookie") || "";
      const sessMatch = setCookie.match(/PHPSESSID=([^;]+)/);
      if (!sessMatch) {
        return new Response(JSON.stringify({ error: "Falha no login AEasy" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true, session_cookie: `PHPSESSID=${sessMatch[1]}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ACTION: GESTORES
    if (action === "gestores") {
      const gestoresUrl = `${AEASY_URL}/consultores/listagem?draw=1&columns%5B0%5D%5Bdata%5D=IndividuosNome&columns%5B0%5D%5Bname%5D=IndividuosNome&columns%5B0%5D%5Bsearchable%5D=false&columns%5B0%5D%5Borderable%5D=true&order%5B0%5D%5Bcolumn%5D=0&order%5B0%5D%5Bdir%5D=asc&start=0&length=7000&formPesquisa%5BsubmitFilter%5D=true&formPesquisa%5BSituacao%5D%5B%5D=2`;
      const gestoresResp = await fetch(gestoresUrl, { headers: { Cookie: session_cookie, "X-Requested-With": "XMLHttpRequest", "User-Agent": "Mozilla/5.0" } });
      const gestoresData = await gestoresResp.json();
      const result: any[] = [];
      const seen = new Set<string>();
      for (const r of gestoresData.data || []) {
        if (r.ConsultoresLider === "1" && !seen.has(r.ConsultoresId)) {
          seen.add(r.ConsultoresId);
          const cidadeNome = r.IndividuosEnderecosCidadesNome || null;
          const estadoNome = r.IndividuosEnderecosEstadosNome || null;
          let cidade: string | null = null;
          if (cidadeNome) {
            cidade = estadoNome ? `${cidadeNome} - ${estadoNome}` : cidadeNome;
          }
          result.push({ id: r.ConsultoresId, nome: r.IndividuosNome, sede: r.GruposEmpresasNome || null, cidade });
        }
      }
      return new Response(JSON.stringify({ success: true, gestores: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ACTION: BATCH
    if (action === "batch") {
      const results: any[] = [];
      for (const g of gestores) {
        const url = `${AEASY_URL}/TopVendas?TipoData=${tipo_data}&DataInicial=${data_inicial}&DataFinal=${data_final}&Ordenar=${ordenar}&CampoOrder=Quantidade&EquipeId=${g.id}&RetornarLiderComEquipe=${retornar_lider}`;
        try {
          const resp = await fetch(url, { headers: { Cookie: session_cookie, "User-Agent": "Mozilla/5.0" } });
          const html = await resp.text();
          const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
          if (!tbodyMatch) {
            results.push({ gestor: g.nome, sede: g.sede, cidade: g.cidade, gestor_ativadas_qtd: 0, gestor_ativadas_valor: 0, equipe_total_qtd: 0, equipe_total_valor: 0, equipe_sem_gestor_qtd: 0, equipe_sem_gestor_valor: 0, membros_total: 0, membros_ativos: 0, membros: [] });
            continue;
          }
          const rows = tbodyMatch[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
          let tq = 0, tv = 0, gq = 0, gv = 0, ma = 0;
          const membros: any[] = [];
          for (const row of rows) {
            const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || []).map(c => c.replace(/<[^>]+>/g, "").trim());
            if (cells.length >= 15) {
              const nome = cells[1];
              const aq = parseInt(cells[13]) || 0;
              const av = parseFloat(cells[14].replace("R$", "").replace(/\./g, "").replace(",", ".").trim()) || 0;
              tq += aq; tv += av;
              if (aq > 0) ma++;
              if (nome.toUpperCase() === g.nome.toUpperCase()) { gq = aq; gv = av; }
              membros.push({ nome, ativadas_qtd: aq, ativadas_valor: Math.round(av * 100) / 100 });
            }
          }
          membros.sort((a: any, b: any) => b.ativadas_qtd - a.ativadas_qtd);
          results.push({
            gestor: g.nome, sede: g.sede, cidade: g.cidade,
            gestor_ativadas_qtd: gq, gestor_ativadas_valor: Math.round(gv * 100) / 100,
            equipe_total_qtd: tq, equipe_total_valor: Math.round(tv * 100) / 100,
            equipe_sem_gestor_qtd: tq - gq, equipe_sem_gestor_valor: Math.round((tv - gv) * 100) / 100,
            membros_total: rows.length, membros_ativos: ma, membros
          });
        } catch {
          results.push({ gestor: g.nome, sede: g.sede, cidade: g.cidade, gestor_ativadas_qtd: 0, gestor_ativadas_valor: 0, equipe_total_qtd: 0, equipe_total_valor: 0, equipe_sem_gestor_qtd: 0, equipe_sem_gestor_valor: 0, membros_total: 0, membros_ativos: 0, membros: [] });
        }
      }
      return new Response(JSON.stringify({ success: true, data: results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ACTION: CONSULTORES_TODOS
    if (action === "consultores_todos") {
      const url = `${AEASY_URL}/TopVendas?TipoData=${tipo_data || '3'}&DataInicial=${data_inicial}&DataFinal=${data_final}&Ordenar=${ordenar || '6'}&CampoOrder=Quantidade`;
      try {
        const resp = await fetch(url, { headers: { Cookie: session_cookie, "User-Agent": "Mozilla/5.0" } });
        const html = await resp.text();
        const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
        if (!tbodyMatch) {
          return new Response(JSON.stringify({ success: true, consultores: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const rows = tbodyMatch[1].match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
        const consultores: any[] = [];
        for (const row of rows) {
          const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || []).map(c => c.replace(/<[^>]+>/g, "").trim());
          if (cells.length >= 15) {
            const nome = cells[1];
            const aq = parseInt(cells[13]) || 0;
            const av = parseFloat(cells[14].replace("R$", "").replace(/\./g, "").replace(",", ".").trim()) || 0;
            if (aq > 0) {
              consultores.push({ nome, ativados: aq, mensalidade: Math.round(av * 100) / 100 });
            }
          }
        }
        consultores.sort((a: any, b: any) => b.ativados - a.ativados);
        return new Response(JSON.stringify({ success: true, consultores, total: consultores.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ success: false, error: e.message, consultores: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ACTION: CAMPANHA
    if (action === "campanha") {
      const { gestor_id, gestor_nome, data_final: camp_data_final, retornar_lider: camp_retornar_lider } = body;
      const url = `${AEASY_URL}/vendas/listagem`;
      const formData = new URLSearchParams();
      formData.append("draw", "1");
      formData.append("columns[0][data]", "ClientesIndividuosNome");
      formData.append("columns[0][name]", "ClientesIndividuosNome");
      formData.append("columns[0][searchable]", "false");
      formData.append("columns[0][orderable]", "true");
      formData.append("order[0][column]", "0");
      formData.append("order[0][dir]", "DESC");
      formData.append("start", "0");
      formData.append("length", "5000");
      formData.append("formPesquisa[DepartNivel]", "1");
      formData.append("formPesquisa[TipoData]", "VendasDataAtivacao");
      formData.append("formPesquisa[DataInicial]", "2026-01-01");
      formData.append("formPesquisa[DataFinal]", camp_data_final);
      formData.append("formPesquisa[VendasSituacao][]", "1");
      formData.append("formPesquisa[FaturasPagas]", "1");
      formData.append("formPesquisa[TipoVendasFaturasPagas]", ">");
      formData.append("formPesquisa[EquipesId]", gestor_id);
      formData.append("formPesquisa[RetornarLiderComEquipe]", camp_retornar_lider || "NAO");
      formData.append("formPesquisa[submitFilter]", "true");

      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            Cookie: session_cookie,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: formData.toString(),
        });

        const data = await resp.json();
        const ativados = parseInt(data.recordsTotal) || 0;

        let mensalidade = 0;
        if (data.data) {
          for (const row of data.data) {
            mensalidade += parseValorBR(row.VendasValor);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          gestor_nome,
          ativados,
          mensalidade: Math.round(mensalidade * 100) / 100,
          ticket_medio: ativados > 0 ? Math.round((mensalidade / ativados) * 100) / 100 : 0,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ success: false, error: e.message, gestor_nome, ativados: 0, mensalidade: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ACTION: BASE_EXCEL
    // Gera e baixa o Excel Completo da AEasy por período, retorna como base64
    // Params: session_cookie, data_inicial, data_final
    if (action === "base_excel") {
      const { data_inicial: exDataIni, data_final: exDataFim, situacao_filtro } = body;
      let situacaoParam = '';
      if (situacao_filtro) {
        situacaoParam = '&VendasSituacao%5B%5D=' + situacao_filtro;
      }
      const exportUrl = `${AEASY_URL}/vendas/exportar-relatorio-completo-associados?DepartNivel=1&TipoData=VendasDataCadastro&DataInicial=${exDataIni}&DataFinal=${exDataFim}${situacaoParam}&Fidelidade=&IndividuosEnderecosLogradouro=&IndividuosEnderecosBairro=&VendasCarrosPlaca=&VendasCarrosPlacaImplemento=&VendasCarrosModelosId=&PossuiEvento=&DataNascimento=&VendasDiasAtraso=&TipoVendasFaturasPagas=&FaturasPagas=&VeiculoZero=&ValorFipeInicio=&ValorFipeFinal=&FormaPagamento=&VendasClassificacao=&PossuiRastreador=&VendasCarrosRastreadorObrigatorio=&CarneEmitido=&PossuiCarne=&ConsultoresIndicadoresConsultoresNome=&VendasTipoSuspensao=&VendasCarrosValorDescontoConsultor=&VendasCarrosOrigemMigracao=&VendasFuncionariosConsultoresId=&VendasCarrosPortabilidade=&AssociadosMaisPlacas=&VendasCarrosAssociacaoOrigem=&CarrosChassi=&VendasCarrosPlotagem=&FaturaNaoGeradaMesAno=&FaturaNaoGeradaTipo=&ParcelasDisponiveis=&DadosExtra=&TermoAdesaoAssinado=&AuxilioProfissional=&VendasCarrosChassiRemarcado=&VendasCarrosLeilao=&VendasCarrosMediaMonta=&VendasCarrosMotivosDeprecacaoId=&RetornarLiderComEquipe=&ProdutosId=&ContabilizaParaMeta=`;

      try {
        // Step 1: Solicitar geração do Excel
        const genResp = await fetch(exportUrl, {
          headers: { Cookie: session_cookie, "User-Agent": "Mozilla/5.0", "X-Requested-With": "XMLHttpRequest" }
        });
        const genData = await genResp.json();
        if (!genData.redirect) {
          return new Response(JSON.stringify({ success: false, error: "Falha ao gerar Excel: " + (genData.mensagem || "sem redirect") }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Step 2: Baixar o arquivo XLSX
        const fileUrl = `${AEASY_URL}/${genData.redirect}`;
        const fileResp = await fetch(fileUrl, {
          headers: { Cookie: session_cookie, "User-Agent": "Mozilla/5.0" }
        });
        if (!fileResp.ok) {
          return new Response(JSON.stringify({ success: false, error: "Falha ao baixar arquivo: " + fileResp.status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const fileBuffer = await fileResp.arrayBuffer();
        // Convert to base64 in chunks to avoid stack overflow
        const bytes = new Uint8Array(fileBuffer);
        let base64 = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.slice(i, i + chunkSize);
          base64 += String.fromCharCode.apply(null, chunk as unknown as number[]);
        }
        base64 = btoa(base64);

        return new Response(JSON.stringify({
          success: true,
          xlsx_base64: base64,
          file_size: fileBuffer.byteLength,
          periodo: `${exDataIni} a ${exDataFim}`,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ACTION: BASE_ASSOCIADOS
    // Busca a base completa de associados (paginado)
    // Params: session_cookie, situacoes (array [1,2,3]), start (offset), length (batch size), data_inicial (opcional), data_final (opcional)
    if (action === "base_associados") {
      const { situacao, situacoes, start: startOffset, length: batchLength, data_inicial: biDataInicial, data_final: biDataFinal } = body;
      const url = `${AEASY_URL}/vendas/listagem`;
      const formData = new URLSearchParams();
      formData.append("draw", "1");
      formData.append("columns[0][data]", "ClientesIndividuosNome");
      formData.append("columns[0][name]", "ClientesIndividuosNome");
      formData.append("columns[0][searchable]", "false");
      formData.append("columns[0][orderable]", "true");
      formData.append("order[0][column]", "0");
      formData.append("order[0][dir]", "ASC");
      formData.append("start", String(startOffset || 0));
      formData.append("length", String(batchLength || 5000));
      formData.append("formPesquisa[DepartNivel]", "1");
      // Filtro de data (opcional — usa VendasDataCadastro para capturar toda a base)
      if (biDataInicial && biDataFinal) {
        formData.append("formPesquisa[TipoData]", "VendasDataCadastro");
        formData.append("formPesquisa[DataInicial]", biDataInicial);
        formData.append("formPesquisa[DataFinal]", biDataFinal);
      }
      // Suporta array de situações ou situação única
      const sits = situacoes || [situacao || 1];
      for (const s of sits) {
        formData.append("formPesquisa[VendasSituacao][]", String(s));
      }
      formData.append("formPesquisa[submitFilter]", "true");

      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            Cookie: session_cookie,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: formData.toString(),
        });

        const rawData = await resp.json();
        const recordsTotal = parseInt(rawData.recordsTotal) || 0;
        const registros: any[] = [];

        if (rawData.data) {
          for (const r of rawData.data) {
            registros.push({
              nome: r.ClientesIndividuosNome || "",
              situacao: parseInt(r.VendasSituacaoEnum) === 1 ? "Ativo" : parseInt(r.VendasSituacaoEnum) === 2 ? "Suspenso" : parseInt(r.VendasSituacaoEnum) === 3 ? "Cancelado" : (r.VendasSituacao || ""),
              situacao_enum: parseInt(r.VendasSituacaoEnum) || 0,
              categoria: r.VendasCarrosCategoriasCarrosNome || "",
              plano: r.VendasCarrosCategoriasPlanosNome || "",
              marca: r.VendasCarrosMarcasNome || "",
              modelo: r.VendasCarrosModelosNome || "",
              cor: r.VendasCarrosCarrosCor || "",
              ano_fabricacao: parseInt(r.CarrosAnoFabricacao) || 0,
              placa: r.VendasCarrosPlaca || "",
              cidade: r.IndividuosEnderecosCidadesNome || "",
              uf: r.IndividuosEnderecosEstadosUf || "",
              consultor: r.ConsultoresNome || "",
              valor_mensal: parseValorBR(r.VendasValor),
              valor_fipe: parseValorBR(r.VendasCarrosValorFipe),
              valor_adesao: parseValorBR(r.VendasCarrosValorAdesao),
              data_ativacao: r.VendasDataAtivacao || "",
              data_cancelamento: r.VendasDataCancelamento || "",
              data_suspensao: r.VendasDataSuspensao || "",
              motivo_cancelamento: r.VendasMotivosCancelamentosNome || "",
              rastreador: String(r.VendasCarrosRastreadorInstalado) === "1" ? 1 : 0,
              numero_rastreador: r.VendasCarrosNumeroRastreador || "",
              dias_atraso: parseInt(r.VendasDiasAtraso) || 0,
              faturas_pagas: parseInt(r.VendasQuantidadeFaturasPagas) || 0,
              forma_pagamento: parseInt(r.VendasFormaPagamentoEnum) || 0,
              telefone: r.VendaTelefone || "",
              email: r.ClientesIndividuosEmail || "",
              classificacao: r.VendasClassificacao || "",
              data_cadastro: r.VendasDataCadastro || "",
            });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          recordsTotal,
          recordsReturned: registros.length,
          start: startOffset || 0,
          data: registros,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ success: false, error: e.message, recordsTotal: 0, data: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // ACTION: BASE_ASSOCIADOS_COUNT
    // Retorna apenas a contagem por situação (rápido, para KPIs iniciais)
    if (action === "base_associados_count") {
      const { situacao } = body;
      const url = `${AEASY_URL}/vendas/listagem`;
      const formData = new URLSearchParams();
      formData.append("draw", "1");
      formData.append("columns[0][data]", "ClientesIndividuosNome");
      formData.append("columns[0][name]", "ClientesIndividuosNome");
      formData.append("columns[0][searchable]", "false");
      formData.append("columns[0][orderable]", "true");
      formData.append("order[0][column]", "0");
      formData.append("order[0][dir]", "ASC");
      formData.append("start", "0");
      formData.append("length", "1");
      formData.append("formPesquisa[DepartNivel]", "1");
      formData.append("formPesquisa[VendasSituacao][]", String(situacao || 1));
      formData.append("formPesquisa[submitFilter]", "true");

      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            Cookie: session_cookie,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: formData.toString(),
        });

        const rawData = await resp.json();
        const recordsTotal = parseInt(rawData.recordsTotal) || 0;

        return new Response(JSON.stringify({
          success: true,
          situacao: situacao || 1,
          total: recordsTotal,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ success: false, error: e.message, total: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ error: "action invalida" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// ====== UTILS ======
function formatDateBR(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function parseValorBR(val: any): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  const cleaned = String(val).replace(/[R$\s.]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
