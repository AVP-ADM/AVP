import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const AEASY_URL = "https://aeasy.autovaleprevencoes.org";
const LOGIN_USER = "57975250899";
const LOGIN_PASS = "Avp9768#";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action;

    if (action === "login") {
      return await handleLogin();
    } else if (action === "gestores") {
      return await handleGestores(body.session_cookie);
    } else if (action === "batch") {
      return await handleBatch(body);
    } else if (action === "campanha") {
      return await handleCampanha(body);
    } else {
      return json({ error: "action invalida" }, 400);
    }
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ====== LOGIN ======
async function handleLogin() {
  const formData = new URLSearchParams();
  formData.append("usuario", LOGIN_USER);
  formData.append("senha", LOGIN_PASS);

  const resp = await fetch(`${AEASY_URL}/login/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
    redirect: "manual",
  });

  const cookies = resp.headers.getSetCookie?.() || [];
  let sessionCookie = "";
  for (const c of cookies) {
    if (c.startsWith("PHPSESSID=")) {
      sessionCookie = c.split(";")[0];
      break;
    }
  }

  // Fallback: try to extract from all set-cookie headers
  if (!sessionCookie) {
    const raw = resp.headers.get("set-cookie") || "";
    const match = raw.match(/PHPSESSID=[^;]+/);
    if (match) sessionCookie = match[0];
  }

  if (!sessionCookie) {
    return json({ success: false, error: "Nao conseguiu obter session cookie" });
  }

  return json({ success: true, session_cookie: sessionCookie });
}

// ====== GESTORES ======
async function handleGestores(sessionCookie: string) {
  const resp = await fetch(`${AEASY_URL}/equipes/listagem?length=200&start=0`, {
    headers: { Cookie: sessionCookie },
  });
  const data = await resp.json();

  if (!data.data) {
    return json({ success: false, error: "Sem dados de gestores" });
  }

  const gestores = data.data.map((g: any) => ({
    id: g.EquipesId,
    nome: g.NomeExibicao || g.EquipesNome,
    sede: g.SedesNome,
    cidade: parseCidade(g.SedesNome),
  }));

  return json({ success: true, gestores });
}

function parseCidade(sede: string | null): string | null {
  if (!sede) return null;
  // Format: "05 - Itabuna - Ba" -> "Itabuna - Bahia"
  const parts = (sede || "").split(" \u2013 ");
  if (parts.length < 2) {
    const parts2 = sede.split(" - ");
    if (parts2.length >= 2) {
      return parts2.slice(1).join(" - ").trim();
    }
    return sede;
  }
  const city = parts[0].replace(/^\d+\s*-\s*/, "").trim();
  const state = expandState(parts[1]?.trim());
  return city + " - " + state;
}

function expandState(abbr: string): string {
  const states: Record<string, string> = {
    Ba: "Bahia", PE: "Pernambuco", Al: "Alagoas", Se: "Sergipe",
    Ce: "Ceara", MA: "Maranhao", PI: "Piaui", RN: "Rio Grande do Norte",
    PB: "Paraiba", MG: "Minas Gerais", SP: "Sao Paulo", RJ: "Rio de Janeiro",
  };
  return states[abbr] || abbr;
}

// ====== BATCH (Acompanhamento/Pesquisa) ======
async function handleBatch(body: any) {
  const { session_cookie, tipo_data, data_inicial, data_final, ordenar, retornar_lider, gestores } = body;

  const results = [];
  for (const g of gestores) {
    try {
      const result = await fetchGestorAdesoes(session_cookie, g, tipo_data, data_inicial, data_final, ordenar, retornar_lider);
      results.push(result);
    } catch (e) {
      results.push({
        gestor: g.nome,
        sede: g.sede,
        cidade: g.cidade,
        gestor_ativadas_qtd: 0,
        gestor_ativadas_valor: 0,
        equipe_total_qtd: 0,
        equipe_total_valor: 0,
        equipe_sem_gestor_qtd: 0,
        equipe_sem_gestor_valor: 0,
        membros_total: 0,
        membros_ativos: 0,
        membros: [],
      });
    }
  }

  return json({ success: true, data: results });
}

async function fetchGestorAdesoes(
  sessionCookie: string,
  gestor: any,
  tipoData: string,
  dataInicial: string,
  dataFinal: string,
  ordenar: string,
  retornarLider: string
) {
  const formData = new URLSearchParams();
  formData.append("formPesquisa[DepartNivel]", "1");
  formData.append("formPesquisa[TipoData]", tipoData === "3" ? "VendasDataAtivacao" : tipoData === "2" ? "VendasDataCotacao" : tipoData === "4" ? "VendasDataEfetivacao" : "VendasDataPrimeiroBoleto");
  formData.append("formPesquisa[DataInicial]", formatDateBR(dataInicial));
  formData.append("formPesquisa[DataFinal]", formatDateBR(dataFinal));
  formData.append("formPesquisa[VendasSituacao][]", "1");
  formData.append("formPesquisa[FaturasPagas]", "1");
  formData.append("formPesquisa[TipoVendasFaturasPagas]", ">");
  formData.append("formPesquisa[EquipesId]", gestor.id);
  formData.append("formPesquisa[RetornarLiderComEquipe]", retornarLider || "NAO");
  formData.append("formPesquisa[submitFilter]", "true");
  formData.append("length", "5000");
  formData.append("start", "0");

  const ordCol = ordenar === "6" ? "6" : ordenar === "2" ? "2" : ordenar === "1" ? "1" : "7";
  formData.append("order[0][column]", ordCol);
  formData.append("order[0][dir]", "desc");

  const resp = await fetch(`${AEASY_URL}/vendas/listagem`, {
    method: "POST",
    headers: {
      Cookie: sessionCookie,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  const data = await resp.json();
  const totalQtd = data.recordsTotal || 0;

  // Parse members
  const membros: any[] = [];
  const membrosMap: Record<string, { nome: string; qtd: number; valor: number }> = {};

  if (data.data) {
    for (const row of data.data) {
      const nome = row.VendasConsultorNome || row.NomeExibicao || "Desconhecido";
      const valor = parseValorBR(row.VendasValor);
      if (!membrosMap[nome]) {
        membrosMap[nome] = { nome, qtd: 0, valor: 0 };
      }
      membrosMap[nome].qtd++;
      membrosMap[nome].valor += valor;
    }
  }

  for (const key of Object.keys(membrosMap)) {
    membros.push({
      nome: membrosMap[key].nome,
      ativadas_qtd: membrosMap[key].qtd,
      ativadas_valor: membrosMap[key].valor,
    });
  }
  membros.sort((a: any, b: any) => b.ativadas_qtd - a.ativadas_qtd);

  // Calc individual vs equipe
  const gestorNomeUpper = gestor.nome.toUpperCase();
  let gestorQtd = 0, gestorValor = 0;
  let equipeQtd = 0, equipeValor = 0;

  for (const m of membros) {
    if (m.nome.toUpperCase() === gestorNomeUpper) {
      gestorQtd = m.ativadas_qtd;
      gestorValor = m.ativadas_valor;
    } else {
      equipeQtd += m.ativadas_qtd;
      equipeValor += m.ativadas_valor;
    }
  }

  return {
    gestor: gestor.nome,
    sede: gestor.sede,
    cidade: gestor.cidade,
    gestor_ativadas_qtd: gestorQtd,
    gestor_ativadas_valor: gestorValor,
    equipe_total_qtd: totalQtd,
    equipe_total_valor: gestorValor + equipeValor,
    equipe_sem_gestor_qtd: equipeQtd,
    equipe_sem_gestor_valor: equipeValor,
    membros_total: membros.length,
    membros_ativos: membros.filter((m: any) => m.ativadas_qtd > 0).length,
    membros,
  };
}

// ====== CAMPANHA (Premiações) ======
async function handleCampanha(body: any) {
  const { session_cookie, gestor_id, gestor_nome, data_final, retornar_lider } = body;

  const formData = new URLSearchParams();
  formData.append("formPesquisa[DepartNivel]", "1");
  formData.append("formPesquisa[TipoData]", "VendasDataAtivacao");
  formData.append("formPesquisa[DataInicial]", "01/01/2026");
  formData.append("formPesquisa[DataFinal]", formatDateBR(data_final));
  formData.append("formPesquisa[VendasSituacao][]", "1");
  formData.append("formPesquisa[FaturasPagas]", "1");
  formData.append("formPesquisa[TipoVendasFaturasPagas]", ">");
  formData.append("formPesquisa[EquipesId]", gestor_id);
  formData.append("formPesquisa[RetornarLiderComEquipe]", retornar_lider || "NAO");
  formData.append("formPesquisa[submitFilter]", "true");
  formData.append("length", "5000");
  formData.append("start", "0");

  try {
    const resp = await fetch(`${AEASY_URL}/vendas/listagem`, {
      method: "POST",
      headers: {
        Cookie: session_cookie,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await resp.json();
    const ativados = data.recordsTotal || 0;

    // Sum VendasValor from all records
    let mensalidade = 0;
    if (data.data) {
      for (const row of data.data) {
        mensalidade += parseValorBR(row.VendasValor);
      }
    }

    return json({
      success: true,
      gestor_nome,
      ativados,
      mensalidade,
      ticket_medio: ativados > 0 ? mensalidade / ativados : 0,
    });
  } catch (e) {
    return json({ success: false, error: e.message, gestor_nome, ativados: 0, mensalidade: 0 });
  }
}

// ====== UTILS ======
function formatDateBR(dateStr: string): string {
  // Convert YYYY-MM-DD to DD/MM/YYYY
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function parseValorBR(val: any): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  // "R$ 114,21" -> 114.21
  const cleaned = String(val).replace(/[R$\s.]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
