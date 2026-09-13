import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { advogadoAtual } from "@/lib/sessao";

// O mesmo arquivo que a equipe mantém no repositório é entregue como anexo.
// Assim o advogado baixa a versão certa sem depender de Git, e não existe uma
// cópia paralela do conector para manter atualizada.
export async function GET() {
  const advogado = await advogadoAtual();
  if (!advogado) return Response.json({ erro: "Entre no escritório para baixar o conector." }, { status: 401 });

  try {
    const arquivo = await readFile(join(process.cwd(), "conector", "conector.mjs"));
    return new Response(arquivo, {
      headers: {
        "content-type": "text/javascript; charset=utf-8",
        "content-disposition": "attachment; filename=conector-escritorio-dativo.mjs",
        "cache-control": "no-store",
      },
    });
  } catch {
    return Response.json({ erro: "O arquivo do conector não está disponível neste servidor." }, { status: 503 });
  }
}
