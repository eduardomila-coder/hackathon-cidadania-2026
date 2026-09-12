import { contexto, type Trecho } from "./juridico/corpus";
import { analisar, extrair, verificar, type Analise, type Extracao, type Verificacao } from "./etapas";
import { somarCusto, type Custo } from "./custo";
import type { Uso } from "./claude";

// Orquestra as etapas e avisa o progresso a quem quiser mostrar na tela.
export type Etapa = "extraindo" | "buscando" | "analisando" | "verificando" | "pronto";

// Força do caso: quantos requisitos legais já estão comprovados por documento
// ou fato do relato, sobre os que se aplicam. Não é previsão de resultado —
// é contagem do que está provado, e cada requisito traz a fonte que o exige.
export type Forca = {
  comprovados: number;
  aplicaveis: number;
};

export type Resultado = {
  analise: Analise;
  extracao: Extracao;
  fontes: Trecho[];
  verificacao: Verificacao;
  forca: Forca;
  custo: Custo;
  tempos_ms: Partial<Record<Etapa, number>>;
};

export async function analisarRelato(
  relato: string,
  aoProgredir: (etapa: Etapa) => void = () => {},
): Promise<Resultado> {
  const tempos: Partial<Record<Etapa, number>> = {};
  const usos: Uso[] = [];
  const cronometrar = async <T,>(etapa: Etapa, fn: () => Promise<T> | T): Promise<T> => {
    aoProgredir(etapa);
    const t0 = Date.now();
    const r = await fn();
    tempos[etapa] = Date.now() - t0;
    return r;
  };

  const extracao = await cronometrar("extraindo", () => extrair(relato));
  usos.push(extracao.uso);
  const consulta = [...extracao.dados.temas, ...extracao.dados.fatos, ...extracao.dados.o_que_quer].join(" ");
  const fontes = await cronometrar("buscando", () => contexto(consulta, 8));
  const bruta = await cronometrar("analisando", () => analisar(relato, extracao.dados, fontes));
  usos.push(bruta.uso);
  const verificacao = await cronometrar("verificando", () => verificar(bruta.dados, fontes));
  usos.push(verificacao.uso);

  // O que o revisor derrubou não fica como afirmação: vira alerta.
  const derrubadas = verificacao.dados.itens.filter((i) => i.situacao !== "confirmada");
  const derrubada = (texto: string) => derrubadas.some((d) => d.afirmacao === texto);
  const analise: Analise = {
    ...bruta.dados,
    fundamentos: bruta.dados.fundamentos.filter((f) =>
      !derrubadas.some((d) => d.afirmacao === f.afirmacao || d.fonte === f.fonte && d.situacao === "contradiz"),
    ),
    // Requisito que o revisor não confirmou deixa de contar como provado.
    requisitos: bruta.dados.requisitos.map((r) =>
      r.situacao === "comprovado" && derrubada(r.requisito) ? { ...r, situacao: "falta_documento" as const } : r,
    ),
    sem_base: [...bruta.dados.sem_base, ...derrubadas.map((d) => `${d.afirmacao} (${d.observacao})`)],
  };

  const aplicaveis = analise.requisitos.filter((r) => r.situacao !== "nao_se_aplica");
  aoProgredir("pronto");
  return {
    analise,
    extracao: extracao.dados,
    fontes,
    verificacao: verificacao.dados,
    forca: {
      comprovados: aplicaveis.filter((r) => r.situacao === "comprovado").length,
      aplicaveis: aplicaveis.length,
    },
    custo: somarCusto(usos),
    tempos_ms: tempos,
  };
}
