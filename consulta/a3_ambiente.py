"""
a3_ambiente.py — Resolução multiplataforma do ambiente A3 (curl, engine
PKCS#11 e biblioteca do token).

Os fluxos de autenticação mTLS (projudi_auth, pje_auth, eproc_auth) usam
curl + engine pkcs11 do OpenSSL. Os caminhos variam por sistema operacional
e instalação — este módulo centraliza a resolução, com override por
variáveis de ambiente:

  A3_CURL_BIN       — caminho do curl com suporte a engine (OpenSSL)
  A3_PKCS11_ENGINE  — caminho do engine pkcs11 (libp11)
  A3_PKCS11_LIB     — caminho da biblioteca PKCS#11 do token

Defaults preservam o comportamento atual no macOS (Homebrew). No Windows,
o instalador do Agente A3 inclui curl+libp11 na pasta vendor/ ao lado do
executável; sem eles, procura no PATH.

IMPORTANTE (Windows): o curl.exe que vem com o Windows usa Schannel e NÃO
suporta engine pkcs11 — é preciso um build com OpenSSL (o do instalador).
"""

from __future__ import annotations

import os
import shutil
import sys

# Bibliotecas PKCS#11 conhecidas no Windows (tokens A3 ICP-Brasil)
LIBS_WINDOWS = [
    # SafeSign IC (A.E.T.) — Certisign, Soluti e outras ACs
    r"C:\Windows\System32\aetpkss1.dll",
    r"C:\Windows\SysWOW64\aetpkss1.dll",
    # SafeNet / Thales eToken
    r"C:\Windows\System32\eTPKCS11.dll",
    r"C:\Windows\SysWOW64\eTPKCS11.dll",
    # Watchdata (Certisign)
    r"C:\WINDOWS\System32\WDPKCS.dll",
    r"C:\Program Files\Watchdata\Watchdata Brazil CSP v1.0\WDPKCS.dll",
    r"C:\Program Files (x86)\Watchdata\Watchdata Brazil CSP v1.0\WDPKCS.dll",
    # Gemalto / Thales IDPrime
    r"C:\Windows\System32\IDPrimePKCS1164.dll",
    r"C:\Program Files\Gemalto\IDGo 800 PKCS#11\IDPrimePKCS1164.dll",
    # Oberthur / Idemia
    r"C:\Windows\System32\OcsCryptoki.dll",
    # OpenSC (genérico)
    r"C:\Program Files\OpenSC Project\OpenSC\pkcs11\opensc-pkcs11.dll",
    r"C:\Program Files (x86)\OpenSC Project\OpenSC\pkcs11\opensc-pkcs11.dll",
]

_CURL_MACOS = "/opt/homebrew/opt/curl/bin/curl"
_ENGINE_MACOS = "/opt/homebrew/lib/engines-3/pkcs11.dylib"

_ENGINES_LINUX = [
    "/usr/lib/x86_64-linux-gnu/engines-3/pkcs11.so",
    "/usr/lib64/engines-3/pkcs11.so",
    "/usr/lib/engines-3/pkcs11.so",
]


def _dir_vendor() -> str | None:
    """Pasta vendor/ ao lado do executável (PyInstaller) ou do projeto."""
    if getattr(sys, "frozen", False):  # PyInstaller
        base = os.path.dirname(sys.executable)
    else:
        base = os.path.dirname(os.path.abspath(__file__))
    vendor = os.path.join(base, "vendor")
    return vendor if os.path.isdir(vendor) else None


def curl_bin() -> str:
    """Caminho do curl com suporte a engine OpenSSL."""
    env = os.environ.get("A3_CURL_BIN", "").strip()
    if env:
        return env
    if sys.platform == "darwin":
        return _CURL_MACOS
    if sys.platform == "win32":
        vendor = _dir_vendor()
        if vendor:
            cand = os.path.join(vendor, "curl", "curl.exe")
            if os.path.isfile(cand):
                return cand
        return shutil.which("curl") or "curl"
    return shutil.which("curl") or "/usr/bin/curl"


def engine_pkcs11() -> str:
    """Caminho do engine pkcs11 (libp11) do OpenSSL."""
    env = os.environ.get("A3_PKCS11_ENGINE", "").strip()
    if env:
        return env
    if sys.platform == "darwin":
        return _ENGINE_MACOS
    if sys.platform == "win32":
        vendor = _dir_vendor()
        if vendor:
            cand = os.path.join(vendor, "libp11", "pkcs11.dll")
            if os.path.isfile(cand):
                return cand
        return r"C:\Program Files\libp11\pkcs11.dll"
    for p in _ENGINES_LINUX:
        if os.path.exists(p):
            return p
    return _ENGINES_LINUX[0]


def pkcs11_lib_candidatos() -> list[str]:
    """Candidatos de biblioteca PKCS#11 do token para o SO atual."""
    env = os.environ.get("A3_PKCS11_LIB", "").strip()
    if env:
        return [env]
    if sys.platform == "win32":
        return LIBS_WINDOWS
    # macOS/Linux: listas mantidas em projudi_auth (fonte original)
    from projudi_auth import _LIBS_MACOS, _LIBS_LINUX
    return _LIBS_MACOS if sys.platform == "darwin" else _LIBS_LINUX


def diagnostico() -> dict:
    """Snapshot do ambiente A3 — usado pelo agente para exibir status."""
    curl = curl_bin()
    engine = engine_pkcs11()
    lib = next((p for p in pkcs11_lib_candidatos() if os.path.exists(p)), None)
    return {
        "plataforma": sys.platform,
        "curl": curl, "curl_ok": os.path.isfile(curl) or bool(shutil.which(curl)),
        "engine": engine, "engine_ok": os.path.exists(engine),
        "pkcs11_lib": lib, "pkcs11_ok": lib is not None,
    }
