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

// O que a etapa gastou. Cada chamada devolve o seu; lib/custo.ts soma e põe
// preço. É o que permite dizer ao advogado quanto custou aquela triagem.
export type Uso = {
  modelo: string;
  entrada: number;
  saida: number;
  cache_leitura: number;
};

// A foto só acompanha a chamada atual. Não é gravada nem entra nas métricas.
export type ImagemDocumento = {
  mime: "image/jpeg" | "image/png" | "image/webp";
  dadosBase64: string;
};

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
  imagem?: ImagemDocumento;
}): Promise<{ dados: T; uso: Uso }> {
  const conteudo = opts.imagem
    ? [
        { type: "image" as const, source: { type: "base64" as const, media_type: opts.imagem.mime, data: opts.imagem.dadosBase64 } },
        { type: "text" as const, text: opts.usuario },
      ]
    : opts.usuario;
  const resposta = await client.messages
    .stream({
      model: MODEL,
      // O limite inclui o pensamento; por isso é folgado.
      max_tokens: opts.maxTokens ?? 16000,
      ...(RACIOCINIO_OFF ? { thinking: { type: "disabled" as const } } : {}),
      system: opts.system,
      messages: [{ role: "user", content: conteudo }],
    })
    .finalMessage();

  const texto = resposta.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const uso: Uso = {
    modelo: resposta.model,
    entrada: resposta.usage.input_tokens,
    saida: resposta.usage.output_tokens,
    cache_leitura: resposta.usage.cache_read_input_tokens ?? 0,
  };

  try {
    return { dados: opts.schema.parse(JSON.parse(extrairJson(texto))), uso };
  } catch (e) {
    // Diagnóstico útil: truncou (max_tokens), veio vazio, ou veio fora do formato.
    const tipos = resposta.content.map((b) => b.type).join(",");
    throw new Error(
      `resposta fora do formato (stop=${resposta.stop_reason}, blocos=${tipos}, ${texto.length} chars): ` +
        `${texto.slice(0, 300)} … ${String(e).slice(0, 200)}`,
    );
  }
}
