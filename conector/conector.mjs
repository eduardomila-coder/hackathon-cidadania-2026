#!/usr/bin/env node
// Conector do Escritório Dativo: assina pelo certificado do advogado sem que a
// chave saia do computador dele.
//
// O desenho é o mesmo que a advocacia já usa para o token A3: o programa nunca
// vê a chave privada nem o PIN. Ele manda o *hash* do documento, o conector
// assina aqui dentro e devolve só a assinatura. Se este processo não estiver
// rodando, o escritório continua funcionando — apenas sem assinar.
//
// Uso:
//   node conector/conector.mjs                      (modo demonstração)
//   PKCS11=/caminho/do/driver.so node conector/conector.mjs   (token A3)
//
// Para o escritório aberto no endereço público, o navegador não alcança esta
// máquina — então é o conector que procura o escritório. Pegue a chave em
// Certificado digital → "Ligar este computador" e rode:
//
//   ESCRITORIO=https://habeastitas.eduardomila.adv.br CHAVE=pd_... node conector/conector.mjs
//
// O PIN, quando existe, é digitado aqui no terminal e fica só na memória deste
// processo. Não vai para arquivo, não vai para o servidor, não vai para log.

import { createServer } from "node:http";
import { createPrivateKey, privateEncrypt, constants } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createInterface } from "node:readline";

const rodar = promisify(execFile);
const PORTA = Number(process.env.PORTA ?? 8766);
const PASTA = join(homedir(), ".escritorio-dativo");
const VERSAO = "1.0.0";

// Origens que podem falar com o conector. O navegador do advogado é quem faz a
// ponte: a página do escritório pede a assinatura, o conector responde só para
// as origens conhecidas. Sem isso, qualquer site aberto no navegador poderia
// pedir uma assinatura.
const ORIGENS = new Set([
  "https://habeastitas.eduardomila.adv.br",
  "http://127.0.0.1:3000",
  "http://localhost:3000",
  "http://127.0.0.1:3100",
  ...(process.env.ORIGENS ? process.env.ORIGENS.split(",").map((o) => o.trim()) : []),
]);

// O prefixo ASN.1 do DigestInfo de SHA-256: é ele que transforma um hash em algo
// que uma chave RSA assina no padrão PKCS#1 v1.5, o mesmo que o token faz.
const PREFIXO_SHA256 = Buffer.from("3031300d060960864801650304020105000420", "hex");
const digestInfo = (hashHex) => Buffer.concat([PREFIXO_SHA256, Buffer.from(hashHex, "hex")]);

async function existe(caminho) {
  try { await access(caminho); return true; } catch { return false; }
}

function perguntarPin() {
  const leitor = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolver) => {
    leitor.question("PIN do token (fica só na memória deste processo): ", (resposta) => {
      leitor.close();
      resolver(resposta.trim());
    });
  });
}

// ---------------------------------------------------------------- modo A3

// Token de verdade, pelo driver PKCS#11 que o fabricante instala. Lista os
// certificados do token; a chave nunca é lida, só usada lá dentro.
async function certificadosDoToken(driver) {
  const { stdout } = await rodar("pkcs11-tool", ["--module", driver, "--list-objects", "--type", "cert"]);
  const certificados = [];
  let atual = null;
  for (const linha of stdout.split("\n")) {
    if (/^Certificate Object/.test(linha)) { atual = { origem: "a3" }; certificados.push(atual); continue; }
    if (!atual) continue;
    const rotulo = linha.match(/label:\s*(.+)$/);
    if (rotulo) atual.titular = rotulo[1].trim();
    const id = linha.match(/ID:\s*([0-9a-f]+)/i);
    if (id) atual.id = id[1];
  }
  return certificados.filter((certificado) => certificado.id);
}

async function assinarNoToken(driver, id, pin, hashHex) {
  const entrada = join(PASTA, "digest.bin");
  const saida = join(PASTA, "assinatura.bin");
  await writeFile(entrada, digestInfo(hashHex));
  await rodar("pkcs11-tool", [
    "--module", driver, "--sign", "--mechanism", "RSA-PKCS",
    "--id", id, "--pin", pin, "--input-file", entrada, "--output-file", saida,
  ]);
  return (await readFile(saida)).toString("base64");
}

// ------------------------------------------------------- modo demonstração

// Sem token plugado, o conector cria um par de chaves só desta máquina e um
// certificado autoassinado, para a tela poder ser demonstrada. Ele se anuncia
// como demonstração em toda resposta: não vale como ICP-Brasil e o escritório
// mostra isso na tela, para ninguém confundir com assinatura com fé pública.
async function garantirCertificadoDeDemonstracao() {
  const chave = join(PASTA, "demonstracao-chave.pem");
  const certificado = join(PASTA, "demonstracao-certificado.pem");
  if (await existe(chave) && await existe(certificado)) return { chave, certificado };
  await mkdir(PASTA, { recursive: true });
  await rodar("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-sha256", "-days", "30", "-nodes",
    "-keyout", chave, "-out", certificado,
    "-subj", "/CN=CERTIFICADO DE DEMONSTRACAO - SEM VALOR JURIDICO/O=Escritorio Dativo/C=BR",
  ]);
  return { chave, certificado };
}

async function dadosDaDemonstracao() {
  const { certificado } = await garantirCertificadoDeDemonstracao();
  const { stdout } = await rodar("openssl", ["x509", "-in", certificado, "-noout", "-subject", "-enddate"]);
  const titular = stdout.match(/CN\s*=\s*([^\/\n,]+)/)?.[1]?.trim() ?? "Certificado de demonstração";
  const validade = stdout.match(/notAfter=(.+)/)?.[1]?.trim() ?? null;
  return [{ id: "demonstracao", titular, validade, origem: "demonstracao" }];
}

async function assinarNaDemonstracao(hashHex) {
  const { chave } = await garantirCertificadoDeDemonstracao();
  const pem = await readFile(chave, "utf8");
  const assinatura = privateEncrypt(
    { key: createPrivateKey(pem), padding: constants.RSA_PKCS1_PADDING },
    digestInfo(hashHex),
  );
  return assinatura.toString("base64");
}

// ----------------------------------------------------------------- servidor

const driver = process.env.PKCS11 ?? null;
let pin = null;

async function listarCertificados() {
  if (driver) return certificadosDoToken(driver);
  return dadosDaDemonstracao();
}

async function assinar(certificadoId, hashHex) {
  if (!/^[0-9a-f]{64}$/i.test(hashHex)) throw new Error("O hash precisa ser um SHA-256 em hexadecimal.");
  if (driver) {
    if (!pin) pin = await perguntarPin();
    return { assinatura: await assinarNoToken(driver, certificadoId, pin, hashHex), origem: "a3" };
  }
  return { assinatura: await assinarNaDemonstracao(hashHex), origem: "demonstracao" };
}

function responder(res, origem, status, corpo) {
  const cabecalhos = { "content-type": "application/json; charset=utf-8" };
  if (origem && ORIGENS.has(origem)) {
    cabecalhos["access-control-allow-origin"] = origem;
    cabecalhos["access-control-allow-headers"] = "content-type";
    cabecalhos["access-control-allow-methods"] = "GET,POST,OPTIONS";
    cabecalhos["access-control-max-age"] = "600";
    // O Chrome trata uma chamada de página pública para 127.0.0.1 como acesso a
    // rede privada e só deixa passar se o preflight responder isto. Sem a linha,
    // a tela servida pelo endereço público não enxerga o conector.
    cabecalhos["access-control-allow-private-network"] = "true";
  }
  res.writeHead(status, cabecalhos);
  res.end(JSON.stringify(corpo));
}

const servidor = createServer(async (req, res) => {
  const origem = req.headers.origin ?? null;
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORTA}`);

  if (req.method === "OPTIONS") return responder(res, origem, 204, {});
  if (origem && !ORIGENS.has(origem)) return responder(res, origem, 403, { erro: "Origem não autorizada." });

  try {
    if (url.pathname === "/saude") {
      return responder(res, origem, 200, {
        conector: "escritorio-dativo",
        versao: VERSAO,
        modo: driver ? "a3" : "demonstracao",
        pinNaMemoria: Boolean(pin),
      });
    }
    if (url.pathname === "/certificados") {
      return responder(res, origem, 200, { certificados: await listarCertificados() });
    }
    if (url.pathname === "/assinar" && req.method === "POST") {
      const corpo = await new Promise((resolver, rejeitar) => {
        let texto = "";
        req.on("data", (parte) => { texto += parte; if (texto.length > 10_000) rejeitar(new Error("Corpo grande demais.")); });
        req.on("end", () => { try { resolver(JSON.parse(texto)); } catch { rejeitar(new Error("Corpo inválido.")); } });
      });
      const resultado = await assinar(corpo.certificadoId ?? "demonstracao", String(corpo.hash ?? ""));
      return responder(res, origem, 200, resultado);
    }
    return responder(res, origem, 404, { erro: "Não há esse caminho no conector." });
  } catch (e) {
    return responder(res, origem, 400, { erro: e instanceof Error ? e.message : "Falhou." });
  }
});

// ------------------------------------------------------------ fila remota

// Quando o escritório é aberto pelo endereço público, o navegador não consegue
// falar com esta máquina. Aí a conversa se inverte: o conector pergunta ao
// escritório se há algo para fazer. Nenhuma porta é aberta para a internet e
// nada sigiloso trafega — vai o pedido, volta a resposta.
const ESCRITORIO = (process.env.ESCRITORIO ?? "").replace(/\/$/, "");
const CHAVE = process.env.CHAVE ?? "";
const INTERVALO = Number(process.env.INTERVALO ?? 2000);
const CONSULTA = process.env.CONSULTA ?? "http://127.0.0.1:8767";

// Os pedidos do PROJUDI vão para o serviço de consulta, que é outro programa
// nesta mesma máquina. Daqui para lá é localhost falando com localhost: nada
// atravessa a rede.
async function noServicoDeConsulta(caminho, metodo, corpo) {
  const resposta = await fetch(`${CONSULTA}${caminho}`, {
    method: metodo,
    headers: corpo ? { "content-type": "application/json" } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro ?? `O serviço de consulta devolveu ${resposta.status}.`);
  return dados;
}

async function atender(pedido) {
  const dados = pedido.dados ?? {};
  switch (pedido.tipo) {
    case "certificados":
      return { certificados: await listarCertificados() };
    case "assinar":
      return assinar(dados.certificadoId ?? "demonstracao", String(dados.hash ?? ""));
    case "projudi-entrar":
      return noServicoDeConsulta("/entrar", "POST", dados);
    case "projudi-carteira":
      return noServicoDeConsulta("/carteira", "GET");
    case "projudi-processo":
      return noServicoDeConsulta(`/processo?cnj=${encodeURIComponent(String(dados.cnj ?? ""))}`, "GET");
    default:
      throw new Error(`Pedido desconhecido: ${pedido.tipo}`);
  }
}

async function umaRodadaDaFila() {
  const resposta = await fetch(`${ESCRITORIO}/api/conector/fila`, { headers: { authorization: `Bearer ${CHAVE}` } });
  if (resposta.status === 401) throw new Error("O escritório não reconheceu a chave. Gere outra na tela e rode de novo.");
  if (!resposta.ok) throw new Error(`O escritório respondeu ${resposta.status}.`);
  const { pedidos = [] } = await resposta.json();
  for (const pedido of pedidos) {
    let corpo;
    try {
      corpo = { id: pedido.id, resultado: await atender(pedido) };
      console.log(`  atendido: ${pedido.tipo}`);
    } catch (e) {
      corpo = { id: pedido.id, erro: e instanceof Error ? e.message : "Falhou aqui no seu computador." };
      console.log(`  recusado: ${pedido.tipo} — ${corpo.erro}`);
    }
    await fetch(`${ESCRITORIO}/api/conector/fila`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CHAVE}` },
      body: JSON.stringify(corpo),
    });
  }
}

function acompanharEscritorio() {
  let avisouQueCaiu = false;
  const rodar = async () => {
    try {
      await umaRodadaDaFila();
      if (avisouQueCaiu) { console.log("Escritório de volta."); avisouQueCaiu = false; }
    } catch (e) {
      if (!avisouQueCaiu) {
        console.log(`Sem falar com o escritório: ${e instanceof Error ? e.message : e}`);
        avisouQueCaiu = true;
      }
    }
  };
  setInterval(() => { void rodar(); }, INTERVALO);
  void rodar();
}

// Só 127.0.0.1: o conector não aceita conexão de fora da máquina. Quem fala com
// ele é o navegador do próprio advogado, não o servidor do escritório.
servidor.listen(PORTA, "127.0.0.1", () => {
  console.log(`Conector do Escritório Dativo na porta ${PORTA}, modo ${driver ? "A3 (token)" : "demonstração"}.`);
  console.log("A chave privada não sai desta máquina. Ctrl+C encerra.");
  if (ESCRITORIO && CHAVE) {
    console.log(`Atendendo também os pedidos de ${ESCRITORIO}, a cada ${INTERVALO / 1000}s.`);
    acompanharEscritorio();
  } else {
    console.log("Sem ESCRITORIO e CHAVE: atende só o navegador desta máquina.");
  }
});
