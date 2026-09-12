import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Banco de dados da plataforma: um arquivo JSON por coleção em `data/`, fora
// do git. Não há servidor de banco de propósito: o hackathon precisa rodar em
// qualquer máquina com `npm run dev`. Toda leitura e escrita passa por aqui.
//
// Escrita segura: grava num arquivo temporário e renomeia por cima, para o
// JSON nunca ficar pela metade se o processo cair. Escritas na mesma coleção
// entram numa fila, uma de cada vez, para uma não sobrescrever a outra.

const PASTA = join(process.cwd(), "data");
const NOME_VALIDO = /^[a-z0-9][a-z0-9-]*$/;
const filas = new Map<string, Promise<unknown>>();

function caminho(colecao: string) {
  if (!NOME_VALIDO.test(colecao)) throw new Error(`Nome de coleção inválido: ${colecao}`);
  return join(PASTA, `${colecao}.json`);
}

export function listar<T>(colecao: string): T[] {
  try {
    const dados = JSON.parse(readFileSync(caminho(colecao), "utf8")) as unknown;
    return Array.isArray(dados) ? (dados as T[]) : [];
  } catch {
    return [];
  }
}

function gravar<T>(colecao: string, itens: T[]) {
  const destino = caminho(colecao);
  mkdirSync(PASTA, { recursive: true });
  const temporario = `${destino}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporario, JSON.stringify(itens, null, 2) + "\n");
  renameSync(temporario, destino);
}

// Lê a coleção, aplica `fn` e grava o resultado. `fn` pode devolver a lista
// nova ou alterar a recebida no lugar (e não devolver nada).
export function alterar<T>(colecao: string, fn: (itens: T[]) => T[] | void): Promise<T[]> {
  const anterior = filas.get(colecao) ?? Promise.resolve();
  const tarefa = anterior
    .catch(() => undefined)
    .then(() => {
      const itens = listar<T>(colecao);
      const resultado = fn(itens);
      const novos = resultado ?? itens;
      gravar(colecao, novos);
      return novos;
    });
  filas.set(colecao, tarefa);
  return tarefa;
}

export function novoId(): string {
  return randomUUID();
}

export function agora(): string {
  return new Date().toISOString();
}
