import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { agora, alterar, listar, novoId } from "./banco";

// Contas dos advogados da plataforma. Não há cadastro livre: a equipe cria
// a conta no painel (ou pelo `scripts/advogado.mjs`) e passa usuário e senha
// ao advogado. A senha fica só como hash scrypt; o objeto que sai daqui para
// qualquer tela ou API é sempre o `AdvogadoPublico`, sem o campo `senha`.

export type Advogado = {
  id: string;
  nome: string;
  oab: string;
  usuario: string;
  senha: string; // scrypt$sal$hash (hex), N=16384, r=8, p=1, 64 bytes
  criadoEm: string;
  criadoPor: string;
  ativo: boolean;
};

export type AdvogadoPublico = Omit<Advogado, "senha">;

export class ErroConta extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

const COLECAO = "advogados";
const SENHA_MINIMA = 8;
const PARAMETROS_SCRYPT = { N: 16384, r: 8, p: 1 };
const TAMANHO_HASH = 64;

function semSenha(advogado: Advogado): AdvogadoPublico {
  const { senha: _senha, ...publico } = advogado;
  void _senha;
  return publico;
}

function normalizarUsuario(entrada: string) {
  return entrada.trim().toLowerCase();
}

function validarUsuario(usuario: string) {
  if (!/^[a-z0-9][a-z0-9._-]{1,39}$/.test(usuario)) {
    throw new ErroConta("O usuário deve ter de 2 a 40 caracteres: letras minúsculas, números, ponto, traço ou sublinhado, sem espaço.");
  }
}

function validarSenha(senha: string) {
  if (typeof senha !== "string" || senha.length < SENHA_MINIMA) {
    throw new ErroConta(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
  }
}

export function gerarHash(senha: string): string {
  const sal = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, sal, TAMANHO_HASH, PARAMETROS_SCRYPT).toString("hex");
  return `scrypt$${sal}$${hash}`;
}

function conferirHash(senha: string, guardado: string): boolean {
  const [algoritmo, sal, hash] = guardado.split("$");
  if (algoritmo !== "scrypt" || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "hex");
  const calculado = scryptSync(senha, sal, esperado.length, PARAMETROS_SCRYPT);
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}

export async function criarAdvogado(dados: { nome: string; oab: string; usuario: string; senha: string; criadoPor: string }): Promise<AdvogadoPublico> {
  const nome = (dados.nome ?? "").trim();
  const oab = (dados.oab ?? "").trim();
  const usuario = normalizarUsuario(dados.usuario ?? "");
  if (!nome) throw new ErroConta("Informe o nome do advogado.");
  if (!oab) throw new ErroConta("Informe o número da OAB.");
  validarUsuario(usuario);
  validarSenha(dados.senha);

  const novo: Advogado = {
    id: novoId(),
    nome,
    oab,
    usuario,
    senha: gerarHash(dados.senha),
    criadoEm: agora(),
    criadoPor: (dados.criadoPor ?? "equipe").trim() || "equipe",
    ativo: true,
  };

  await alterar<Advogado>(COLECAO, (lista) => {
    if (lista.some((item) => item.usuario === usuario)) throw new ErroConta("Já existe um advogado com esse usuário.", 409);
    lista.push(novo);
  });
  return semSenha(novo);
}

// Confere usuário e senha. Devolve null para usuário desconhecido, senha
// errada ou conta desativada, sem dizer qual dos três: a mensagem de erro é
// a mesma para todos.
export function autenticar(usuario: string, senha: string): AdvogadoPublico | null {
  const procurado = normalizarUsuario(usuario ?? "");
  const advogado = listar<Advogado>(COLECAO).find((item) => item.usuario === procurado);
  if (!advogado || !advogado.ativo || typeof senha !== "string") return null;
  return conferirHash(senha, advogado.senha) ? semSenha(advogado) : null;
}

export function listarAdvogados(): AdvogadoPublico[] {
  return listar<Advogado>(COLECAO).map(semSenha);
}

export function advogadoPorId(id: string): AdvogadoPublico | null {
  const advogado = listar<Advogado>(COLECAO).find((item) => item.id === id);
  return advogado ? semSenha(advogado) : null;
}

export function advogadoPorUsuario(usuario: string): AdvogadoPublico | null {
  const procurado = normalizarUsuario(usuario ?? "");
  const advogado = listar<Advogado>(COLECAO).find((item) => item.usuario === procurado);
  return advogado ? semSenha(advogado) : null;
}

export async function definirSenha(id: string, senha: string): Promise<void> {
  validarSenha(senha);
  const hash = gerarHash(senha);
  await alterar<Advogado>(COLECAO, (lista) => {
    const advogado = lista.find((item) => item.id === id);
    if (!advogado) throw new ErroConta("Advogado não encontrado.", 404);
    advogado.senha = hash;
  });
}

export async function desativarAdvogado(id: string): Promise<void> {
  await definirAtivo(id, false);
}

export async function definirAtivo(id: string, ativo: boolean): Promise<void> {
  await alterar<Advogado>(COLECAO, (lista) => {
    const advogado = lista.find((item) => item.id === id);
    if (!advogado) throw new ErroConta("Advogado não encontrado.", 404);
    advogado.ativo = ativo;
  });
}
