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

    // ACTION: CAMPANHA
    if (action === "campanha") {
      const { gestor_id, gestor_nome, data_final: camp_data_final, retornar_lider: camp_retornar_lider } = body;
      const url = `${AEASY_URL}/vendas/listagem`;
      const formData = new URLSearchParams();
      formData.append("formPesquisa[DepartNivel]", "1");
      formData.append("formPesquisa[TipoData]", "VendasDataAtivacao");
      formData.append("formPesquisa[DataInicial]", "01/01/2026");
      formData.append("formPesquisa[DataFinal]", formatDateBR(camp_data_final));
      formData.append("formPesquisa[VendasSituacao][]", "1");
      formData.append("formPesquisa[FaturasPagas]", "1");
      formData.append("formPesquisa[TipoVendasFaturasPagas]", ">");
      formData.append("formPesquisa[EquipesId]", gestor_id);
      formData.append("formPesquisa[RetornarLiderComEquipe]", camp_retornar_lider || "NAO");
      formData.append("formPesquisa[submitFilter]", "true");
      formData.append("length", "5000");
      formData.append("start", "0");

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
        const ativados = data.recordsTotal || 0;

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
