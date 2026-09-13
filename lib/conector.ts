import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { agora, alterar, listar, novoId } from "./banco";

// Ponte entre o escritório e o computador do advogado.
//
// O navegador não consegue falar direto com o conector quando a página vem do
// endereço público: o Chrome trata `127.0.0.1` como rede privada e barra. Então
// a conversa se inverte, como na Mila: o conector é quem procura o servidor.
//
// O advogado pede um pedido ("assine este hash", "consulte este processo"), que
// fica numa fila da conta dele. O conector, rodando na máquina dele, pergunta de
// tempos em tempos se há algo para fazer, faz e devolve o resultado. Nada do que
// é sigiloso — chave, PIN, senha do tribunal — passa por aqui: só o pedido e a
// resposta.
//
// A chave do conector é mostrada uma vez, na tela, e guardada só como hash: se
// vazar do servidor, não dá para usar. Trocar a chave desliga o conector antigo.

const CONECTORES = "escritorio-conectores";

// Um pedido velho não interessa a ninguém: ou o conector respondeu, ou o
// advogado desistiu. Some da fila depois disso.
const VALIDADE_MS = 5 * 60 * 1000;

export type TipoDePedido = "certificados" | "assinar" | "projudi-entrar" | "projudi-carteira" | "projudi-processo";

export type Pedido = {
  id: string;
  advogadoId: string;
  tipo: TipoDePedido;
  dados: Record<string, unknown>;
  estado: "pendente" | "entregue" | "respondido" | "erro";
  resultado: Record<string, unknown> | null;
  erro: string | null;
  criadoEm: string;
  respondidoEm: string | null;
};

type Conector = { advogadoId: string; hashDaChave: string; criadoEm: string; ultimoContato: string | null };

export class ErroDoConector extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

const hashDe = (chave: string) => createHash("sha256").update(chave, "utf8").digest("hex");

/** Gera uma chave nova para o advogado e devolve o texto — só desta vez. */
export async function novaChave(advogadoId: string): Promise<string> {
  const chave = `pd_${randomBytes(24).toString("base64url")}`;
  const registro: Conector = { advogadoId, hashDaChave: hashDe(chave), criadoEm: agora(), ultimoContato: null };
  await alterar<Conector>(CONECTORES, (itens) => {
    const resto = itens.filter((item) => item.advogadoId !== advogadoId);
    resto.push(registro);
    return resto;
  });
  return chave;
}

export function conectorDoAdvogado(advogadoId: string): { criadoEm: string; ultimoContato: string | null } | null {
  const registro = listar<Conector>(CONECTORES).find((item) => item.advogadoId === advogadoId);
  return registro ? { criadoEm: registro.criadoEm, ultimoContato: registro.ultimoContato } : null;
}

/** Descobre de quem é a chave, em tempo constante. */
export function advogadoDaChave(chave: string): string | null {
  const procurado = Buffer.from(hashDe(chave || ""));
  for (const registro of listar<Conector>(CONECTORES)) {
    const guardado = Buffer.from(registro.hashDaChave);
    if (guardado.length === procurado.length && timingSafeEqual(guardado, procurado)) return registro.advogadoId;
  }
  return null;
}

// A fila vive só na memória do servidor, de propósito. Um pedido do PROJUDI
// carrega o PIN do token ou a senha do tribunal a caminho do computador do
// advogado: isso não pode encostar no disco. Ao reiniciar o servidor a fila
// esvazia, e tudo bem — pedido tem cinco minutos de validade.
const emMemoria: Map<string, Pedido> = (globalThis as { __pedidosDoConector?: Map<string, Pedido> }).__pedidosDoConector
  ?? ((globalThis as { __pedidosDoConector?: Map<string, Pedido> }).__pedidosDoConector = new Map());

function limparVelhos() {
  const limite = Date.now() - VALIDADE_MS;
  for (const [id, pedido] of emMemoria) {
    if (new Date(pedido.criadoEm).getTime() <= limite) emMemoria.delete(id);
  }
}

export async function pedir(advogadoId: string, tipo: TipoDePedido, dados: Record<string, unknown>): Promise<Pedido> {
  limparVelhos();
  const pedido: Pedido = {
    id: novoId(), advogadoId, tipo, dados,
    estado: "pendente", resultado: null, erro: null,
    criadoEm: agora(), respondidoEm: null,
  };
  emMemoria.set(pedido.id, pedido);
  return pedido;
}

export function pedidoPorId(advogadoId: string, id: string): Pedido | null {
  const pedido = emMemoria.get(id);
  return pedido && pedido.advogadoId === advogadoId ? pedido : null;
}

/** O que o conector daquele advogado ainda tem para fazer. Marca como entregue. */
export async function fila(advogadoId: string): Promise<Pedido[]> {
  limparVelhos();
  const pendentes: Pedido[] = [];
  for (const pedido of emMemoria.values()) {
    if (pedido.advogadoId === advogadoId && pedido.estado === "pendente") {
      pedido.estado = "entregue";
      pendentes.push({ ...pedido });
    }
  }
  await alterar<Conector>(CONECTORES, (itens) => {
    const registro = itens.find((item) => item.advogadoId === advogadoId);
    if (registro) registro.ultimoContato = agora();
  });
  return pendentes;
}

export async function responder(advogadoId: string, id: string, resposta: { resultado?: Record<string, unknown>; erro?: string }): Promise<void> {
  const pedido = emMemoria.get(id);
  if (!pedido || pedido.advogadoId !== advogadoId) throw new ErroDoConector("Esse pedido não existe mais.", 404);
  pedido.estado = resposta.erro ? "erro" : "respondido";
  pedido.resultado = resposta.resultado ?? null;
  pedido.erro = resposta.erro ?? null;
  pedido.respondidoEm = agora();
  // O que ia para o computador do advogado já foi entregue: apaga o que era
  // sigiloso e deixa só a resposta, que a tela ainda precisa ler.
  pedido.dados = {};
}
