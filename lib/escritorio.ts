import type { Resultado } from "./analise";
import { FichaDeNomeacaoSchema, normalizarFicha, type FichaDeNomeacao } from "./assistente";
import { createHash } from "node:crypto";
import { agora, alterar, listar, novoId } from "./banco";

// Modelo de dados do escritório e todo o CRUD. Cada advogado só enxerga o que
// é dele: toda função recebe `advogadoId` e filtra por ele. Os filhos de caso
// (documentos, tarefas, registros, triagens) não guardam `advogadoId`; herdam
// pelo `casoId`, e toda função de filho confere que o caso pertence ao
// advogado antes de ler ou gravar. Se não pertence, lança `ErroEscritorio`
// 404 — para quem não é dono, o caso simplesmente não existe.

export type Cliente = {
  id: string;
  advogadoId: string;
  nome: string;
  telefone: string; // só dígitos, com 55
  email: string | null;
  observacoes: string;
  criadoEm: string;
};
export type Origem = "nomeacao" | "plantao" | "particular";
export type Situacao = "novo" | "em_andamento" | "aguardando_cliente" | "concluido";
export type Caso = {
  id: string;
  advogadoId: string;
  clienteId: string | null;
  titulo: string;
  origem: Origem;
  processo: string | null; // CNJ só dígitos ou null
  orgao: string | null;
  ato: string | null;
  prazo: string | null; // AAAA-MM-DD
  situacao: Situacao;
  resumo: string;
  relato: string;
  notas: string;
  fundamentos: string[];
  criadoEm: string;
  atualizadoEm: string;
};
export type Documento = { id: string; casoId: string; nome: string; detalhe: string; essencial: boolean; recebido: boolean; atualizadoEm: string };
export type Tarefa = { id: string; casoId: string; titulo: string; prazo: string | null; concluida: boolean; criadoEm: string };
export type TipoRegistro = "registro" | "assistente" | "humano" | "whatsapp";
export type Registro = { id: string; casoId: string; tipo: TipoRegistro; texto: string; quando: string };
// Assinatura feita pelo certificado do advogado. Guardamos o que foi assinado, o
// hash e a assinatura — nunca a chave, que não sai do computador dele. `origem`
// diz se veio do token A3 ou do certificado de demonstração do conector, e a
// tela mostra essa diferença: demonstração não tem fé pública.
export type Assinatura = {
  id: string;
  advogadoId: string;
  casoId: string | null;
  documento: string;
  conteudo: string;
  hash: string;
  assinatura: string;
  certificado: string;
  origem: "a3" | "demonstracao";
  quando: string;
};
export type Triagem = { id: string; casoId: string; quando: string; resultado: Resultado };
export type Mensagem = {
  id: string;
  advogadoId: string;
  instancia: string;
  contato: string; // dígitos
  nomeContato: string | null;
  texto: string;
  deMim: boolean;
  quando: string;
  casoId: string | null;
  lida: boolean;
  idExterno: string | null;
  // true quando quem respondeu foi o estagiário virtual, não o advogado. A
  // tela marca a mensagem para ninguém confundir quem falou.
  doEstagiario?: boolean;
};
export type Processo = {
  id: string;
  advogadoId: string;
  casoId: string | null;
  numero: string;
  classe: string | null;
  orgao: string | null;
  ultimoMovimento: string | null;
  dataMovimento: string | null;
  consultadoEm: string;
};
export type EstadoDaNomeacao = "aberta" | "arquivada";
export type ItemDoChecklistDaNomeacao = { id: string; descricao: string; conferido: boolean; conferidoEm: string | null };
export type Nomeacao = { id: string; advogadoId: string; textoOriginal: string; camposExtraidos: FichaDeNomeacao; checklist: ItemDoChecklistDaNomeacao[]; estado: EstadoDaNomeacao; casoId: string | null; criadoEm: string; atualizadoEm: string };
export type TipoDeEvento = "audiencia" | "atendimento" | "tarefa" | "revisao" | "prazo_informado" | "prazo_confirmado";
export type EventoDoCaso = { id: string; casoId: string; tipo: TipoDeEvento; titulo: string; descricao: string; data: string | null; prazoInformado: string | null; criadoEm: string; atualizadoEm: string };
export type EtapaDeHonorario = { id: string; titulo: string; concluida: boolean };
export type PendenciaDeHonorario = { id: string; descricao: string; resolvida: boolean };
export type RegistroDeHonorario = { id: string; texto: string; quando: string };
// Não há valores, cálculos nem pagamentos: só andamento administrativo informado pelo advogado.
export type HonorariosDoCaso = { id: string; casoId: string; etapas: EtapaDeHonorario[]; pendencias: PendenciaDeHonorario[]; registros: RegistroDeHonorario[]; criadoEm: string; atualizadoEm: string };

export const ORIGENS: Origem[] = ["nomeacao", "plantao", "particular"];
export const SITUACOES: Situacao[] = ["novo", "em_andamento", "aguardando_cliente", "concluido"];
export const ESTADOS_DA_NOMEACAO: EstadoDaNomeacao[] = ["aberta", "arquivada"];
export const TIPOS_DE_EVENTO: TipoDeEvento[] = ["audiencia", "atendimento", "tarefa", "revisao", "prazo_informado", "prazo_confirmado"];
export const NOMES_DA_ORIGEM: Record<Origem, string> = { nomeacao: "Nomeação", plantao: "Plantão", particular: "Particular" };
export const NOMES_DA_SITUACAO: Record<Situacao, string> = { novo: "Novo", em_andamento: "Em andamento", aguardando_cliente: "Aguardando cliente", concluido: "Concluído" };

export class ErroEscritorio extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

// Nomes dos arquivos em data/. `casos.json` já é do registro de triagens
// (lib/casos.ts), por isso o prefixo.
const CLIENTES = "escritorio-clientes";
const CASOS = "escritorio-casos";
const DOCUMENTOS = "escritorio-documentos";
const TAREFAS = "escritorio-tarefas";
const REGISTROS = "escritorio-registros";
const TRIAGENS = "escritorio-triagens";
const MENSAGENS = "escritorio-mensagens";
const PROCESSOS = "escritorio-processos";
const NOMEACOES = "escritorio-nomeacoes";
const EVENTOS = "escritorio-eventos";
const HONORARIOS = "escritorio-honorarios";
const ASSINATURAS = "escritorio-assinaturas";

// Os quatro documentos que todo caso começa pedindo.
export const DOCUMENTOS_PADRAO: Array<Pick<Documento, "nome" | "detalhe" | "essencial">> = [
  { nome: "Documento de identificação", detalhe: "RG ou CNH do cliente; conferir os dados no atendimento.", essencial: true },
  { nome: "Comprovante de endereço", detalhe: "Conta recente em nome do cliente ou declaração de residência.", essencial: false },
  { nome: "Contrato ou proposta", detalhe: "O que foi combinado por escrito; ajuda a reconstruir os fatos.", essencial: true },
  { nome: "Conversas e comprovantes", detalhe: "Mensagens, recibos, prints e fotos que provam o relato.", essencial: false },
];
export const CHECKLIST_PADRAO_DA_NOMEACAO: Array<Pick<ItemDoChecklistDaNomeacao, "descricao">> = [
  { descricao: "Conferir a íntegra da intimação e a data de ciência" },
  { descricao: "Confirmar ato e prazo no processo oficial" },
  { descricao: "Confirmar os dados da parte assistida" },
  { descricao: "Verificar impedimento ou conflito" },
];

const naoEncontrado = () => new ErroEscritorio("Caso não encontrado.", 404);

function texto(valor: unknown, maximo = 5000): string {
  return typeof valor === "string" ? valor.trim().slice(0, maximo) : "";
}

function textoOuNulo(valor: unknown, maximo = 300): string | null {
  const limpo = texto(valor, maximo);
  return limpo ? limpo : null;
}

function porDataDesc<T>(campo: keyof T) {
  return (a: T, b: T) => String(b[campo]).localeCompare(String(a[campo]));
}

function porDataAsc<T>(campo: keyof T) {
  return (a: T, b: T) => String(a[campo]).localeCompare(String(b[campo]));
}

// Telefone como o advogado digita → só dígitos com o 55 na frente.
export function normalizarTelefone(entrada: string): string {
  const digitos = (entrada ?? "").replace(/\D/g, "");
  const completo = digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : digitos;
  if (!/^55\d{10,11}$/.test(completo)) throw new ErroEscritorio("Informe o telefone com DDD, como (41) 99999-9999.");
  return completo;
}

// Número CNJ como vem da intimação → 20 dígitos, ou null se veio vazio.
export function normalizarProcesso(entrada: unknown): string | null {
  const digitos = texto(entrada, 40).replace(/\D/g, "");
  if (!digitos) return null;
  if (digitos.length !== 20) throw new ErroEscritorio("O número do processo deve ter 20 dígitos no padrão CNJ, como 0000000-00.0000.8.16.0000.");
  return digitos;
}

export function normalizarData(entrada: unknown): string | null {
  const valor = texto(entrada, 10);
  if (!valor) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(Date.parse(valor))) throw new ErroEscritorio("Use a data no formato AAAA-MM-DD.");
  return valor;
}

function validarOrigem(valor: unknown): Origem {
  if (ORIGENS.includes(valor as Origem)) return valor as Origem;
  throw new ErroEscritorio("Origem inválida: use nomeação, plantão ou particular.");
}

function validarSituacao(valor: unknown): Situacao {
  if (SITUACOES.includes(valor as Situacao)) return valor as Situacao;
  throw new ErroEscritorio("Situação inválida.");
}

function validarEstadoDaNomeacao(valor: unknown): EstadoDaNomeacao {
  if (ESTADOS_DA_NOMEACAO.includes(valor as EstadoDaNomeacao)) return valor as EstadoDaNomeacao;
  throw new ErroEscritorio("Estado da nomeação inválido.");
}

function validarTipoDeEvento(valor: unknown): TipoDeEvento {
  if (TIPOS_DE_EVENTO.includes(valor as TipoDeEvento)) return valor as TipoDeEvento;
  throw new ErroEscritorio("Tipo de evento inválido.");
}

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === "object" && !Array.isArray(valor) ? valor as Record<string, unknown> : null;
}

function listaDeTextos(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.map((item) => texto(item, 500)).filter(Boolean).slice(0, 30) : [];
}

// ---- Casos ---------------------------------------------------------------

export function listarCasos(advogadoId: string): Caso[] {
  return listar<Caso>(CASOS).filter((caso) => caso.advogadoId === advogadoId).sort(porDataDesc<Caso>("atualizadoEm"));
}

export function casoPorId(advogadoId: string, casoId: string): Caso | null {
  return listar<Caso>(CASOS).find((caso) => caso.id === casoId && caso.advogadoId === advogadoId) ?? null;
}

function exigirCaso(advogadoId: string, casoId: string): Caso {
  const caso = casoPorId(advogadoId, casoId);
  if (!caso) throw naoEncontrado();
  return caso;
}

async function marcarAtualizado(casoId: string) {
  await alterar<Caso>(CASOS, (casos) => {
    const caso = casos.find((item) => item.id === casoId);
    if (caso) caso.atualizadoEm = agora();
  });
}

export type DadosDoCaso = {
  titulo: string;
  origem?: Origem;
  clienteId?: string | null;
  processo?: string | null;
  orgao?: string | null;
  ato?: string | null;
  prazo?: string | null;
  situacao?: Situacao;
  resumo?: string;
  relato?: string;
  notas?: string;
  fundamentos?: string[];
};

// Abre o caso já com o checklist de documentos padrão e o primeiro registro
// na linha do tempo, para o advogado nunca começar de uma tela vazia.
export async function criarCaso(advogadoId: string, dados: DadosDoCaso): Promise<Caso> {
  const titulo = texto(dados.titulo, 200);
  if (!titulo) throw new ErroEscritorio("Dê um título ao caso.");
  const clienteId = dados.clienteId ? texto(dados.clienteId, 100) : null;
  if (clienteId && !clientePorId(advogadoId, clienteId)) throw new ErroEscritorio("Cliente não encontrado.", 404);

  const momento = agora();
  const caso: Caso = {
    id: novoId(),
    advogadoId,
    clienteId,
    titulo,
    origem: dados.origem === undefined ? "particular" : validarOrigem(dados.origem),
    processo: normalizarProcesso(dados.processo),
    orgao: textoOuNulo(dados.orgao),
    ato: textoOuNulo(dados.ato),
    prazo: normalizarData(dados.prazo),
    situacao: dados.situacao === undefined ? "novo" : validarSituacao(dados.situacao),
    resumo: texto(dados.resumo, 3000),
    relato: texto(dados.relato, 20000),
    notas: texto(dados.notas, 20000),
    fundamentos: listaDeTextos(dados.fundamentos),
    criadoEm: momento,
    atualizadoEm: momento,
  };

  await alterar<Caso>(CASOS, (casos) => { casos.push(caso); });
  await alterar<Documento>(DOCUMENTOS, (documentos) => {
    for (const padrao of DOCUMENTOS_PADRAO) {
      documentos.push({ id: novoId(), casoId: caso.id, ...padrao, recebido: false, atualizadoEm: momento });
    }
  });
  await alterar<Registro>(REGISTROS, (registros) => {
    registros.push({ id: novoId(), casoId: caso.id, tipo: "registro", texto: "Caso aberto", quando: momento });
  });
  return caso;
}

export type CamposDoCaso = Partial<Omit<Caso, "id" | "advogadoId" | "criadoEm" | "atualizadoEm">>;

export async function atualizarCaso(advogadoId: string, casoId: string, campos: CamposDoCaso): Promise<Caso> {
  exigirCaso(advogadoId, casoId);
  if (campos.clienteId && !clientePorId(advogadoId, campos.clienteId)) throw new ErroEscritorio("Cliente não encontrado.", 404);

  let atualizado = null as Caso | null;
  await alterar<Caso>(CASOS, (casos) => {
    const caso = casos.find((item) => item.id === casoId && item.advogadoId === advogadoId);
    if (!caso) throw naoEncontrado();
    if (campos.titulo !== undefined) {
      const titulo = texto(campos.titulo, 200);
      if (!titulo) throw new ErroEscritorio("O título não pode ficar vazio.");
      caso.titulo = titulo;
    }
    if (campos.origem !== undefined) caso.origem = validarOrigem(campos.origem);
    if (campos.situacao !== undefined) caso.situacao = validarSituacao(campos.situacao);
    if (campos.clienteId !== undefined) caso.clienteId = campos.clienteId ? texto(campos.clienteId, 100) : null;
    if (campos.processo !== undefined) caso.processo = normalizarProcesso(campos.processo);
    if (campos.orgao !== undefined) caso.orgao = textoOuNulo(campos.orgao);
    if (campos.ato !== undefined) caso.ato = textoOuNulo(campos.ato);
    if (campos.prazo !== undefined) caso.prazo = normalizarData(campos.prazo);
    if (campos.resumo !== undefined) caso.resumo = texto(campos.resumo, 3000);
    if (campos.relato !== undefined) caso.relato = texto(campos.relato, 20000);
    if (campos.notas !== undefined) caso.notas = texto(campos.notas, 20000);
    if (campos.fundamentos !== undefined) caso.fundamentos = listaDeTextos(campos.fundamentos);
    caso.atualizadoEm = agora();
    atualizado = caso;
  });
  if (!atualizado) throw naoEncontrado();
  return atualizado;
}

// ---- Nomeações -----------------------------------------------------------

function normalizarCamposExtraidos(valor: unknown): FichaDeNomeacao {
  const ficha = FichaDeNomeacaoSchema.safeParse(valor);
  if (!ficha.success) throw new ErroEscritorio("Os campos extraídos da nomeação são inválidos.");
  return normalizarFicha(ficha.data);
}

function normalizarChecklistDaNomeacao(valor: unknown, usarPadrao = false): ItemDoChecklistDaNomeacao[] {
  if (valor === undefined && usarPadrao) {
    return CHECKLIST_PADRAO_DA_NOMEACAO.map((item) => ({ id: novoId(), descricao: item.descricao, conferido: false, conferidoEm: null }));
  }
  if (!Array.isArray(valor)) throw new ErroEscritorio("O checklist da nomeação deve ser uma lista.");
  return valor.slice(0, 30).map((item) => {
    const campos = objeto(item);
    const descricao = texto(campos?.descricao, 500);
    if (!descricao) throw new ErroEscritorio("Cada item do checklist precisa de uma descrição.");
    const conferido = Boolean(campos?.conferido);
    return { id: texto(campos?.id, 100) || novoId(), descricao, conferido, conferidoEm: conferido ? (textoOuNulo(campos?.conferidoEm, 40) ?? agora()) : null };
  });
}

function normalizarCasoIdOpcional(advogadoId: string, valor: unknown): string | null {
  if (valor === undefined || valor === null || valor === "") return null;
  const casoId = texto(valor, 100);
  if (!casoId) throw new ErroEscritorio("Caso vinculado inválido.");
  exigirCaso(advogadoId, casoId);
  return casoId;
}

export type DadosDaNomeacao = { textoOriginal: string; camposExtraidos: unknown; checklist?: unknown; estado?: EstadoDaNomeacao; casoId?: string | null };

export function listarNomeacoes(advogadoId: string, filtro: { estado?: EstadoDaNomeacao } = {}): Nomeacao[] {
  return listar<Nomeacao>(NOMEACOES).filter((nomeacao) => nomeacao.advogadoId === advogadoId).filter((nomeacao) => !filtro.estado || nomeacao.estado === filtro.estado).sort(porDataDesc<Nomeacao>("atualizadoEm"));
}

export function nomeacaoPorId(advogadoId: string, nomeacaoId: string): Nomeacao | null {
  return listar<Nomeacao>(NOMEACOES).find((nomeacao) => nomeacao.id === nomeacaoId && nomeacao.advogadoId === advogadoId) ?? null;
}

export function nomeacoesDoCaso(advogadoId: string, casoId: string): Nomeacao[] {
  exigirCaso(advogadoId, casoId);
  return listarNomeacoes(advogadoId).filter((nomeacao) => nomeacao.casoId === casoId);
}

export async function criarNomeacao(advogadoId: string, dados: DadosDaNomeacao): Promise<Nomeacao> {
  const textoOriginal = texto(dados.textoOriginal, 12000);
  if (!textoOriginal) throw new ErroEscritorio("Cole o texto original da nomeação.");
  const momento = agora();
  const nomeacao: Nomeacao = {
    id: novoId(), advogadoId, textoOriginal, camposExtraidos: normalizarCamposExtraidos(dados.camposExtraidos),
    checklist: normalizarChecklistDaNomeacao(dados.checklist, true), estado: dados.estado === undefined ? "aberta" : validarEstadoDaNomeacao(dados.estado),
    casoId: normalizarCasoIdOpcional(advogadoId, dados.casoId), criadoEm: momento, atualizadoEm: momento,
  };
  await alterar<Nomeacao>(NOMEACOES, (nomeacoes) => { nomeacoes.push(nomeacao); });
  return nomeacao;
}

export type CamposDaNomeacao = Partial<Pick<Nomeacao, "camposExtraidos" | "checklist" | "estado" | "casoId">>;

export async function atualizarNomeacao(advogadoId: string, nomeacaoId: string, campos: CamposDaNomeacao): Promise<Nomeacao> {
  const casoId = campos.casoId === undefined ? undefined : normalizarCasoIdOpcional(advogadoId, campos.casoId);
  let atualizada = null as Nomeacao | null;
  await alterar<Nomeacao>(NOMEACOES, (nomeacoes) => {
    const nomeacao = nomeacoes.find((item) => item.id === nomeacaoId && item.advogadoId === advogadoId);
    if (!nomeacao) throw new ErroEscritorio("Nomeação não encontrada.", 404);
    if (campos.camposExtraidos !== undefined) nomeacao.camposExtraidos = normalizarCamposExtraidos(campos.camposExtraidos);
    if (campos.checklist !== undefined) nomeacao.checklist = normalizarChecklistDaNomeacao(campos.checklist);
    if (campos.estado !== undefined) nomeacao.estado = validarEstadoDaNomeacao(campos.estado);
    if (casoId !== undefined) nomeacao.casoId = casoId;
    nomeacao.atualizadoEm = agora();
    atualizada = nomeacao;
  });
  if (!atualizada) throw new ErroEscritorio("Nomeação não encontrada.", 404);
  return atualizada;
}

export async function removerNomeacao(advogadoId: string, nomeacaoId: string): Promise<void> {
  let removida = false;
  await alterar<Nomeacao>(NOMEACOES, (nomeacoes) => nomeacoes.filter((nomeacao) => {
    const remover = nomeacao.id === nomeacaoId && nomeacao.advogadoId === advogadoId;
    removida ||= remover;
    return !remover;
  }));
  if (!removida) throw new ErroEscritorio("Nomeação não encontrada.", 404);
}

// ---- Clientes ------------------------------------------------------------

export function listarClientes(advogadoId: string): Cliente[] {
  return listar<Cliente>(CLIENTES).filter((cliente) => cliente.advogadoId === advogadoId).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function clientePorId(advogadoId: string, id: string): Cliente | null {
  return listar<Cliente>(CLIENTES).find((cliente) => cliente.id === id && cliente.advogadoId === advogadoId) ?? null;
}

export function clientePorTelefone(advogadoId: string, telefone: string): Cliente | null {
  const digitos = (telefone ?? "").replace(/\D/g, "");
  if (!digitos) return null;
  return listar<Cliente>(CLIENTES).find((cliente) => cliente.advogadoId === advogadoId && cliente.telefone === digitos) ?? null;
}

export async function criarCliente(advogadoId: string, dados: { nome: string; telefone: string; email?: string | null; observacoes?: string }): Promise<Cliente> {
  const nome = texto(dados.nome, 200);
  if (!nome) throw new ErroEscritorio("Informe o nome do cliente.");
  const cliente: Cliente = {
    id: novoId(),
    advogadoId,
    nome,
    telefone: normalizarTelefone(dados.telefone),
    email: textoOuNulo(dados.email),
    observacoes: texto(dados.observacoes, 3000),
    criadoEm: agora(),
  };
  await alterar<Cliente>(CLIENTES, (clientes) => { clientes.push(cliente); });
  return cliente;
}

export async function atualizarCliente(advogadoId: string, id: string, campos: Partial<Pick<Cliente, "nome" | "telefone" | "email" | "observacoes">>): Promise<Cliente> {
  let atualizado = null as Cliente | null;
  await alterar<Cliente>(CLIENTES, (clientes) => {
    const cliente = clientes.find((item) => item.id === id && item.advogadoId === advogadoId);
    if (!cliente) throw new ErroEscritorio("Cliente não encontrado.", 404);
    if (campos.nome !== undefined) {
      const nome = texto(campos.nome, 200);
      if (!nome) throw new ErroEscritorio("O nome não pode ficar vazio.");
      cliente.nome = nome;
    }
    if (campos.telefone !== undefined) cliente.telefone = normalizarTelefone(campos.telefone);
    if (campos.email !== undefined) cliente.email = textoOuNulo(campos.email);
    if (campos.observacoes !== undefined) cliente.observacoes = texto(campos.observacoes, 3000);
    atualizado = cliente;
  });
  if (!atualizado) throw new ErroEscritorio("Cliente não encontrado.", 404);
  return atualizado;
}

// ---- Documentos ----------------------------------------------------------

export function documentosDoCaso(advogadoId: string, casoId: string): Documento[] {
  exigirCaso(advogadoId, casoId);
  return listar<Documento>(DOCUMENTOS).filter((documento) => documento.casoId === casoId);
}

export async function adicionarDocumento(advogadoId: string, casoId: string, dados: { nome: string; detalhe?: string; essencial?: boolean }): Promise<Documento> {
  exigirCaso(advogadoId, casoId);
  const nome = texto(dados.nome, 200);
  if (!nome) throw new ErroEscritorio("Dê um nome ao documento.");
  const documento: Documento = { id: novoId(), casoId, nome, detalhe: texto(dados.detalhe, 500), essencial: Boolean(dados.essencial), recebido: false, atualizadoEm: agora() };
  await alterar<Documento>(DOCUMENTOS, (documentos) => { documentos.push(documento); });
  await marcarAtualizado(casoId);
  return documento;
}

export async function atualizarDocumento(advogadoId: string, casoId: string, id: string, campos: Partial<Pick<Documento, "nome" | "detalhe" | "essencial" | "recebido">>): Promise<Documento> {
  exigirCaso(advogadoId, casoId);
  let atualizado = null as Documento | null;
  await alterar<Documento>(DOCUMENTOS, (documentos) => {
    const documento = documentos.find((item) => item.id === id && item.casoId === casoId);
    if (!documento) throw new ErroEscritorio("Documento não encontrado.", 404);
    if (campos.nome !== undefined) {
      const nome = texto(campos.nome, 200);
      if (!nome) throw new ErroEscritorio("O nome do documento não pode ficar vazio.");
      documento.nome = nome;
    }
    if (campos.detalhe !== undefined) documento.detalhe = texto(campos.detalhe, 500);
    if (campos.essencial !== undefined) documento.essencial = Boolean(campos.essencial);
    if (campos.recebido !== undefined) documento.recebido = Boolean(campos.recebido);
    documento.atualizadoEm = agora();
    atualizado = documento;
  });
  if (!atualizado) throw new ErroEscritorio("Documento não encontrado.", 404);
  await marcarAtualizado(casoId);
  return atualizado;
}

// ---- Tarefas -------------------------------------------------------------

export function tarefasDoCaso(advogadoId: string, casoId: string): Tarefa[] {
  exigirCaso(advogadoId, casoId);
  return listar<Tarefa>(TAREFAS).filter((tarefa) => tarefa.casoId === casoId).sort((a, b) => {
    if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
    return (a.prazo ?? "9999").localeCompare(b.prazo ?? "9999") || a.criadoEm.localeCompare(b.criadoEm);
  });
}

export async function adicionarTarefa(advogadoId: string, casoId: string, dados: { titulo: string; prazo?: string | null }): Promise<Tarefa> {
  exigirCaso(advogadoId, casoId);
  const titulo = texto(dados.titulo, 200);
  if (!titulo) throw new ErroEscritorio("Escreva o que precisa ser feito.");
  const tarefa: Tarefa = { id: novoId(), casoId, titulo, prazo: normalizarData(dados.prazo), concluida: false, criadoEm: agora() };
  await alterar<Tarefa>(TAREFAS, (tarefas) => { tarefas.push(tarefa); });
  await marcarAtualizado(casoId);
  return tarefa;
}

export async function atualizarTarefa(advogadoId: string, casoId: string, id: string, campos: Partial<Pick<Tarefa, "titulo" | "prazo" | "concluida">>): Promise<Tarefa> {
  exigirCaso(advogadoId, casoId);
  let atualizada = null as Tarefa | null;
  await alterar<Tarefa>(TAREFAS, (tarefas) => {
    const tarefa = tarefas.find((item) => item.id === id && item.casoId === casoId);
    if (!tarefa) throw new ErroEscritorio("Tarefa não encontrada.", 404);
    if (campos.titulo !== undefined) {
      const titulo = texto(campos.titulo, 200);
      if (!titulo) throw new ErroEscritorio("O título da tarefa não pode ficar vazio.");
      tarefa.titulo = titulo;
    }
    if (campos.prazo !== undefined) tarefa.prazo = normalizarData(campos.prazo);
    if (campos.concluida !== undefined) tarefa.concluida = Boolean(campos.concluida);
    atualizada = tarefa;
  });
  if (!atualizada) throw new ErroEscritorio("Tarefa não encontrada.", 404);
  await marcarAtualizado(casoId);
  return atualizada;
}

// ---- Registros (linha do tempo) -----------------------------------------

export function registrosDoCaso(advogadoId: string, casoId: string): Registro[] {
  exigirCaso(advogadoId, casoId);
  return listar<Registro>(REGISTROS).filter((registro) => registro.casoId === casoId).sort(porDataDesc<Registro>("quando"));
}

export async function registrar(advogadoId: string, casoId: string, tipo: TipoRegistro, textoDoRegistro: string): Promise<Registro> {
  exigirCaso(advogadoId, casoId);
  const conteudo = texto(textoDoRegistro, 5000);
  if (!conteudo) throw new ErroEscritorio("Escreva o registro.");
  const registro: Registro = { id: novoId(), casoId, tipo, texto: conteudo, quando: agora() };
  await alterar<Registro>(REGISTROS, (registros) => { registros.push(registro); });
  await marcarAtualizado(casoId);
  return registro;
}

// ---- Triagens ------------------------------------------------------------

export function triagensDoCaso(advogadoId: string, casoId: string): Triagem[] {
  exigirCaso(advogadoId, casoId);
  return listar<Triagem>(TRIAGENS).filter((triagem) => triagem.casoId === casoId).sort(porDataDesc<Triagem>("quando"));
}

export async function guardarTriagem(advogadoId: string, casoId: string, resultado: Resultado): Promise<Triagem> {
  exigirCaso(advogadoId, casoId);
  const triagem: Triagem = { id: novoId(), casoId, quando: agora(), resultado };
  await alterar<Triagem>(TRIAGENS, (triagens) => { triagens.push(triagem); });
  await marcarAtualizado(casoId);
  return triagem;
}

// ---- Eventos -------------------------------------------------------------

export function eventosDoCaso(advogadoId: string, casoId: string): EventoDoCaso[] {
  exigirCaso(advogadoId, casoId);
  return listar<EventoDoCaso>(EVENTOS).filter((evento) => evento.casoId === casoId).sort(porDataDesc<EventoDoCaso>("atualizadoEm"));
}

export type DadosDoEvento = { tipo: TipoDeEvento; titulo: string; descricao?: string; data?: string | null; prazoInformado?: string | null };

export async function adicionarEvento(advogadoId: string, casoId: string, dados: DadosDoEvento): Promise<EventoDoCaso> {
  exigirCaso(advogadoId, casoId);
  const titulo = texto(dados.titulo, 200);
  if (!titulo) throw new ErroEscritorio("Dê um título ao evento.");
  const momento = agora();
  const evento: EventoDoCaso = {
    id: novoId(), casoId, tipo: validarTipoDeEvento(dados.tipo), titulo, descricao: texto(dados.descricao, 3000),
    // A data e o prazo são apenas o que o advogado informou; nunca são calculados aqui.
    data: normalizarData(dados.data), prazoInformado: textoOuNulo(dados.prazoInformado, 500), criadoEm: momento, atualizadoEm: momento,
  };
  await alterar<EventoDoCaso>(EVENTOS, (eventos) => { eventos.push(evento); });
  await marcarAtualizado(casoId);
  return evento;
}

export type CamposDoEvento = Partial<Pick<EventoDoCaso, "tipo" | "titulo" | "descricao" | "data" | "prazoInformado">>;

export async function atualizarEvento(advogadoId: string, casoId: string, eventoId: string, campos: CamposDoEvento): Promise<EventoDoCaso> {
  exigirCaso(advogadoId, casoId);
  let atualizado = null as EventoDoCaso | null;
  await alterar<EventoDoCaso>(EVENTOS, (eventos) => {
    const evento = eventos.find((item) => item.id === eventoId && item.casoId === casoId);
    if (!evento) throw new ErroEscritorio("Evento não encontrado.", 404);
    if (campos.tipo !== undefined) evento.tipo = validarTipoDeEvento(campos.tipo);
    if (campos.titulo !== undefined) {
      const titulo = texto(campos.titulo, 200);
      if (!titulo) throw new ErroEscritorio("O título do evento não pode ficar vazio.");
      evento.titulo = titulo;
    }
    if (campos.descricao !== undefined) evento.descricao = texto(campos.descricao, 3000);
    if (campos.data !== undefined) evento.data = normalizarData(campos.data);
    if (campos.prazoInformado !== undefined) evento.prazoInformado = textoOuNulo(campos.prazoInformado, 500);
    evento.atualizadoEm = agora();
    atualizado = evento;
  });
  if (!atualizado) throw new ErroEscritorio("Evento não encontrado.", 404);
  await marcarAtualizado(casoId);
  return atualizado;
}

export async function removerEvento(advogadoId: string, casoId: string, eventoId: string): Promise<void> {
  exigirCaso(advogadoId, casoId);
  let removido = false;
  await alterar<EventoDoCaso>(EVENTOS, (eventos) => eventos.filter((evento) => {
    const remover = evento.id === eventoId && evento.casoId === casoId;
    removido ||= remover;
    return !remover;
  }));
  if (!removido) throw new ErroEscritorio("Evento não encontrado.", 404);
  await marcarAtualizado(casoId);
}

// ---- Honorários ----------------------------------------------------------

function normalizarEtapasDeHonorario(valor: unknown): EtapaDeHonorario[] {
  if (!Array.isArray(valor)) throw new ErroEscritorio("As etapas dos honorários devem ser uma lista.");
  return valor.slice(0, 50).map((item) => {
    const campos = objeto(item);
    const titulo = texto(campos?.titulo, 300);
    if (!titulo) throw new ErroEscritorio("Cada etapa dos honorários precisa de um título.");
    return { id: texto(campos?.id, 100) || novoId(), titulo, concluida: Boolean(campos?.concluida) };
  });
}

function normalizarPendenciasDeHonorario(valor: unknown): PendenciaDeHonorario[] {
  if (!Array.isArray(valor)) throw new ErroEscritorio("As pendências dos honorários devem ser uma lista.");
  return valor.slice(0, 50).map((item) => {
    const campos = objeto(item);
    const descricao = texto(campos?.descricao, 1000);
    if (!descricao) throw new ErroEscritorio("Cada pendência dos honorários precisa de uma descrição.");
    return { id: texto(campos?.id, 100) || novoId(), descricao, resolvida: Boolean(campos?.resolvida) };
  });
}

function normalizarRegistrosDeHonorario(valor: unknown): RegistroDeHonorario[] {
  if (!Array.isArray(valor)) throw new ErroEscritorio("Os registros dos honorários devem ser uma lista.");
  return valor.slice(0, 100).map((item) => {
    const campos = objeto(item);
    const textoDoRegistro = texto(campos?.texto, 3000);
    if (!textoDoRegistro) throw new ErroEscritorio("Cada registro dos honorários precisa de um texto.");
    return { id: texto(campos?.id, 100) || novoId(), texto: textoDoRegistro, quando: texto(campos?.quando, 40) || agora() };
  });
}

export type DadosDosHonorarios = { etapas?: unknown; pendencias?: unknown; registros?: unknown };

export function honorariosDoCaso(advogadoId: string, casoId: string): HonorariosDoCaso | null {
  exigirCaso(advogadoId, casoId);
  return listar<HonorariosDoCaso>(HONORARIOS).find((honorarios) => honorarios.casoId === casoId) ?? null;
}

export async function criarHonorariosDoCaso(advogadoId: string, casoId: string, dados: DadosDosHonorarios = {}): Promise<HonorariosDoCaso> {
  exigirCaso(advogadoId, casoId);
  if (honorariosDoCaso(advogadoId, casoId)) throw new ErroEscritorio("Os honorários deste caso já foram registrados.", 409);
  const momento = agora();
  const honorarios: HonorariosDoCaso = {
    id: novoId(), casoId, etapas: dados.etapas === undefined ? [] : normalizarEtapasDeHonorario(dados.etapas),
    pendencias: dados.pendencias === undefined ? [] : normalizarPendenciasDeHonorario(dados.pendencias),
    registros: dados.registros === undefined ? [] : normalizarRegistrosDeHonorario(dados.registros), criadoEm: momento, atualizadoEm: momento,
  };
  await alterar<HonorariosDoCaso>(HONORARIOS, (itens) => { itens.push(honorarios); });
  await marcarAtualizado(casoId);
  return honorarios;
}

export async function atualizarHonorariosDoCaso(advogadoId: string, casoId: string, campos: DadosDosHonorarios): Promise<HonorariosDoCaso> {
  exigirCaso(advogadoId, casoId);
  let atualizado = null as HonorariosDoCaso | null;
  await alterar<HonorariosDoCaso>(HONORARIOS, (itens) => {
    const honorarios = itens.find((item) => item.casoId === casoId);
    if (!honorarios) throw new ErroEscritorio("Honorários não encontrados.", 404);
    if (campos.etapas !== undefined) honorarios.etapas = normalizarEtapasDeHonorario(campos.etapas);
    if (campos.pendencias !== undefined) honorarios.pendencias = normalizarPendenciasDeHonorario(campos.pendencias);
    if (campos.registros !== undefined) honorarios.registros = normalizarRegistrosDeHonorario(campos.registros);
    honorarios.atualizadoEm = agora();
    atualizado = honorarios;
  });
  if (!atualizado) throw new ErroEscritorio("Honorários não encontrados.", 404);
  await marcarAtualizado(casoId);
  return atualizado;
}

export async function removerHonorariosDoCaso(advogadoId: string, casoId: string): Promise<void> {
  exigirCaso(advogadoId, casoId);
  let removidos = 0;
  await alterar<HonorariosDoCaso>(HONORARIOS, (itens) => itens.filter((item) => {
    const remover = item.casoId === casoId;
    if (remover) removidos += 1;
    return !remover;
  }));
  if (removidos === 0) throw new ErroEscritorio("Honorários não encontrados.", 404);
  await marcarAtualizado(casoId);
}

// ---- Mensagens (WhatsApp) ------------------------------------------------

// `somenteAssistidos`: só conversas de quem está cadastrado como cliente do
// advogado. O número do escritório também recebe contato pessoal, e isso não
// é atendimento: a tela mostra só o assistido; o resto fica guardado e passa a
// aparecer quando a pessoa for cadastrada com aquele telefone.
export type FiltroDeMensagens = { contato?: string; casoId?: string; naoLidas?: boolean; somenteAssistidos?: boolean };

export function mensagensDo(advogadoId: string, filtro: FiltroDeMensagens = {}): Mensagem[] {
  const contato = filtro.contato ? filtro.contato.replace(/\D/g, "") : null;
  const telefonesDeAssistidos = filtro.somenteAssistidos
    ? new Set(listar<Cliente>(CLIENTES).filter((cliente) => cliente.advogadoId === advogadoId).map((cliente) => cliente.telefone))
    : null;
  return listar<Mensagem>(MENSAGENS)
    .filter((mensagem) => mensagem.advogadoId === advogadoId)
    .filter((mensagem) => !telefonesDeAssistidos || telefonesDeAssistidos.has(mensagem.contato))
    .filter((mensagem) => !contato || mensagem.contato === contato)
    .filter((mensagem) => !filtro.casoId || mensagem.casoId === filtro.casoId)
    .filter((mensagem) => !filtro.naoLidas || (!mensagem.lida && !mensagem.deMim))
    .sort(porDataAsc<Mensagem>("quando"));
}

export type NovaMensagem = Omit<Mensagem, "id"> & { id?: string };

// Idempotente pelo `idExterno`: a Evolution pode reenviar o mesmo evento e o
// advogado não pode ver a mensagem duplicada.
export async function guardarMensagem(dados: NovaMensagem): Promise<Mensagem> {
  const contato = (dados.contato ?? "").replace(/\D/g, "");
  if (!dados.advogadoId || !contato) throw new ErroEscritorio("Mensagem sem advogado ou sem contato.");
  const mensagem: Mensagem = {
    id: dados.id ?? novoId(),
    advogadoId: dados.advogadoId,
    instancia: texto(dados.instancia, 100),
    contato,
    nomeContato: textoOuNulo(dados.nomeContato, 200),
    texto: texto(dados.texto, 10000),
    deMim: Boolean(dados.deMim),
    quando: dados.quando || agora(),
    casoId: dados.casoId ?? null,
    lida: Boolean(dados.lida) || Boolean(dados.deMim),
    idExterno: textoOuNulo(dados.idExterno, 200),
    ...(dados.doEstagiario ? { doEstagiario: true } : {}),
  };
  let guardada = mensagem;
  await alterar<Mensagem>(MENSAGENS, (mensagens) => {
    const existente = mensagem.idExterno
      ? mensagens.find((item) => item.advogadoId === mensagem.advogadoId && item.idExterno === mensagem.idExterno)
      : undefined;
    if (existente) { guardada = existente; return; }
    mensagens.push(mensagem);
  });
  return guardada;
}

export async function marcarLidas(advogadoId: string, contato: string): Promise<number> {
  const digitos = (contato ?? "").replace(/\D/g, "");
  let marcadas = 0;
  await alterar<Mensagem>(MENSAGENS, (mensagens) => {
    for (const mensagem of mensagens) {
      if (mensagem.advogadoId === advogadoId && mensagem.contato === digitos && !mensagem.lida) {
        mensagem.lida = true;
        marcadas += 1;
      }
    }
  });
  return marcadas;
}

export async function vincularMensagens(advogadoId: string, contato: string, casoId: string): Promise<number> {
  exigirCaso(advogadoId, casoId);
  const digitos = (contato ?? "").replace(/\D/g, "");
  let vinculadas = 0;
  await alterar<Mensagem>(MENSAGENS, (mensagens) => {
    for (const mensagem of mensagens) {
      if (mensagem.advogadoId === advogadoId && mensagem.contato === digitos && mensagem.casoId !== casoId) {
        mensagem.casoId = casoId;
        vinculadas += 1;
      }
    }
  });
  return vinculadas;
}

// ---- Processos -----------------------------------------------------------

export function processosDo(advogadoId: string): Processo[] {
  return listar<Processo>(PROCESSOS).filter((processo) => processo.advogadoId === advogadoId).sort(porDataDesc<Processo>("consultadoEm"));
}

export type NovoProcesso = Omit<Processo, "id" | "consultadoEm"> & { id?: string; consultadoEm?: string };

// Um registro por número e advogado: consultar de novo atualiza o andamento
// em vez de acumular linhas.
export async function guardarProcesso(dados: NovoProcesso): Promise<Processo> {
  const numero = (dados.numero ?? "").replace(/\D/g, "");
  if (!dados.advogadoId || !numero) throw new ErroEscritorio("Processo sem advogado ou sem número.");
  if (dados.casoId) exigirCaso(dados.advogadoId, dados.casoId);
  let guardado = null as Processo | null;
  await alterar<Processo>(PROCESSOS, (processos) => {
    const existente = processos.find((item) => item.advogadoId === dados.advogadoId && item.numero === numero);
    const atualizado: Processo = {
      id: existente?.id ?? dados.id ?? novoId(),
      advogadoId: dados.advogadoId,
      casoId: dados.casoId ?? existente?.casoId ?? null,
      numero,
      classe: textoOuNulo(dados.classe),
      orgao: textoOuNulo(dados.orgao),
      ultimoMovimento: textoOuNulo(dados.ultimoMovimento, 2000),
      dataMovimento: textoOuNulo(dados.dataMovimento, 40),
      consultadoEm: dados.consultadoEm || agora(),
    };
    if (existente) Object.assign(existente, atualizado);
    else processos.push(atualizado);
    guardado = atualizado;
  });
  if (!guardado) throw new ErroEscritorio("Não foi possível guardar o processo.", 500);
  return guardado;
}

// ---- Resumo do painel ----------------------------------------------------

export type ResumoDoEscritorio = {
  casosAbertos: number;
  prazosProximos: Array<{ casoId: string; titulo: string; prazo: string }>;
  mensagensNovas: number;
  documentosPendentes: number;
};

export function resumoDoEscritorio(advogadoId: string): ResumoDoEscritorio {
  const casos = listarCasos(advogadoId);
  const abertos = casos.filter((caso) => caso.situacao !== "concluido");
  const idsAbertos = new Set(abertos.map((caso) => caso.id));

  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const limite = new Date(inicio);
  limite.setDate(limite.getDate() + 7);
  const dentroDaJanela = (prazo: string) => {
    const data = new Date(`${prazo}T00:00:00`);
    return data >= inicio && data <= limite;
  };

  const prazosProximos = abertos
    .filter((caso) => caso.prazo && dentroDaJanela(caso.prazo))
    .map((caso) => ({ casoId: caso.id, titulo: caso.titulo, prazo: caso.prazo as string }));
  const tarefas = listar<Tarefa>(TAREFAS).filter((tarefa) => idsAbertos.has(tarefa.casoId) && !tarefa.concluida && tarefa.prazo && dentroDaJanela(tarefa.prazo));
  for (const tarefa of tarefas) {
    const caso = abertos.find((item) => item.id === tarefa.casoId);
    if (caso) prazosProximos.push({ casoId: caso.id, titulo: `${caso.titulo}: ${tarefa.titulo}`, prazo: tarefa.prazo as string });
  }
  prazosProximos.sort((a, b) => a.prazo.localeCompare(b.prazo));

  return {
    casosAbertos: abertos.length,
    prazosProximos,
    mensagensNovas: mensagensDo(advogadoId, { naoLidas: true, somenteAssistidos: true }).length,
    documentosPendentes: listar<Documento>(DOCUMENTOS).filter((documento) => idsAbertos.has(documento.casoId) && !documento.recebido).length,
  };
}

// ---- Composições para as telas de casos ---------------------------------

export type CasoComDetalhes = Caso & { cliente: Cliente | null; ultimoRegistro: Registro | null };

// Lista do painel: cada caso com o cliente e o último registro da linha do
// tempo, lendo cada coleção uma vez só.
export function listarCasosComDetalhes(advogadoId: string, filtro: { situacao?: Situacao } = {}): CasoComDetalhes[] {
  const casos = listarCasos(advogadoId).filter((caso) => !filtro.situacao || caso.situacao === filtro.situacao);
  const clientes = new Map(listarClientes(advogadoId).map((cliente) => [cliente.id, cliente]));
  const ultimos = new Map<string, Registro>();
  for (const registro of listar<Registro>(REGISTROS)) {
    const atual = ultimos.get(registro.casoId);
    if (!atual || registro.quando > atual.quando) ultimos.set(registro.casoId, registro);
  }
  return casos.map((caso) => ({
    ...caso,
    cliente: caso.clienteId ? clientes.get(caso.clienteId) ?? null : null,
    ultimoRegistro: ultimos.get(caso.id) ?? null,
  }));
}

export type DossieDoCaso = {
  caso: Caso;
  cliente: Cliente | null;
  documentos: Documento[];
  tarefas: Tarefa[];
  registros: Registro[];
  triagens: Triagem[];
  processo: Processo | null;
  mensagens: Mensagem[];
  nomeacoes: Nomeacao[];
  eventos: EventoDoCaso[];
  honorarios: HonorariosDoCaso | null;
};

// Tudo que a página do caso mostra, numa leitura só. null se o caso não é
// desse advogado (para ele, o caso não existe).
export function dossieDoCaso(advogadoId: string, casoId: string): DossieDoCaso | null {
  const caso = casoPorId(advogadoId, casoId);
  if (!caso) return null;
  const processos = processosDo(advogadoId);
  const processo = processos.find((item) => item.casoId === casoId)
    ?? (caso.processo ? processos.find((item) => item.numero === caso.processo) : undefined)
    ?? null;
  return {
    caso,
    cliente: caso.clienteId ? clientePorId(advogadoId, caso.clienteId) : null,
    documentos: documentosDoCaso(advogadoId, casoId),
    tarefas: tarefasDoCaso(advogadoId, casoId),
    registros: registrosDoCaso(advogadoId, casoId),
    triagens: triagensDoCaso(advogadoId, casoId),
    processo,
    mensagens: mensagensDo(advogadoId, { casoId }),
    nomeacoes: nomeacoesDoCaso(advogadoId, casoId),
    eventos: eventosDoCaso(advogadoId, casoId),
    honorarios: honorariosDoCaso(advogadoId, casoId),
  };
}

// ----------------------------------------------------------- assinaturas

export function assinaturasDo(advogadoId: string): Assinatura[] {
  return listar<Assinatura>(ASSINATURAS).filter((item) => item.advogadoId === advogadoId).sort(porDataDesc<Assinatura>("quando"));
}

export function assinaturasDoCaso(advogadoId: string, casoId: string): Assinatura[] {
  exigirCaso(advogadoId, casoId);
  return assinaturasDo(advogadoId).filter((item) => item.casoId === casoId);
}

// O servidor confere o hash do conteúdo antes de guardar: assinatura que não
// corresponde ao texto recebido não entra. Ele não valida a cadeia ICP-Brasil —
// isso é trabalho de quem recebe a peça, e está escrito na tela.
export async function registrarAssinatura(advogadoId: string, dados: {
  casoId?: string | null;
  documento: string;
  conteudo: string;
  hash: string;
  assinatura: string;
  certificado: string;
  origem: "a3" | "demonstracao";
}): Promise<Assinatura> {
  const documento = texto(dados.documento, 200);
  const conteudo = texto(dados.conteudo, 20000);
  if (!documento) throw new ErroEscritorio("Diga o que está sendo assinado.");
  if (!conteudo) throw new ErroEscritorio("Não há conteúdo para assinar.");
  if (dados.casoId) exigirCaso(advogadoId, dados.casoId);

  const conferido = createHash("sha256").update(conteudo, "utf8").digest("hex");
  if (conferido !== (dados.hash ?? "").toLowerCase()) {
    throw new ErroEscritorio("O hash não corresponde ao texto assinado.");
  }
  if (!/^[A-Za-z0-9+/=]{64,}$/.test(dados.assinatura ?? "")) {
    throw new ErroEscritorio("Assinatura inválida.");
  }

  const assinatura: Assinatura = {
    id: novoId(),
    advogadoId,
    casoId: dados.casoId ?? null,
    documento,
    conteudo,
    hash: conferido,
    assinatura: dados.assinatura,
    certificado: texto(dados.certificado, 300) || "Certificado sem identificação",
    origem: dados.origem === "a3" ? "a3" : "demonstracao",
    quando: agora(),
  };
  await alterar<Assinatura>(ASSINATURAS, (itens) => { itens.push(assinatura); });
  if (assinatura.casoId) {
    await registrar(advogadoId, assinatura.casoId, "registro", `Documento assinado com certificado digital: ${documento}.`);
  }
  return assinatura;
}
