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
// schema. O schema não é afrouxado: análise inventada não passa. O que existe
// é uma segunda tentativa, porque o plano B (DeepSeek pelo endpoint compatível)
// às vezes omite uma lista ou manda null onde o contrato pede string, e o
// próprio erro, devolvido ao modelo, conserta a maior parte disso. Se as duas
// tentativas falharem, o erro sobe.
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

  type Mensagens = Parameters<typeof client.messages.stream>[0]["messages"];

  async function chamar(mensagens: Mensagens) {
    const resposta = await client.messages
      .stream({
        model: MODEL,
        // O limite inclui o pensamento; por isso é folgado.
        max_tokens: opts.maxTokens ?? 16000,
        ...(RACIOCINIO_OFF ? { thinking: { type: "disabled" as const } } : {}),
        system: opts.system,
        messages: mensagens,
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
    // Diagnóstico útil: truncou (max_tokens), veio vazio, ou veio fora do formato.
    const tipos = resposta.content.map((b) => b.type).join(",");
    const diagnostico = `stop=${resposta.stop_reason}, blocos=${tipos}, ${texto.length} chars`;

    return { texto, uso, diagnostico };
  }

  // O que a segunda tentativa recebe: o motivo exato da recusa, sem o texto
  // inteiro do modelo (ele já está na conversa).
  function motivo(e: unknown): string {
    if (e && typeof e === "object" && "issues" in e) {
      const issues = (e as { issues: Array<{ path: Array<string | number>; message: string }> }).issues;
      return issues.slice(0, 8).map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`).join("; ");
    }
    return String(e).slice(0, 200);
  }

  let usoDaChamada: Uso | null = null;
  function acumular(uso: Uso) {
    usoDaChamada = usoDaChamada
      ? {
          modelo: uso.modelo,
          entrada: usoDaChamada.entrada + uso.entrada,
          saida: usoDaChamada.saida + uso.saida,
          cache_leitura: usoDaChamada.cache_leitura + uso.cache_leitura,
        }
      : uso;
  }

  const primeira = await chamar([{ role: "user", content: conteudo }]);
  acumular(primeira.uso);
  let motivoDaRecusa = "";
  try {
    return { dados: opts.schema.parse(JSON.parse(extrairJson(primeira.texto))), uso: usoDaChamada! };
  } catch (e) {
    motivoDaRecusa = motivo(e);
    console.warn(`perguntarJson: ${primeira.diagnostico} · ${motivoDaRecusa} · repetindo uma vez`);
  }

  const segunda = await chamar([
    { role: "user", content: conteudo },
    { role: "assistant", content: primeira.texto || "(resposta vazia)" },
    {
      role: "user",
      content:
        "Sua resposta anterior não respeitou o formato exigido. Responda de novo, somente com o JSON, " +
        "sem texto antes ou depois, com todos os campos do formato preenchidos. Se o texto foi cortado, " +
        `seja mais curto, mas complete o JSON. O validador recusou assim: ${motivoDaRecusa}`,
    },
  ]);
  acumular(segunda.uso);
  try {
    return { dados: opts.schema.parse(JSON.parse(extrairJson(segunda.texto))), uso: usoDaChamada! };
  } catch (e) {
    throw new Error(
      `resposta fora do formato depois de duas tentativas (${segunda.diagnostico}): ` +
        `${segunda.texto.slice(0, 300)} … ${motivo(e)}`,
    );
  }
}
