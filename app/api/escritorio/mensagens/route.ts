import { ErroEscritorio, clientePorTelefone, marcarLidas, mensagensDo, type Mensagem } from "@/lib/escritorio";
import { ErroSessao, exigirAdvogado } from "@/lib/sessao";

export const dynamic = "force-dynamic";

// Caixa de mensagens do advogado logado. Sem `?contato=`, devolve as
// conversas (uma linha por telefone); com `?contato=`, as mensagens daquele
// telefone, já marcadas como lidas. Tudo filtrado pelo advogado da sessão e
// só de assistido cadastrado: contato pessoal não aparece no atendimento.

type Conversa = {
  contato: string;
  nome: string | null;
  ultimaMensagem: string;
  quando: string;
  naoLidas: number;
  casoId: string | null;
  clienteNome: string | null;
};

function erro(e: unknown) {
  if (e instanceof ErroSessao || e instanceof ErroEscritorio) return Response.json({ erro: e.message }, { status: e.status });
  console.error("mensagens:", e);
  return Response.json({ erro: "Não foi possível carregar as mensagens agora." }, { status: 500 });
}

// Agrupa as mensagens por contato. O nome é o último `pushName` que chegou;
// o caso é o da mensagem mais recente que tem um.
function conversasDe(advogadoId: string, mensagens: Mensagem[]): Conversa[] {
  const porContato = new Map<string, Conversa>();
  for (const mensagem of mensagens) {
    const atual = porContato.get(mensagem.contato);
    const conversa: Conversa = atual ?? {
      contato: mensagem.contato,
      nome: null,
      ultimaMensagem: "",
      quando: "",
      naoLidas: 0,
      casoId: null,
      clienteNome: null,
    };
    conversa.ultimaMensagem = mensagem.deMim ? `Você: ${mensagem.texto}` : mensagem.texto;
    conversa.quando = mensagem.quando;
    if (mensagem.nomeContato) conversa.nome = mensagem.nomeContato;
    if (mensagem.casoId) conversa.casoId = mensagem.casoId;
    if (!mensagem.lida && !mensagem.deMim) conversa.naoLidas += 1;
    porContato.set(mensagem.contato, conversa);
  }
  for (const conversa of porContato.values()) {
    conversa.clienteNome = clientePorTelefone(advogadoId, conversa.contato)?.nome ?? null;
  }
  return [...porContato.values()].sort((a, b) => b.quando.localeCompare(a.quando));
}

export async function GET(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const contato = new URL(request.url).searchParams.get("contato")?.replace(/\D/g, "") ?? "";
    if (contato) {
      const mensagens = mensagensDo(advogado.id, { contato, somenteAssistidos: true });
      await marcarLidas(advogado.id, contato);
      return Response.json(mensagens.map((mensagem) => ({ ...mensagem, lida: true })));
    }
    return Response.json(conversasDe(advogado.id, mensagensDo(advogado.id, { somenteAssistidos: true })));
  } catch (e) { return erro(e); }
}
