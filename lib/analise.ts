import { contexto, type Trecho } from "./juridico/corpus";
import { analisar, extrair, verificar, type Analise, type Extracao, type Verificacao } from "./etapas";

// Orquestra as etapas e avisa o progresso a quem quiser mostrar na tela.
export type Etapa = "extraindo" | "buscando" | "analisando" | "verificando" | "pronto";

export type Resultado = {
  analise: Analise;
  extracao: Extracao;
  fontes: Trecho[];
  verificacao: Verificacao;
  tempos_ms: Partial<Record<Etapa, number>>;
};

export async function analisarRelato(
  relato: string,
  aoProgredir: (etapa: Etapa) => void = () => {},
): Promise<Resultado> {
  const tempos: Partial<Record<Etapa, number>> = {};
  const cronometrar = async <T,>(etapa: Etapa, fn: () => Promise<T> | T): Promise<T> => {
    aoProgredir(etapa);
    const t0 = Date.now();
    const r = await fn();
    tempos[etapa] = Date.now() - t0;
    return r;
  };

  const extracao = await cronometrar("extraindo", () => extrair(relato));
  const consulta = [...extracao.temas, ...extracao.fatos, ...extracao.o_que_quer].join(" ");
  const fontes = await cronometrar("buscando", () => contexto(consulta, 8));
  const bruta = await cronometrar("analisando", () => analisar(relato, extracao, fontes));
  const verificacao = await cronometrar("verificando", () => verificar(bruta, fontes));

  // O que o revisor derrubou não fica como afirmação: vira alerta.
  const derrubadas = verificacao.itens.filter((i) => i.situacao !== "confirmada");
  const analise: Analise = {
    ...bruta,
    fundamentos: bruta.fundamentos.filter((f) =>
      !derrubadas.some((d) => d.afirmacao === f.afirmacao || d.fonte === f.fonte && d.situacao === "contradiz"),
    ),
    sem_base: [...bruta.sem_base, ...derrubadas.map((d) => `${d.afirmacao} (${d.observacao})`)],
  };
  aoProgredir("pronto");
  return { analise, extracao, fontes, verificacao, tempos_ms: tempos };
}
