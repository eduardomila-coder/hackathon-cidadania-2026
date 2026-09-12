#!/usr/bin/env node
// Contas de advogado pela linha de comando, sem passar pelo painel.
//
//   node scripts/advogado.mjs criar "Nome" "OAB/PR 12345" usuario senha
//   node scripts/advogado.mjs listar
//   node scripts/advogado.mjs senha usuario nova-senha
//   node scripts/advogado.mjs desativar usuario
//   node scripts/advogado.mjs ativar usuario
//
// Grava direto em data/advogados.json, no mesmo formato de lib/contas.ts:
// senha como `scrypt$sal$hash` (hex), N=16384, r=8, p=1, 64 bytes. Rode com
// o servidor parado ou logo antes de subir: o app lê o arquivo a cada pedido,
// mas duas escritas ao mesmo tempo podem se atropelar.

import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PASTA = join(RAIZ, "data");
const ARQUIVO = join(PASTA, "advogados.json");
const SENHA_MINIMA = 8;
const PARAMETROS_SCRYPT = { N: 16384, r: 8, p: 1 };

function ler() {
  try {
    const dados = JSON.parse(readFileSync(ARQUIVO, "utf8"));
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

function gravar(lista) {
  mkdirSync(PASTA, { recursive: true });
  const temporario = `${ARQUIVO}.${process.pid}.tmp`;
  writeFileSync(temporario, JSON.stringify(lista, null, 2) + "\n");
  renameSync(temporario, ARQUIVO);
}

function gerarHash(senha) {
  const sal = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, sal, 64, PARAMETROS_SCRYPT).toString("hex");
  return `scrypt$${sal}$${hash}`;
}

function falhar(mensagem) {
  console.error(`Erro: ${mensagem}`);
  process.exit(1);
}

function validarSenha(senha) {
  if (!senha || senha.length < SENHA_MINIMA) falhar(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`);
}

function acharPorUsuario(lista, usuario) {
  const procurado = (usuario ?? "").trim().toLowerCase();
  const advogado = lista.find((item) => item.usuario === procurado);
  if (!advogado) falhar(`Não há advogado com o usuário "${procurado}".`);
  return advogado;
}

function criar([nome, oab, usuario, senha]) {
  const usuarioLimpo = (usuario ?? "").trim().toLowerCase();
  if (!nome?.trim()) falhar("Informe o nome do advogado.");
  if (!oab?.trim()) falhar("Informe o número da OAB.");
  if (!/^[a-z0-9][a-z0-9._-]{1,39}$/.test(usuarioLimpo)) falhar("O usuário deve ter de 2 a 40 caracteres: letras minúsculas, números, ponto, traço ou sublinhado, sem espaço.");
  validarSenha(senha);

  const lista = ler();
  if (lista.some((item) => item.usuario === usuarioLimpo)) falhar(`Já existe um advogado com o usuário "${usuarioLimpo}".`);

  const novo = {
    id: randomUUID(),
    nome: nome.trim(),
    oab: oab.trim(),
    usuario: usuarioLimpo,
    senha: gerarHash(senha),
    criadoEm: new Date().toISOString(),
    criadoPor: `script:${process.env.USER ?? "terminal"}`,
    ativo: true,
  };
  gravar([...lista, novo]);
  console.log(`Advogado criado: ${novo.nome} (${novo.oab}), usuário "${novo.usuario}".`);
  console.log("Passe usuário e senha ao advogado; ele entra em /entrar.");
}

function listarTodos() {
  const lista = ler();
  if (lista.length === 0) {
    console.log("Nenhum advogado cadastrado ainda.");
    return;
  }
  for (const item of lista) {
    console.log(`${item.ativo ? "ativo   " : "inativo "} ${item.usuario.padEnd(20)} ${item.nome} · ${item.oab} · criado em ${item.criadoEm.slice(0, 10)} por ${item.criadoPor}`);
  }
}

function trocarSenha([usuario, senha]) {
  validarSenha(senha);
  const lista = ler();
  const advogado = acharPorUsuario(lista, usuario);
  advogado.senha = gerarHash(senha);
  gravar(lista);
  console.log(`Senha de "${advogado.usuario}" trocada.`);
}

function definirAtivo([usuario], ativo) {
  const lista = ler();
  const advogado = acharPorUsuario(lista, usuario);
  advogado.ativo = ativo;
  gravar(lista);
  console.log(`Conta "${advogado.usuario}" ${ativo ? "ativada" : "desativada"}.`);
}

const [comando, ...argumentos] = process.argv.slice(2);
switch (comando) {
  case "criar": criar(argumentos); break;
  case "listar": listarTodos(); break;
  case "senha": trocarSenha(argumentos); break;
  case "desativar": definirAtivo(argumentos, false); break;
  case "ativar": definirAtivo(argumentos, true); break;
  default:
    console.log("Uso:");
    console.log('  node scripts/advogado.mjs criar "Nome" "OAB/PR 12345" usuario senha');
    console.log("  node scripts/advogado.mjs listar");
    console.log("  node scripts/advogado.mjs senha usuario nova-senha");
    console.log("  node scripts/advogado.mjs desativar usuario");
    console.log("  node scripts/advogado.mjs ativar usuario");
    process.exit(comando ? 1 : 0);
}
