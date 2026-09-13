import { z } from "zod";
import { alterar, agora, listar, novoId } from "./banco";
import { perguntarJson } from "./claude";
import { enviarTexto, estadoDaConexao } from "./evolution";
import {
  casoPorId,
  documentosDoCaso,
  guardarMensagem,
  mensagensDo,
  registrar,
  tarefasDoCaso,
  triagensDoCaso,
  type Caso,
  type Mensagem,
} from "./escritorio";

// Estagiário virtual do escritório: responde o cliente no WhatsApp quando o
// advogado liga isso naquela conversa, seguindo as regras do robô da Mila
// (~/automacao-processual/backend/whatsapp/services/ai_robot.py), que é o
// mesmo motor do Estagiário Virtual dela, com prompt restrito ao atendimento
// externo.
//
// Três travas vieram de lá: confiança mínima, envio automático ou só sugestão,
// e a decisão de responder ou não vir no contrato do modelo. Toda decisão fica
// registrada no caso, inclusive as de não responder: o advogado lê por que o
// estagiário preferiu ficar quieto.

const CONFIG = "escritorio-estagiario";
const SUGESTOES = "escritorio-estagiario-sugestoes";

export type ConfigDoEstagiario = {
  id: string;
  advogadoId: string;
  contato: string;
  ativo: boolean;
  // true: o estagiário envia sozinho quando tem confiança. false: ele prepara
  // a resposta e o advogado envia com um clique.
  autoEnviar: boolean;
  confiancaMinima: number;
  // Instrução do escritório (tom, tratamento, o que evitar).
  instrucao: string;
  // Se true, ele se apresenta como atendimento automático. Por padrão, como no
  // robô da Mila, escreve como integrante da equipe.
  avisarQueEDeMaquina: boolean;
  atualizadoEm: string;
  atualizadoPor: string;
};

export type SugestaoDoEstagiario = {
  id: string;
  advogadoId: string;
  contato: string;
  casoId: string | null;
  texto: string;
  motivo: string;
  estado: "pendente" | "enviada" | "descartada";
  quando: string;
};

export const CONFIANCA_PADRAO = 0.72;

export const CONFIANCAS: Array<{ valor: number; nome: string; explicacao: string }> = [
  { valor: 0.85, nome: "cuidadoso", explicacao: "Só responde quando tem muita certeza. Erra menos e cala mais." },
  { valor: CONFIANCA_PADRAO, nome: "padrão", explicacao: "O mesmo nível do robô da Mila: responde o simples, cala no que é dúvida." },
  { valor: 0.5, nome: "confiante", explicacao: "Responde mais, inclusive quando a informação está incompleta. Confira depois." },
];

function chave(advogadoId: string, contato: string) {
  return `${advogadoId}:${contato.replace(/\D/g, "")}`;
}

export function configDaConversa(advogadoId: string, contato: string): ConfigDoEstagiario {
  const digitos = contato.replace(/\D/g, "");
  const existente = listar<ConfigDoEstagiario>(CONFIG).find((item) => chave(item.advogadoId, item.contato) === chave(advogadoId, digitos));
  if (existente) return existente;
  // Padrão: desligado. O estagiário só atende a conversa que o advogado ligar.
  return {
    id: "",
    advogadoId,
    contato: digitos,
    ativo: false,
    autoEnviar: true,
    confiancaMinima: CONFIANCA_PADRAO,
    instrucao: "",
    avisarQueEDeMaquina: false,
    atualizadoEm: "",
    atualizadoPor: "",
  };
}

export async function atualizarConfig(
  advogadoId: string,
  contato: string,
  campos: Partial<Pick<ConfigDoEstagiario, "ativo" | "autoEnviar" | "confiancaMinima" | "instrucao" | "avisarQueEDeMaquina">>,
  porUsuario: string,
): Promise<ConfigDoEstagiario> {
  const digitos = contato.replace(/\D/g, "");
  if (!digitos) throw new Error("Conversa sem contato.");
  const atual = configDaConversa(advogadoId, digitos);
  const confianca = campos.confiancaMinima ?? atual.confiancaMinima;
  const atualizada: ConfigDoEstagiario = {
    ...atual,
    ...campos,
    confiancaMinima: Math.min(0.95, Math.max(0.3, confianca)),
    instrucao: (campos.instrucao ?? atual.instrucao).slice(0, 600),
    id: atual.id || novoId(),
    advogadoId,
    contato: digitos,
    atualizadoEm: agora(),
    atualizadoPor: porUsuario,
  };
  await alterar<ConfigDoEstagiario>(CONFIG, (itens) => {
    const outros = itens.filter((item) => chave(item.advogadoId, item.contato) !== chave(advogadoId, digitos));
    return [...outros, atualizada];
  });
  return atualizada;
}

export function sugestaoPendente(advogadoId: string, contato: string): SugestaoDoEstagiario | null {
  const digitos = contato.replace(/\D/g, "");
  const pendentes = listar<SugestaoDoEstagiario>(SUGESTOES)
    .filter((item) => item.advogadoId === advogadoId && item.contato === digitos && item.estado === "pendente")
    .sort((a, b) => a.quando.localeCompare(b.quando));
  return pendentes[pendentes.length - 1] ?? null;
}

async function guardarSugestao(dados: Omit<SugestaoDoEstagiario, "id" | "estado" | "quando">): Promise<SugestaoDoEstagiario> {
  const sugestao: SugestaoDoEstagiario = { ...dados, id: novoId(), estado: "pendente", quando: agora() };
  await alterar<SugestaoDoEstagiario>(SUGESTOES, (itens) => {
    // Só a mais nova fica pendente: o cliente escreveu de novo, a antiga venceu.
    const limpas = itens.map((item) =>
      item.advogadoId === dados.advogadoId && item.contato === dados.contato && item.estado === "pendente"
        ? { ...item, estado: "descartada" as const }
        : item,
    );
    return [...limpas, sugestao];
  });
  return sugestao;
}

export async function fecharSugestao(advogadoId: string, id: string, estado: "enviada" | "descartada"): Promise<SugestaoDoEstagiario> {
  let encontrada: SugestaoDoEstagiario | null = null;
  await alterar<SugestaoDoEstagiario>(SUGESTOES, (itens) =>
    itens.map((item) => {
      if (item.id !== id || item.advogadoId !== advogadoId) return item;
      encontrada = { ...item, estado };
      return encontrada;
    }),
  );
  if (!encontrada) throw new Error("Sugestão não encontrada.");
  return encontrada;
}

// ── A decisão do estagiário ─────────────────────────────────────────────────

export const DecisaoDoEstagiarioSchema = z.object({
  mensagem: z.string().describe("O texto pronto para enviar ao cliente; vazio quando não for responder"),
  enviar: z.boolean().describe("true só quando for seguro responder ao cliente agora"),
  confianca: z.number().min(0).max(1).describe("Quanta certeza você tem de que esta resposta não promete, não inventa e não decide nada que é do advogado"),
  intencao: z.string().describe("O que a mensagem faz, em poucas palavras"),
  faltando: z.array(z.string()).describe("O que falta para responder melhor, quando houver"),
  fontes: z.array(z.string()).describe("De onde saiu cada informação usada, no contexto"),
  motivoDeSilencio: z.string().describe("Quando enviar for false, o motivo em uma frase clara para o advogado"),
});
export type DecisaoDoEstagiario = z.infer<typeof DecisaoDoEstagiarioSchema>;

export type PedidoDoEstagiario = {
  advogado: { id: string; nome: string; usuario: string };
  contato: string;
  nomeContato?: string | null;
  mensagens: Mensagem[];
  caso: Caso | null;
  config: ConfigDoEstagiario;
};

function formatarConversa(mensagens: Mensagem[], doEstagiario: (m: Mensagem) => boolean) {
  if (mensagens.length === 0) return "(não há mensagens nesta conversa)";
  return mensagens
    .slice(-30)
    .map((mensagem) => {
      const hora = new Date(mensagem.quando).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
      const quem = mensagem.deMim ? (doEstagiario(mensagem) ? "ESCRITÓRIO (estagiário)" : "ESCRITÓRIO") : `CLIENTE${mensagem.nomeContato ? ` (${mensagem.nomeContato})` : ""}`;
      return `[${hora}] ${quem}: ${mensagem.texto}`;
    })
    .join("\n");
}

function formatarCaso(advogadoId: string, caso: Caso | null) {
  if (!caso) {
    return "Não há caso vinculado a esta conversa. Acolha, pergunte em poucas palavras o que aconteceu e combine o atendimento; não prometa nada.";
  }
  const linhas = [
    `Caso: ${caso.titulo}`,
    `Origem: ${caso.origem} · situação: ${caso.situacao}`,
    caso.resumo ? `Resumo interno (não repetir ao cliente): ${caso.resumo}` : "",
    caso.relato ? `Relato do cliente (não repetir como se fosse novo): ${caso.relato.slice(0, 1200)}` : "",
  ];
  const pendentes = documentosDoCaso(advogadoId, caso.id).filter((documento) => !documento.recebido);
  linhas.push(pendentes.length
    ? `Documentos que ainda faltam no checklist: ${pendentes.map((documento) => documento.nome).join("; ")}`
    : "Documentos do checklist: todos recebidos.");
  const tarefas = tarefasDoCaso(advogadoId, caso.id).filter((tarefa) => !tarefa.concluida);
  if (tarefas.length) linhas.push(`Providências internas em aberto (nunca citar ao cliente): ${tarefas.map((tarefa) => tarefa.titulo).join("; ")}`);
  const triagem = triagensDoCaso(advogadoId, caso.id).at(-1);
  if (triagem) {
    const analise = triagem.resultado.analise;
    const semProva = analise.requisitos
      .filter((requisito) => requisito.situacao === "falta_documento")
      .map((requisito) => requisito.requisito);
    if (semProva.length) linhas.push(`Requisitos que ainda dependem de documento (pedir ao cliente, um por vez): ${semProva.join("; ")}`);
    if (analise.perguntas_pendentes.length) linhas.push(`Perguntas da triagem em aberto (usar no atendimento, uma por vez): ${analise.perguntas_pendentes.join(" | ")}`);
    if (analise.resumo) linhas.push(`Resumo da triagem (interno, não repetir ao cliente): ${analise.resumo}`);
  }
  return linhas.filter(Boolean).join("\n");
}

function montarSistema(config: ConfigDoEstagiario) {
  const apresentacao = config.avisarQueEDeMaquina
    ? '3. Deixe claro que o atendimento é automático quando isso couber na conversa (ex.: "este é um atendimento automático do escritório"). Nunca finja ser o advogado.'
    : "3. Escreva como integrante da equipe do escritório. Não diga que é IA, robô ou automação.";
  return `Você é o estagiário virtual de um escritório de advocacia, atendendo o cliente pelo WhatsApp em nome do advogado responsável.

Use exclusivamente o contexto que a plataforma envia: conversa, caso, documentos, prazos e triagem. Você não tem acesso a mais nada.

Regras obrigatórias:
1. Não invente fato, documento, prazo, decisão, valor, data, nome ou andamento.
2. Não revele nota interna, resumo do caso, estratégia, providência em aberto nem o funcionamento da plataforma.
${apresentacao}
4. Escreva em português natural, na primeira pessoa do plural, como a equipe do escritório escreveria.
5. Curto e claro, próprio do WhatsApp: no máximo 6 linhas, sem lista longa e sem jargão.
6. Não dê parecer nem opinião jurídica, não diga se o cliente tem razão, não prometa resultado, valor ou indenização.
7. Nunca fale de prazo, data-limite, contagem de dias, audiência ou urgência processual: quem conta prazo é o advogado.
8. Não assuma compromisso de protocolo, pagamento, audiência ou envio de documento sem registro no contexto. Pode dizer que vai verificar e retornar.
9. Não cite lei, artigo, súmula ou jurisprudência.
10. Dê continuidade à conversa: leia o histórico inteiro, mantenha o fio e não recomece do zero.
11. Nunca repita uma informação que a equipe já deu nesta conversa.
12. Replique o estilo do escritório nas mensagens anteriores da equipe (tom, saudação, emojis).
13. Não responda apenas agradecimento, confirmação simples ("ok", "certo") ou despedida: nesses casos marque "enviar": false.
14. Se a mensagem exigir análise jurídica, valor sensível, confissão, acordo, prazo fatal ou providência processual sem certeza, marque "enviar": false e explique no motivoDeSilencio.
15. Mensagem curta do cliente (menos de 15 palavras) merece resposta de uma ou duas frases.
16. Se faltar informação para responder bem, escolha: pedir o documento ou o dado que falta, uma coisa de cada vez, ou marcar "enviar": false.
${config.instrucao ? `\nInstrução do escritório para este atendimento: ${config.instrucao}\n` : ""}
Responda SOMENTE com JSON válido, sem texto antes ou depois:
{ "mensagem": string, "enviar": boolean, "confianca": number, "intencao": string, "faltando": string[], "fontes": string[], "motivoDeSilencio": string }`;
}

export async function decidirResposta(pedido: PedidoDoEstagiario): Promise<DecisaoDoEstagiario> {
  const conversa = pedido.mensagens.filter((mensagem) => !mensagem.doEstagiario || !mensagem.deMim);
  const { dados } = await perguntarJson({
    schema: DecisaoDoEstagiarioSchema,
    maxTokens: 4000,
    system: montarSistema(pedido.config),
    usuario: `Advogado responsável: ${pedido.advogado.nome}
Contato do cliente: ${pedido.nomeContato ?? pedido.contato}

Contexto interno do caso:
"""
${formatarCaso(pedido.advogado.id, pedido.caso)}
"""

Conversa do WhatsApp (mais antiga primeiro):
"""
${formatarConversa(conversa, (mensagem) => Boolean(mensagem.doEstagiario))}
"""

Escreva a próxima mensagem da equipe para o cliente, ou decida não responder.`,
  });
  return dados;
}

// ── O atendimento ───────────────────────────────────────────────────────────

export type ResultadoDoEstagiario =
  | { acao: "desligado" }
  | { acao: "sem_mensagem_do_cliente" }
  | { acao: "enviada"; mensagem: string; confianca: number; motivo: string }
  | { acao: "sugerida"; sugestao: SugestaoDoEstagiario; confianca: number; motivo: string }
  | { acao: "calado"; motivo: string; confianca: number }
  | { acao: "erro"; erro: string };

// Responde o cliente em nome do escritório, com as travas do robô da Mila.
// Nada sai sem passar por: ativo, enviar, confiança mínima e envio automático.
export async function atenderComoEstagiario(
  advogado: { id: string; usuario: string; nome: string },
  contato: string,
  opcoes: { simular?: boolean } = {},
): Promise<ResultadoDoEstagiario> {
  const digitos = contato.replace(/\D/g, "");
  const guardada = configDaConversa(advogado.id, digitos);
  // Na simulação o advogado vê o que o estagiário faria: não precisa estar
  // ligado e nada é enviado, só se prepara a resposta.
  const config = opcoes.simular ? { ...guardada, ativo: true, autoEnviar: false } : guardada;
  const avisoDeSimulacao = opcoes.simular ? "Simulação (nada foi enviado): " : "";
  if (!config.ativo) return { acao: "desligado" };

  const conversa = mensagensDo(advogado.id, { contato: digitos });
  const ultimaDoCliente = [...conversa].reverse().find((mensagem) => !mensagem.deMim);
  if (!ultimaDoCliente) return { acao: "sem_mensagem_do_cliente" };

  const casoId = [...conversa].reverse().find((mensagem) => mensagem.casoId)?.casoId ?? null;
  const caso = casoId ? casoPorId(advogado.id, casoId) : null;

  let decisao: DecisaoDoEstagiario;
  try {
    decisao = await decidirResposta({
      advogado: { id: advogado.id, nome: advogado.nome, usuario: advogado.usuario },
      contato: digitos,
      nomeContato: ultimaDoCliente.nomeContato,
      mensagens: conversa,
      caso,
      config,
    });
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    if (casoId) await registrar(advogado.id, casoId, "assistente", `O estagiário virtual não conseguiu responder agora: ${erro.slice(0, 200)}`);
    return { acao: "erro", erro };
  }

  const texto = decisao.mensagem.trim();
  const confianca = decisao.confianca;
  const podeEnviar = decisao.enviar && Boolean(texto) && confianca >= config.confiancaMinima;

  if (!podeEnviar) {
    const motivo = !decisao.enviar
      ? (decisao.motivoDeSilencio.trim() || "O estagiário preferiu não responder.")
      : confianca < config.confiancaMinima
        ? `Confiança ${confianca.toFixed(2)} abaixo do mínimo ${config.confiancaMinima.toFixed(2)}: melhor o advogado olhar.`
        : "O estagiário não produziu texto para enviar.";
    // Se ele escreveu algo, guarda como sugestão para o advogado mandar com um
    // clique. Se decidiu ficar quieto sem texto, só registra o motivo no caso.
    if (texto) {
      const sugestao = await guardarSugestao({ advogadoId: advogado.id, contato: digitos, casoId, texto, motivo: avisoDeSimulacao + motivo });
      if (casoId) await registrar(advogado.id, casoId, "assistente", `O estagiário virtual preparou uma resposta e não enviou. Motivo: ${motivo}`);
      return { acao: "sugerida", sugestao, confianca, motivo };
    }
    if (casoId) await registrar(advogado.id, casoId, "assistente", `O estagiário virtual preferiu não responder. Motivo: ${motivo}`);
    return { acao: "calado", motivo, confianca };
  }

  if (!config.autoEnviar) {
    const sugestao = await guardarSugestao({
      advogadoId: advogado.id,
      contato: digitos,
      casoId,
      texto,
      motivo: avisoDeSimulacao + "Envio automático desligado nesta conversa: revise e envie você.",
    });
    if (casoId) await registrar(advogado.id, casoId, "assistente", "O estagiário virtual preparou a resposta e aguarda o envio do advogado.");
    return { acao: "sugerida", sugestao, confianca, motivo: sugestao.motivo };
  }

  // Envio automático ligado: manda pelo WhatsApp do advogado, como o robô da
  // Mila. Sem conexão, o texto não se perde: vira sugestão com o erro no motivo.
  try {
    await enviarTexto(advogado.usuario, digitos, texto);
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e);
    const sugestao = await guardarSugestao({
      advogadoId: advogado.id,
      contato: digitos,
      casoId,
      texto,
      motivo: `Não deu para enviar sozinho: ${erro.slice(0, 160)}`,
    });
    if (casoId) await registrar(advogado.id, casoId, "assistente", `O estagiário virtual não conseguiu enviar: ${erro.slice(0, 200)}`);
    return { acao: "sugerida", sugestao, confianca, motivo: sugestao.motivo };
  }

  await guardarMensagem({
    advogadoId: advogado.id,
    instancia: `ponto-dativo-${advogado.usuario.replace(/\./g, "-")}`,
    contato: digitos,
    nomeContato: ultimaDoCliente.nomeContato,
    texto,
    deMim: true,
    quando: agora(),
    casoId,
    lida: true,
    idExterno: null,
    doEstagiario: true,
  });
  if (casoId) await registrar(advogado.id, casoId, "assistente", `O estagiário virtual respondeu ao cliente (${decisao.intencao || "atendimento"}). ${decisao.mensagem}`);
  return { acao: "enviada", mensagem: texto, confianca, motivo: decisao.intencao || "resposta enviada" };
}

// Estado da conexão, para a tela avisar se o envio automático vai mesmo sair.
export async function podeEnviarSozinho(usuario: string): Promise<boolean> {
  try {
    const estado = await estadoDaConexao(usuario);
    return estado.estado === "open";
  } catch {
    return false;
  }
}
