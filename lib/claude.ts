import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";

// Um único cliente para o app inteiro. Lê ANTHROPIC_API_KEY do .env.local.
// ANTHROPIC_BASE_URL também é lido automaticamente, se existir.
const client = new Anthropic();

// Modelo configurável por .env.local; padrão é o Opus 5.
export const MODEL = process.env.MODEL ?? "claude-opus-5";
// RACIOCINIO=off desliga o pensamento estendido (mais rápido; útil no plano B
// com DeepSeek, que pensa longo por padrão e estoura o max_tokens só pensando).
const RACIOCINIO_OFF = process.env.RACIOCINIO === "off";

// Tira cercas de código caso o modelo embrulhe o JSON em ```json ... ```.
function extrairJson(texto: string): string {
  const m = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (m ? m[1] : texto).trim();
}

// Toda etapa do sistema é uma pergunta com resposta em JSON validado por
// schema. Se o modelo devolver algo fora do formato, o erro sobe: melhor
// falhar do que mostrar uma análise inventada.
export async function perguntarJson<T>(opts: {
  system: string;
  usuario: string;
  schema: ZodType<T>;
  maxTokens?: number;
}): Promise<T> {
  const resposta = await client.messages
    .stream({
      model: MODEL,
      // O limite inclui o pensamento; por isso é folgado.
      max_tokens: opts.maxTokens ?? 16000,
      ...(RACIOCINIO_OFF ? { thinking: { type: "disabled" as const } } : {}),
      system: opts.system,
      messages: [{ role: "user", content: opts.usuario }],
    })
    .finalMessage();

  const texto = resposta.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  try {
    return opts.schema.parse(JSON.parse(extrairJson(texto)));
  } catch (e) {
    // Diagnóstico útil: truncou (max_tokens), veio vazio, ou veio fora do formato.
    const tipos = resposta.content.map((b) => b.type).join(",");
    throw new Error(
      `resposta fora do formato (stop=${resposta.stop_reason}, blocos=${tipos}, ${texto.length} chars): ` +
        `${texto.slice(0, 300)} … ${String(e).slice(0, 200)}`,
    );
  }
}
