#!/usr/bin/env python3
"""Consulta ao PROJUDI pelo acesso do próprio advogado, na máquina dele.

Roda ao lado do conector de certificado e segue a mesma regra: o que depende da
identidade do advogado acontece no computador dele. O escritório não guarda
senha, PIN nem sessão do tribunal — pede a consulta a este serviço, que só
escuta em 127.0.0.1.

    python3 consulta/servico.py

Depois, pela tela do escritório (ou por curl):

    POST /entrar    {"modo": "a3", "pin": "..."}          token A3 plugado
    POST /entrar    {"modo": "2fa", "cpf": "...", "senha": "...", "totp": "..."}
    GET  /carteira  → processos em que o advogado está habilitado
    GET  /processo?cnj=0001234-56.2026.8.16.0001

As credenciais ficam só na memória deste processo, enquanto ele estiver aberto.
Não há quebra de CAPTCHA: quando o PROJUDI pede o desafio, o serviço para e diz
ao advogado para resolvê-lo no navegador dele.
"""
from __future__ import annotations

import json
import logging
import os
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

VERSAO = "1.0.0"
PORTA = int(os.environ.get("PORTA_CONSULTA", "8767"))
ORIGENS = {
    "https://habeastitas.eduardomila.adv.br",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://127.0.0.1:3100",
    *[o.strip() for o in os.environ.get("ORIGENS", "").split(",") if o.strip()],
}

log = logging.getLogger("consulta")
_trava = threading.Lock()
_cliente = None  # sessão viva do PROJUDI, só em memória


def _entrar(dados: dict) -> dict:
    """Autentica no PROJUDI e guarda a sessão. Nada é escrito em disco."""
    global _cliente

    modo = (dados.get("modo") or "a3").lower()
    if modo not in ("a3", "2fa"):
        raise ValueError("Modo de entrada desconhecido: use a3 ou 2fa.")
    try:
        from projudi_client import ProJudiClient
    except ModuleNotFoundError as e:
        raise RuntimeError(
            f"Falta uma dependência do serviço de consulta ({e.name}). "
            "Instale com: python3 -m venv .venv && .venv/bin/pip install -r consulta/requirements.txt"
        ) from e

    if modo == "a3":
        from projudi_auth import ProJudiAuthA3
        sessao = ProJudiAuthA3(pin=str(dados.get("pin") or "")).autenticar()
    else:
        from projudi_auth import ProJudiAuth2FA
        sessao = ProJudiAuth2FA(
            str(dados.get("cpf") or ""),
            str(dados.get("senha") or ""),
            str(dados.get("totp") or ""),
        ).autenticar()

    with _trava:
        _cliente = ProJudiClient(sessao)
    return {"autenticado": True, "modo": modo}


def _exigir_cliente():
    with _trava:
        if _cliente is None:
            raise RuntimeError("Ainda não entrou no PROJUDI. Faça a entrada antes de consultar.")
        return _cliente


class Manipulador(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, formato, *args):  # silencia o log padrão, ruidoso
        log.debug(formato, *args)

    def _responder(self, status: int, corpo: dict):
        origem = self.headers.get("Origin")
        dados = json.dumps(corpo, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(dados)))
        if origem and origem in ORIGENS:
            self.send_header("Access-Control-Allow-Origin", origem)
            self.send_header("Access-Control-Allow-Headers", "content-type")
            self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
            # Página pública falando com 127.0.0.1 é acesso a rede privada para o
            # Chrome; sem esta linha o preflight não passa.
            self.send_header("Access-Control-Allow-Private-Network", "true")
        self.end_headers()
        self.wfile.write(dados)

    def do_OPTIONS(self):  # noqa: N802
        self._responder(204, {})

    def do_GET(self):  # noqa: N802
        origem = self.headers.get("Origin")
        if origem and origem not in ORIGENS:
            return self._responder(403, {"erro": "Origem não autorizada."})
        caminho = urlparse(self.path)
        try:
            if caminho.path == "/saude":
                with _trava:
                    return self._responder(200, {"consulta": "projudi", "versao": VERSAO, "autenticado": _cliente is not None})
            if caminho.path == "/carteira":
                cliente = _exigir_cliente()
                return self._responder(200, cliente.listar_carteira())
            if caminho.path == "/processo":
                cnj = (parse_qs(caminho.query).get("cnj") or [""])[0]
                if not cnj:
                    return self._responder(400, {"erro": "Informe o número CNJ."})
                cliente = _exigir_cliente()
                processo = cliente.buscar_processo(cnj)
                if not processo:
                    return self._responder(404, {"erro": "Processo não encontrado na sua carteira."})
                return self._responder(200, {"processo": processo, "movimentos": cliente.listar_movimentos(cnj)})
            return self._responder(404, {"erro": "Não há esse caminho no serviço de consulta."})
        except Exception as e:  # a mensagem do PROJUDI é mais útil que um 500 mudo
            return self._responder(400, {"erro": str(e)})

    def do_POST(self):  # noqa: N802
        origem = self.headers.get("Origin")
        if origem and origem not in ORIGENS:
            return self._responder(403, {"erro": "Origem não autorizada."})
        if urlparse(self.path).path != "/entrar":
            return self._responder(404, {"erro": "Não há esse caminho no serviço de consulta."})
        try:
            tamanho = int(self.headers.get("Content-Length") or 0)
            if tamanho > 10_000:
                return self._responder(400, {"erro": "Corpo grande demais."})
            dados = json.loads(self.rfile.read(tamanho) or b"{}")
            return self._responder(200, _entrar(dados))
        except Exception as e:
            return self._responder(400, {"erro": str(e)})


def main():
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    servidor = ThreadingHTTPServer(("127.0.0.1", PORTA), Manipulador)
    print(f"Consulta PROJUDI na porta {PORTA}. Credenciais só na memória; Ctrl+C encerra.")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print("\nEncerrado. A sessão do tribunal foi descartada.")


if __name__ == "__main__":
    main()
