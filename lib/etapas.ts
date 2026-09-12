import { z } from "zod";
import { perguntarJson } from "./claude";
import { formatarContexto, type Trecho } from "./juridico/corpus";

// As três etapas da análise. Cada uma tem um prompt curto, um contexto
// delimitado e um formato de saída validado. O encadeamento é:
//   relato → extrair fatos → buscar a lei → analisar com a lei → verificar.

const REGRAS_COMUNS = `Você trabalha na secretaria virtual de um Juizado Especial Cível no Paraná, atendendo pessoas leigas, muitas de baixa renda.
Fale em português simples, sem juridiquês. Nunca invente fatos que a pessoa não contou.
Você não é advogado: organiza e orienta, não dá parecer.
Responda SOMENTE com um JSON válido, sem texto antes ou depois.`;

// ── Etapa 1: extrair ────────────────────────────────────────────────────────
export const ExtracaoSchema = z.object({
  fatos: z.array(z.string()).describe("O que aconteceu, um fato por item, na ordem"),
  quem_reclama: z.string(),
  contra_quem: z.string(),
  valor_estimado_reais: z.number().nullable().describe("Valor em jogo, se a pessoa disse; senão null"),
  o_que_quer: z.array(z.string()),
  provas_que_tem: z.array(z.string()),
  temas: z.array(z.string()).describe("Termos jurídicos para buscar na lei: ex. vício do produto, responsabilidade solidária, competência, valor da causa"),
  perguntas_pendentes: z.array(z.string()).describe("O que falta saber, em pergunta direta para a pessoa"),
});
export type Extracao = z.infer<typeof ExtracaoSchema>;

export function extrair(relato: string) {
  return perguntarJson({
    schema: ExtracaoSchema,
    maxTokens: 12000,
    system: `${REGRAS_COMUNS}

Sua tarefa nesta etapa é só ORGANIZAR o relato. Não julgue, não oriente, não cite lei.
Formato:
{
  "fatos": string[],
  "quem_reclama": string,
  "contra_quem": string,
  "valor_estimado_reais": number | null,
  "o_que_quer": string[],
  "provas_que_tem": string[],
  "temas": string[],
  "perguntas_pendentes": string[]
}`,
    usuario: `Relato da pessoa:\n"""\n${relato}\n"""`,
  });
}

// ── Etapa 2: analisar com a lei ─────────────────────────────────────────────
export const FundamentoSchema = z.object({
  afirmacao: z.string().describe("A afirmação jurídica, em linguagem simples"),
  fonte: z.string().describe("O id do trecho que sustenta, ex. L9099-3"),
});

export const AnaliseSchema = z.object({
  resumo: z.string().describe("O caso em duas ou três frases, em linguagem simples"),
  area: z.enum(["consumidor", "contrato", "vizinhanca", "familia", "trabalho", "transito", "outro"]),
  cabe_juizado_especial: z.boolean(),
  motivo_juizado: z.string().describe("Por que cabe ou não no JEC, em uma frase, citando a fonte pelo id entre colchetes"),
  encaminhamento: z.string().nullable().describe("Se não cabe no JEC, para onde a pessoa deve ir; senão null"),
  caminhos_extrajudiciais: z.array(z.string()),
  documentos_necessarios: z.array(z.string()),
  perguntas_pendentes: z.array(z.string()),
  orientacao: z.string().describe("Próximo passo concreto, em linguagem simples"),
  fundamentos: z.array(FundamentoSchema).describe("Cada afirmação jurídica feita acima, com o id do trecho que a sustenta"),
  sem_base: z.array(z.string()).describe("Pontos que a pessoa precisaria saber mas que os trechos fornecidos não cobrem"),
});
export type Analise = z.infer<typeof AnaliseSchema>;

export function analisar(relato: string, extracao: Extracao, trechos: Trecho[]) {
  return perguntarJson({
    schema: AnaliseSchema,
    maxTokens: 16000,
    system: `${REGRAS_COMUNS}

REGRA CENTRAL: você só pode afirmar sobre a lei o que está nos TRECHOS fornecidos abaixo. Cada afirmação jurídica vai em "fundamentos" com o id do trecho (ex. "L9099-3"). Se algo importante não está nos trechos, coloque em "sem_base" e NÃO afirme. Não cite artigo, lei ou prazo que não esteja nos trechos.

Limites do Juizado Especial Cível e valor em reais: os trechos falam em salários mínimos; não converta para reais.

Formato:
{
  "resumo": string,
  "area": "consumidor" | "contrato" | "vizinhanca" | "familia" | "trabalho" | "transito" | "outro",
  "cabe_juizado_especial": boolean,
  "motivo_juizado": string,
  "encaminhamento": string | null,
  "caminhos_extrajudiciais": string[],
  "documentos_necessarios": string[],
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
  alertas: z.array(z.string()).describe("O que a pessoa deve saber antes de confiar na análise, em linguagem simples"),
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
Também confira "motivo_juizado" e "orientacao": se afirmam algo jurídico sem fundamento listado, inclua como item "sem_base".
Seja rigoroso: na dúvida, "sem_base".
"alertas" é o que a PESSOA precisa saber sobre o caso dela (prazo que pode ter passado, condição que não foi verificada, ponto que depende de prova). Nunca comente o formato da análise nem dê recado para o outro assistente.
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
