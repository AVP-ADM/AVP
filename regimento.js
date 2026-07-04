// ========= REGIMENTO INTERNO - CONSULTA IA + LEITURA =========
// Auto Vale Clube de Benefícios - v2.0

// ========= CONFIG =========
const _dk = [103,115,107,95,49,54,86,111,71,104,48,70,117,51,90,89,53,84,86,115,77,56,79,70,87,71,100,121,98,51,70,89,87,110,113,89,99,49,115,65,72,78,89,108,56,75,97,107,82,98,119,115,67,105,50,49].map(c=>String.fromCharCode(c)).join('');
let GEMINI_API_KEY = localStorage.getItem('avp-gemini-key') || _dk;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

let _regimentoMessages = [];
let _regimentoLoading = false;
let _regimentoTab = 'consulta'; // 'consulta' | 'leitura'
let _regimentoHistory = [];

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


// ========= REGIMENTO - CAPÍTULOS E ARTIGOS =========
const REGIMENTO_CAPITULOS = [
  { id: 'cap1', titulo: '1. Informacoes Iniciais', artigos: 'Art. 1 a 5', conteudo: `Art. 1 - A AUTO VALE CLUBE DE BENEFICIOS, com sede na Av. Coronel Antonio Honorato Viana, 538, Gercino Coelho, Petrolina/PE, CEP 56308-000, e uma associacao privada, sem fins lucrativos, com fundamento no art. 5, incisos XVII a XXI da CF e arts. 53 a 61 do Codigo Civil.\n\nArt. 2 - A AUTO VALE encontra-se em plena vigencia, por tempo indeterminado, constituindo o PROGRAMA DE AUXILIO MUTUO - PAM.\n\nArt. 3 - Este Regulamento Interno estabelece as regras do PAM.\n\nArt. 4 - Este Regulamento possui carater publico, devendo ser cumprido por todos os Associados, sob pena de exclusao.\n\nArt. 5 - As alteracoes produzirao efeitos imediatamente, sendo informadas aos Associados.` },
  { id: 'cap2', titulo: '2. Dos Objetivos e Implementos Opcionais', artigos: 'Art. 6 a 12', conteudo: `Art. 6 - O PAM tem como objetivo conferir amparo em caso de roubo, furto, colisao, perda total, incendio derivado de colisao, capotamento, abalroamento, danos materiais por quedas e objetos externos.\n\nArt. 7 - Todos os beneficios sao de livre escolha do Associado. Alteracoes apos filiacao so produzem efeito apos 30 dias.\n\nArt. 8 - Veiculos cadastrados NAO podem ter seguro particular ou outra associacao de protecao.\n\nArt. 9 - Sao inaplicaveis a Lei de Seguros e o CDC.\n\nArt. 10 - Cobertura em todo o territorio nacional.\n\nArt. 11 - Apos filiacao, compromisso minimo de 90 dias no rateio. Cancelamento em ate 5 dias uteis nao paga taxa.\n\nArt. 12 - Planos disponiveis:\nI. Start - Limitado a 30 anos. Colisao, fenomenos naturais, roubo, furto, incendio, perda total. Reboque 500km/ano. Para-brisa 50%. Sem placa preta.\nII. Basico Carros - Ate R$501.000. Reboque 250km pane. Ilimitado colisao.\nIII. Vip Carros - Ate R$501.000. Vidros 50%. Terceiros R$50.000. Reboque 500km pane.\nIV. Top Carros - Ate R$501.000. Vidros 30%. Terceiros R$100.000. Carro reserva 30 dias. Reboque 1.000km.\nV. Personalizado - Roubo/furto. Rastreador obrigatorio. Reboque 400km.\nVI. Premium - Ate R$401.000. Terceiros R$30.000. Reboque 300km. Rastreador obrigatorio.\nVII. Basico Motos - Ate R$40.000. Reboque 250km.\nVIII. Vip Motos - Ate R$40.000. Terceiros R$10.000. Reboque 500km.\nIX. Top Motos - Ate R$40.000. Terceiros R$10.000. Moto reserva 30 dias. Reboque 1.000km.\nX. Frota Publica - 20 anos. Reboque 1.500km/ano. Cota 10%.\nXI. Eletrico - Roubo, furto, perda total. Tag obrigatoria. Exclui bateria.\nXII. Hibrido - Idem Eletrico. Exclui bateria.` },
  { id: 'cap3', titulo: '3. Do Rastreador', artigos: 'Secao 3.1 a 3.2', conteudo: `3.1 - O uso do rastreador podera ser obrigatorio conforme avaliacao da diretoria (valor do veiculo, indice de roubo/furto, custo de pecas).\n\n3.2 - O associado se compromete a imediata instalacao.\n\n1. Associacao fornece em COMODATO. Associado deve ir ao local indicado.\n2. Associado responsavel pela guarda do equipamento.\n3. Se usar rastreador de terceiros, deve repassar dados de acesso.\n4. Manutencao quando solicitada.\n5. Comunicacoes por email/telefone sao validas.\n6. Sem rastreador = sem direito a reparacao/indenizacao.\n7. Em caso de roubo/furto/colisao, informar imediatamente.\n8. Ao desistir, devolver equipamento. Multa R$500 se perder/extraviar.\n\nParagrafo unico: Se nao devolver em 15 dias apos notificacao, caracteriza esbulho.` },
  { id: 'cap4', titulo: '4. Da Filiacao, Exclusao e Retirada', artigos: 'Art. 12 a 25', conteudo: `Art. 13 - Documentos: CNH/CI, CPF, CRLV, NF (0km), Comprovante Residencia, Certidao Antecedentes.\n\nArt. 14 - Vistoria previa obrigatoria com fotos e videos.\n\nArt. 15 - Analise em ate 3 dias uteis apos pagamento da taxa de adesao. Taxa de adesao NAO e a primeira mensalidade.\n\nArt. 16 - Recusa: restituicao de 40% da taxa. 60% para despesas administrativas.\n\nArt. 20 - Exclusao a pedido: formalizar na sede, responsabilizar-se pelas contribuicoes vigentes.\n\nArt. 22 - Exclusao pela Associacao: dificuldade em encontrar pecas, inadimplencia 3+ meses, tentativa de fraude, condutas contrarias.\n\nArt. 23 - Troca de titularidade: transferir em 30 dias sob pena de exclusao.\n\nArt. 24 - Substituicao de veiculo: taxa + aprovacao da Diretoria.\n\nArt. 25 - Vigencia 12 meses com renovacao automatica. Inadimplencia da ultima contribuicao pode ensejar inscricao nos cadastros de restricao ao credito.` },
  { id: 'cap5', titulo: '5. Taxas Contributivas', artigos: 'Art. 26 a 31', conteudo: `Art. 26 - Contribuicao mensal = Taxa Administrativa + Prestacao Servicos Terceirizados + Rateio. Pago via boleto.\n\nArt. 27 - Rateio definido por categoria do veiculo.\n\nArt. 28 - Valores administrados pela Diretoria Executiva.\n\nArt. 29 - Pode destinar percentual para instituicao filantropica.\n\nArt. 30 - Pagamento em dia, no vencimento escolhido.\n\nArt. 31 - Se nao receber boleto ate 5 dias antes do vencimento, contatar a associacao. Omissao nao exime da obrigacao.` },
  { id: 'cap6', titulo: '6. Da Aceitacao', artigos: 'Art. 32 a 45', conteudo: `Art. 32 - Veiculos nacionais e importados em bom estado, com documentacao em dia.\n\nArt. 33 - Limites: Leve ate R$251.000, SUV/Caminhonete ate R$501.000, Motos ate R$60.000 (FIPE na data de filiacao).\n\nArt. 34 - Vistoria previa obrigatoria.\n\nArt. 35 - Rastreador/antifurto obrigatorio conforme plano.\n\nArt. 36 - Veiculo deve estar em dia com tributos e documentacao.\n\nArt. 37 - Conserto de avarias: fazer nova vistoria para atualizar.\n\nArt. 38 - Veiculos turbinados/tunados NAO aceitos.\n\nArt. 39 - Avarias na vistoria: excluidas da reparacao parcial, -20% FIPE para integral.\n\nArt. 40 - Veiculos de leilao/recuperados/rebaixados/recall nao efetuado: -30% FIPE.\n\nArt. 42 - Veiculo com GNV: vistoria anual obrigatoria.\n\nArt. 43 - Termo de opcao pode ser recusado em ate 30 dias.` },
  { id: 'cap7', titulo: '7. Prestacao de Servicos Terceirizados', artigos: 'Art. 46 a 52', conteudo: `Art. 46 - Servicos especificos executados por empresas terceirizadas, votadas em Assembleia.\n\nArt. 47 - Rastreamento: servico terceirizado, sem custo para o Associado.\n\nArt. 49 - Instalar rastreador em ate 5 dias apos convite, sob pena de exclusao.\n\nArt. 50 - Retirada sem autorizacao: perde todos os beneficios.\n\nArt. 51 - Custos de instalacao/manutencao percebidos pela Associacao e repassados.` },
  { id: 'cap8', titulo: '8. Dos Beneficios do PAM', artigos: 'Art. 53 a 59-A', conteudo: `Art. 53 - Beneficios disponibilizados no momento da filiacao.\n\nArt. 54 - Cobertura: roubo, furto, colisao, incendio de colisao, capotamento, abalroamento.\n\nArt. 55 - Reboque:\n- Colisao: ILIMITADO (ate credenciada mais proxima)\n- Pane: 250km (Basico), 500km (VIP), 1.000km (Top)\n- Acionamento pane: 1x/mes, intervalo minimo 30 dias\n- Destino pode ser alterado em ate 50km do indicado\n\nArt. 55-A - GUINCHO SEGUNDA SAIDA: 50km (25+25) no primeiro dia util seguinte, quando pane em dia nao util/noturno.\n\nArt. 56 - TERCEIROS: ate R$20.000 motos, ate R$100.000 carros (conforme plano). Exige culpa exclusiva + pagamento da cota.\n\nArt. 57 - VIDROS NACIONAIS: 70% (Top) ou 50% (VIP). Carencia 60 dias. Limite 2x/12 meses. Dano para-brisa ate 10cm = reparacao (nao troca). Limitado R$100.\n\nArt. 58 - VIDROS PREMIUM IMPORTADO: 50%. Carencia 60 dias. Limite 1x/12 meses.\n\nArt. 59 - GUARDA DO VEICULO: ate 5 dias apos evento. Depois, responsabilidade do associado.\n\nArt. 59-A - PEQUENOS REPAROS: martelinho/para-choques. 2x/ano, 1x/mes. Ate R$2.000. Coparticipacao 50%. Autorizacao previa obrigatoria. Carencia 60 dias.` },
  { id: 'cap9', titulo: '9. Vigencia e Beneficios', artigos: 'Art. 60 a 71', conteudo: `Art. 60 - Eventos cobertos: Roubo, furto, colisao, incendio de colisao, capotamento, abalroamento.\n\nArt. 61 - Condutor deve estar habilitado, CNH valida na categoria.\n\nArt. 62 - Roubo/furto nao se confundem com fraude e apropriacao indebita.\n\nArt. 63 - Acessorios originais de fabrica (constantes na NF) sao incluidos.\n\nArt. 64 - Acessorios nao originais (som, rodas, kit gas, DVD) NAO sao ressarcidos se atingidos isoladamente.\n\nArt. 65/66 - Pneus: ate 6 meses = 100% (com NF). Acima de 6 meses = 50%.\n\nArt. 67 - Pneus/vidros/retrovisores cobertos em colisao (nao isoladamente).\n\nArt. 70 - Protecao inicia no 1o dia util apos anuencia.\n\nArt. 71 - Assistencia 24h: imediata apos aceitacao.` },
  { id: 'cap10', titulo: '10. Danos Nao Incluidos', artigos: 'Art. 72 a 74', conteudo: `Art. 72 - NAO COBRE:\na) Responsabilidade civil, danos morais\nb) Dano moral de qualquer especie\nc) Desgaste natural, defeito fabricacao, mecanico, eletrico, corrosao, alagamentos\nd) Explosao/incendio NAO de colisao\ne) Guerra, tumultos, motins, vandalismo\nf) Danos a carga\ng) Multas e despesas processuais\nh) Reparos sem autorizacao\ni) Acessorios nao originais (som, DVD, GNV sem contrato, rodas)\nj) Juros/correcao monetaria\nk) Radiacao, poluicao, furacao, terremoto\nl) Ato de autoridade publica\nm) Tombamento em descarga\nn) Pessoas em locais nao apropriados\no) Veiculos de leilao sem certificado INMETRO (incendio)\np) Servicos sem consentimento\nq) Vidros blindados/especiais\nr) Danos por objetos transportados\ns) Danos pre-existentes nos vidros\nt) Danos por negligencia do condutor\nu) Prejuizos pela paralisacao\nv) Reboque inadequado\nw) Onibus, tratores, blindados, converssiveis, lotacao\nx) Riscos nos vidros\ny) Peliculas\nz) GNV isolado (furto/roubo)\naa) Baterias de veiculos eletricos\n\nArt. 73 - NAO COBRE (condutor):\na) Infracao de transito\nb) Sem CNH/vencida/suspensa/embriaguez\nc) Estradas impedidas/praias\nd) Sobrecarga\ne) Negligencia (veiculo aberto, chave na ignicao)\nf) Competicoes/apostas/trilhas\ng) Terrorismo, guerra, vandalismo, manifestacoes\nh) Furto simples, apropriacao indebita\n\nArt. 74 - EXCLUIDOS VIDROS: tumultos, servicos particulares, teto solar/blindados, riscos, peliculas, retrovisor interno, eletronicos retrovisor, lanternas laterais, break-light, farois xenonio/LED.` },
  { id: 'cap11', titulo: '11. Documentos para Ressarcimento', artigos: 'Art. 75 a 79', conteudo: `Art. 76 - Danos parciais: CNH condutor, B.O., CRLV, RG/CPF, declaracao a punho + croqui. Terceiros: laudo SMTT.\n\nArt. 77 - Perda total: idem + CRV em favor da associacao (firma reconhecida), chaves originais + reserva, manual, certidao negativa furto/multa, quitacao IPVA/seguro obrigatorio.\n\nArt. 78 - Roubo/furto: idem + extrato DETRAN com queixa, certidao negativa multas, comprovante baixa na Fazenda.\n\nArt. 79 - Internacao/falecimento: atestado obito, laudo necropsia, prontuario medico, laudo pericial, processo de inventario.` },
  { id: 'cap12', titulo: '12. Condicoes para Utilizacao', artigos: 'Art. 80 a 83', conteudo: `Art. 80 - Deve estar adimplente com TODAS as obrigacoes.\n\nArt. 81 - Atraso: beneficios SUSPENSOS. Para regularizar: comparecer na sede + pagar boleto atualizado + nova vistoria. Beneficios reativam as 00h do 1o dia util apos confirmacao.\n\nArt. 82 - NAO aceita pagamento de boleto vencido sem atualizacao na sede. NAO permite pagamento via PIX.\n\nArt. 83 - Pecas/salvados pertencem a associacao (podem ser vendidos para reduzir rateio).` },
  { id: 'cap13', titulo: '13. Dano Reparavel', artigos: 'Art. 90 a 99', conteudo: `Art. 90 - Danos reparaveis: colisao, capotamento, abalroamento.\n\nArt. 91 - Reparo em oficina homologada.\n\nArt. 92 - Oficina do associado: cadastrar (CNPJ, alvara), vistoria pela associacao, orcamento dentro da media, associado paga diferenca se houver.\n\nArt. 93 - Prazo: 30 dias uteis apos documentacao completa. Cota de participacao: 5 dias uteis apos aprovacao do orcamento.\n\nArt. 94 - Pode usar pecas similares ou usadas em bom estado.\n\nArt. 95 - Reparacao para veiculos com mais de 1 ano: conforme Diretoria.\n\nArt. 96 - Pecas nao encontradas: associado localiza, reembolsado em 30 dias (limitado tabela fabrica).\n\nArt. 97 - Associacao NAO se responsabiliza pela qualidade/prazo dos reparos.\n\nArt. 98 - Pecas remanescentes: doadas a associacao.\n\nArt. 99 - Media monta/reposicao de placa: responsabilidade do associado regularizar.` },
  { id: 'cap14', titulo: '14. Dano Irreparavel', artigos: 'Art. 100 a 117', conteudo: `Art. 100 - Ressarcimento: outro veiculo igual OU 100% FIPE na data da documentacao completa.\n\nArt. 101 - Se FIPE maior que mercado, pode usar outros meios (Webmotors, OLX, etc).\n\nArt. 102 - Perda total: quando reparo >= 75% da FIPE.\n\nArt. 103 - Diretoria decide entre ressarcir integral ou consertar.\n\nArt. 104 - Produtor rural/locacao/frotista/avarias: -20% FIPE.\n\nArt. 105 - Taxi/transporte remunerado: -20% FIPE.\n\nArt. 106 - Leilao/chassis remarcado: -30% FIPE.\n\nArt. 107 - Prazo ressarcimento integral: ate 90 dias uteis.\n\nArt. 108 - Prazo suspenso se pedir documentacao complementar ou abrir pericia/sindicancia.\n\nArt. 110 - Pagamento: cheque nominal, deposito ou reposicao de veiculo similar.\n\nArt. 111 - Veiculo deve estar livre de gravame. Deduz multas, tributos, financiamento.\n\nArt. 112 - Alienacao fiduciaria: paga instituicao financeira primeiro.\n\nArt. 115 - Pode ser parcelado conforme condicoes da associacao.\n\nArt. 116 - Se antes de 12 meses: deduz mensalidades faltantes.` },
  { id: 'cap15', titulo: '15. Sub-Rogacao de Direitos', artigos: 'Art. 118', conteudo: `Art. 118 - Apos pagamento da indenizacao, a Associacao fica sub-rogada em todos os direitos e acoes do Associado contra terceiros que causaram os prejuizos.` },
  { id: 'cap16', titulo: '16. Participacao do Associado (Cota)', artigos: 'Art. 119 a 127', conteudo: `Art. 119 - MOTOS (exceto Yamaha/Shineray/Avelloz/Bajaj):\n- Ate R$20k = 7% (min R$1.000)\n- R$20-32k = 8%\n- R$32-40k = 10%\n- Automaticas = 15%\n- Shineray/Avelloz/Bajaj = 10% fixo\n- 2o evento em 12 meses = DOBRA. 3o evento = TRIPLICA.\n\nArt. 120 - MOTOS YAMAHA:\n- Ate R$20k = 9%\n- R$20-32k = 10%\n- R$32-40k = 12%\n- Automaticas = 15%\n\nArt. 121 - MOTOS ALTA CILINDRADA: 18% (min R$3.000). Sem cobertura carenagens.\n\nArt. 122 - AUTOMOVEIS LINHA LEVE:\n- Ate R$41k = 5.4%\n- R$41-61k = 5.6%\n- R$61-101k = 5.8%\n- R$101-151k = 6%\n- R$151-251k = 6.2%\n- Importado = 10% (min R$3.000)\n- Eletrico = 10% (min R$3.000)\n- Minimo geral: R$2.000\n\nArt. 123 - SUV/CAMINHONETE/UTILITARIO:\n- Ate R$51k = 5.8%\n- R$51-101k = 6%\n- R$101-151k = 6.2%\n- R$151-251k = 6.5%\n- R$251-301k = 7%\n- R$301-501k = 8%\n- Importado = 10% (min R$4.000)\n- Minimo geral: R$3.000\n\nArt. 124 - PREMIUM: 14% (min R$5.000). Paga cota em roubo/furto.\n\nArt. 125 - PERSONALIZADO: paga cota em roubo/furto.\n\nArt. 126 - BASICO, VIP, TOP: cota DISPENSADA em roubo/furto.\n\nArt. 127 - Mais de 2 eventos em 12 meses com culpa: pode ser excluido.` },
  { id: 'cap17', titulo: '17. Obrigacoes dos Associados', artigos: 'Art. 128 a 143', conteudo: `Art. 128 - Agir com lealdade e boa-fe.\nArt. 130 - Pagar em dia.\nArt. 131 - Manter veiculo em bom estado.\nArt. 132 - Informar mudanca de domicilio, uso do veiculo, transferencia, alteracoes.\nArt. 133 - Proteger veiculo acidentado e evitar agravar prejuizos.\nArt. 135 - Informar roubo/furto as autoridades em ate 6 HORAS.\nArt. 136 - B.O. deve ficar arquivado na sede.\nArt. 137 - Avisar imediatamente qualquer fato que agrave risco.\nArt. 138 - NAO iniciar reparo sem autorizacao.\nArt. 139 - Registrar ocorrencia no local/hora. Incluir telefones da Auto Vale no B.O.\nArt. 140 - NAO fazer acordos sem comunicar.\nArt. 141 - Identificar terceiros no registro policial + 2 testemunhas.\nArt. 142 - Aguardar autorizacao para iniciar reparacao.\nArt. 143 - Ler mensagens no boleto e site (instrumentos oficiais de comunicacao).` },
  { id: 'cap18', titulo: '18. Do Foro', artigos: 'Art. 144', conteudo: `Art. 144 - Foro: Comarca de Petrolina/PE, conforme arts. 31 e 33 da Lei 9.307/1996.` },
  { id: 'cap19', titulo: '19. Disposicoes Finais', artigos: 'Art. 145 a 149', conteudo: `Art. 145 - Comunicacoes validas: site, SMS, redes sociais, boleto, correspondencia.\n\nArt. 146 - Associacao elege o meio de comunicacao que melhor convir.\n\nArt. 147 - Informacoes falsas: exclusao imediata + devolver indenizacao recebida.\n\nArt. 148 - Associado declara ter lido e aceito todas as normas.\n\nArt. 149 - Regulamento apresentado, discutido, votado e aprovado em Assembleia Geral.` },
  { id: 'anexo1', titulo: 'Anexo I - Beneficios Adicionais', artigos: 'Beneficios extras', conteudo: `REBOQUE: conforme plano, 24h, territorio nacional.\n\nPROTECAO TERCEIROS: conforme plano, quando associado culpado.\n\nCARRO/MOTO RESERVA: so colisao, so planos com previsao, ate 30 dias. Sujeito a disponibilidade. NAO se aplica a perda total/roubo/furto. Liberado apos orcamento. Diarias: R$30 motos, R$80 carros (se ressarcimento em dinheiro).\n\nPROTECAO VIDROS: VIP=50% coparticipacao, TOP=30% coparticipacao. Limite 2x/12 meses.\n\nSOS PNEU (carros): troca ou reboque ate 50km. 12x/ano (1/mes).\n\nSOS PNEU/AUXILIO BORRACHEIRO (motos): reboque ate 50km OU reembolso R$25 (com NF). 3x/ano (1/mes). Prazo 48h.\n\nTAXI/APP: reembolso ate R$70 em pane/acidente/roubo (atendido pela 24h). Prazo 48h.\n\nHOSPEDAGEM: 1 diaria ate R$50/pessoa (com NF). Prazo 48h. Nao aplicavel a vans/micro-onibus.\n\nRETORNO DOMICILIO: transporte coletivo ate R$500 se imobilizacao >48h a >100km. Prazo 48h.\n\nASSISTENCIA FUNERAL: ate R$2.000 em morte acidental (exceto desaparecimento/presumida).\n\nCHAVEIRO: abertura de porta ate R$200.\n\nPEQUENOS REPAROS: martelinho/para-choques. 2x/ano, limite R$2.000, coparticipacao 50%, carencia 60 dias. Autorizacao previa.\n\nTROCA PECAS ISOLADAS: VIP=50% (ampliavel a 70%), TOP=70%. Autorizacao em 3 dias.` }
];


// ========= SYSTEM PROMPT =========
const REGIMENTO_SYSTEM_PROMPT = `Voce e um assistente da AUTO VALE CLUBE DE BENEFICIOS. Responda APENAS em portugues brasileiro.

REGRAS OBRIGATORIAS:
1. NUNCA responda em ingles. Apenas portugues brasileiro.
2. NUNCA mostre seu raciocinio ou pensamento. Va direto a resposta.
3. Seja BREVE e DIRETO - maximo 3-5 frases por topico.
4. Cite o artigo relevante entre parenteses. Ex: (Art. 81)
5. Use bullet points para listar itens.
6. Se nao souber, diga "Nao encontrei essa informacao no regimento."
7. Nunca invente informacoes.
8. Ao final da resposta, liste os artigos citados no formato: [FONTES: Art. XX, Art. YY]

` + REGIMENTO_CAPITULOS.map(c => c.titulo + '\\n' + c.conteudo).join('\\n\\n---\\n\\n');

// ========= INIT =========
function regimentoInit() {
  const container = document.getElementById('regimento_container');
  if (!container) return;
  GEMINI_API_KEY = localStorage.getItem('avp-gemini-key') || _dk;
  _regimentoHistory = JSON.parse(localStorage.getItem('avp-regimento-history') || '[]');
  regimentoRender();
}

// ========= RENDER PRINCIPAL =========
function regimentoRender() {
  const container = document.getElementById('regimento_container');
  if (!container) return;
  const isAdmin = currentProfile && currentProfile.nivel === 'admin';
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

  // Tab content
  if (_regimentoTab === 'consulta') {
    html += regimentoRenderConsulta();
  } else {
    html += regimentoRenderLeitura();
  }

  container.innerHTML = html;
  if (_regimentoTab === 'consulta') regimentoRenderMessages();
}

function regimentoSwitchTab(tab) {
  _regimentoTab = tab;
  regimentoRender();
}


// ========= TAB CONSULTA =========
function regimentoRenderConsulta() {
  let html = '';
  // FAQ Chips
  html += `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px" id="regimento_chips">`;
  REGIMENTO_FAQ_CHIPS.forEach(chip => {
    html += `<button class="regimento-chip" onclick="regimentoAsk('${chip.replace(/'/g, "\\'")}')">${chip}</button>`;
  });
  html += `</div>`;

  // Recent searches (from history)
  if (_regimentoHistory.length > 0 && _regimentoMessages.length === 0) {
    const recentes = _regimentoHistory.slice(0, 5);
    html += `<div style="margin-bottom:16px"><div style="font-size:.68rem;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Pesquisas recentes</div><div style="display:flex;flex-wrap:wrap;gap:6px">`;
    recentes.forEach(h => {
      const shortQ = h.question.length > 40 ? h.question.substring(0, 40) + '...' : h.question;
      html += `<button class="regimento-chip" style="background:var(--surface-2);border-color:var(--border-light);font-size:.7rem" onclick="regimentoAsk('${h.question.replace(/'/g, "\\'")}')">${escapeHtml(shortQ)}</button>`;
    });
    html += `</div></div>`;
  }

  // Messages area
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
    <div style="font-size:.62rem;color:var(--text3);margin-top:6px;text-align:center">Respostas geradas por IA com base no Regimento Interno. Consulte sempre o documento oficial para decisoes importantes.</div>
  </div>`;
  return html;
}

// ========= TAB LEITURA COMPLETA =========
function regimentoRenderLeitura() {
  let html = '';
  // Search
  html += `<div style="margin-bottom:16px"><input type="text" id="regimento_search" placeholder="Buscar no regimento..." oninput="regimentoFilterLeitura()" style="width:100%;padding:10px 14px;border:1px solid var(--border-strong);border-radius:var(--radius-lg);font-size:.82rem;background:var(--surface);color:var(--text1)"></div>`;

  // Accordion
  html += `<div id="regimento_accordion">`;
  REGIMENTO_CAPITULOS.forEach((cap, idx) => {
    html += `<div class="reg-accordion" data-search="${cap.titulo.toLowerCase()} ${cap.conteudo.toLowerCase()}">
      <div class="reg-accordion-header" onclick="regimentoToggleCap(${idx})">
        <div style="flex:1">
          <div style="font-size:.85rem;font-weight:600;color:var(--text1)">${cap.titulo}</div>
          <div style="font-size:.68rem;color:var(--text3)">${cap.artigos}</div>
        </div>
        <svg class="reg-accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="reg-accordion-body" id="reg_cap_${idx}" style="display:none">
        <div style="font-size:.8rem;color:var(--text2);line-height:1.7;white-space:pre-wrap">${escapeHtml(cap.conteudo)}</div>
      </div>
    </div>`;
  });
  html += `</div>`;
  return html;
}

function regimentoToggleCap(idx) {
  const body = document.getElementById('reg_cap_' + idx);
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  body.parentElement.classList.toggle('expanded', !isOpen);
}

function regimentoFilterLeitura() {
  const query = (document.getElementById('regimento_search') || {}).value.toLowerCase().trim();
  const items = document.querySelectorAll('.reg-accordion');
  items.forEach(item => {
    if (!query || item.dataset.search.includes(query)) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
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
      const sources = regimentoExtractSources(msg.content);
      const cleanContent = msg.content.replace(/\[FONTES:.*?\]/gi, '').trim();
      html += `<div class="regimento-msg regimento-msg-assistant">
        <div class="regimento-msg-avatar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
        <div class="regimento-msg-bubble regimento-msg-assistant-bubble">
          <div class="regimento-msg-content">${regimentoFormatResponse(cleanContent)}</div>
          ${sources.length > 0 ? regimentoRenderSources(sources) : ''}
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

// ========= FONTES COLAPSÁVEIS (Opção B) =========
function regimentoExtractSources(text) {
  const sources = [];
  // Match [FONTES: Art. XX, Art. YY]
  const fontesMatch = text.match(/\[FONTES?:([^\]]+)\]/i);
  if (fontesMatch) {
    const arts = fontesMatch[1].split(',').map(s => s.trim());
    arts.forEach(artRef => {
      const cap = REGIMENTO_CAPITULOS.find(c => c.conteudo.toLowerCase().includes(artRef.toLowerCase().replace('art.','art.').trim()));
      if (cap) sources.push({ ref: artRef, capitulo: cap.titulo, trecho: regimentoGetArticleText(artRef, cap) });
    });
  }
  // Also match inline (Art. XX) references
  const inlineMatches = text.matchAll(/\(Art\.\s*(\d+[º°]?(?:-[A-Z])?)\)/g);
  for (const m of inlineMatches) {
    const artRef = 'Art. ' + m[1];
    if (sources.find(s => s.ref === artRef)) continue;
    const cap = REGIMENTO_CAPITULOS.find(c => c.conteudo.toLowerCase().includes(artRef.toLowerCase()));
    if (cap) sources.push({ ref: artRef, capitulo: cap.titulo, trecho: regimentoGetArticleText(artRef, cap) });
  }
  return sources;
}

function regimentoGetArticleText(artRef, cap) {
  const lines = cap.conteudo.split('\n');
  const artNum = artRef.replace('Art. ', '').replace('Art.', '');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('art. ' + artNum.toLowerCase()) || lines[i].toLowerCase().includes('art.' + artNum.toLowerCase())) {
      // Get this line and next few until next Art or blank
      let trecho = lines[i];
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].match(/^Art\./i) || lines[j].trim() === '') break;
        trecho += '\n' + lines[j];
      }
      return trecho.trim();
    }
  }
  return cap.conteudo.substring(0, 200) + '...';
}

function regimentoRenderSources(sources) {
  if (!sources.length) return '';
  const id = 'reg_src_' + Math.random().toString(36).substr(2, 6);
  let html = `<div class="reg-sources">
    <button class="reg-sources-toggle" onclick="this.parentElement.classList.toggle('open')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      <span>Fontes (${sources.length} ${sources.length === 1 ? 'artigo' : 'artigos'})</span>
      <svg class="reg-sources-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    <div class="reg-sources-body">`;
  sources.forEach(s => {
    html += `<div class="reg-source-item">
      <div class="reg-source-ref">${escapeHtml(s.ref)}</div>
      <div class="reg-source-text">${escapeHtml(s.trecho)}</div>
    </div>`;
  });
  html += `</div></div>`;
  return html;
}


// ========= SEND / API CALL =========
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

  _regimentoMessages.push({ role: 'user', content: question });
  input.value = '';
  regimentoRenderMessages();

  // Hide chips after first message
  const chips = document.getElementById('regimento_chips');
  if (chips) chips.style.display = 'none';

  // Show loading + timer
  _regimentoLoading = true;
  const _regStartTime = Date.now();
  const loadingEl = document.getElementById('regimento_loading');
  if (loadingEl) loadingEl.style.display = 'flex';
  const timerEl = document.getElementById('regimento_timer');
  if (timerEl) timerEl.style.display = 'inline';
  let _regTimerInterval = setInterval(() => {
    const elapsed = ((Date.now() - _regStartTime) / 1000).toFixed(0);
    if (timerEl) timerEl.textContent = elapsed + 's';
  }, 1000);
  const sendBtn = document.getElementById('regimento_sendBtn');
  if (sendBtn) { sendBtn.disabled = true; sendBtn.style.opacity = '.5'; }

  try {
    const response = await regimentoCallAPI(question);
    const elapsed = ((Date.now() - _regStartTime) / 1000).toFixed(1);
    _regimentoMessages.push({ role: 'assistant', content: response, time: elapsed });
    // Save to history
    regimentoSaveHistory(question, response);
  } catch (err) {
    const elapsed = ((Date.now() - _regStartTime) / 1000).toFixed(1);
    _regimentoMessages.push({ role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente.\n\nErro: ' + err.message, time: elapsed });
  }

  clearInterval(_regTimerInterval);
  _regimentoLoading = false;
  if (loadingEl) loadingEl.style.display = 'none';
  if (timerEl) timerEl.style.display = 'none';
  if (sendBtn) { sendBtn.disabled = false; sendBtn.style.opacity = ''; }
  regimentoRenderMessages();
}

async function regimentoCallAPI(question) {
  const messages = [{ role: 'system', content: REGIMENTO_SYSTEM_PROMPT }];
  // History context (last 6)
  if (_regimentoMessages.length > 1) {
    _regimentoMessages.slice(0, -1).slice(-6).forEach(m => {
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

// ========= HISTORY =========
function regimentoSaveHistory(question, answer) {
  const entry = { question, answer: answer.substring(0, 200), date: new Date().toISOString() };
  _regimentoHistory.unshift(entry);
  if (_regimentoHistory.length > 50) _regimentoHistory = _regimentoHistory.slice(0, 50);
  localStorage.setItem('avp-regimento-history', JSON.stringify(_regimentoHistory));
  // Also save to Supabase (non-blocking)
  regimentoSaveHistoryRemote(entry);
}

async function regimentoSaveHistoryRemote(entry) {
  try {
    if (typeof supabase !== 'undefined' && supabase.insert) {
      await supabase.insert('regimento_historico', {
        usuario_id: currentProfile ? currentProfile.id : null,
        usuario_nome: currentUser || 'anonimo',
        pergunta: entry.question,
        resposta_resumo: entry.answer,
        created_at: entry.date
      });
    }
  } catch(e) { /* silent */ }
}


// ========= ADMIN UPLOAD =========
function regimentoAdminUpload() {
  showModal('Atualizar Regimento Interno',
    `<div style="display:flex;flex-direction:column;gap:14px">
      <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px;font-size:.78rem">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="color:var(--text2)">Versao atual:</span><strong>05/2026</strong></div>
        <div style="display:flex;justify-content:space-between"><span style="color:var(--text2)">Capitulos:</span><strong>${REGIMENTO_CAPITULOS.length}</strong></div>
      </div>
      <div class="upload-dropzone" id="regUploadZone" onclick="document.getElementById('regFileInput').click()" style="border:2px dashed var(--border);border-radius:var(--radius-lg);padding:28px;text-align:center;cursor:pointer;transition:all .2s">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <div style="font-size:.82rem;color:var(--text2);font-weight:500">Arraste o arquivo ou clique para selecionar</div>
        <div style="font-size:.68rem;color:var(--text3);margin-top:4px">Formatos aceitos: .pdf, .txt</div>
      </div>
      <input type="file" id="regFileInput" accept=".pdf,.txt" style="display:none" onchange="regimentoFileSelected(event)">
      <div id="regUploadPreview" style="display:none"></div>
      <div style="background:var(--amber-bg);border:1px solid var(--amber-light);border-radius:var(--radius);padding:10px 14px;font-size:.72rem;color:var(--amber);display:flex;align-items:center;gap:8px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Ao atualizar, o documento anterior sera substituido. O historico de pesquisas sera mantido.
      </div>
    </div>`, null);
}

function regimentoFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;
  const preview = document.getElementById('regUploadPreview');
  if (preview) {
    preview.style.display = 'block';
    preview.innerHTML = '<div style="padding:10px;background:var(--surface-2);border-radius:var(--radius);font-size:.78rem"><strong>' + escapeHtml(file.name) + '</strong> (' + (file.size/1024).toFixed(1) + ' KB)<br><span style="color:var(--text3)">Funcionalidade de extracao de PDF sera implementada em breve.</span></div>';
  }
  // For now, show toast about upcoming feature
  showToast('Upload de PDF sera implementado na proxima versao. Por enquanto, o regimento atual esta embutido no sistema.', 'warning');
}

// ========= FORMAT & UTILS =========
function regimentoFormatResponse(text) {
  if (!text) return '';
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h4 style="font-size:.84rem;font-weight:700;margin:10px 0 4px;color:var(--text1)">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 style="font-size:.88rem;font-weight:700;margin:12px 0 6px;color:var(--text1)">$1</h3>')
    .replace(/^- (.*$)/gm, '<li style="margin-bottom:3px">$1</li>')
    .replace(/\n\n/g, '</p><p style="margin:6px 0">')
    .replace(/\n/g, '<br>');
  html = html.replace(/(<li[^>]*>.*?<\/li>(\s*<br>)?)+/g, match => '<ul style="padding-left:16px;margin:6px 0">' + match.replace(/<br>/g, '') + '</ul>');
  // Highlight article references
  html = html.replace(/\(Art\.\s*(\d+[º°]?(?:-[A-Z])?)\)/g, '<span class="reg-art-ref">(Art. $1)</span>');
  return '<p style="margin:6px 0">' + html + '</p>';
}

function regimentoFeedback(msgIdx, type) {
  const feedbackEl = document.querySelector(`.regimento-msg-feedback[data-idx="${msgIdx}"]`);
  if (!feedbackEl) return;
  const icon = type === 'util'
    ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="var(--green)" stroke="var(--green)" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>'
    : '<svg width="13" height="13" viewBox="0 0 24 24" fill="var(--red)" stroke="var(--red)" stroke-width="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>';
  feedbackEl.innerHTML = `<span style="font-size:.65rem;color:var(--text3);display:flex;align-items:center;gap:3px">${icon} ${type === 'util' ? 'Obrigado!' : 'Vamos melhorar!'}</span>`;
}

function regimentoConfigKey() {
  const currentKey = GEMINI_API_KEY ? '****' + GEMINI_API_KEY.slice(-6) : 'Nao configurada';
  showModal('Configurar API Key',
    '<div style="display:flex;flex-direction:column;gap:12px"><input id="gemini_key_input" type="password" placeholder="Cole sua API Key..." value="' + (GEMINI_API_KEY || '') + '" style="width:100%"></div>',
    function() { var key = document.getElementById('gemini_key_input').value.trim(); if (!key) return; localStorage.setItem('avp-gemini-key', key); GEMINI_API_KEY = key; closeModal(); showToast('API Key salva!', 'success'); }, 'green', 'Salvar');
}
