import { advogadoPorUsuario } from "@/lib/contas";
import { clientePorTelefone, guardarMensagem, listarCasos } from "@/lib/escritorio";
import { mensagensDoEvento, resumoDoEvento, usuarioDaInstancia, webhookAutorizado } from "@/lib/evolution";

export const dynamic = "force-dynamic";

// Esta rota é pública para a Evolution, mas só aceita o segredo configurado no
// servidor. Ela guarda a mensagem na caixa do advogado dono da instância e
// nada mais: não responde, não baixa mídia e não dispara triagem. Quem lê e
// decide o que enviar é o advogado, na tela de Mensagens.
//
// A resposta é sempre 202 para evento válido, mesmo quando se ignora: a
// Evolution reenvia o que não for aceito, e não há o que reenviar aqui.

// O caso mais recente do advogado cujo cliente tem esse telefone, para a
// mensagem já chegar ligada ao caso certo.
function casoDoContato(advogadoId: string, contato: string): string | null {
  const cliente = clientePorTelefone(advogadoId, contato);
  if (!cliente) return null;
  return listarCasos(advogadoId).find((caso) => caso.clienteId === cliente.id)?.id ?? null;
}

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!webhookAutorizado(token)) return Response.json({ erro: "Webhook não autorizado." }, { status: 401 });

  const payload = await request.json().catch(() => null);
  if (!payload) return Response.json({ erro: "Evento inválido." }, { status: 400 });

  const resumo = resumoDoEvento(payload);
  const mensagens = mensagensDoEvento(payload);
  if (mensagens.length === 0) {
    return Response.json({ recebido: true, acao: "ignorado", evento: resumo.evento, instancia: resumo.instancia }, { status: 202 });
  }

  const usuario = resumo.instancia ? usuarioDaInstancia(resumo.instancia) : null;
  const advogado = usuario ? advogadoPorUsuario(usuario) : null;
  if (!advogado || !advogado.ativo) {
    return Response.json({ recebido: true, acao: "ignorado", motivo: "instância sem advogado", evento: resumo.evento, instancia: resumo.instancia }, { status: 202 });
  }

  let guardadas = 0;
  for (const mensagem of mensagens) {
    try {
      await guardarMensagem({
        advogadoId: advogado.id,
        instancia: resumo.instancia ?? "",
        contato: mensagem.contato,
        nomeContato: mensagem.nomeContato,
        texto: mensagem.texto,
        deMim: mensagem.deMim,
        quando: mensagem.quando,
        casoId: casoDoContato(advogado.id, mensagem.contato),
        lida: mensagem.deMim,
        idExterno: mensagem.idExterno,
      });
      guardadas += 1;
    } catch (e) {
      console.error("webhook whatsapp: mensagem não guardada:", e);
    }
  }

  return Response.json({ recebido: true, acao: "guardada", guardadas, evento: resumo.evento, instancia: resumo.instancia }, { status: 202 });
}
