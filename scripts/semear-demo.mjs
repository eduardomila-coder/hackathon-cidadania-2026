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
//
// A conta do Eduardo tem também a carteira da área de família da advocacia
// dativa: violência doméstica, guarda e divórcio. São os casos que a advocacia
// dativa mais recebe e os que puxam a base jurídica da família em docs/juridico.
// Cada um traz documentos próprios do tema (boletim de ocorrência, certidão de
// nascimento, matrícula do imóvel), porque o checklist padrão é de consumo.
const CONTAS = [
  {
    nome: "Eduardo Mila",
    oab: "OAB/PR 127088",
    usuario: "eduardo",
    conversas: true,
    casos: [
      {
        titulo: "Nomeação: contestar cobrança de mensalidades escolares",
        origem: "nomeacao",
        situacao: "em_andamento",
        cliente: { nome: "Maria Ferreira", telefone: "5541998220110" },
        processo: "00023456720268160030",
        orgao: "3º Juizado Especial Cível de Curitiba",
        ato: "Contestar a ação de cobrança",
        prazo: emDias(6),
        resumo:
          "Ré em cobrança de mensalidades escolares de 2024. Diz que pediu o cancelamento da matrícula por escrito em fevereiro e mesmo assim foi cobrada o ano inteiro. Prazo informado na intimação, a conferir no processo oficial.",
        relato:
          "A cliente matriculou a filha na escola em janeiro de 2024 e cancelou a matrícula em fevereiro, por escrito, no e-mail da secretaria. A escola continuou cobrando as mensalidades do ano todo e agora entrou com ação. Ela tem o e-mail do cancelamento, a resposta da secretaria e os boletos.",
        recebidos: ["Documento de identificação", "Conversas e comprovantes"],
        tarefas: [
          { titulo: "Conferir a data de ciência no processo oficial", prazo: emDias(2) },
          { titulo: "Pedir à cliente o e-mail de cancelamento com o cabeçalho completo", prazo: emDias(3) },
          { titulo: "Levantar a jurisprudência sobre cobrança após cancelamento", prazo: null },
        ],
        registros: [
          { tipo: "registro", texto: "Nomeação recebida pela Central. Ficha criada a partir do texto da intimação; prazo a conferir no processo." },
          { tipo: "registro", texto: "Cliente contatada pelo WhatsApp e confirmou que tem o e-mail de cancelamento." },
        ],
        consultarProcesso: false,
        triar: true,
      },
      {
        titulo: "Compra pela internet não entregue há três meses",
        origem: "plantao",
        situacao: "aguardando_cliente",
        cliente: { nome: "Fernando Alsterna", telefone: "5541998330221" },
        processo: null,
        orgao: null,
        ato: null,
        prazo: null,
        resumo:
          "Consumidor pagou uma geladeira pela internet em junho e não recebeu. A loja não responde e não devolve o dinheiro. Caso típico de Juizado Especial Cível.",
        relato:
          "O cliente comprou uma geladeira pela internet em junho, pagou à vista no Pix, e até hoje não recebeu. A loja deu três datas de entrega diferentes e parou de responder. Ele já abriu reclamação no site do consumidor e não teve resposta. Tem o comprovante do Pix, o pedido e as conversas com a loja.",
        recebidos: ["Conversas e comprovantes"],
        tarefas: [
          { titulo: "Pedir ao cliente o comprovante do Pix e o número do pedido", prazo: emDias(2) },
          { titulo: "Conferir o valor da causa e o limite do Juizado", prazo: null },
        ],
        registros: [{ tipo: "registro", texto: "Atendimento no plantão. Cliente prefere resolver sem audiência, se a loja devolver o valor." }],
        consultarProcesso: false,
        triar: false,
      },
      {
        titulo: "Academia segue cobrando depois do cancelamento",
        origem: "plantao",
        situacao: "novo",
        cliente: { nome: "Rita Camargo", telefone: "5541998440332" },
        processo: null,
        orgao: null,
        ato: null,
        prazo: null,
        resumo:
          "Cliente cancelou o plano da academia em maio, pelo aplicativo, e a cobrança continuou por quatro meses no cartão.",
        relato:
          "A cliente cancelou o plano da academia em maio pelo aplicativo e recebeu o protocolo. A cobrança continuou no cartão por quatro meses. Ela ligou duas vezes e pediram para esperar o próximo ciclo. Tem o protocolo do cancelamento e as faturas.",
        recebidos: [],
        tarefas: [
          { titulo: "Somar o que foi cobrado depois do cancelamento", prazo: emDias(4) },
        ],
        registros: [{ tipo: "registro", texto: "Primeiro contato. Falta reunir as faturas do período." }],
        consultarProcesso: false,
        triar: false,
      },
      {
        // Violência doméstica: nomeação para acompanhar a ofendida na medida
        // protetiva de urgência, o que a PGE-PR e a OAB-PR acordaram pagar à
        // dativa. O relato fica no que a lei chama de violência psicológica e
        // patrimonial, sem detalhe de agressão.
        titulo: "Nomeação: acompanhar medida protetiva de urgência",
        origem: "nomeacao",
        situacao: "em_andamento",
        cliente: { nome: "Vanessa Aparecida Teles", telefone: "5541998550117" },
        processo: "00045678920268160030",
        orgao: "1º Juizado de Violência Doméstica e Familiar contra a Mulher de Curitiba",
        ato: "Acompanhar a ofendida e requerer a manutenção das medidas protetivas",
        prazo: emDias(2),
        resumo:
          "Nomeação para acompanhar a ofendida em medida protetiva de urgência: afastamento do agressor do lar e proibição de aproximação. Ela quer a manutenção das medidas, a guarda do filho de cinco anos e a partilha do imóvel comum. Prazo informado na intimação, a conferir no processo oficial.",
        relato:
          "A assistida registrou boletim de ocorrência na Delegacia da Mulher depois de ameaças e de uma discussão em que o companheiro quebrou objetos da casa. O juízo concedeu, de imediato, o afastamento dele do lar e a proibição de aproximação a menos de 300 metros. Ela quer a manutenção das medidas enquanto o caso corre, a guarda do filho do casal e a definição do que fica com cada um no apartamento comprado pelos dois. Ela tem o boletim de ocorrência, o pedido de medida protetiva, a decisão judicial e as fotos dos objetos quebrados. Ele continua mandando recado pelos amigos da família.",
        recebidos: ["Documento de identificação", "Conversas e comprovantes"],
        documentos: [
          { nome: "Boletim de ocorrência", detalhe: "Registro da Delegacia da Mulher, com o número do procedimento.", essencial: true, recebido: true },
          { nome: "Decisão das medidas protetivas", detalhe: "Decisão que concedeu o afastamento do lar e a proibição de aproximação.", essencial: true, recebido: true },
          { nome: "Certidão de nascimento do filho", detalhe: "Para o pedido de guarda e de alimentos.", essencial: false, recebido: false },
        ],
        tarefas: [
          { titulo: "Conferir no processo o prazo de vigência das medidas e o que já foi cumprido", prazo: emDias(1) },
          { titulo: "Orientar a assistida sobre a Delegacia da Mulher e o Ligue 180", prazo: emDias(2) },
          { titulo: "Avaliar pedido de guarda e de alimentos junto com as medidas protetivas", prazo: null },
          { titulo: "Reunir a matrícula do imóvel para a partilha", prazo: null },
        ],
        registros: [
          { tipo: "registro", texto: "Nomeação recebida pela Central. Ficha criada a partir do texto da intimação; prazo a conferir no processo." },
          { tipo: "humano", texto: "Assistida atendida no escritório com a decisão das medidas em mãos. Avisada de que o acompanhamento é gratuito e de que a medida é urgente." },
        ],
        consultarProcesso: false,
        triar: true,
      },
      {
        // Guarda: o caso mais comum do plantão. A guarda compartilhada é a
        // regra do art. 1.584 do Código Civil, e os alimentos seguem o binômio
        // necessidade do filho e possibilidade do genitor.
        titulo: "Guarda compartilhada e alimentos do filho de seis anos",
        origem: "plantao",
        situacao: "em_andamento",
        cliente: { nome: "Simone Barreto da Luz", telefone: "5541998660228" },
        processo: null,
        orgao: "Vara de Família e Sucessões de Curitiba",
        ato: "Propor a ação de guarda com alimentos",
        prazo: null,
        resumo:
          "Mãe quer regularizar a guarda do filho de seis anos e fixar alimentos. O pai visita de vez em quando e passa valores soltos, sem dia certo. Não existe acordo escrito nem processo.",
        relato:
          "A assistida e o pai do menino se separaram há dois anos e a criança mora com ela desde então. O pai, pintor autônomo, faz visitas irregulares, ajuda com valores soltos e não participa das decisões da escola nem da saúde do filho. Ela quer a guarda compartilhada com a criança morando com ela, visitação em finais de semana alternados e alimentos fixados por mês, de acordo com o que ele recebe. Ela tem a certidão de nascimento, os comprovantes das despesas do menino (escola, plano de saúde e farmácia) e as conversas em que ele promete ajudar.",
        recebidos: ["Documento de identificação", "Conversas e comprovantes"],
        documentos: [
          { nome: "Certidão de nascimento do filho", detalhe: "Para o pedido de guarda e de alimentos.", essencial: true, recebido: true },
          { nome: "Comprovantes de despesas do filho", detalhe: "Escola, plano de saúde e farmácia dos últimos três meses.", essencial: true, recebido: true },
          { nome: "Comprovação de renda do genitor", detalhe: "Notas de serviço ou declaração de imposto de renda do pai.", essencial: false, recebido: false },
        ],
        tarefas: [
          { titulo: "Somar as despesas do menino dos últimos três meses", prazo: emDias(4) },
          { titulo: "Pedir a comprovação de renda do genitor; se não vier, pedir ofício ao juízo", prazo: emDias(7) },
          { titulo: "Minutar a ação de guarda com alimentos e o pedido de alimentos provisórios", prazo: null },
        ],
        registros: [
          { tipo: "registro", texto: "Atendimento no plantão. Assistida trouxe a certidão de nascimento e os comprovantes de despesas." },
          { tipo: "humano", texto: "Explicado que guarda compartilhada não é moradia alternada e que os alimentos dependem da necessidade do filho e da possibilidade do pai." },
        ],
        consultarProcesso: false,
        triar: true,
      },
      {
        // Família: divórcio com partilha, em que o obstáculo não é o fim do
        // casamento, e sim o imóvel financiado em nome dos dois. Regime de
        // comunhão parcial, arts. 1.571 e 1.658 do Código Civil.
        titulo: "Nomeação: contestar divórcio com partilha do imóvel financiado",
        origem: "nomeacao",
        situacao: "aguardando_cliente",
        cliente: { nome: "Ademir Kaminski", telefone: "5541998770339" },
        processo: "00067890120268160030",
        orgao: "Vara de Família e Sucessões de Curitiba",
        ato: "Contestar a ação de divórcio e tratar a partilha",
        prazo: emDias(8),
        resumo:
          "Réu em ação de divórcio. Casamento em comunhão parcial, apartamento financiado em nome dos dois e um carro comprado na constância do casamento. Ele concorda com o divórcio e quer manter o apartamento, assumindo o financiamento. Prazo informado na intimação, a conferir no processo oficial.",
        relato:
          "O assistido é casado há doze anos em comunhão parcial de bens e está separado de fato desde janeiro, quando a esposa saiu de casa. Os dois compraram um apartamento financiado, ainda em pagamento, e um carro em nome dele, usado no trabalho. Ela propôs a ação pedindo o divórcio, a partilha do imóvel e metade do valor do carro. Ele concorda com o divórcio, quer ficar com o apartamento assumindo o financiamento e compensando a parte dela, e diz que não tem como pagar honorários. Ele tem a certidão de casamento, a matrícula do imóvel, o contrato do financiamento e os comprovantes das parcelas.",
        recebidos: ["Documento de identificação", "Contrato ou proposta"],
        documentos: [
          { nome: "Certidão de casamento", detalhe: "Com o regime de bens, que define o que entra na partilha.", essencial: true, recebido: true },
          { nome: "Matrícula do imóvel e contrato do financiamento", detalhe: "Titularidade e saldo devedor do apartamento.", essencial: true, recebido: true },
          { nome: "Comprovantes das parcelas do financiamento", detalhe: "Quem pagou o quê desde a separação de fato.", essencial: false, recebido: false },
        ],
        tarefas: [
          { titulo: "Conferir o saldo devedor do financiamento e o valor do imóvel", prazo: emDias(5) },
          { titulo: "Levantar o que foi pago depois da separação de fato", prazo: emDias(9) },
          { titulo: "Avaliar acordo de partilha antes da audiência de conciliação", prazo: null },
        ],
        registros: [
          { tipo: "registro", texto: "Intimação de nomeação recebida. Ficha criada a partir do texto colado; prazo a conferir no processo." },
        ],
        consultarProcesso: false,
        triar: false,
      },
    ],
  },
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
  // Documentos que só existem neste tema: boletim de ocorrência, certidão de
  // nascimento, matrícula do imóvel. O checklist padrão é de consumo.
  for (const documento of caso.documentos ?? []) {
    const criado = await pedir(`/api/escritorio/casos/${id}/documentos`, {
      metodo: "POST",
      cookie,
      corpo: { nome: documento.nome, detalhe: documento.detalhe, essencial: documento.essencial },
    });
    if (criado.status !== 201) { console.log(`    aviso: não criou o documento "${documento.nome}" (HTTP ${criado.status})`); continue; }
    if (documento.recebido) await pedir(`/api/escritorio/casos/${id}/documentos`, { metodo: "PATCH", cookie, corpo: { id: criado.json.id, recebido: true } });
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


// Conversas de WhatsApp da demonstração. Entram pelo webhook da Evolution, o
// mesmo caminho de uma mensagem de verdade, e não escrevendo no arquivo: assim
// a mensagem já chega ligada ao caso do cliente pelo telefone. Precisa de
// EVOLUTION_WEBHOOK_SECRET no ambiente e da instância do advogado cadastrada.
const CONVERSAS = [
  {
    contato: "5541998220110",
    nome: "Maria Ferreira",
    falas: [
      { de: "cliente", hora: -50, texto: "Doutor, bom dia. Recebi uma carta do fórum sobre a escola. É aquela cobrança que o senhor falou?" },
      { de: "mim", hora: -49, texto: "Bom dia, Maria. É sim. A nomeação chegou para mim e eu já abri o caso. Vou contestar." },
      { de: "mim", hora: -49, texto: "Preciso que a senhora me mande o e-mail do cancelamento da matrícula, aquele de fevereiro, com o cabeçalho completo." },
      { de: "cliente", hora: -26, texto: "Achei aqui. Mando por e-mail ou por aqui mesmo?" },
      { de: "mim", hora: -25, texto: "Pode mandar por aqui. Se der, mande também a resposta da secretaria." },
      { de: "cliente", hora: -3, texto: "Mandei os dois. A escola ligou de novo ontem cobrando, mesmo com o processo." },
    ],
  },
  {
    contato: "5541998330221",
    nome: "Fernando Alsterna",
    falas: [
      { de: "cliente", hora: -30, texto: "Boa tarde. Continuo sem a geladeira e a loja não responde mais nem no chat." },
      { de: "mim", hora: -29, texto: "Boa tarde, Fernando. Me mande o comprovante do Pix e o número do pedido que eu conto o prazo e vejo o valor da causa." },
      { de: "cliente", hora: -28, texto: "O pedido é 884213. O Pix foi em 12 de junho, 3.480 reais." },
      { de: "mim", hora: -27, texto: "Anotado. Com esse valor o caso cabe no Juizado Especial. Até 20 salários mínimos o senhor pode entrar sem advogado, mas eu acompanho." },
      { de: "cliente", hora: -2, texto: "Prefiro com o senhor acompanhando. Quando a gente entra?" },
    ],
  },
  {
    contato: "5541998550117",
    nome: "Vanessa Aparecida Teles",
    falas: [
      { de: "cliente", hora: -22, texto: "Doutor, boa tarde. Recebi uma ligação do fórum sobre a medida. Eu preciso ir lá?" },
      { de: "mim", hora: -21, texto: "Boa tarde, Vanessa. A medida protetiva foi concedida e eu recebi a nomeação para acompanhar o seu caso. A senhora não vai sozinha: eu aviso quando tiver audiência." },
      { de: "cliente", hora: -20, texto: "Ele saiu de casa no mesmo dia, mas continua mandando recado pelos amigos da família. Isso conta como descumprimento?" },
      { de: "mim", hora: -19, texto: "Conta. Guarde as mensagens e anote quem procurou a senhora, sem responder. Descumprir medida protetiva é crime: eu junto isso ao processo e peço as providências ao juízo." },
      { de: "cliente", hora: -4, texto: "Doutor, o juiz marcou a audiência para a semana que vem. Meu filho de cinco anos vai precisar falar?" },
      { de: "mim", hora: -3, texto: "Não precisa. A audiência é sobre as medidas e sobre a guarda. Eu passo aí antes para a gente combinar tudo com calma." },
    ],
  },
  {
    contato: "5541998660228",
    nome: "Simone Barreto da Luz",
    falas: [
      { de: "cliente", hora: -28, texto: "Doutor, boa tarde. Consegui os comprovantes da escola e do plano do meu filho. Levo aí?" },
      { de: "mim", hora: -27, texto: "Boa tarde, Simone. Pode mandar por aqui que eu junto no caso. Me diga também o que o pai dele recebe por mês, se a senhora souber." },
      { de: "cliente", hora: -26, texto: "Ele é pintor, trabalha por conta. Não sei quanto tira certo, mas tem carro e mora com os pais." },
      { de: "mim", hora: -25, texto: "Então a gente pede a comprovação e, se ele não apresentar, o juízo oficia. O valor dos alimentos sai da necessidade do menino e do que o pai pode pagar, não de acordo entre vocês." },
      { de: "cliente", hora: -2, texto: "Doutor, ele falou que não vai aceitar a guarda compartilhada, que quer que o menino fique com ele. Isso muda alguma coisa?" },
      { de: "mim", hora: -1, texto: "Não muda o que a lei manda olhar, que é o melhor para o menino. A discordância dele entra no processo e a gente leva isso para a audiência." },
    ],
  },
  {
    contato: "5541998770339",
    nome: "Ademir Kaminski",
    falas: [
      { de: "cliente", hora: -24, texto: "Doutor, boa tarde. Recebi a carta do fórum. Fiquei sabendo que a minha ex-mulher entrou com o divórcio e com a partilha." },
      { de: "mim", hora: -23, texto: "Boa tarde, Ademir. Eu recebi a nomeação para te defender nessa ação. Preciso da certidão de casamento, da matrícula do apartamento e do contrato do financiamento." },
      { de: "cliente", hora: -22, texto: "Tenho tudo em casa. Ela quer metade do carro também, mas o carro é do meu trabalho." },
      { de: "mim", hora: -21, texto: "O carro foi comprado depois do casamento e o regime é comunhão parcial, então entra na partilha mesmo no seu nome. O que a gente discute é a forma de compensar." },
      { de: "cliente", hora: -3, texto: "Doutor, ela aceitou conversar sobre a partilha antes da audiência. Vale a pena?" },
      { de: "mim", hora: -2, texto: "Vale. Acordo homologado resolve mais rápido e mais barato, e o juízo marca a audiência de conciliação. Eu preparo a proposta com a compensação do financiamento." },
    ],
  },
];

async function semearConversas(conta) {
  const segredo = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (!segredo) { console.log("  (sem EVOLUTION_WEBHOOK_SECRET: conversas não semeadas)"); return; }
  const instancia = "ponto-dativo-" + conta.usuario.toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  let enviadas = 0;
  for (const conversa of CONVERSAS) {
    for (const fala of conversa.falas) {
      const quando = Math.floor((Date.now() + fala.hora * 60 * 60 * 1000) / 1000);
      const corpo = {
        event: "messages.upsert",
        instance: instancia,
        data: [{
          key: { remoteJid: `${conversa.contato}@s.whatsapp.net`, fromMe: fala.de === "mim", id: `demo-${conversa.contato}-${fala.hora}` },
          pushName: conversa.nome,
          message: { conversation: fala.texto },
          messageTimestamp: quando,
        }],
      };
      const resposta = await fetch(`${BASE}/api/whatsapp/webhook?token=${encodeURIComponent(segredo)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corpo),
      });
      if (resposta.status === 202) enviadas += 1;
      else { console.log(`  aviso: webhook devolveu HTTP ${resposta.status}; conversas não semeadas`); return; }
    }
  }
  console.log(`  ✓ ${enviadas} mensagens em ${CONVERSAS.length} conversas`);
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
  if (conta.conversas) await semearConversas(conta);
  console.log("");
}
console.log("Pronto. Cada conta enxerga só os casos dela: é o isolamento por advogadoId.");
