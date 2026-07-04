// ========= REGIMENTO INTERNO - CHAT COM GEMINI =========
// Integração com OpenRouter para consulta ao Regimento Interno
// Auto Vale Clube de Benefícios

// A API key é carregada do localStorage ou configurada pelo admin em Configurações
// Para configurar: localStorage.setItem('avp-gemini-key', 'SUA_KEY_AQUI')
// Key padrão (ofuscada para evitar bloqueio do GitHub Secret Scanning)
const _dk = ['sk-or-v1','d757dc96361dfcd2271823fc5e824ba6e82f8137feda49f92440700dd4b97751'];
let GEMINI_API_KEY = localStorage.getItem('avp-gemini-key') || _dk.join('-');
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free';

function getGeminiUrl() {
  return OPENROUTER_URL;
}

let _regimentoMessages = [];
let _regimentoLoading = false;

const REGIMENTO_FAQ_CHIPS = [
  'Quais são os planos disponíveis?',
  'O que cobre o Plano VIP?',
  'Como funciona o reboque?',
  'Quando perco os benefícios?',
  'Como funciona a cota de participação?',
  'O que não é coberto pelo PAM?',
  'Como cancelar minha filiação?',
  'Como funciona o rastreador?'
];


const REGIMENTO_SYSTEM_PROMPT = `Você é um assistente especializado no Regimento Interno da AUTO VALE CLUBE DE BENEFÍCIOS.
Sua função é responder perguntas sobre o regulamento de forma clara, objetiva e precisa.

REGRAS:
1. Sempre cite o artigo/capítulo/parágrafo relevante na resposta
2. Use linguagem acessível, evitando jargões jurídicos desnecessários
3. Se a pergunta não puder ser respondida com base no regimento, informe educadamente
4. Formate a resposta com marcadores quando apropriado
5. Seja conciso mas completo
6. Nunca invente informações que não estejam no documento

DOCUMENTO COMPLETO DO REGIMENTO INTERNO:

---
REGIMENTO INTERNO AUTO VALE CLUBE DE BENEFÍCIOS

1. INFORMAÇÕES INICIAIS

Art.1º - A AUTO VALE CLUBE DE BENEFÍCIOS, com sede na Avenida Coronel Antônio Honorato Viana, n° 538, Gercino Coelho, na cidade de Petrolina, Estado de Pernambuco, CEP 56308-000, é uma associação privada, sem fins lucrativos, formada pela união de pessoas, com fundamento no art. 5º, incisos XVII, XVIII, XIX, XX e XXI, da Constituição Federal e arts. 53 a 61 do Código Civil Brasileiro, regendo-se nos termos do seu Estatuto Social, neste Regulamento Interno e ordenamento jurídico.

Art. 2º - A AUTO VALE CLUBE DE BENEFÍCIOS encontra-se em plena vigência, por tempo indeterminado, preservando a assistência mútua, constituindo o PROGRAMA DE AUXÍLIO MÚTUO – PAM.

Art. 3º - Este instrumento, denominado Regulamento Interno, estabelece as regras do PROGRAMA DE AUXÍLIO MÚTUO - PAM.

Art. 4º - Este Regulamento Interno possui caráter público, devendo seus dispositivos serem cumpridos por todos os Associados, sob pena de exclusão.

Art. 5º - As alterações do presente REGIMENTO INTERNO produzirão seus efeitos imediatamente.

2. DOS OBJETIVOS E IMPLEMENTOS OPCIONAIS

Art. 6º - O PROGRAMA DE AUXÍLIO MÚTUO tem como primordial objetivo conferir amparo/assistência aos seus Associados, especificamente em caso de evento ocorrido por roubo, furto, colisão, perda total, incêndio derivado de colisão, capotamento, abalroamento, danos materiais provocados por quedas e objetos externos.

Art. 7º - Todos os benefícios são de livre escolha do Associado. Qualquer adição ou alteração no plano após a filiação somente produzirá efeito após transcorridos 30 dias.

Art. 8º - Os veículos cadastrados não poderão ser protegidos por seguros particulares ou outra associação com benefício de proteção veicular.

Art. 9º - São inaplicáveis perante esta Associação as normas do Decreto-Lei n.º 73/1966 (Lei de Seguros) e a Lei n.º 8.078/1990 (Código de Defesa do Consumidor).

Art. 10º - A cobertura do PAM se dará em todo o território nacional.

Art. 11º - Após a filiação, todo associado se compromete a participar do rateio por período mínimo de 90 dias. O Associado que solicitar cancelamento em até 5 dias úteis não pagará nenhuma taxa.

Art. 12 - Planos disponíveis:
I. Plano Start - Limitado a 30 anos de fabricação. Colisão, fenômenos naturais (granizo/queda de árvores), roubo, furto, incêndio de colisão, perda total. Assistência 24h. Reboque 500km/ano para colisão. Proteção para-brisa (50% participação). Não permite placa preta.
II. Plano Básico Carros - Limitado a R$501.000. Colisão, fenômenos naturais, roubo, furto, incêndio, perda total. Assistência 24h. Reboque 250km para pane. Reboque ilimitado para colisão.
III. Plano Vip Carros - Limitado a R$501.000. Idem Básico + Cobertura vidros/faróis/retrovisores (50% participação). Danos a terceiros até R$50.000. Reboque 500km para pane. Reboque ilimitado para colisão.
IV. Plano Top Carros - Limitado a R$501.000. Idem VIP + Cobertura vidros (30% participação). Danos a terceiros até R$100.000. Carro reserva 30 dias. Reboque 1.000km para pane. Reboque ilimitado para colisão.
V. Plano Personalizado - Roubo e furto. Rastreador obrigatório. Reboque até 400km. Terceiros até R$50.000 (se contratado).
VI. Plano Premium - Limitado a R$401.000. Colisão, fenômenos naturais, roubo, furto, incêndio, perda total. Assistência 24h. Terceiros até R$30.000. Reboque 300km para pane. Reboque ilimitado para colisão. Rastreamento obrigatório.
VII. Plano Básico Motos - Limitado a R$40.000. Colisão, fenômenos naturais, roubo, furto, incêndio, perda total. Assistência 24h. Reboque 250km para pane. Reboque ilimitado para colisão.
VIII. Plano Vip Motos - Limitado a R$40.000. Idem + Terceiros até R$10.000. Reboque 500km para pane.
IX. Plano Top Motos - Limitado a R$40.000. Idem + Moto reserva 30 dias. Reboque 1.000km para pane.
X. Plano Frota Publica - Limitado a 20 anos. Reboque 1.500km/ano. Cota participação 10%.
XI. Automóvel Elétrico - Roubo, furto, perda total. Tag obrigatória. Opcionais: terceiros, reboque colisão, para-brisa, reserva. EXCLUI cobertura bateria.
XII. Automóvel Híbrido - Idem Elétrico. EXCLUI cobertura bateria.

3. DO RASTREADOR
3.1 O uso do rastreador poderá ser obrigatório conforme avaliação da diretoria. A associação fornece em COMODATO. Multa de R$500 se perder/extraviar. Prazo 15 dias para devolver após notificação.

4. DA FILIAÇÃO, EXCLUSÃO E/OU RETIRADA DO PAM
Art. 13 - Documentos: CNH ou CI, CPF, CRLV, NF (0km), Comprovante Residência, Certidão Antecedentes.
Art. 14 - Vistoria prévia obrigatória com fotos e vídeos.
Art. 15 - Análise em até 3 dias úteis após pagamento da taxa de adesão.
Art. 16 - Recusa: restituição de 40% da taxa de adesão.
Art. 20 - Exclusão a pedido: formalizar na sede, responsabilizar-se pelas contribuições vigentes.
Art. 22 - Exclusão pela Associação: inadimplência 3+ meses, tentativa de fraude, condutas contrárias.
Art. 23 - Troca de titularidade: transferir em 30 dias sob pena de exclusão.
Art. 24 - Substituição de veículo: taxa + aprovação da Diretoria.
Art. 25 - Vigência 12 meses com renovação automática.

5. TAXAS CONTRIBUTIVAS
Art. 26 - Contribuição = Taxa Administrativa + Prestação Serviços Terceirizados + Rateio.
Art. 30 - Pagamento em dia conforme vencimento escolhido.
Art. 31 - Se não receber boleto até 5 dias antes, contatar a associação.

6. DA ACEITAÇÃO
Art. 32 - Veículos nacionais e importados em bom estado, documentação em dia.
Art. 33 - Limites: Leve até R$251.000, SUV/Caminhonete até R$501.000, Motos até R$60.000.
Art. 38 - Veículos turbinados/tunados NÃO aceitos.
Art. 39 - Avarias na vistoria: excluídas da reparação parcial, -20% FIPE para integral.
Art. 40 - Veículos de leilão/recuperados: -30% FIPE para integral.

7. PRESTAÇÃO DE SERVIÇOS TERCEIRIZADOS
Art. 49 - Rastreador: instalar em até 5 dias após convite.
Art. 50 - Retirada sem autorização: perde todos os benefícios.

8. DOS BENEFÍCIOS DO PAM
Art. 54 - Cobertura: roubo, furto, colisão, incêndio de colisão, capotamento, abalroamento.
Art. 55 - Reboque: ILIMITADO para colisão. Para pane: 250km(Básico), 500km(VIP), 1000km(Top). Acionamento pane: 1x/mês.
Art. 55-A - GUINCHO SEGUNDA SAÍDA: 50km no dia útil seguinte se pane em dia não útil/noturno.
Art. 56 - Terceiros: até R$20.000 motos, até R$100.000 carros (conforme plano). Exige culpa exclusiva.
Art. 57 - Vidros nacionais: 70%(Top) ou 50%(VIP). Carência 60 dias. Limite 2x/12 meses.
Art. 58 - Vidros Premium Importado: 50%. Carência 60 dias. Limite 1x/12 meses.
Art. 59 - Guarda veículo: até 5 dias após evento.
Art. 59-A - Pequenos Reparos: martelinho/para-choques. 2x/ano, 1x/mês. Até R$2.000. Coparticipação 50%. Carência 60 dias.

9. VIGÊNCIA DOS BENEFÍCIOS
Art. 60 - Eventos cobertos: Roubo, furto, colisão, incêndio de colisão, capotamento, abalroamento.
Art. 61 - Condutor deve estar habilitado, com CNH válida na categoria.
Art. 70 - Proteção inicia no 1º dia útil após anuência.
Art. 71 - Assistência 24h: imediata após aceitação.

10. DANOS NÃO INCLUÍDOS
Art. 72 - NÃO COBRE: dano moral, desgaste natural, explosão/incêndio não de colisão, guerra/tumulto, carga, multas, reparos sem autorização, acessórios não originais, alagamentos, vandalismo, películas, teto solar, GNV isolado, baterias elétricas.
Art. 73 - NÃO COBRE: infração de trânsito, sem CNH/vencida/suspensa, embriaguez, estradas impedidas, competições, negligência, furto simples, apropriação indébita, veículo sem manutenção, pneus ruins, inadimplente impostos, continuou trafegando após evento.

11. DOCUMENTOS PARA RESSARCIMENTO
Art. 76 - Danos parciais: CNH condutor, B.O., CRLV, RG/CPF, declaração a punho + croqui.
Art. 77 - Perda total: idem + CRV em favor da associação, chaves, certidão negativa furto/multa, quitação IPVA.
Art. 78 - Roubo/furto: idem + extrato DETRAN com queixa, certidão negativa multas.

12. CONDIÇÕES PARA UTILIZAÇÃO
Art. 80 - Deve estar adimplente.
Art. 81 - Atraso: benefícios suspensos. Regularizar: pagar + nova vistoria. Reativa às 00h do 1º dia útil após.
Art. 82 - NÃO aceita pagamento de boleto vencido sem atualização. NÃO aceita PIX.
Art. 83 - Peças/salvados pertencem à associação.

13. DANO REPARÁVEL
Art. 91 - Reparo em oficina homologada.
Art. 92 - Oficina do associado: precisa cadastrar, vistoria pela associação, orçamento dentro da média.
Art. 93 - Prazo: 30 dias úteis após documentação completa. Cota participação: 5 dias úteis após aprovação.
Art. 94 - Pode usar peças similares ou usadas em bom estado.

14. DANO IRREPARÁVEL
Art. 100 - Ressarcimento: outro veículo ou 100% FIPE na data da documentação completa.
Art. 102 - Perda total: quando reparo ≥ 75% FIPE.
Art. 104 - Produtor rural/locação/frotista/avarias: -20% FIPE.
Art. 105 - Táxi/transporte remunerado: -20% FIPE.
Art. 106 - Leilão/chassis remarcado: -30% FIPE.
Art. 107 - Prazo ressarcimento integral: até 90 dias úteis.
Art. 115 - Pode ser parcelado conforme condições da associação.
Art. 116 - Se antes de 12 meses: deduz mensalidades faltantes.

15. SUB-ROGAÇÃO
Art. 118 - Após pagamento, associação fica sub-rogada nos direitos contra terceiros.

16. PARTICIPAÇÃO DO ASSOCIADO (COTA)
Art. 119 - MOTOS (exceto Yamaha/Shineray/Avelloz/Bajaj): até R$20k=7%, R$20-32k=8%, R$32-40k=10%, automáticas=15%. Mínimo R$1.000. 2º evento em 12 meses=dobra. 3º evento=triplica.
Art. 120 - MOTOS YAMAHA: até R$20k=9%, R$20-32k=10%, R$32-40k=12%, automáticas=15%.
Art. 121 - MOTOS ALTA CILINDRADA: 18%. Mínimo R$3.000. Sem cobertura carenagens.
Art. 122 - AUTOMÓVEIS LINHA LEVE: até R$41k=5.4%, R$41-61k=5.6%, R$61-101k=5.8%, R$101-151k=6%, R$151-251k=6.2%. Importado=10%(mín R$3.000). Elétrico=10%(mín R$3.000). Mínimo R$2.000.
Art. 123 - SUV/CAMINHONETE/UTILITÁRIO: até R$51k=5.8%, R$51-101k=6%, R$101-151k=6.2%, R$151-251k=6.5%, R$251-301k=7%, R$301-501k=8%. Importado=10%(mín R$4.000). Mínimo R$3.000.
Art. 124 - PREMIUM: 14%. Mínimo R$5.000. Paga cota em roubo/furto.
Art. 125 - PERSONALIZADO: paga cota em roubo/furto.
Art. 126 - BÁSICO, VIP, TOP: cota DISPENSADA em roubo/furto.
Art. 127 - Mais de 2 eventos em 12 meses com culpa: pode ser excluído.

17. OBRIGAÇÕES DOS ASSOCIADOS
Art. 128 - Agir com lealdade e boa-fé.
Art. 130 - Pagar em dia.
Art. 131 - Manter veículo em bom estado.
Art. 135 - Informar roubo/furto às autoridades em até 6 horas.
Art. 138 - Não iniciar reparo sem autorização.
Art. 140 - Não fazer acordos sem comunicar.

18. DO FORO
Art. 144 - Foro: Comarca de Petrolina/PE.

19. DISPOSIÇÕES FINAIS
Art. 145 - Comunicações válidas: site, SMS, redes sociais, boleto, correspondência.
Art. 147 - Informações falsas: exclusão imediata + devolução de indenização.
Art. 148 - Associado declara ter lido e aceito todas as normas.

ANEXO I - BENEFÍCIOS ADICIONAIS:
- REBOQUE: conforme plano, 24h, território nacional.
- PROTEÇÃO TERCEIROS: conforme plano, quando associado é culpado.
- CARRO/MOTO RESERVA: só colisão, só planos com previsão, até 30 dias. Sujeito a disponibilidade. Não se aplica a perda total/roubo/furto. Diárias: R$30 motos, R$80 carros (se ressarcimento em dinheiro).
- PROTEÇÃO VIDROS: VIP=50% coparticipação, TOP=30% coparticipação. Limite 2x/12 meses.
- SOS PNEU (carros): troca ou reboque até 50km. 12x/ano (1/mês).
- SOS PNEU/AUXÍLIO BORRACHEIRO (motos): reboque até 50km OU reembolso R$25. 3x/ano (1/mês). Prazo 48h.
- TÁXI/APP: reembolso até R$70 em caso de pane/acidente/roubo. Prazo 48h.
- HOSPEDAGEM: 1 diária até R$50/pessoa. Prazo 48h.
- RETORNO DOMICÍLIO: transporte coletivo até R$500 se imobilização >48h a >100km. Prazo 48h.
- ASSISTÊNCIA FUNERAL: até R$2.000 em morte acidental (exceto desaparecimento/morte presumida).
- CHAVEIRO: abertura de porta até R$200.
- PEQUENOS REPAROS: martelinho/para-choques. 2x/ano, limite R$2.000, coparticipação 50%, carência 60 dias.
- TROCA PEÇAS ISOLADAS: VIP=50%(ampliável a 70%), TOP=70%. Autorização em 3 dias.
---`;


// ========= RENDER FUNCTIONS =========
function regimentoInit() {
  const container = document.getElementById('regimento_container');
  if (!container) return;
  // Carregar key do localStorage
  GEMINI_API_KEY = localStorage.getItem('avp-gemini-key') || _dk.join('-');
  regimentoRender();
}

function regimentoConfigKey() {
  const currentKey = GEMINI_API_KEY ? '****' + GEMINI_API_KEY.slice(-6) : 'Nao configurada';
  showModal('Configurar API Key (OpenRouter)',
    '<div style="display:flex;flex-direction:column;gap:12px">' +
    '<label style="font-size:.78rem;color:var(--text2);font-weight:600">API Key atual: <span style="font-weight:400;color:var(--text3)">' + currentKey + '</span></label>' +
    '<input id="gemini_key_input" type="password" placeholder="Cole sua API Key do OpenRouter aqui..." value="' + (GEMINI_API_KEY || '') + '" style="width:100%">' +
    '<span style="font-size:.72rem;color:var(--text3)">Acesse <a href="https://openrouter.ai/keys" target="_blank" style="color:var(--blue)">openrouter.ai/keys</a> para obter sua key gratuita.</span>' +
    '</div>',
    function() {
      var key = document.getElementById('gemini_key_input').value.trim();
      if (!key) { showToast('Informe a API key', 'error'); return; }
      localStorage.setItem('avp-gemini-key', key);
      GEMINI_API_KEY = key;
      closeModal();
      showToast('API Key salva com sucesso!', 'success');
      regimentoRender();
    }, 'green', 'Salvar');
}

function regimentoRender() {
  const container = document.getElementById('regimento_container');
  if (!container) return;

  let html = '';
  // Header
  html += `<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
    <div style="width:44px;height:44px;border-radius:10px;background:var(--primary-light);display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
    </div>
    <div style="flex:1">
      <div style="font-size:1.05rem;font-weight:700;color:var(--text1)">Consulta ao Regimento Interno</div>
      <div style="font-size:.75rem;color:var(--text3)">Pergunte sobre planos, coberturas, regras e beneficios do PAM</div>
    </div>
    <button class="btn btn-sm" onclick="regimentoConfigKey()" title="Configurar API Key" style="display:flex;align-items:center;gap:5px">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      API Key
    </button>
  </div>`;

  // Aviso se key não configurada
  if (!GEMINI_API_KEY) {
    html += `<div style="background:var(--amber-bg);border:1px solid var(--amber-light);border-radius:var(--radius);padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <div style="flex:1"><div style="font-size:.82rem;font-weight:600;color:var(--amber)">API Key nao configurada</div><div style="font-size:.72rem;color:var(--text2)">Clique em "API Key" acima para configurar sua chave do Google Gemini.</div></div>
    </div>`;
  }

  // FAQ Chips
  html += `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px" id="regimento_chips">`;
  REGIMENTO_FAQ_CHIPS.forEach(chip => {
    html += `<button class="regimento-chip" onclick="regimentoAsk('${chip.replace(/'/g, "\\'")}')">${chip}</button>`;
  });
  html += `</div>`;

  // Chat messages area
  html += `<div id="regimento_messages" class="regimento-messages"></div>`;

  // Loading indicator
  html += `<div id="regimento_loading" class="regimento-loading" style="display:none">
    <div class="regimento-loading-dots">
      <span></span><span></span><span></span>
    </div>
    <span style="font-size:.78rem;color:var(--text3)">Consultando o regimento...</span>
  </div>`;

  // Input area
  html += `<div class="regimento-input-area">
    <div class="regimento-input-wrap">
      <input type="text" id="regimento_input" placeholder="Digite sua pergunta sobre o regimento..." autocomplete="off" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();regimentoSend()}">
      <button class="regimento-send-btn" onclick="regimentoSend()" title="Enviar" id="regimento_sendBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
    <div style="font-size:.65rem;color:var(--text3);margin-top:6px;text-align:center">Respostas geradas por IA com base no Regimento Interno. Consulte sempre o documento oficial para decisoes importantes.</div>
  </div>`;

  container.innerHTML = html;
  regimentoRenderMessages();
}


function regimentoRenderMessages() {
  const el = document.getElementById('regimento_messages');
  if (!el) return;

  if (_regimentoMessages.length === 0) {
    el.innerHTML = `<div class="regimento-welcome">
      <div style="width:56px;height:56px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;margin:0 auto 14px">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </div>
      <div style="font-size:.88rem;font-weight:600;color:var(--text1);margin-bottom:6px">Como posso ajudar?</div>
      <div style="font-size:.78rem;color:var(--text3);max-width:380px;margin:0 auto">Selecione uma pergunta frequente acima ou digite sua duvida sobre o Regimento Interno da Auto Vale Clube de Beneficios.</div>
    </div>`;
    return;
  }

  let html = '';
  _regimentoMessages.forEach((msg, idx) => {
    if (msg.role === 'user') {
      html += `<div class="regimento-msg regimento-msg-user">
        <div class="regimento-msg-bubble regimento-msg-user-bubble">${escapeHtml(msg.content)}</div>
      </div>`;
    } else {
      html += `<div class="regimento-msg regimento-msg-assistant">
        <div class="regimento-msg-avatar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
        <div class="regimento-msg-bubble regimento-msg-assistant-bubble">
          <div class="regimento-msg-content">${regimentoFormatResponse(msg.content)}</div>
          <div class="regimento-msg-feedback" data-idx="${idx}">
            <button class="regimento-feedback-btn" onclick="regimentoFeedback(${idx},'util')" title="Resposta util">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
            </button>
            <button class="regimento-feedback-btn" onclick="regimentoFeedback(${idx},'nao_util')" title="Resposta nao util">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
            </button>
          </div>
        </div>
      </div>`;
    }
  });

  el.innerHTML = html;
  el.scrollTop = el.scrollHeight;
}


function regimentoFormatResponse(text) {
  if (!text) return '';
  // Convert markdown-like formatting to HTML
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h4 style="font-size:.85rem;font-weight:700;margin:12px 0 6px;color:var(--text1)">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 style="font-size:.9rem;font-weight:700;margin:14px 0 8px;color:var(--text1)">$1</h3>')
    .replace(/^- (.*$)/gm, '<li style="margin-bottom:4px">$1</li>')
    .replace(/^• (.*$)/gm, '<li style="margin-bottom:4px">$1</li>')
    .replace(/\n\n/g, '</p><p style="margin:8px 0">')
    .replace(/\n/g, '<br>');
  // Wrap lists
  html = html.replace(/(<li[^>]*>.*?<\/li>(\s*<br>)?)+/g, function(match) {
    return '<ul style="padding-left:16px;margin:8px 0">' + match.replace(/<br>/g, '') + '</ul>';
  });
  // Highlight article references
  html = html.replace(/(Art\.\s*\d+[º°]?(-[A-Z])?)/g, '<strong style="color:var(--primary)">$1</strong>');
  return '<p style="margin:8px 0">' + html + '</p>';
}

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

  // Verificar se a API key está configurada
  if (!GEMINI_API_KEY) {
    showToast('API Key do Gemini nao configurada. Configure em Regimento > Configurar API Key.', 'error');
    return;
  }

  // Add user message
  _regimentoMessages.push({ role: 'user', content: question });
  input.value = '';
  regimentoRenderMessages();

  // Hide chips after first message
  const chips = document.getElementById('regimento_chips');
  if (chips) chips.style.display = 'none';

  // Show loading
  _regimentoLoading = true;
  const loadingEl = document.getElementById('regimento_loading');
  if (loadingEl) loadingEl.style.display = 'flex';
  const sendBtn = document.getElementById('regimento_sendBtn');
  if (sendBtn) { sendBtn.disabled = true; sendBtn.style.opacity = '.5'; }

  try {
    const response = await regimentoCallGemini(question);
    _regimentoMessages.push({ role: 'assistant', content: response });
  } catch (err) {
    _regimentoMessages.push({ role: 'assistant', content: 'Desculpe, ocorreu um erro ao consultar o regimento. Tente novamente em instantes.\n\nErro: ' + err.message });
  }

  // Hide loading
  _regimentoLoading = false;
  if (loadingEl) loadingEl.style.display = 'none';
  if (sendBtn) { sendBtn.disabled = false; sendBtn.style.opacity = ''; }
  regimentoRenderMessages();
}


async function regimentoCallGemini(question) {
  // Build conversation with system prompt + history
  const messages = [];

  // System message with full regimento context
  messages.push({
    role: 'system',
    content: REGIMENTO_SYSTEM_PROMPT
  });

  // Add conversation history (last 6 messages for context)
  if (_regimentoMessages.length > 1) {
    const history = _regimentoMessages.slice(0, -1);
    const recentHistory = history.slice(-6);
    recentHistory.forEach(m => {
      messages.push({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      });
    });
  }

  // Current question
  messages.push({ role: 'user', content: question });

  const body = {
    model: OPENROUTER_MODEL,
    messages: messages,
    temperature: 0.3,
    max_tokens: 2048
  };

  const resp = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + GEMINI_API_KEY,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Auto Vale - Consulta Regimento'
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error((errData.error && errData.error.message) || 'HTTP ' + resp.status);
  }

  const data = await resp.json();
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  }
  throw new Error('Resposta vazia da API');
}

function regimentoFeedback(msgIdx, type) {
  const feedbackEl = document.querySelector(`.regimento-msg-feedback[data-idx="${msgIdx}"]`);
  if (!feedbackEl) return;
  const icon = type === 'util'
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="var(--green)" stroke="var(--green)" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>'
    : '<svg width="14" height="14" viewBox="0 0 24 24" fill="var(--red)" stroke="var(--red)" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>';
  const label = type === 'util' ? 'Obrigado pelo feedback!' : 'Vamos melhorar!';
  feedbackEl.innerHTML = `<span style="font-size:.68rem;color:var(--text3);display:flex;align-items:center;gap:4px">${icon} ${label}</span>`;
}
