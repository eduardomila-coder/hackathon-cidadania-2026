import { z } from "zod";
import { perguntarJson } from "./claude";

// Assistente do escritório: as perguntas ao modelo que não são a triagem
// (aquela fica em lib/analise.ts). Tudo aqui redige ou organiza para o
// advogado ler; nada sai para o cliente sem ele clicar.

// ── Resposta ao cliente pelo WhatsApp ───────────────────────────────────────
// A IA redige o rascunho; o advogado lê, muda o que quiser e só então envia.

export type PedidoDeResposta = {
  advogado: { nome: string };
  mensagens: Array<{ texto: string; deMim: boolean; quando: string; nomeContato?: string | null }>;
  caso?: {
    titulo: string;
    resumo?: string;
    clienteNome?: string | null;
    documentosPendentes?: string[];
    perguntas?: string[];
  } | null;
};

export const RespostaSugeridaSchema = z.object({
  texto: z.string().describe("A mensagem pronta para o advogado revisar e enviar"),
  motivo: z.string().describe("Uma frase, para o advogado, explicando o que a mensagem faz e por quê"),
});
export type RespostaSugerida = z.infer<typeof RespostaSugeridaSchema>;

function formatarConversa(mensagens: PedidoDeResposta["mensagens"]) {
  if (mensagens.length === 0) return "(ainda não há mensagens: esta será a primeira do escritório)";
  return mensagens
    .slice(-30)
    .map((mensagem) => {
      const hora = new Date(mensagem.quando).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
      const quem = mensagem.deMim ? "ESCRITÓRIO" : `CLIENTE${mensagem.nomeContato ? ` (${mensagem.nomeContato})` : ""}`;
      return `[${hora}] ${quem}: ${mensagem.texto}`;
    })
    .join("\n");
}

function formatarCaso(caso: PedidoDeResposta["caso"]) {
  if (!caso) return "Não há caso vinculado a esta conversa. Acolha, pergunte o que aconteceu em poucas palavras e combine o atendimento.";
  const linhas = [`Caso: ${caso.titulo}`];
  if (caso.clienteNome) linhas.push(`Cliente cadastrado: ${caso.clienteNome}`);
  if (caso.resumo) linhas.push(`Resumo para o advogado (não repita ao cliente): ${caso.resumo}`);
  const documentos = (caso.documentosPendentes ?? []).filter(Boolean);
  linhas.push(documentos.length ? `Documentos que ainda faltam: ${documentos.join("; ")}` : "Documentos: nenhum pendente no checklist.");
  const perguntas = (caso.perguntas ?? []).filter(Boolean);
  if (perguntas.length) linhas.push(`Perguntas que a última triagem deixou em aberto: ${perguntas.join(" | ")}`);
  return linhas.join("\n");
}

export async function sugerirResposta(pedido: PedidoDeResposta): Promise<RespostaSugerida> {
  const nome = pedido.advogado.nome.trim();
  const { dados } = await perguntarJson({
    schema: RespostaSugeridaSchema,
    maxTokens: 4000,
    system: `Você redige, para o advogado revisar, a próxima mensagem de WhatsApp da equipe de um escritório de advocacia ao cliente. Quem envia é o advogado, depois de ler; você só escreve o rascunho.

Como escrever:
- Em português simples, como uma pessoa da equipe escreveria: curta (no máximo 6 linhas), calorosa e direta, na primeira pessoa do plural ("nós", "a equipe").
- Comece acolhendo o que o cliente disse por último, se houver. Chame o cliente pelo primeiro nome quando ele for conhecido.
- Peça só o que falta: os documentos pendentes e, se houver, as informações das perguntas em aberto, uma coisa de cada vez e sem lista longa.
- Combine o próximo passo concreto (mandar os documentos por aqui, confirmar um horário, aguardar o retorno do advogado).
- Termine assinando "Equipe do Dr. ${nome}" ou "Equipe da Dra. ${nome}", conforme o nome indicar.

O que é proibido, sem exceção:
- Dar parecer, opinião jurídica ou dizer se o cliente tem razão.
- Prometer resultado, valor, indenização ou que o caso "vai dar certo".
- Falar de prazo, data-limite, dias para responder ou urgência processual.
- Citar lei, artigo, súmula, jurisprudência ou termo jurídico rebuscado.
- Inventar fato, documento ou informação que não esteja na conversa ou no caso.
- Marcar horário específico como certo: só proponha e peça confirmação.

Responda SOMENTE com um JSON válido, sem texto antes ou depois, no formato:
{ "texto": string, "motivo": string }
"motivo" é uma frase para o advogado, dizendo o que a mensagem faz (ex.: "Acolhe o relato e pede o contrato que falta no checklist").`,
    usuario: `Contexto do caso:\n${formatarCaso(pedido.caso)}\n\nConversa até agora (a mais antiga primeiro):\n"""\n${formatarConversa(pedido.mensagens)}\n"""\n\nEscreva a próxima mensagem da equipe.`,
  });
  return { texto: dados.texto.trim(), motivo: dados.motivo.trim() };
}
// ── Ficha de nomeação ───────────────────────────────────────────────────────
// O advogado cola o texto da intimação de nomeação e recebe uma ficha com o
// que está escrito ali, sem cálculo de prazo e sem tese pronta.

export const FichaDeNomeacaoSchema = z.object({
  processo: z.string().nullable().describe("Número do processo como aparece no texto; null se não aparece"),
  orgao: z.string().nullable().describe("Vara, juizado ou comarca; null se não aparece"),
  ato: z.string().nullable().describe("Para que o advogado foi nomeado; null se não dá para saber"),
  prazoInformado: z.string().nullable().describe("O prazo como está escrito no texto; null se não há"),
  dataCiencia: z.string().nullable().default(null).describe("Data explícita da intimação ou da ciência (AAAA-MM-DD); null se o texto não traz essa data"),
  dataPrazo: z.string().nullable().describe("Só a data explícita de vencimento de prazo ou de ato designado, como audiência (AAAA-MM-DD); null quando o prazo vem em dias"),
  resumo: z.string(),
  fundamentosAAvaliar: z.array(z.string()).describe("Ideias e pontos a examinar, não teses prontas"),
  documentosAPedir: z.array(z.string()),
  perguntasAoCliente: z.array(z.string()),
  alertas: z.array(z.string()),
});
export type FichaDeNomeacao = z.infer<typeof FichaDeNomeacaoSchema>;

const TAMANHO_MAXIMO_DA_INTIMACAO = 12000;

function limparLista(itens: string[], maximo = 12): string[] {
  return itens.map((item) => item.trim()).filter(Boolean).slice(0, maximo);
}

function textoOuNulo(valor: string | null): string | null {
  const limpo = (valor ?? "").trim();
  return limpo ? limpo : null;
}

// Deixa a ficha do jeito que o caso espera: data só se veio no formato certo
// (senão vira alerta), listas sem item vazio, textos sem espaço sobrando.
//
// A data da intimação nunca pode virar prazo. Sem esta trava, o modelo às
// vezes devolvia a data da ciência em `dataPrazo` e o painel do advogado
// anunciava "vence hoje" para um prazo que só começa a contar ali: alarme
// falso no lugar onde o erro custa caro.
export function normalizarFicha(bruta: FichaDeNomeacao): FichaDeNomeacao {
  const alertas = limparLista(bruta.alertas);
  const conferirData = (valor: string | null, oQue: string) => {
    const limpo = textoOuNulo(valor);
    if (limpo && (!/^\d{4}-\d{2}-\d{2}$/.test(limpo) || Number.isNaN(Date.parse(limpo)))) {
      alertas.push(`A ${oQue} "${limpo}" não veio no formato esperado: confira no ato.`);
      return null;
    }
    return limpo;
  };

  const dataCiencia = conferirData(bruta.dataCiencia, "data de ciência");
  let dataPrazo = conferirData(bruta.dataPrazo, "data");
  if (dataPrazo && dataCiencia && dataPrazo === dataCiencia) {
    alertas.push("A data informada é a da intimação, não a do vencimento: o prazo conta a partir dela e quem conta é o advogado.");
    dataPrazo = null;
  }

  const prazoInformado = textoOuNulo(bruta.prazoInformado);
  if (!dataPrazo) alertas.push(prazoInformado ? `O texto fala em "${prazoInformado}" sem data de vencimento explícita: conferir no ato e contar a partir da ciência.` : "A intimação não traz data nem prazo explícito: conferir no ato.");
  return {
    processo: textoOuNulo(bruta.processo),
    orgao: textoOuNulo(bruta.orgao),
    ato: textoOuNulo(bruta.ato),
    prazoInformado,
    dataCiencia,
    dataPrazo,
    resumo: bruta.resumo.trim(),
    fundamentosAAvaliar: limparLista(bruta.fundamentosAAvaliar),
    documentosAPedir: limparLista(bruta.documentosAPedir),
    perguntasAoCliente: limparLista(bruta.perguntasAoCliente),
    alertas: [...new Set(alertas)],
  };
}

export async function fichaDeNomeacao(texto: string): Promise<FichaDeNomeacao> {
  const intimacao = (texto ?? "").trim().slice(0, TAMANHO_MAXIMO_DA_INTIMACAO);
  if (intimacao.length < 30) throw new Error("Cole o texto completo da intimação de nomeação.");

  const { dados } = await perguntarJson({
    schema: FichaDeNomeacaoSchema,
    maxTokens: 8000,
    system: `Você é o assistente de um advogado ou advogada dativa no Paraná. Ele colou o texto de uma intimação de nomeação (do Portal da Advocacia Dativa, do processo eletrônico ou de um e-mail). Sua tarefa é só ORGANIZAR o que está escrito ali numa ficha, em português simples, para o advogado conferir.

Regras:
- "processo": copie o número exatamente como aparece no texto. Se não houver número, null. Nunca invente, complete ou corrija dígitos.
- "orgao": a vara, o juizado ou a comarca como está no texto; null se não aparece.
- "ato": para que o advogado foi nomeado (audiência, defesa, contestação, recurso, acompanhamento...), como o texto diz; null se não dá para saber.
- "prazoInformado": o prazo como está escrito (ex.: "15 dias", "audiência em 20/10/2026 às 14h"); null se o texto não fala de prazo.
- "dataCiencia": a DATA explícita da intimação ou da ciência, em AAAA-MM-DD, se o texto trouxer. É a data a partir da qual um prazo em dias começa a contar.
- "dataPrazo": SÓ a data explícita de vencimento do prazo ou de um ato já designado (ex.: audiência marcada para 20/10/2026), em AAAA-MM-DD. NUNCA repita aqui a data da intimação/ciência: quando o prazo vem em dias ("15 dias"), "dataPrazo" é null mesmo que a data da intimação esteja escrita no texto, porque você NÃO calcula prazo: quem conta é o advogado.
- "resumo": duas ou três frases sobre o que é o caso e o que se espera do advogado, sem juridiquês.
- "fundamentosAAvaliar": pontos a examinar (ex.: "verificar se cabe justiça gratuita", "checar se houve citação válida"), como ideias, não como teses prontas nem conclusões. Lista vazia se o texto não permite.
- "documentosAPedir": o que o advogado deve pedir ao cliente ou buscar nos autos, um por item.
- "perguntasAoCliente": perguntas diretas para o primeiro contato com o cliente.
- "alertas": o que o advogado precisa checar antes de confiar na ficha (ex.: "a data de ciência não está no texto", "o prazo em dias conta a partir da intimação, não desta leitura").
- Não dê parecer, não diga se deve aceitar ou recusar a nomeação, não cite lei que não esteja no texto, não invente fato.
Responda SOMENTE com um JSON válido, sem texto antes ou depois:
{
  "processo": string | null,
  "orgao": string | null,
  "ato": string | null,
  "prazoInformado": string | null,
  "dataCiencia": "AAAA-MM-DD" | null,
  "dataPrazo": "AAAA-MM-DD" | null,
  "resumo": string,
  "fundamentosAAvaliar": string[],
  "documentosAPedir": string[],
  "perguntasAoCliente": string[],
  "alertas": string[]
}`,
    usuario: `Texto da intimação de nomeação:\n"""\n${intimacao}\n"""`,
  });

  return normalizarFicha(dados);
}

