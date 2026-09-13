import { after } from "next/server";
import { advogadoPorUsuario } from "@/lib/contas";
import { clientePorTelefone, guardarMensagem, listarCasos } from "@/lib/escritorio";
import { mensagensDoEvento, resumoDoEvento, usuarioDaInstancia, webhookAutorizado } from "@/lib/evolution";
import { atenderComoEstagiario, configDaConversa } from "@/lib/estagiario";

export const dynamic = "force-dynamic";

// Esta rota é pública para a Evolution, mas só aceita o segredo configurado no
// servidor. Ela guarda a mensagem na caixa do advogado dono da instância e,
// quando o advogado ligou o estagiário virtual naquela conversa, deixa ele
// atender. Não baixa mídia e não dispara triagem.
//
// A resposta é sempre 202 para evento válido, mesmo quando se ignora: a
// Evolution reenvia o que não for aceito, e não há o que reenviar aqui. O
// atendimento do estagiário roda depois da resposta (`after`), para o webhook
// não ficar preso esperando o modelo.

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
  const deClientes = new Set<string>();
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
      // Mensagens seguidas do mesmo cliente viram um atendimento só, como o
      // agrupamento do robô da Mila: o estagiário responde a última.
      if (!mensagem.deMim) deClientes.add(mensagem.contato);
    } catch (e) {
      console.error("webhook whatsapp: mensagem não guardada:", e);
    }
  }

  // Só atende a conversa em que o estagiário virtual está ligado. Se estiver
  // desligado, o webhook continua sendo só um cofre de mensagens.
  const comEstagiario = [...deClientes].filter((contato) => configDaConversa(advogado.id, contato).ativo);
  for (const contato of comEstagiario) {
    after(async () => {
      try {
        const resultado = await atenderComoEstagiario(advogado, contato);
        console.log(`estagiario virtual: ${contato} -> ${resultado.acao}`);
      } catch (e) {
        console.error("estagiario virtual: falhou ao atender", contato, e);
      }
    });
  }

  return Response.json({
    recebido: true,
    acao: "guardada",
    guardadas,
    estagiario: comEstagiario.length ? "acionado" : "desligado",
    evento: resumo.evento,
    instancia: resumo.instancia,
  }, { status: 202 });
}
