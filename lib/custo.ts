import type { Uso } from "./claude";

// Preço por milhão de tokens, em dólar, da tabela oficial da Anthropic
// consultada em 12/09/2026. Modelo que não está aqui fica sem preço: o custo
// sai como null, e a tela diz que não foi calculado. Preço inventado seria o
// mesmo erro que a cadeia inteira existe para evitar.
const TABELA: Record<string, { entrada: number; saida: number }> = {
  "claude-opus-5": { entrada: 5, saida: 25 },
  "claude-sonnet-5": { entrada: 2, saida: 10 },
  "claude-haiku-4-5": { entrada: 1, saida: 5 },
};

// Token lido do cache custa cerca de um décimo do token de entrada.
const FATOR_CACHE = 0.1;

// Cotação do dólar: não é chute do sistema. Sem DOLAR_REAIS no ambiente, o
// custo aparece só em dólar.
const DOLAR_REAIS = Number(process.env.DOLAR_REAIS) || null;

export type Custo = {
  modelo: string;
  tokens_entrada: number;
  tokens_saida: number;
  chamadas: number;
  dolares: number | null;
  reais: number | null;
};

export function somarCusto(usos: Uso[]): Custo {
  const modelo = usos[0]?.modelo ?? "desconhecido";
  const tokens_entrada = usos.reduce((t, u) => t + u.entrada + u.cache_leitura, 0);
  const tokens_saida = usos.reduce((t, u) => t + u.saida, 0);

  const dolares = usos.reduce<number | null>((total, u) => {
    const preco = TABELA[u.modelo];
    if (total === null || !preco) return null;
    const entrada = (u.entrada * preco.entrada + u.cache_leitura * preco.entrada * FATOR_CACHE) / 1e6;
    return total + entrada + (u.saida * preco.saida) / 1e6;
  }, 0);

  return {
    modelo,
    tokens_entrada,
    tokens_saida,
    chamadas: usos.length,
    dolares,
    reais: dolares === null || DOLAR_REAIS === null ? null : dolares * DOLAR_REAIS,
  };
}

export function formatarCusto(custo: Custo): string {
  if (custo.reais !== null) return `R$ ${custo.reais.toFixed(2).replace(".", ",")}`;
  if (custo.dolares !== null) return `US$ ${custo.dolares.toFixed(3)}`;
  return `sem preço de tabela para ${custo.modelo}`;
}
