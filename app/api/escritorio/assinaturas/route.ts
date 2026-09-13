import { assinaturasDo, registrarAssinatura } from "@/lib/escritorio";
import { exigirAdvogado } from "@/lib/sessao";
import { lerCorpo, responderErro } from "../comum";

export const dynamic = "force-dynamic";

type CorpoDaAssinatura = {
  casoId: string | null;
  documento: string;
  conteudo: string;
  hash: string;
  assinatura: string;
  certificado: string;
  origem: "a3" | "demonstracao";
};

// GET /api/escritorio/assinaturas → o que este advogado já assinou.
export async function GET() {
  try {
    const advogado = await exigirAdvogado();
    return Response.json(assinaturasDo(advogado.id));
  } catch (e) {
    return responderErro(e, "listar assinaturas");
  }
}

// POST /api/escritorio/assinaturas → guarda uma assinatura feita no computador
// do advogado. O servidor nunca vê a chave nem o PIN: recebe o texto, o hash e
// a assinatura, confere que o hash é mesmo o do texto e guarda.
export async function POST(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const corpo = await lerCorpo<CorpoDaAssinatura>(request);
    const assinatura = await registrarAssinatura(advogado.id, {
      casoId: corpo.casoId ?? null,
      documento: String(corpo.documento ?? ""),
      conteudo: String(corpo.conteudo ?? ""),
      hash: String(corpo.hash ?? ""),
      assinatura: String(corpo.assinatura ?? ""),
      certificado: String(corpo.certificado ?? ""),
      origem: corpo.origem === "a3" ? "a3" : "demonstracao",
    });
    return Response.json(assinatura, { status: 201 });
  } catch (e) {
    return responderErro(e, "registrar assinatura");
  }
}
