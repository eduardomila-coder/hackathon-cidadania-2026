import type { Origem, Situacao } from "@/lib/escritorio";

// Formatação usada pelo painel e pela página do caso. Roda no servidor e no
// navegador, por isso não importa nada de `lib/` que toque em arquivo, e
// sempre usa o fuso de Brasília para o HTML do servidor bater com o do
// cliente. Os nomes de origem e situação repetem os de `lib/escritorio.ts`
// porque aquele módulo não pode entrar no pacote do navegador.

export const FUSO = "America/Sao_Paulo";

export const NOMES_DA_ORIGEM: Record<Origem, string> = { nomeacao: "Nomeação", plantao: "Plantão", particular: "Particular" };
export const NOMES_DA_SITUACAO: Record<Situacao, string> = { novo: "Novo", em_andamento: "Em andamento", aguardando_cliente: "Aguardando cliente", concluido: "Concluído" };
export const ORIGENS = Object.keys(NOMES_DA_ORIGEM) as Origem[];
export const SITUACOES = Object.keys(NOMES_DA_SITUACAO) as Situacao[];

// "AAAA-MM-DD" → "DD/MM/AAAA", sem passar por Date (não tem fuso para errar).
export function formatarData(data: string | null | undefined): string {
  if (!data) return "";
  const partes = data.split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : data;
}

export function formatarMomento(iso: string | null | undefined, opcoes: { comAno?: boolean } = {}): string {
  if (!iso) return "";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return data.toLocaleString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", ...(opcoes.comAno === false ? {} : { year: "numeric" }), hour: "2-digit", minute: "2-digit" }).replace(",", " às");
}

export function hojeIso(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: FUSO });
}

function diaEmUtc(data: string): number {
  const [ano, mes, dia] = data.split("-").map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

// Dias entre hoje e a data: 0 é hoje, negativo já passou.
export function diasAte(data: string): number {
  return Math.round((diaEmUtc(data) - diaEmUtc(hojeIso())) / 86_400_000);
}

export type TomDoPrazo = "vencido" | "hoje" | "urgente" | "proximo" | "normal";

export function descreverPrazo(data: string | null | undefined): { texto: string; tom: TomDoPrazo } | null {
  if (!data) return null;
  const dias = diasAte(data);
  if (dias < 0) return { texto: dias === -1 ? "venceu ontem" : `venceu há ${-dias} dias`, tom: "vencido" };
  if (dias === 0) return { texto: "vence hoje", tom: "hoje" };
  if (dias === 1) return { texto: "vence amanhã", tom: "urgente" };
  if (dias <= 3) return { texto: `em ${dias} dias`, tom: "urgente" };
  if (dias <= 7) return { texto: `em ${dias} dias`, tom: "proximo" };
  return { texto: `em ${dias} dias`, tom: "normal" };
}

// 20 dígitos → NNNNNNN-DD.AAAA.J.TR.OOOO
export function formatarCnj(digitos: string | null | undefined): string {
  if (!digitos) return "";
  const m = digitos.replace(/\D/g, "").match(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/);
  return m ? `${m[1]}-${m[2]}.${m[3]}.${m[4]}.${m[5]}.${m[6]}` : digitos;
}

export function formatarTelefone(digitos: string | null | undefined): string {
  if (!digitos) return "";
  const m = digitos.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : digitos;
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

export function saudacao(): string {
  const hora = Number(new Date().toLocaleString("en-US", { timeZone: FUSO, hour: "numeric", hour12: false }));
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export function dataPorExtenso(): string {
  const texto = new Date().toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "long", day: "numeric", month: "long" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
