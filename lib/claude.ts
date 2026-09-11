import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Um único cliente para o app inteiro. Lê ANTHROPIC_API_KEY do .env.local.
// ANTHROPIC_BASE_URL também é lido automaticamente, se existir.
const client = new Anthropic();

// Modelo configurável por .env.local; padrão é o Opus 5.
export const MODEL = process.env.MODEL ?? "claude-opus-5";

// O que o sistema devolve depois de ouvir o relato da pessoa.
export const AnaliseSchema = z.object({
  resumo: z.string().describe("O caso em duas ou três frases, em linguagem simples"),
  area: z.enum([
    "consumidor",
    "contrato",
    "vizinhanca",
    "familia",
    "trabalho",
    "transito",
    "outro",
  ]),
  cabe_juizado_especial: z.boolean(),
  motivo_juizado: z.string().describe("Por que cabe ou não no JEC, em uma frase"),
  caminhos_extrajudiciais: z
    .array(z.string())
    .describe("Alternativas antes de processar: Procon, consumidor.gov.br, mediação, etc."),
  documentos_necessarios: z.array(z.string()),
  perguntas_pendentes: z
    .array(z.string())
    .describe("O que ainda falta saber para montar o pedido"),
  orientacao: z.string().describe("Próximo passo concreto para a pessoa, em linguagem simples"),
});
export type Analise = z.infer<typeof AnaliseSchema>;

const SYSTEM = `Você é a atendente virtual de um Juizado Especial Cível no Paraná.
Sua função é ouvir o relato de uma pessoa leiga, muitas vezes de baixa renda, e:
1. entender o que aconteceu;
2. dizer se o caso cabe no Juizado Especial (causas até 40 salários mínimos, sem advogado até 20);
3. apontar caminhos que resolvem sem processo, quando existirem;
4. listar os documentos que ela precisa juntar;
5. perguntar o que ainda falta para montar o pedido.

Fale em português simples, sem juridiquês. Nunca invente fatos que a pessoa não contou.
Você não substitui advogado: oriente, não dê parecer definitivo.

Responda SOMENTE com um JSON válido, sem texto antes ou depois, neste formato:
{
  "resumo": string,
  "area": "consumidor" | "contrato" | "vizinhanca" | "familia" | "trabalho" | "transito" | "outro",
  "cabe_juizado_especial": boolean,
  "motivo_juizado": string,
  "caminhos_extrajudiciais": string[],
  "documentos_necessarios": string[],
  "perguntas_pendentes": string[],
  "orientacao": string
}`;

// Tira cercas de código caso o modelo embrulhe o JSON em ```json ... ```.
function extrairJson(texto: string): string {
  const m = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (m ? m[1] : texto).trim();
}

export async function analisarRelato(relato: string): Promise<Analise> {
  const resposta = await client.messages
    .stream({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM,
      messages: [{ role: "user", content: relato }],
    })
    .finalMessage();

  const texto = resposta.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  return AnaliseSchema.parse(JSON.parse(extrairJson(texto)));
}
