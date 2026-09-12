import { z } from "zod";
import { perguntarJson, type ImagemDocumento } from "./claude";
import { formatarContexto, type Trecho } from "./juridico/corpus";

// As três etapas da análise. Cada uma tem um prompt curto, um contexto
// delimitado e um formato de saída validado. O encadeamento é:
//   relato → extrair fatos → buscar a lei → analisar com a lei → verificar.

const REGRAS_COMUNS = `Você é o assistente de triagem de um advogado ou advogada que atende causas de pequeno valor, sobretudo no Juizado Especial Cível do Paraná.
Quem lê a sua saída é o advogado, não o cliente: seja direto, sem juridiquês decorativo e sem repetir o óbvio para quem é da área.
Nunca invente fato que o cliente não contou. Você não decide se o caso deve ser aceito e não dá parecer: quem analisa e assina é o advogado.
Responda SOMENTE com um JSON válido, sem texto antes ou depois.`;

// ── Etapa 1: extrair ────────────────────────────────────────────────────────
export const ExtracaoSchema = z.object({
  fatos: z.array(z.string()).describe("O que aconteceu, um fato por item, na ordem"),
  quem_reclama: z.string(),
  contra_quem: z.string(),
  valor_estimado_reais: z.number().nullable().describe("Valor em jogo, se o cliente disse; senão null"),
  o_que_quer: z.array(z.string()),
  provas_que_tem: z.array(z.string()),
  temas: z.array(z.string()).describe("Termos jurídicos para buscar na lei: ex. vício do produto, responsabilidade solidária, competência, valor da causa"),
  perguntas_pendentes: z.array(z.string()).describe("O que o advogado ainda precisa perguntar ao cliente, em pergunta direta"),
  tipo_caso: z.enum(["novo", "em_andamento", "indefinido"]).describe("\"em_andamento\" se o relato indica processo já protocolado (número, audiência marcada, decisão); \"novo\" se ainda não há processo; \"indefinido\" se não dá para saber"),
});
export type Extracao = z.infer<typeof ExtracaoSchema>;

export function extrair(relato: string, imagem?: ImagemDocumento) {
  return perguntarJson({
    schema: ExtracaoSchema,
    maxTokens: 12000,
    system: `${REGRAS_COMUNS}

Sua tarefa nesta etapa é só ORGANIZAR o que o cliente contou. Não julgue, não oriente, não cite lei.
Formato:
{
  "fatos": string[],
  "quem_reclama": string,
  "contra_quem": string,
  "valor_estimado_reais": number | null,
  "o_que_quer": string[],
  "provas_que_tem": string[],
  "temas": string[],
  "perguntas_pendentes": string[],
  "tipo_caso": "novo" | "em_andamento" | "indefinido"
}`,
    usuario: `Relato do cliente:\n"""\n${relato}\n"""\n\n${imagem ? "A imagem anexada é um documento deste caso. Inclua apenas fatos e provas que estejam visíveis nela." : ""}`,
    imagem,
  });
}

// ── Etapa 2: analisar com a lei ─────────────────────────────────────────────
export const FundamentoSchema = z.object({
  afirmacao: z.string().describe("A afirmação jurídica, em linguagem simples"),
  fonte: z.string().describe("O id do trecho que sustenta, ex. L9099-3"),
});

// Cada requisito que a lei exige para o pedido, com o documento que o
// comprova. É daqui que sai a força do caso: requisitos comprovados sobre o
// total que se aplica. Não é previsão de resultado, é contagem do que já está
// provado — por isso cada item carrega a fonte e pode ser conferido.
export const RequisitoSchema = z.object({
  requisito: z.string().describe("O que a lei exige, em uma frase"),
  fonte: z.string().describe("O id do trecho que exige isso, ex. L8078-18"),
  situacao: z.enum(["comprovado", "falta_documento", "nao_se_aplica"]),
  o_que_comprova: z.string().describe("Se comprovado, qual fato ou documento do relato comprova; se falta, qual documento resolveria"),
});

export const AnaliseSchema = z.object({
  resumo: z.string().describe("O caso em duas ou três frases, para o advogado decidir se segue lendo"),
  area: z.enum(["consumidor", "contrato", "vizinhanca", "familia", "trabalho", "transito", "outro"]),
  cabe_juizado_especial: z.boolean(),
  motivo_juizado: z.string().describe("Por que cabe ou não no JEC, em uma frase, citando a fonte pelo id entre colchetes"),
  encaminhamento: z.string().nullable().describe("Se não cabe no JEC, qual é o foro ou a via adequada; senão null"),
  caminhos_extrajudiciais: z.array(z.string()),
  requisitos: z.array(RequisitoSchema).describe("Os requisitos legais do pedido, um por item, cada um com a fonte e a situação da prova"),
  documentos_necessarios: z.array(z.string()).describe("O que o advogado precisa pedir ao cliente"),
  custos_do_processo: z.array(z.string()).describe("O que os trechos dizem sobre custas, despesas e gratuidade nesta via; cada item cita a fonte pelo id entre colchetes. Não estime valor em reais que não esteja nos trechos"),
  perguntas_pendentes: z.array(z.string()),
  orientacao: z.string().describe("Próximo passo concreto para o advogado"),
  fundamentos: z.array(FundamentoSchema).describe("Cada afirmação jurídica feita acima, com o id do trecho que a sustenta"),
  sem_base: z.array(z.string()).describe("Pontos que o advogado precisaria checar mas que os trechos fornecidos não cobrem"),
});
export type Analise = z.infer<typeof AnaliseSchema>;

export function analisar(relato: string, extracao: Extracao, trechos: Trecho[]) {
  return perguntarJson({
    schema: AnaliseSchema,
    maxTokens: 16000,
    system: `${REGRAS_COMUNS}

REGRA CENTRAL: você só pode afirmar sobre a lei o que está nos TRECHOS fornecidos abaixo. Cada afirmação jurídica vai em "fundamentos" com o id do trecho (ex. "L9099-3"). Se algo importante não está nos trechos, coloque em "sem_base" e NÃO afirme. Não cite artigo, lei ou prazo que não esteja nos trechos.

Limites do Juizado Especial Cível e valor em reais: os trechos falam em salários mínimos; não converta para reais.

"requisitos": liste o que a lei exige para este pedido, um item por requisito, cada um com o id do trecho que o exige. "comprovado" só quando um fato ou documento que o cliente JÁ TEM comprova o requisito; "falta_documento" quando o requisito se aplica e a prova não veio; "nao_se_aplica" quando aquele requisito não é exigido neste caso. Não invente requisito que os trechos não exijam.

"custos_do_processo": só o que os trechos dizem sobre custas, despesas e gratuidade. Se os trechos não tratarem de custo, devolva lista vazia e registre isso em "sem_base". Nunca estime honorário ou valor em reais.

Você não diz se o caso será ganho e não estima probabilidade de êxito. Quem decide é o advogado.

Formato:
{
  "resumo": string,
  "area": "consumidor" | "contrato" | "vizinhanca" | "familia" | "trabalho" | "transito" | "outro",
  "cabe_juizado_especial": boolean,
  "motivo_juizado": string,
  "encaminhamento": string | null,
  "caminhos_extrajudiciais": string[],
  "requisitos": [{"requisito": string, "fonte": string, "situacao": "comprovado" | "falta_documento" | "nao_se_aplica", "o_que_comprova": string}],
  "documentos_necessarios": string[],
  "custos_do_processo": string[],
  "perguntas_pendentes": string[],
  "orientacao": string,
  "fundamentos": [{"afirmacao": string, "fonte": string}],
  "sem_base": string[]
}

TRECHOS (única fonte permitida):

${formatarContexto(trechos)}`,
    usuario: `Relato original:\n"""\n${relato}\n"""\n\nRelato organizado:\n${JSON.stringify(extracao, null, 2)}`,
  });
}

// ── Etapa 3: verificar ──────────────────────────────────────────────────────
export const VerificacaoSchema = z.object({
  itens: z.array(
    z.object({
      afirmacao: z.string(),
      fonte: z.string(),
      situacao: z.enum(["confirmada", "sem_base", "contradiz"]),
      observacao: z.string().describe("Uma frase: por que confirma, ou o que o trecho realmente diz"),
    }),
  ),
  alertas: z.array(z.string()).describe("O que o advogado precisa checar antes de confiar nesta triagem"),
  confiavel: z.boolean().describe("true só se nenhuma afirmação central foi marcada sem_base ou contradiz"),
});
export type Verificacao = z.infer<typeof VerificacaoSchema>;

export function verificar(analise: Analise, trechos: Trecho[]) {
  return perguntarJson({
    schema: VerificacaoSchema,
    maxTokens: 12000,
    system: `Você é o revisor de uma análise feita por outro assistente. Sua única tarefa é conferir, uma a uma, as afirmações jurídicas contra os TRECHOS da lei fornecidos.

Para cada fundamento:
- "confirmada": o trecho citado diz exatamente aquilo;
- "sem_base": o trecho citado não trata disso, ou o id não existe nos trechos;
- "contradiz": o trecho diz o contrário.
Confira do mesmo modo, um por um, os itens de "requisitos" (o trecho citado exige mesmo aquele requisito?) e de "custos_do_processo" (o trecho citado diz aquilo sobre custas?). Um requisito marcado "comprovado" sem fato ou documento que o comprove no relato é "sem_base".
Também confira "motivo_juizado" e "orientacao": se afirmam algo jurídico sem fundamento listado, inclua como item "sem_base".
Seja rigoroso: na dúvida, "sem_base".
"alertas" é o que o ADVOGADO precisa checar neste caso (prazo que pode ter passado, condição não verificada, ponto que depende de prova, requisito sem documento). Nunca comente o formato da análise nem dê recado para o outro assistente.
Responda SOMENTE com JSON:
{
  "itens": [{"afirmacao": string, "fonte": string, "situacao": "confirmada" | "sem_base" | "contradiz", "observacao": string}],
  "alertas": string[],
  "confiavel": boolean
}

TRECHOS:

${formatarContexto(trechos)}`,
    usuario: `Análise a conferir:\n${JSON.stringify(analise, null, 2)}`,
  });
}
