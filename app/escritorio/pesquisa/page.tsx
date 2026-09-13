import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listarCasosComDetalhes, triagensDoCaso } from "@/lib/escritorio";
import { BASE_FIXA, porId } from "@/lib/juridico/corpus";
import { advogadoAtual } from "@/lib/sessao";
import { formatarMomento } from "../casos/formatos";
import { Pesquisa, type CasoPesquisado, type FonteDaBase, type TriagemNaTela } from "./Pesquisa";
import "./pesquisa.css";

export const metadata: Metadata = { title: "Pesquisa jurídica · Escritório Dativo" };
export const dynamic = "force-dynamic";

const NOMES_DA_AREA: Record<string, string> = {
  consumidor: "Consumidor",
  contrato: "Contrato",
  vizinhanca: "Vizinhança",
  familia: "Família",
  trabalho: "Trabalho",
  transito: "Trânsito",
  outro: "Outro",
};

const NOMES_DO_TIPO: Record<string, string> = {
  novo: "caso novo, ainda sem processo",
  em_andamento: "processo já em andamento",
  indefinido: "não deu para saber se já existe processo",
};

function valorDoCusto(custo: { reais: number | null; dolares: number | null }): string {
  if (custo.reais !== null) return `R$ ${custo.reais.toFixed(2).replace(".", ",")}`;
  if (custo.dolares !== null) return `US$ ${custo.dolares.toFixed(3)}`;
  return "não calculado";
}

// A memória de pesquisa do escritório: as triagens já feitas, por caso, com os
// requisitos e a fonte de cada um. O conteúdo é leitura do que ficou salvo no
// caso; nada é analisado de novo nesta tela. As fontes citadas por id são
// resolvidas aqui, no servidor, pelo mesmo corpus que a análise usa, para o
// advogado ver de que lei e de que artigo se trata.
export default async function PaginaDePesquisa() {
  const advogado = await advogadoAtual();
  if (!advogado) redirect("/entrar?voltar=/escritorio/pesquisa");

  const casos = listarCasosComDetalhes(advogado.id);
  const casosPesquisados: CasoPesquisado[] = [];
  const idsCitados = new Set<string>();
  let totalDeTriagens = 0;

  for (const caso of casos) {
    const triagens = triagensDoCaso(advogado.id, caso.id);
    if (triagens.length === 0) continue;
    totalDeTriagens += triagens.length;

    const naTela: TriagemNaTela[] = triagens.map((triagem) => {
      const { analise, extracao, forca, verificacao, custo } = triagem.resultado;
      for (const requisito of analise.requisitos) idsCitados.add(requisito.fonte);
      for (const fundamento of analise.fundamentos) idsCitados.add(fundamento.fonte);
      return {
        id: triagem.id,
        quando: formatarMomento(triagem.quando),
        area: NOMES_DA_AREA[analise.area] ?? analise.area,
        tipo: NOMES_DO_TIPO[extracao.tipo_caso] ?? extracao.tipo_caso,
        cabeJec: analise.cabe_juizado_especial,
        motivoJec: analise.motivo_juizado,
        encaminhamento: analise.encaminhamento,
        resumo: analise.resumo,
        orientacao: analise.orientacao,
        forca,
        requisitos: analise.requisitos.map((requisito) => ({
          requisito: requisito.requisito,
          situacao: requisito.situacao,
          oQueComprova: requisito.o_que_comprova,
          fonte: requisito.fonte,
        })),
        fundamentos: analise.fundamentos.map((fundamento) => ({ afirmacao: fundamento.afirmacao, fonte: fundamento.fonte })),
        documentosAPedir: analise.documentos_necessarios,
        perguntasPendentes: analise.perguntas_pendentes,
        alertas: [...analise.sem_base, ...verificacao.alertas],
        custo: valorDoCusto(custo),
        modelo: custo.modelo,
      };
    });

    casosPesquisados.push({
      id: caso.id,
      titulo: caso.titulo,
      cliente: caso.cliente?.nome ?? null,
      triagens: naTela,
    });
  }

  const fontes: Record<string, FonteDaBase> = {};
  for (const id of idsCitados) {
    const trecho = porId(id);
    if (trecho) fontes[id] = { id: trecho.id, lei: trecho.lei, artigo: trecho.artigo };
  }

  // O índice do que a busca sempre leva em conta. O acervo inteiro fica em
  // docs/juridico/, um "## Art. N" por trecho; aqui vão só os fixos, que é o
  // que dá para ler sem inventar um listador que o corpus não expõe.
  const base: FonteDaBase[] = BASE_FIXA.flatMap((id) => {
    const trecho = porId(id);
    return trecho ? [{ id: trecho.id, lei: trecho.lei, artigo: trecho.artigo }] : [];
  });

  return <Pesquisa casos={casosPesquisados} fontes={fontes} base={base} totalDeTriagens={totalDeTriagens} />;
}
