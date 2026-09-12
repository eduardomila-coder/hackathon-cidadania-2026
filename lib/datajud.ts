type Movimento = { nome?: string; dataHora?: string; codigo?: number };
type FonteProcesso = {
  numeroProcesso?: string;
  classe?: { nome?: string };
  orgaoJulgador?: { nome?: string };
  movimentos?: Movimento[];
  "@timestamp"?: string;
};

type RespostaDataJud = { hits?: { hits?: Array<{ _source?: FonteProcesso }> } };

export class ErroDataJud extends Error {
  constructor(message: string, readonly status = 502) { super(message); }
}

export function numeroCnjValido(valor: string) {
  return /^\d{20}$/.test(valor.replace(/\D/g, ""));
}

export function dataJudConfigurado() {
  return Boolean(process.env.DATAJUD_API_KEY);
}

export async function consultarProcessoTjpr(numeroInformado: string) {
  const numero = numeroInformado.replace(/\D/g, "");
  if (!numeroCnjValido(numero)) throw new ErroDataJud("Informe os 20 dígitos do processo no padrão CNJ.", 400);
  const chave = process.env.DATAJUD_API_KEY;
  if (!chave) throw new ErroDataJud("A consulta oficial do DataJud ainda não foi configurada no servidor.", 503);

  const resposta = await fetch("https://api-publica.datajud.cnj.jus.br/api_publica_tjpr/_search", {
    method: "POST",
    cache: "no-store",
    headers: { Authorization: `APIKey ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({ size: 1, query: { term: { numeroProcesso: numero } } }),
  });
  const corpo = await resposta.json().catch(() => null) as RespostaDataJud | null;
  if (!resposta.ok || !corpo) throw new ErroDataJud("O DataJud não respondeu à consulta agora.", resposta.status || 502);
  const processo = corpo.hits?.hits?.[0]?._source;
  if (!processo) return { encontrado: false, numero };

  const ultimoMovimento = [...(processo.movimentos ?? [])]
    .sort((a, b) => (b.dataHora ?? "").localeCompare(a.dataHora ?? ""))[0];
  return {
    encontrado: true,
    numero: processo.numeroProcesso ?? numero,
    classe: processo.classe?.nome ?? "Classe não informada",
    orgao: processo.orgaoJulgador?.nome ?? "Órgão não informado",
    ultimoMovimento: ultimoMovimento?.nome ?? "Movimentação não informada",
    dataMovimento: ultimoMovimento?.dataHora ?? processo["@timestamp"] ?? null,
  };
}
