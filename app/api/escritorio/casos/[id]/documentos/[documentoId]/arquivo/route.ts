import { ErroEscritorio, guardarArquivoDoDocumento, lerArquivoDoDocumento } from "@/lib/escritorio";
import { exigirAdvogado } from "@/lib/sessao";
import { responderErro } from "../../../../../comum";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string; documentoId: string }> };

export async function POST(request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id, documentoId } = await params;
    const formulario = await request.formData();
    const arquivo = formulario.get("arquivo");
    if (!(arquivo instanceof File)) throw new ErroEscritorio("Escolha um arquivo para enviar.");
    return Response.json(await guardarArquivoDoDocumento(advogado.id, id, documentoId, { nome: arquivo.name, bytes: new Uint8Array(await arquivo.arrayBuffer()) }));
  } catch (e) {
    return responderErro(e, "enviar arquivo");
  }
}

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const advogado = await exigirAdvogado();
    const { id, documentoId } = await params;
    const { arquivo, bytes } = await lerArquivoDoDocumento(advogado.id, id, documentoId);
    const nome = arquivo.nome.replace(/[\\\r\n"]/g, "_");
    return new Response(new Uint8Array(bytes), { headers: { "content-type": arquivo.mime, "content-length": String(bytes.byteLength), "content-disposition": `attachment; filename="${nome}"` } });
  } catch (e) {
    return responderErro(e, "baixar arquivo");
  }
}
