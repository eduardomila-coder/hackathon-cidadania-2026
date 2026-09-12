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
