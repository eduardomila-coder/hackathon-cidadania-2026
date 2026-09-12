import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Resultado } from "./analise";

// Registro das triagens, para responder se a ferramenta está valendo a pena.
// Guarda SÓ medida: área, força, custo e tempo. Nunca o relato, o nome do
// cliente nem o número do processo — a triagem não fica gravada em lugar
// nenhum, e é isso que permite usar a ferramenta com caso real sem virar
// banco de dados de cliente.

export type Desfecho = "ganho" | "acordo" | "perdido" | "desistiu";

export type CasoRegistrado = {
  id: string;
  quando: string;
  area: string;
  cabe_jec: boolean;
  comprovados: number;
  aplicaveis: number;
  custo_dolares: number | null;
  modelo: string;
  segundos: number;
  desfecho: Desfecho | null;
  desfecho_em: string | null;
};

// A partir de quanto a força do caso conta como favorável. É um corte
// declarado, não um modelo escondido: quem lê a métrica sabe o que ela mede.
export const CORTE_FAVORAVEL = 0.7;

export type Eficiencia = {
  casos: number;
  com_desfecho: number;
  custo_total_dolares: number | null;
  custo_medio_dolares: number | null;
  acertos: number;
  corte_favoravel: number;
};

const PASTA = join(process.cwd(), "data");
const ARQUIVO = join(PASTA, "casos.json");

function ler(): CasoRegistrado[] {
  try {
    return JSON.parse(readFileSync(ARQUIVO, "utf8")) as CasoRegistrado[];
  } catch {
    return [];
  }
}

function gravar(casos: CasoRegistrado[]) {
  mkdirSync(PASTA, { recursive: true });
  const temporario = `${ARQUIVO}.${process.pid}.tmp`;
  writeFileSync(temporario, JSON.stringify(casos, null, 2) + "\n");
  renameSync(temporario, ARQUIVO);
}

export function registrar(resultado: Resultado): CasoRegistrado {
  const segundos = Object.values(resultado.tempos_ms).reduce((t, ms) => t + ms, 0) / 1000;
  const caso: CasoRegistrado = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    quando: new Date().toISOString(),
    area: resultado.analise.area,
    cabe_jec: resultado.analise.cabe_juizado_especial,
    comprovados: resultado.forca.comprovados,
    aplicaveis: resultado.forca.aplicaveis,
    custo_dolares: resultado.custo.dolares,
    modelo: resultado.custo.modelo,
    segundos: Number(segundos.toFixed(1)),
    desfecho: null,
    desfecho_em: null,
  };
  gravar([...ler(), caso]);
  return caso;
}

// O advogado volta depois e diz no que deu. Sem isso a ferramenta não tem
// como saber se a força que ela mediu significava alguma coisa.
export function anotarDesfecho(id: string, desfecho: Desfecho): boolean {
  const casos = ler();
  const caso = casos.find((c) => c.id === id);
  if (!caso) return false;
  caso.desfecho = desfecho;
  caso.desfecho_em = new Date().toISOString();
  gravar(casos);
  return true;
}

export function eficiencia(): Eficiencia {
  const casos = ler();
  const comPreco = casos.filter((c) => c.custo_dolares !== null);
  const total = comPreco.length === casos.length && casos.length > 0
    ? comPreco.reduce((t, c) => t + (c.custo_dolares ?? 0), 0)
    : null;

  const julgados = casos.filter((c) => c.desfecho !== null && c.aplicaveis > 0);
  const acertos = julgados.filter((c) => {
    const favoravelPrevisto = c.comprovados / c.aplicaveis >= CORTE_FAVORAVEL;
    const favoravelReal = c.desfecho === "ganho" || c.desfecho === "acordo";
    return favoravelPrevisto === favoravelReal;
  }).length;

  return {
    casos: casos.length,
    com_desfecho: julgados.length,
    custo_total_dolares: total,
    custo_medio_dolares: total === null || casos.length === 0 ? null : total / casos.length,
    acertos,
    corte_favoravel: CORTE_FAVORAVEL,
  };
}

export function listar(): CasoRegistrado[] {
  return ler().slice(-50).reverse();
}
