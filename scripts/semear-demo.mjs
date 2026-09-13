// Semeia o ambiente de demonstração com advogados e casos fictícios, pela API
// da própria plataforma (não escreve direto nos arquivos). Serve para o auditor
// ter contas prontas e para mostrar que o isolamento entre advogados é real:
// cada conta enxerga só os casos dela.
//
// Uso:
//   SENHA_DEMO=... node --env-file=.env.local scripts/semear-demo.mjs [endereço]
//
// A senha vem do ambiente de propósito: o repositório é público.
const BASE = (process.argv[2] ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const SENHA = process.env.SENHA_DEMO;
if (!SENHA || SENHA.length < 8) throw new Error("Defina SENHA_DEMO (mínimo 8 caracteres) no ambiente.");

const equipe = (process.env.PAINEL_USUARIOS ?? "")
  .split(";")
  .map((item) => item.split("="))
  .filter(([nome, valor]) => nome && valor)[0];
if (!equipe) throw new Error("PAINEL_USUARIOS não está no ambiente.");
const basic = "Basic " + Buffer.from(`${equipe[0]}:${equipe[1]}`).toString("base64");

function emDias(dias) {
  const data = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  return data.toISOString().slice(0, 10);
}

// Três contas, três casos cada, cobrindo as telas do escritório: mesa de
// trabalho, nomeações, agenda (tarefas vencendo, adiante, sem data e
// concluídas), documentos (checklist em estados variados), pesquisa (triagens)
// e processos (consulta pontual ao DataJud). Tudo fictício, sem pessoa real.
const CONTAS = [
  {
    nome: "Ana Souza",
    oab: "OAB/PR 12345",
    usuario: "ana.souza",
    casos: [
      {
        titulo: "Busca e apreensão de moto financiada",
        origem: "nomeacao",
        situacao: "em_andamento",
        cliente: { nome: "Marcos Vinícius Alves", telefone: "5541998112233" },
        processo: "00012589820208160171",
        orgao: "Juízo Único da Comarca de Tomazina",
        ato: "Contestar e avaliar o pedido de liminar",
        prazo: emDias(4),
        resumo:
          "Réu em busca e apreensão de moto financiada. Alega que não recebeu aviso de mora antes da ação e quer pagar o atrasado para ficar com a moto. Prazo informado na intimação, a conferir no processo oficial.",
        relato:
          "O cliente financiou uma moto em 2023 e pagou as parcelas até março. Ficou desempregado, atrasou três parcelas e recebeu a ação de busca e apreensão sem nenhum aviso do banco antes. Ele quer pagar o que deve e ficar com a moto. Tem os comprovantes de pagamento, o contrato de financiamento e as conversas com a loja.",
        recebidos: ["Documento de identificação", "Conversas e comprovantes"],
        tarefas: [
          { titulo: "Contestação protocolada", prazo: emDias(-1), concluida: true },
          { titulo: "Conferir a data da ciência no processo oficial", prazo: emDias(1) },
          { titulo: "Pedir ao cliente o contrato de financiamento completo", prazo: null },
        ],
        registros: [
          { tipo: "registro", texto: "Intimação de nomeação recebida pelo e-mail do plantão, às 9h20." },
          { tipo: "humano", texto: "Cliente avisado por telefone sobre a nomeação e sobre a conferência do prazo." },
        ],
        consultarProcesso: true,
        triar: false,
      },
      {
        titulo: "Plano de saúde negou a cirurgia",
        origem: "particular",
        situacao: "em_andamento",
        cliente: { nome: "Joana Ribeiro dos Santos", telefone: "5541997445566" },
        processo: null,
        orgao: "2º Juizado Especial Cível de Curitiba",
        ato: null,
        prazo: null,
        resumo:
          "Plano negou cirurgia de vesícula alegando carência. Cliente paga o plano há dois anos e o médico indicou urgência.",
        relato:
          "A cliente teve a cirurgia de vesícula negada pelo plano de saúde, que alegou carência. Ela paga o plano há dois anos e o médico disse que a cirurgia é urgente, com risco de agravamento. Ela tem o pedido médico, o número de protocolo da negativa e as faturas do plano.",
        recebidos: ["Documento de identificação", "Comprovante de endereço"],
        tarefas: [
          { titulo: "Conferir no contrato o prazo de carência aplicado", prazo: null },
          { titulo: "Reunir protocolo da negativa e pedido médico", prazo: emDias(3) },
        ],
        registros: [{ tipo: "registro", texto: "Atendimento no escritório. Cliente trouxe pedido médico e protocolo da negativa." }],
        consultarProcesso: false,
        triar: true,
      },
      {
        titulo: "Nomeação: contestar cobrança de energia",
        origem: "nomeacao",
        situacao: "novo",
        cliente: { nome: "Eliana Castro Pires", telefone: "5541996778899" },
        processo: "00045678920268160101",
        orgao: "Juizado Especial Cível da Comarca de Irati",
        ato: "Contestação em ação de cobrança de energia elétrica",
        prazo: emDias(2),
        resumo:
          "Nomeação em ação de cobrança de energia. A cliente contesta o valor da fatura e alega que a leitura foi estimada por meses. Prazo a conferir no processo oficial.",
        relato:
          "A cliente recebeu uma ação de cobrança da distribuidora de energia. Ela contesta o valor da fatura, diz que a leitura foi estimada por três meses seguidos e que já reclamou na ouvidoria sem resposta. Tem as faturas, os protocolos de reclamação e as fotos do medidor.",
        recebidos: [],
        tarefas: [
          { titulo: "Conferir íntegra da intimação e a data de ciência", prazo: emDias(2) },
          { titulo: "Confirmar prazo no processo oficial", prazo: emDias(2) },
          { titulo: "Pedir à cliente as faturas e protocolos", prazo: emDias(9) },
        ],
        registros: [{ tipo: "registro", texto: "Intimação de nomeação recebida. Ficha criada a partir do texto colado." }],
        consultarProcesso: false,
        triar: false,
      },
    ],
  },
  {
    nome: "Bruno Lima",
    oab: "OAB/PR 54321",
    usuario: "bruno.lima",
    casos: [
      {
        titulo: "Pensão alimentícia atrasada há quatro meses",
        origem: "nomeacao",
        situacao: "aguardando_cliente",
        cliente: { nome: "Tatiana Moraes", telefone: "5541993334455" },
        processo: null,
        orgao: "Vara de Família e Sucessões de São José dos Pinhais",
        ato: "Definir a via de cobrança dos atrasados",
        prazo: null,
        resumo:
          "Pai sem pagar pensão há quatro meses, com trabalho registrado. Cliente quer a retomada do pagamento e a cobrança dos atrasados.",
        relato:
          "A cliente tem uma filha de sete anos e o pai está sem pagar a pensão há quatro meses, apesar de estar trabalhando registrado. Ela quer a retomada do pagamento e a cobrança dos valores atrasados. Tem a sentença que fixou a pensão, os comprovantes das despesas da filha e as mensagens em que ele promete pagar.",
        recebidos: ["Documento de identificação", "Conversas e comprovantes"],
        tarefas: [
          { titulo: "Atender a cliente e colher os documentos", prazo: emDias(-3), concluida: true },
          { titulo: "Conferir se cabe execução de alimentos ou ação de cobrança", prazo: null },
          { titulo: "Levantar o valor atualizado dos atrasados", prazo: emDias(7) },
        ],
        registros: [{ tipo: "registro", texto: "Cliente atendeu no plantão e trouxe a sentença de fixação da pensão." }],
        consultarProcesso: false,
        triar: false,
      },
      {
        titulo: "Acordo trabalhista não pago no prazo",
        origem: "plantao",
        situacao: "em_andamento",
        cliente: { nome: "João Carlos Bueno", telefone: "5541996223311" },
        processo: null,
        orgao: "Vara do Trabalho de Curitiba",
        ato: "Cobrar o acordo descumprido",
        prazo: null,
        resumo:
          "Acordo homologado em audiência não foi pago no prazo. Cliente quer a execução do valor combinado.",
        relato:
          "O cliente trabalhou em uma transportadora por dois anos e saiu sem receber as verbas rescisórias. Fez acordo na audiência, a empresa não pagou no prazo combinado e até hoje não depositou nada. Ele tem a ata da audiência e o cálculo do que ficou acertado.",
        recebidos: ["Documento de identificação"],
        tarefas: [
          { titulo: "Localizar a ata da audiência e conferir o prazo do acordo", prazo: null },
          { titulo: "Calcular o valor da execução com correção", prazo: emDias(14) },
        ],
        registros: [{ tipo: "humano", texto: "Cliente avisado de que a cobrança depende do trânsito em julgado do acordo." }],
        consultarProcesso: false,
        triar: true,
      },
      {
        titulo: "Regularização de guarda e visitação",
        origem: "particular",
        situacao: "concluido",
        cliente: { nome: "Renato Faria Lima", telefone: "5541992887766" },
        processo: null,
        orgao: "Vara de Família e Sucessões de Curitiba",
        ato: null,
        prazo: null,
        resumo:
          "Acordo de guarda compartilhada e visitação homologado. Caso encerrado, com o checklist completo.",
        relato:
          "O cliente queria regularizar a guarda e a visitação do filho de dez anos. Após a audiência de conciliação, as partes chegaram a um acordo de guarda compartilhada, com visitas em finais de semana alternados. O acordo foi homologado e o caso foi concluído.",
        recebidos: ["Documento de identificação", "Comprovante de endereço", "Contrato ou proposta", "Conversas e comprovantes"],
        tarefas: [
          { titulo: "Audiência de conciliação", prazo: emDias(-20), concluida: true },
          { titulo: "Acordo homologado", prazo: emDias(-15), concluida: true },
        ],
        registros: [
          { tipo: "registro", texto: "Caso aberto com a certidão de nascimento e o pedido de guarda." },
          { tipo: "humano", texto: "Acordo de guarda compartilhada homologado em audiência. Caso concluído." },
        ],
        consultarProcesso: false,
        triar: false,
      },
    ],
  },
  {
    nome: "Carla Mendes",
    oab: "OAB/PR 67890",
    usuario: "carla.mendes",
    casos: [
      {
        titulo: "Atraso de dois anos na entrega do apartamento",
        origem: "particular",
        situacao: "em_andamento",
        cliente: { nome: "Helena Prado Camargo", telefone: "5541995566778" },
        processo: null,
        orgao: "1ª Vara Cível de Curitiba",
        ato: null,
        prazo: null,
        resumo:
          "Compradora de apartamento na planta com dois anos de atraso na entrega. Valor da causa acima do limite do Juizado, a confirmar.",
        relato:
          "A cliente comprou um apartamento na planta em 2021, com entrega prevista para dezembro de 2022, e até hoje não recebeu as chaves. Ela pagou todas as parcelas do período e continua pagando aluguel. O valor pago passa de oitenta mil reais. Tem o contrato, os comprovantes de pagamento e as trocas de e-mail com a construtora.",
        recebidos: ["Documento de identificação", "Contrato ou proposta"],
        tarefas: [
          { titulo: "Conferir o valor atualizado do contrato e o limite do Juizado", prazo: null },
          { titulo: "Pedir os comprovantes de aluguel do período de atraso", prazo: null },
          { titulo: "Notificar a construtora extrajudicialmente", prazo: emDias(11) },
        ],
        registros: [{ tipo: "registro", texto: "Primeira reunião. Cliente trouxe contrato e comprovantes de pagamento." }],
        consultarProcesso: false,
        triar: false,
      },
      {
        titulo: "Tarifa bancária cobrada sem contratada",
        origem: "particular",
        situacao: "novo",
        cliente: { nome: "Paulo Sérgio Andrade", telefone: "5541994455667" },
        processo: null,
        orgao: "3º Juizado Especial Cível de Curitiba",
        ato: null,
        prazo: null,
        resumo: "Tarifa de pacote de serviços cobrada em conta salário, sem contratação. Pedido de devolução em dobro.",
        relato:
          "O cliente recebe o salário em conta salário e notou que o banco cobra um pacote de serviços que ele nunca contratou, há oito meses. Ele tem os extratos de todos os meses e já reclamou no aplicativo, sem resposta.",
        recebidos: ["Conversas e comprovantes"],
        tarefas: [
          { titulo: "Separar os extratos do período cobrado", prazo: emDias(5) },
          { titulo: "Somar as tarifas cobradas e pedir a devolução em dobro", prazo: null },
        ],
        registros: [{ tipo: "registro", texto: "Cliente enviou os extratos por WhatsApp do escritório." }],
        consultarProcesso: false,
        triar: true,
      },
      {
        titulo: "Nomeação: contestar ação de despejo",
        origem: "nomeacao",
        situacao: "novo",
        cliente: { nome: "Valdir Antunes Rocha", telefone: "5541992334455" },
        processo: "00078901220268160202",
        orgao: "Vara Cível da Comarca de Campo Largo",
        ato: "Defesa em ação de despejo por falta de pagamento",
        prazo: emDias(5),
        resumo:
          "Nomeação em ação de despejo por falta de pagamento. O cliente contesta os valores cobrados e quer apresentar defesa. Prazo a conferir no processo oficial.",
        relato:
          "O cliente é inquilino e recebeu uma ação de despejo por falta de pagamento. Ele contesta os valores, diz que parte dos aluguéis foi paga e que houve um acordo verbal de parcelamento com a imobiliária. Tem os comprovantes de pagamento, o contrato de locação e as conversas com a imobiliária.",
        recebidos: [],
        tarefas: [
          { titulo: "Conferir íntegra da intimação e a data de ciência", prazo: emDias(5) },
          { titulo: "Confirmar prazo no processo oficial", prazo: emDias(5) },
        ],
        registros: [{ tipo: "registro", texto: "Intimação de nomeação recebida. Ficha criada a partir do texto colado." }],
        consultarProcesso: false,
        triar: false,
      },
    ],
  },
];

async function pedir(caminho, { metodo = "GET", corpo, cookie, cabecalhos = {} } = {}) {
  const resposta = await fetch(`${BASE}${caminho}`, {
    method: metodo,
    redirect: "manual",
    headers: {
      ...(corpo ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...cabecalhos,
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await resposta.text();
  let json = null;
  try { json = JSON.parse(texto); } catch { /* resposta em texto */ }
  const cookieEmitido = (resposta.headers.getSetCookie?.() ?? [])[0]?.split(";")[0] ?? null;
  return { status: resposta.status, json, texto, cookieEmitido };
}

async function garantirConta(conta) {
  const criada = await pedir("/api/advogados", {
    metodo: "POST",
    cabecalhos: { Authorization: basic },
    corpo: { nome: conta.nome, oab: conta.oab, usuario: conta.usuario, senha: SENHA },
  });
  if (criada.status === 201 || criada.status === 200) return "criada";
  if (criada.status === 409) return "já existia";
  throw new Error(`não criou a conta ${conta.usuario}: HTTP ${criada.status} ${criada.texto.slice(0, 120)}`);
}

// Os títulos que a conta já tem. Serve para rodar o seed de novo num ambiente
// já semeado sem duplicar caso: o roteiro cresceu de 2 para 3 casos por conta,
// e o servidor da demonstração já tinha os 2 primeiros.
async function titulosJaSemeados(cookie) {
  const lista = await pedir("/api/escritorio/casos", { cookie });
  if (lista.status !== 200 || !Array.isArray(lista.json)) return new Set();
  return new Set(lista.json.map((caso) => caso.titulo));
}

async function semearCaso(cookie, caso) {
  const aberto = await pedir("/api/escritorio/casos", {
    metodo: "POST",
    cookie,
    corpo: {
      titulo: caso.titulo,
      origem: caso.origem,
      cliente: caso.cliente,
      processo: caso.processo,
      orgao: caso.orgao,
      ato: caso.ato,
      prazo: caso.prazo,
      relato: caso.relato,
      resumo: caso.resumo,
    },
  });
  if (aberto.status !== 201) throw new Error(`não abriu "${caso.titulo}": HTTP ${aberto.status} ${aberto.texto.slice(0, 120)}`);
  const id = aberto.json.id;

  // O caso nasce "novo"; a situação que o roteiro pede entra por PATCH.
  if (caso.situacao && caso.situacao !== "novo") {
    const alterada = await pedir(`/api/escritorio/casos/${id}`, { metodo: "PATCH", cookie, corpo: { situacao: caso.situacao } });
    if (alterada.status !== 200) console.log(`    aviso: não mudou a situação para ${caso.situacao} (HTTP ${alterada.status})`);
  }

  const dossie = await pedir(`/api/escritorio/casos/${id}`, { cookie });
  for (const nome of caso.recebidos) {
    const documento = (dossie.json.documentos ?? []).find((d) => d.nome === nome);
    if (documento) await pedir(`/api/escritorio/casos/${id}/documentos`, { metodo: "PATCH", cookie, corpo: { id: documento.id, recebido: true } });
  }
  for (const tarefa of caso.tarefas) {
    const criada = await pedir(`/api/escritorio/casos/${id}/tarefas`, { metodo: "POST", cookie, corpo: { titulo: tarefa.titulo, prazo: tarefa.prazo } });
    if (tarefa.concluida && criada.status === 201) {
      await pedir(`/api/escritorio/casos/${id}/tarefas`, { metodo: "PATCH", cookie, corpo: { id: criada.json.id, concluida: true } });
    }
  }
  for (const registro of caso.registros) {
    await pedir(`/api/escritorio/casos/${id}/registros`, { metodo: "POST", cookie, corpo: registro });
  }
  if (caso.consultarProcesso) {
    const processo = await pedir(`/api/escritorio/casos/${id}/processo`, { metodo: "POST", cookie, corpo: {} });
    if (processo.status !== 200) console.log(`    aviso: consulta do processo devolveu HTTP ${processo.status}`);
  }
  if (caso.triar) {
    // A triagem depende do modelo. Se falhar, o caso continua semeado e o
    // advogado roda a triagem de novo pela tela.
    try {
      const triagem = await pedir(`/api/escritorio/casos/${id}/triagem`, { metodo: "POST", cookie, corpo: {} });
      const forca = triagem.json?.resultado?.forca;
      console.log(`    triagem: HTTP ${triagem.status}${forca ? ` · ${forca.comprovados} de ${forca.aplicaveis} requisitos comprovados` : ""}`);
    } catch (e) {
      console.log(`    aviso: a triagem falhou (${String(e).slice(0, 80)}); rodar pela tela`);
    }
  }
  console.log(`  ✓ ${caso.titulo}`);
}

console.log(`Semeando demonstração em ${BASE}\n`);
for (const conta of CONTAS) {
  const estado = await garantirConta(conta);
  const entrada = await pedir("/api/entrar", { metodo: "POST", corpo: { usuario: conta.usuario, senha: SENHA } });
  if (entrada.status !== 200 || !entrada.cookieEmitido) throw new Error(`não entrou como ${conta.usuario}: HTTP ${entrada.status}`);
  const jaTem = await titulosJaSemeados(entrada.cookieEmitido);
  const pendentes = conta.casos.filter((caso) => !jaTem.has(caso.titulo));
  const repetidos = conta.casos.length - pendentes.length;
  console.log(`${conta.nome} (${conta.usuario}) · ${estado} · ${pendentes.length} caso(s) a semear${repetidos ? ` · ${repetidos} já estava(m) lá` : ""}`);
  for (const caso of pendentes) await semearCaso(entrada.cookieEmitido, caso);
  console.log("");
}
console.log("Pronto. Cada conta enxerga só os casos dela: é o isolamento por advogadoId.");
