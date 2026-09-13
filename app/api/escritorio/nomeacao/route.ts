import { FichaDeNomeacaoSchema, fichaDeNomeacao, normalizarFicha, type FichaDeNomeacao } from "@/lib/assistente";
import { adicionarDocumento, adicionarTarefa, criarCaso, ErroEscritorio, normalizarProcesso, registrar } from "@/lib/escritorio";
import { exigirAdvogado } from "@/lib/sessao";
import { lerCorpo, responderErro } from "../comum";

export const dynamic = "force-dynamic";

const TAREFAS_DA_NOMEACAO = ["Conferir íntegra da intimação e a data de ciência", "Confirmar prazo no processo oficial"];

function formatarCnj(digitos: string) {
  return digitos.replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, "$1-$2.$3.$4.$5.$6");
}

function tituloDaFicha(ficha: FichaDeNomeacao, processo: string | null) {
  if (ficha.ato) return `Nomeação: ${ficha.ato}`.slice(0, 200);
  if (processo) return `Nomeação no processo ${formatarCnj(processo)}`;
  return "Nomeação a conferir";
}

// POST /api/escritorio/nomeacao { texto } → a IA lê a intimação e o caso é
// aberto a partir da ficha. Dois complementos para a tela mostrar a ficha
// antes de criar: `somenteFicha: true` devolve só a ficha, e `ficha` já
// extraída abre o caso sem chamar o modelo de novo.
export async function POST(request: Request) {
  try {
    const advogado = await exigirAdvogado();
    const corpo = await lerCorpo<{ texto: string; somenteFicha: boolean; ficha: unknown }>(request);
    const texto = typeof corpo.texto === "string" ? corpo.texto.trim() : "";
    if (texto.length < 30) throw new ErroEscritorio("Cole o texto da intimação de nomeação.");

    let ficha: FichaDeNomeacao;
    const fichaRecebida = corpo.ficha ? FichaDeNomeacaoSchema.safeParse(corpo.ficha) : null;
    if (fichaRecebida?.success) {
      ficha = normalizarFicha(fichaRecebida.data);
    } else {
      try {
        ficha = await fichaDeNomeacao(texto);
      } catch (e) {
        console.error("ficha de nomeação:", e);
        return Response.json({ erro: "O assistente não conseguiu ler a intimação agora. Confira a conexão com o modelo e tente de novo." }, { status: 502 });
      }
    }
    if (corpo.somenteFicha) return Response.json({ ficha });

    // O número só entra no caso se estiver no padrão CNJ; senão vira alerta
    // e o advogado corrige na ficha.
    let processo: string | null = null;
    try {
      processo = normalizarProcesso(ficha.processo);
    } catch {
      ficha.alertas.push(`O número "${ficha.processo}" não está no padrão CNJ de 20 dígitos: confira e corrija na ficha do caso.`);
    }

    const caso = await criarCaso(advogado.id, {
      titulo: tituloDaFicha(ficha, processo),
      origem: "nomeacao",
      processo,
      orgao: ficha.orgao,
      ato: ficha.ato,
      // A data da intimação não entra aqui: `normalizarFicha` já a tirou de
      // `dataPrazo`, senão o painel anunciaria vencimento onde só começa a
      // contagem — alarme falso para o advogado.
      prazo: ficha.dataPrazo,
      resumo: ficha.resumo,
      fundamentos: ficha.fundamentosAAvaliar,
      notas: `Intimação de nomeação colada pelo advogado:\n"""\n${texto}\n"""`,
    });
    for (const nome of ficha.documentosAPedir) {
      await adicionarDocumento(advogado.id, caso.id, { nome, detalhe: "Sugerido pela leitura da intimação.", essencial: false });
    }
    for (const titulo of TAREFAS_DA_NOMEACAO) {
      await adicionarTarefa(advogado.id, caso.id, { titulo, prazo: ficha.dataPrazo });
    }
    const emDia = (data: string) => data.split("-").reverse().join("/");
    const ciencia = ficha.dataCiencia ? ` Ciência: ${emDia(ficha.dataCiencia)}.` : "";
    const alertas = ficha.alertas.length ? ` Alertas: ${ficha.alertas.join(" ")}` : "";
    await registrar(advogado.id, caso.id, "assistente", `Ficha de nomeação lida pela IA. Prazo: ${ficha.dataPrazo ? emDia(ficha.dataPrazo) : ficha.prazoInformado ?? "conferir no ato"}.${ciencia}${alertas}`);

    return Response.json({ caso, ficha }, { status: 201 });
  } catch (e) {
    return responderErro(e, "nomeação");
  }
}
