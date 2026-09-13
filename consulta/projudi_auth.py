"""
Autenticação no Projudi TJPR.

Duas estratégias:
  ProJudiAuth2FA — CPF + senha + código TOTP (Google Authenticator)
  ProJudiAuthA3  — Certificado A3 físico via token USB/PKCS#11

Uso rápido:
    # Estratégia 2FA
    from projudi_auth import ProJudiAuth2FA
    sessao = ProJudiAuth2FA("12345678900", "minha_senha", "TOTP_SECRET").autenticar()

    # Estratégia A3
    from projudi_auth import ProJudiAuthA3
    auth = ProJudiAuthA3(pin="123456")            # detecta lib automaticamente
    sessao = auth.autenticar()
    certs  = auth.listar_certificados()           # antes de autenticar, se quiser ver
"""

from __future__ import annotations

import base64
import logging
import os
import re
import shutil as _shutil
import subprocess
import sys
import tempfile
from typing import Optional

import requests
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

# Lock global compartilhado para serializar uso do token A3 entre TODOS os
# módulos de autenticação (projudi/eproc/esaj/pje). O chip PKCS#11 só assina
# uma operação por vez; chamadas paralelas resultam em CKR_FUNCTION_FAILED,
# timeouts ou comportamento errático. Importar como:
#   from projudi_auth import A3_LOCK
import threading as _t_a3
A3_LOCK = _t_a3.Lock()

BASE_URL = "https://projudi.tjpr.jus.br"
HOME_URL = f"{BASE_URL}/projudi/home.do"
CERT_AUTH_URL = f"{BASE_URL}/projudi/token/autenticacaoCertificado.do"

_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers internos
# ─────────────────────────────────────────────────────────────────────────────

class ProjudiSession(requests.Session):
    """Session do Projudi com injeção automática de jsessionid nas URLs.

    O Projudi usa URL-rewriting (não cookies) para rastreamento de sessão.
    Cada URL deve ter `;jsessionid=XXX` imediatamente antes do `?`, ex.:
        /projudi/usuario/advogado.do;jsessionid=XXX?actionType=listarProcessos

    Ao definir `_projudi_jsessionid`, todas as requisições a domínios
    *.tjpr.jus.br passam a receber o jsessionid automaticamente.
    """

    _projudi_jsessionid: Optional[str] = None
    _projudi_tj: Optional[str] = None
    _projudi_html: str = ""
    _projudi_base_url: Optional[str] = None  # "https://projudicrt.tjpr.jus.br" para A3

    def request(self, method: str, url: str, **kwargs):  # type: ignore[override]
        url = self._injetar_jsessionid(url)
        return super().request(method, url, **kwargs)

    def _injetar_jsessionid(self, url: str) -> str:
        jsid = self._projudi_jsessionid
        if not jsid:
            return url
        if "tjpr.jus.br" not in url:
            return url
        if ";jsessionid=" in url:
            return url
        # Inserir antes do '?' ou no final
        if "?" in url:
            path, qs = url.split("?", 1)
            return f"{path};jsessionid={jsid}?{qs}"
        return f"{url};jsessionid={jsid}"


def _nova_sessao() -> ProjudiSession:
    s = ProjudiSession()
    s.headers["User-Agent"] = _UA
    return s


def _extrair_tj(html: str) -> Optional[str]:
    """Extrai o valor do token _tj de qualquer HTML do Projudi."""
    m = re.search(r"[?&]_tj=([a-zA-Z0-9]+)", html)
    return m.group(1) if m else None


def _pkcs11_ler_cert_der(sessao_pkcs11, cert_obj, PyKCS11) -> bytes:
    """Lê os bytes DER de um certificado PKCS#11 de forma robusta.

    SafeSign IC às vezes retorna CKA_LABEL num formato que PyKCS11 não reconhece,
    levantando 'Unknown format (<class 'int'>)' quando as duas attrs são pedidas
    juntas. Aqui pedimos CKA_VALUE separadamente para evitar o problema.
    """
    attrs = sessao_pkcs11.getAttributeValue(cert_obj, [PyKCS11.CKA_VALUE])
    raw = attrs[0]
    # PyKCS11 pode retornar ckbytelist *ou* tuple-de-ints dependendo da versão
    if isinstance(raw, (bytes, bytearray)):
        return bytes(raw)
    return bytes(bytearray(raw))  # tuple/list de ints → bytes


def _pkcs11_ler_label(sessao_pkcs11, cert_obj, PyKCS11) -> str:
    """Lê o label de um certificado PKCS#11. Nunca levanta exceção."""
    try:
        attrs = sessao_pkcs11.getAttributeValue(cert_obj, [PyKCS11.CKA_LABEL])
        val = attrs[0]
        if val is None:
            return "certificado"
        # ckbytelist → decodifica como UTF-8
        if hasattr(val, "__iter__") and not isinstance(val, str):
            try:
                return bytes(bytearray(val)).decode("utf-8", errors="replace").strip()
            except Exception:
                pass
        return str(val).strip() or "certificado"
    except Exception as exc:
        log.debug("Não foi possível ler CKA_LABEL: %s", exc)
        return "certificado"


# ─────────────────────────────────────────────────────────────────────────────
# ESTRATÉGIA A — Login + 2FA (CPF + senha + TOTP)
# ─────────────────────────────────────────────────────────────────────────────

class ProJudiAuth2FA:
    """Autentica no Projudi via CPF + senha + TOTP (Google Authenticator).

    Parâmetros
    ----------
    cpf : str
        CPF do usuário (apenas dígitos; pontos e traço são removidos
        automaticamente).
    senha : str
        Senha de acesso ao Projudi.
    totp_secret : str
        Segredo permanente do Google Authenticator — é o código longo
        exibido ao configurar a conta (ex.: "ABCD1EFGH2IJKL3M").
        Não é o código de 6 dígitos que muda a cada 30 s.

    Notas
    -----
    O Projudi usa Keycloak como IdP. O fluxo é:
        1. GET  home.do           → obtém _tj token (CSRF) nos links
        2. GET  autenticacao.do   → página Keycloak (kc-form-login)
        3. POST credenciais       → página de 2FA (kc-otp-login-form)
        4. POST código TOTP       → home autenticada (iframe userMainFrame)
    """

    def __init__(self, cpf: str, senha: str, totp_secret: str) -> None:
        self.cpf = re.sub(r"\D", "", cpf)
        self.senha = senha
        self.totp_secret = totp_secret.strip().replace(" ", "")

    # ------------------------------------------------------------------
    def autenticar(self) -> requests.Session:
        """Executa o login e devolve uma ``requests.Session`` autenticada.

        A sessão tem dois atributos extras injetados:
            _projudi_html : HTML da home page pós-login
            _projudi_tj   : valor do _tj token extraído
        """
        try:
            import pyotp
        except ImportError:
            raise RuntimeError(
                "Dependência ausente. Instale: pip install pyotp"
            )

        sessao = _nova_sessao()

        # ── Etapa 1: cookies iniciais + _tj ────────────────────────────────
        log.debug("Auth 2FA ▸ etapa 1: carregando home para obter _tj…")
        sessao.get(BASE_URL, timeout=30)
        r_home = sessao.get(HOME_URL, timeout=30)
        r_home.raise_for_status()

        soup_home = BeautifulSoup(r_home.text, "html.parser")
        ul_acessos = soup_home.select('ul[class="acessos"]')
        if not ul_acessos:
            raise RuntimeError(
                "Estrutura do Projudi mudou: elemento 'ul.acessos' não "
                "encontrado na home page. O fluxo pode ter sido atualizado."
            )

        m = re.search(
            r"(/projudi/autenticacao\.do\?[^\"' ]*_tj=[a-zA-Z0-9]+)",
            str(ul_acessos[0]),
        )
        if not m:
            raise RuntimeError(
                "Link de autenticação com _tj não encontrado na home page."
            )

        path_auth = m.group(1)
        log.debug("Auth 2FA ▸ path Keycloak: %s", path_auth)

        # ── Etapa 2: página de login Keycloak ──────────────────────────────
        r_login = sessao.get(f"{BASE_URL}{path_auth}", timeout=30)
        r_login.raise_for_status()

        soup_login = BeautifulSoup(r_login.text, "html.parser")
        form_login = soup_login.find("form", {"id": "kc-form-login"})
        if not form_login:
            raise RuntimeError(
                "Formulário kc-form-login não encontrado. "
                "Talvez o Projudi esteja em manutenção ou o fluxo mudou."
            )

        action_login = form_login.get("action")

        # ── Etapa 3: POST de credenciais ───────────────────────────────────
        log.debug("Auth 2FA ▸ etapa 3: enviando CPF + senha…")
        r_2fa = sessao.post(
            action_login,
            data={"username": self.cpf, "password": self.senha},
            timeout=30,
        )
        r_2fa.raise_for_status()

        soup_2fa = BeautifulSoup(r_2fa.text, "html.parser")

        # Keycloak reporta erro em #kc-error-message ou em .kc-feedback-text
        def _tem_erro_kc(s: BeautifulSoup) -> bool:
            return bool(
                s.find("div", {"id": "kc-error-message"})
                or s.find(class_="kc-feedback-text")
                or s.find("div", class_=re.compile(r"alert-error", re.I))
            )

        if _tem_erro_kc(soup_2fa):
            raise RuntimeError("CPF ou senha incorretos no Projudi.")

        form_2fa = soup_2fa.find("form", {"id": "kc-otp-login-form"})
        if not form_2fa:
            raise RuntimeError(
                "Formulário de 2FA (kc-otp-login-form) não encontrado. "
                "Verifique se a autenticação em dois fatores está ativada "
                "para esta conta."
            )

        action_2fa = form_2fa.get("action")

        # ── Etapa 4: POST do código TOTP ───────────────────────────────────
        log.debug("Auth 2FA ▸ etapa 4: gerando e enviando código TOTP…")
        codigo = pyotp.TOTP(self.totp_secret).now()  # str 6 dígitos com zeros à esquerda
        r_final = sessao.post(
            action_2fa,
            data={"otp": str(codigo)},
            timeout=30,
        )
        r_final.raise_for_status()

        soup_final = BeautifulSoup(r_final.text, "html.parser")

        # ── Etapa 5 (opcional): seleção de perfil ─────────────────────────
        _ja_autenticado = (
            soup_final.find("iframe", attrs={"name": "userMainFrame"})
            or "interno.jsp" in r_final.url
            or soup_final.find("iframe", src=re.compile(r"postLogon\.do|interno\.jsp"))
        )
        if not _ja_autenticado:
            links_perfil = soup_final.find_all(
                "a", href=re.compile(r"actionType=selectLogin")
            )
            if not links_perfil:
                links_perfil = [
                    tag for tag in soup_final.find_all(attrs={"onclick": re.compile(r"actionType=selectLogin")})
                ]

            if links_perfil:
                def _href(el):
                    h = el.get("href")
                    if h:
                        return h
                    m = re.search(r"document\.location\.href='([^']+)'", el.get("onclick", ""))
                    return m.group(1) if m else None

                escolhido = next(
                    (el for el in links_perfil if "grupoID=90" in (el.get("href","") or el.get("onclick",""))),
                    links_perfil[0],
                )
                href_perfil = _href(escolhido)
                if href_perfil:
                    url_perfil = href_perfil if href_perfil.startswith("http") else f"{BASE_URL}{href_perfil}"
                    log.debug("Auth 2FA ▸ etapa 5: selecionando perfil %s", url_perfil)
                    r_final = sessao.get(url_perfil, timeout=30)
                    r_final.raise_for_status()
                    soup_final = BeautifulSoup(r_final.text, "html.parser")

            _url_final = r_final.url if hasattr(r_final, "url") else ""
            _autenticado = (
                soup_final.find("iframe", attrs={"name": "userMainFrame"})
                or "interno.jsp" in _url_final
                or soup_final.find("iframe", src=re.compile(r"postLogon\.do|interno\.jsp"))
            )
            if not _autenticado:
                if _tem_erro_kc(soup_final):
                    raise RuntimeError("Código TOTP rejeitado ou expirado.")
                raise RuntimeError(
                    "Código TOTP rejeitado ou expirado. Verifique:\n"
                    "  • O segredo do Authenticator está correto?\n"
                    "  • O relógio do sistema está sincronizado?"
                )

        sessao._projudi_html = r_final.text
        sessao._projudi_tj = _extrair_tj(r_final.text)
        log.info("✅ Login 2FA concluído com sucesso")
        return sessao


# ─────────────────────────────────────────────────────────────────────────────
# ESTRATÉGIA B — Certificado A3 (PKCS#11 via token USB)
# ─────────────────────────────────────────────────────────────────────────────

# Caminhos comuns de bibliotecas PKCS#11 em macOS / Linux
_LIBS_MACOS = [
    # SafeSign IC (A.E.T. Europe) — usado por várias ACs brasileiras
    "/Applications/tokenadmin.app/Contents/Frameworks/libaetpkss.dylib",
    "/Library/Frameworks/libaetpkss.framework/Versions/Current/libaetpkss",
    "/usr/local/lib/libaetpkss.dylib",
    "/opt/homebrew/lib/libaetpkss.dylib",
    # SafeNet / Thales eToken
    "/Library/Frameworks/eToken.framework/Versions/Current/libeToken.dylib",
    "/usr/local/lib/libeToken.dylib",
    "/usr/local/lib/libeTPkcs11.dylib",
    "/opt/homebrew/lib/libeToken.dylib",
    # Certisign / AC Soluti / Valid
    "/usr/local/lib/libacpkcs.so",
    "/usr/local/lib/libsacpkcs11.dylib",
    "/usr/local/lib/libACSPKCS.dylib",
    "/usr/local/lib/libvalid-iti-pkcs11.so",
    # Watchdata
    "/usr/local/lib/libwdpkcs.dylib",
    # Athena (legacy)
    "/Library/Application Support/Athena/libASEP11.dylib",
    # OpenSC
    "/Library/OpenSC/lib/opensc-pkcs11.so",
    "/usr/local/lib/opensc-pkcs11.so",
    "/opt/homebrew/lib/opensc-pkcs11.so",
    # Serpro
    "/usr/local/lib/libgepkcs11.dylib",
]

_LIBS_LINUX = [
    "/usr/lib/opensc-pkcs11.so",
    "/usr/local/lib/opensc-pkcs11.so",
    "/usr/lib/x86_64-linux-gnu/opensc-pkcs11.so",
    "/usr/lib64/opensc-pkcs11.so",
    "/usr/local/lib/libacpkcs.so",
    "/usr/local/lib/libwdpkcs.so",
]


def detectar_biblioteca_pkcs11() -> Optional[str]:
    """Detecta automaticamente a biblioteca PKCS#11 instalada no sistema.

    Cobre macOS, Linux e Windows. Respeita o override A3_PKCS11_LIB.
    Retorna o primeiro caminho encontrado, ou None se nenhum existir.
    """
    from a3_ambiente import pkcs11_lib_candidatos
    for p in pkcs11_lib_candidatos():
        if os.path.exists(p):
            log.debug("Biblioteca PKCS#11 detectada: %s", p)
            return p
    return None


def listar_slots_token(pkcs11_lib: str) -> list[dict]:
    """Lista todos os slots com token presente na biblioteca PKCS#11.

    Retorna lista de dicts com: slot, label, manufacturer, model, serial.
    Não requer PIN — usa informações públicas do token.
    """
    try:
        import PyKCS11
    except ImportError:
        raise RuntimeError("Instale PyKCS11: pip install PyKCS11")

    lib = PyKCS11.PyKCS11Lib()
    lib.load(pkcs11_lib)

    resultado = []
    for slot in lib.getSlotList(tokenPresent=True):
        try:
            info = lib.getTokenInfo(slot)
            resultado.append({
                "slot": int(slot),
                "label": str(info.label).strip(),
                "manufacturer": str(info.manufacturerID).strip(),
                "model": str(info.model).strip(),
                "serial": str(info.serialNumber).strip(),
            })
        except Exception as e:
            log.warning("Erro ao ler info do slot %s: %s", slot, e)

    return resultado


def ler_certificados_token(
    pkcs11_lib: str, pin: str, slot: int = 0
) -> list[dict]:
    """Lê os certificados armazenados no token A3.

    Parâmetros
    ----------
    pkcs11_lib : str
        Caminho da biblioteca PKCS#11.
    pin : str
        PIN do token.
    slot : int
        Índice do slot (0 = primeiro token conectado).

    Retorna lista de dicts com:
        label, subject_cn, issuer_cn, validade_ate, serial, cpf, cert_pem
    """
    try:
        import PyKCS11
        from cryptography import x509 as cx509
    except ImportError:
        raise RuntimeError(
            "Instale dependências: pip install PyKCS11 cryptography"
        )

    lib = PyKCS11.PyKCS11Lib()
    lib.load(pkcs11_lib)

    slots = lib.getSlotList(tokenPresent=True)
    if not slots:
        raise RuntimeError(
            "Nenhum token PKCS#11 detectado. Verifique se o token está conectado."
        )
    if slot >= len(slots):
        raise RuntimeError(
            f"Slot {slot} inválido. Slots disponíveis: {list(range(len(slots)))}"
        )

    sessao_pkcs11 = lib.openSession(slots[slot], PyKCS11.CKF_SERIAL_SESSION)
    try:
        try:
            sessao_pkcs11.login(pin, PyKCS11.CKU_USER)
        except PyKCS11.PyKCS11Error as _e:
            if getattr(_e, "value", None) == PyKCS11.CKR_USER_ALREADY_LOGGED_IN:
                log.debug("PKCS11 token já logado — reusando estado")
            else:
                raise

        certs_obj = sessao_pkcs11.findObjects(
            [(PyKCS11.CKA_CLASS, PyKCS11.CKO_CERTIFICATE)]
        )

        resultado = []
        for obj in certs_obj:
            # ── IMPORTANTE: pedir CKA_VALUE e CKA_LABEL separadamente ──────
            # SafeSign IC retorna CKA_LABEL num formato que PyKCS11 não
            # consegue parsear quando pedido junto com CKA_VALUE, levantando
            # 'Unknown format (<class 'int'>)'. Pedimos cada um sozinho.
            cert_der = _pkcs11_ler_cert_der(sessao_pkcs11, obj, PyKCS11)
            label = _pkcs11_ler_label(sessao_pkcs11, obj, PyKCS11)

            # ── Parsear o certificado ──────────────────────────────────────
            # NOTA: default_backend() foi removido em cryptography >= 40.
            # Nunca passar o segundo argumento.
            cert = cx509.load_der_x509_certificate(cert_der)

            def _cn(name):
                try:
                    return name.get_attributes_for_oid(
                        cx509.NameOID.COMMON_NAME
                    )[0].value
                except Exception:
                    return None

            cpf = _extrair_cpf_do_cert(cert)

            # DER → PEM (stdlib, sem dependência extra)
            import ssl as _ssl
            cert_pem = _ssl.DER_cert_to_PEM_cert(cert_der)

            # Validade compatível com cryptography < 42 e >= 42
            try:
                validade = cert.not_valid_after_utc.isoformat()
            except AttributeError:
                validade = str(cert.not_valid_after)  # type: ignore[attr-defined]

            resultado.append({
                "label": label,
                "subject_cn": _cn(cert.subject),
                "issuer_cn": _cn(cert.issuer),
                "validade_ate": validade,
                "serial": str(cert.serial_number),
                "cpf": cpf,
                "cert_pem": cert_pem,
            })

        return resultado
    finally:
        try:
            sessao_pkcs11.logout()
            sessao_pkcs11.closeSession()
        except Exception:
            pass


def _extrair_cpf_do_cert(cert) -> Optional[str]:
    """Tenta extrair o CPF do certificado ICP-Brasil."""
    from cryptography import x509 as cx509

    # 1. Tenta no CN (formato "NOME DA PESSOA:12345678900")
    try:
        cn = cert.subject.get_attributes_for_oid(
            cx509.NameOID.COMMON_NAME
        )[0].value
        m = re.search(r"(\d{11})", re.sub(r"\D", "", cn))
        if m:
            return m.group(1)
    except Exception:
        pass

    # 2. Tenta nos campos do Subject
    for attr in cert.subject:
        m = re.search(r"(\d{3}\.?\d{3}\.?\d{3}-?\d{2})", str(attr.value))
        if m:
            return re.sub(r"\D", "", m.group(1))

    # 3. Tenta no SAN (Subject Alternative Name)
    try:
        san = cert.extensions.get_extension_for_oid(
            cx509.ExtensionOID.SUBJECT_ALTERNATIVE_NAME
        )
        for entry in san.value:
            m = re.search(r"(\d{11})", re.sub(r"\D", "", str(entry)))
            if m:
                return m.group(1)
    except Exception:
        pass

    return None


# ─────────────────────────────────────────────────────────────────────────────

class ProJudiAuthA3:
    """Autentica no Projudi via certificado A3 físico (token USB/PKCS#11).

    Parâmetros
    ----------
    pin : str
        PIN (senha) do token A3.
    pkcs11_lib : str | None
        Caminho da biblioteca PKCS#11 (.dylib no macOS, .so no Linux).
        Se None, detecta automaticamente os caminhos mais comuns.
    slot : int
        Índice do slot do token (0 = primeiro token conectado).

    Dependências
    ------------
    pip install PyKCS11 cryptography

    Como funciona
    -------------
    O método autenticar() tenta as seguintes abordagens em sequência:

    1. mTLS via Homebrew curl + libp11 engine pkcs11  ← PRIMÁRIA (testada e aprovada)
       Fluxo: GET home.do (cookies) → mTLS com projudicrt.tjpr.jus.br →
       extrai jsessionid + _tj da resposta pós-login.
       Requer: brew install curl libp11

    2. Challenge-response via PyKCS11
       Tenta obter a página de cert-auth sem mTLS e assinar um challenge
       na camada de aplicação. Fallback caso o Projudi mude o fluxo.

    Se nenhuma abordagem funcionar, levanta RuntimeError com instruções.
    """

    def __init__(
        self,
        pin: str,
        pkcs11_lib: Optional[str] = None,
        slot: int = 0,
    ) -> None:
        self.pin = pin
        self.slot = slot

        if pkcs11_lib:
            if not os.path.exists(pkcs11_lib):
                raise FileNotFoundError(
                    f"Biblioteca PKCS#11 não encontrada: {pkcs11_lib}"
                )
            self.pkcs11_lib = pkcs11_lib
        else:
            lib = detectar_biblioteca_pkcs11()
            if not lib:
                raise RuntimeError(
                    "Biblioteca PKCS#11 não encontrada automaticamente.\n"
                    "Informe o caminho: ProJudiAuthA3(pin='...', "
                    "pkcs11_lib='/caminho/lib.dylib')\n"
                    "Ou instale OpenSC: brew install opensc  (macOS)"
                )
            self.pkcs11_lib = lib

    # ── API pública ─────────────────────────────────────────────────────────

    def listar_certificados(self) -> list[dict]:
        """Lista os certificados disponíveis no token (requer PIN)."""
        return ler_certificados_token(self.pkcs11_lib, self.pin, self.slot)

    def listar_slots(self) -> list[dict]:
        """Lista os slots disponíveis (não requer PIN)."""
        return listar_slots_token(self.pkcs11_lib)

    def autenticar(self) -> requests.Session:
        """Autentica no Projudi e devolve uma ``requests.Session`` autenticada.

        Tenta múltiplas estratégias de autenticação em cascata.
        """
        erros = []

        # ── Tentativa 1: mTLS via Homebrew curl + libp11 (PRIMÁRIA) ──────
        try:
            return self._autenticar_mtls_curl()
        except Exception as e:
            msg = f"mTLS curl+libp11: {e}"
            log.warning("Estratégia 1 falhou: %s", msg)
            erros.append(msg)

        # ── Tentativa 2: challenge-response PyKCS11 (fallback) ───────────
        try:
            return self._autenticar_challenge_response()
        except Exception as e:
            msg = f"challenge-response: {e}"
            log.warning("Estratégia 2 falhou: %s", msg)
            erros.append(msg)

        raise RuntimeError(
            "Autenticação A3 falhou em todas as tentativas:\n"
            + "\n".join(f"  • {e}" for e in erros)
            + "\n\nPré-requisitos para autenticação A3:\n"
            "  brew install curl libp11\n"
            "  (já instalados se você usou o setup automático)\n\n"
            "Alternativa: use autenticação 2FA (CPF + senha + TOTP).\n"
        )

    # ── Estratégia 1: mTLS via Homebrew curl + libp11 ───────────────────────

    def _autenticar_mtls_curl(self) -> requests.Session:
        """mTLS com projudicrt.tjpr.jus.br usando Homebrew curl + engine pkcs11.

        Fluxo confirmado:
        1. GET projudi.tjpr.jus.br/home.do  → cookies base
        2. GET projudicrt.tjpr.jus.br/...   → TLS Certificate Request
           curl assina o handshake com a chave privada do token A3
           (via libp11 engine pkcs11 + SafeSign IC PKCS#11 lib)
        3. Projudi retorna HTML pós-login com jsessionid + _tj
        4. jsessionid injetado como cookie JSESSIONID na requests.Session

        Pré-requisitos:
            brew install curl libp11
        """
        from urllib.parse import quote as _quote
        from a3_ambiente import curl_bin as _curl_bin, engine_pkcs11 as _engine_pkcs11

        # ── Verificar dependências (curl+engine resolvidos por SO) ─────────
        curl_bin = _curl_bin()
        engine_path = _engine_pkcs11()

        if not (os.path.isfile(curl_bin) or _shutil.which(curl_bin)):
            raise RuntimeError(
                f"curl com engine OpenSSL não encontrado ({curl_bin}).\n"
                "macOS: brew install curl · Windows: use o instalador do Agente A3 "
                "(o curl do Windows usa Schannel e não serve)."
            )
        if not os.path.exists(engine_path):
            raise RuntimeError(
                f"libp11 engine não encontrado ({engine_path}).\n"
                "macOS: brew install libp11 · Windows: instalador do Agente A3."
            )

        # ── Ler certificado do usuário diretamente do token ───────────────
        try:
            import PyKCS11
            from cryptography import x509 as cx509
        except ImportError as exc:
            raise RuntimeError(
                f"Dependência ausente ({exc}): pip install PyKCS11 cryptography"
            )

        lib = PyKCS11.PyKCS11Lib()
        lib.load(self.pkcs11_lib)
        slots = lib.getSlotList(tokenPresent=True)
        if not slots:
            raise RuntimeError("Nenhum token PKCS#11 detectado.")

        token_label = ""
        try:
            info = lib.getTokenInfo(slots[self.slot])
            token_label = str(info.label).strip()
        except Exception:
            pass

        pkcs11_sessao = lib.openSession(slots[self.slot], PyKCS11.CKF_SERIAL_SESSION)
        cert_der = None
        import ssl as _ssl_mod

        try:
            try:
                pkcs11_sessao.login(self.pin, PyKCS11.CKU_USER)
            except PyKCS11.PyKCS11Error as _e:
                # CKR_USER_ALREADY_LOGGED_IN (0x100): token já está logado
                # por outra sessão paralela (auto-auth multi-tribunal). Estado
                # válido — podemos prosseguir e usar o login existente.
                if getattr(_e, "value", None) == PyKCS11.CKR_USER_ALREADY_LOGGED_IN:
                    log.debug("PKCS11 token já logado (paralelismo) — reusando estado")
                else:
                    raise
            certs_obj = pkcs11_sessao.findObjects(
                [(PyKCS11.CKA_CLASS, PyKCS11.CKO_CERTIFICATE)]
            )
            if not certs_obj:
                raise RuntimeError("Nenhum certificado no token.")

            # Preferir o certificado do usuário (tem CPF no subject)
            for obj in certs_obj:
                der = _pkcs11_ler_cert_der(pkcs11_sessao, obj, PyKCS11)
                cert = cx509.load_der_x509_certificate(der)
                if _extrair_cpf_do_cert(cert):
                    cert_der = der
                    break

            if cert_der is None:
                # Fallback: último certificado (geralmente o do usuário)
                cert_der = _pkcs11_ler_cert_der(pkcs11_sessao, certs_obj[-1], PyKCS11)
        finally:
            try:
                pkcs11_sessao.logout()
                pkcs11_sessao.closeSession()
            except Exception:
                pass

        # ── Preparar arquivos temporários ─────────────────────────────────
        cert_pem = _ssl_mod.DER_cert_to_PEM_cert(cert_der)
        cert_tmp = tempfile.NamedTemporaryFile(
            mode="w", suffix="_projudi_cert.pem", delete=False
        )
        cert_tmp.write(cert_pem)
        cert_tmp.close()

        # openssl.cnf com engine pkcs11 apontando para libp11
        openssl_cnf = (
            "openssl_conf = openssl_init\n\n"
            "[openssl_init]\n"
            "engines = engine_sect\n\n"
            "[engine_sect]\n"
            "pkcs11 = pkcs11_engine\n\n"
            "[pkcs11_engine]\n"
            "engine_id = pkcs11\n"
            f"dynamic_path = {engine_path}\n"
            f"MODULE_PATH = {self.pkcs11_lib}\n"
            "init = 1\n"
        )
        cnf_tmp = tempfile.NamedTemporaryFile(
            mode="w", suffix="_openssl.cnf", delete=False
        )
        cnf_tmp.write(openssl_cnf)
        cnf_tmp.close()

        cookie_file = tempfile.mktemp(suffix="_projudi_cookies.txt")

        # PKCS#11 URI: token label + pin-value (engine escolhe a chave privada)
        pkcs11_uri = (
            f"pkcs11:token={_quote(token_label, safe='')}"
            f";type=private"
            f";pin-value={_quote(self.pin, safe='')}"
        )

        env = os.environ.copy()
        env["OPENSSL_CONF"] = cnf_tmp.name

        # URL que redireciona para projudicrt.tjpr.jus.br (mTLS)
        CERT_AUTH_CRT = (
            "https://projudicrt.tjpr.jus.br/projudi/token/"
            "autenticacaoCertificado.do"
            "?actionType=inicioComCertificado"
            "&URL=https%3A%2F%2Fprojudi.tjpr.jus.br%2Fprojudi%2F"
        )

        header_file = tempfile.mktemp(suffix="_projudi_headers.txt")

        try:
            # ── Passo 1: cookies base em projudi.tjpr.jus.br ─────────────
            log.debug("A3 mTLS ▸ passo 1: obtendo cookies base…")
            subprocess.run(
                [curl_bin, "-s", "-L",
                 "-c", cookie_file, "-b", cookie_file,
                 "-D", header_file,
                 "--max-time", "20",
                 HOME_URL],
                env=env, capture_output=True, timeout=25,
            )

            # ── Passo 2: mTLS com projudicrt.tjpr.jus.br ─────────────────
            log.debug("A3 mTLS ▸ passo 2: handshake TLS com certificado A3…")
            with A3_LOCK:  # serializar uso do token A3 entre tribunais
                result = subprocess.run(
                    [curl_bin, "-s", "-L",
                     "--engine", "pkcs11",
                     "--cert", cert_tmp.name, "--cert-type", "PEM",
                     "--key-type", "ENG", "--key", pkcs11_uri,
                     "-c", cookie_file, "-b", cookie_file,
                     "-D", header_file,
                     "-H", f"User-Agent: {_UA}",
                     "--tlsv1.2",
                     "--max-time", "60",
                     CERT_AUTH_CRT],
                    env=env, capture_output=True, timeout=75,
                )

            if result.returncode != 0:
                raise RuntimeError(
                    f"curl mTLS retornou erro {result.returncode}: "
                    f"{result.stderr.decode('latin-1', errors='replace').strip()[:300]}"
                )

            # Projudi usa ISO-8859-1; decodifica corretamente
            html = result.stdout.decode("latin-1", errors="replace")

            # ── Verificar autenticação ────────────────────────────────────
            # Projudi pós-login carrega CSS de /css/postLogon/ e tem jsessionid
            if "postLogon" not in html and "jsessionid" not in html:
                if "ERROA3" in html:
                    m_err = re.search(r"ERROA3=(\d+)", html)
                    cod = m_err.group(1) if m_err else "?"
                    raise RuntimeError(
                        f"Projudi rejeitou o certificado (ERROA3={cod}). "
                        "Verifique se o certificado A3 está cadastrado no Projudi."
                    )
                raise RuntimeError(
                    "mTLS completado mas Projudi não retornou sessão autenticada. "
                    f"Primeiros 300 chars: {html[:300]!r}"
                )

            # ── Montar ProjudiSession autenticada ────────────────────────
            sessao = _nova_sessao()
            # Carrega cookies não-HttpOnly do cookie jar
            _carregar_cookies_curl(sessao, cookie_file)
            # Carrega cookies HttpOnly (JSESSIONID, projudi-route) dos headers
            _carregar_cookies_headers(sessao, header_file, dominio_padrao="projudicrt.tjpr.jus.br")

            # Extrair jsessionid → ProjudiSession injeta em todas as URLs
            m_jsess = re.search(r"jsessionid=([a-zA-Z0-9._-]{10,})", html)
            if m_jsess:
                sessao._projudi_jsessionid = m_jsess.group(1)
                log.debug("A3 mTLS ▸ jsessionid: %.25s…", sessao._projudi_jsessionid)
            else:
                log.warning("A3 mTLS ▸ jsessionid não encontrado no HTML.")
                sessao._projudi_jsessionid = None

            sessao._projudi_html = html
            sessao._projudi_tj = _extrair_tj(html)

            # ── Seleção de perfil (se exibida) ───────────────────────────
            # Após mTLS, o Projudi pode mostrar página de seleção de perfil
            # (ex.: Advogado PR127088 vs Assessor) antes de dar acesso à carteira.
            # Detectamos essa tela e POSTamos automaticamente.
            if "PerfilController" in html or "Selecione o Perfil" in html or "perfilAtivoID" in html:
                log.debug("A3 mTLS ▸ tela de seleção de perfil detectada, selecionando…")
                html = self._selecionar_perfil(sessao, html, curl_bin, cookie_file, header_file, env)

            # ── Definir base URL como projudicrt (domínio mTLS) ─────────
            sessao._projudi_base_url = "https://projudicrt.tjpr.jus.br"

            # Atualiza _tj após seleção de perfil (pode ter mudado)
            novo_tj = _extrair_tj(html)
            if novo_tj:
                sessao._projudi_tj = novo_tj

            log.info("✅ Login A3 (mTLS curl + libp11) concluído")
            return sessao

        finally:
            for f in (cert_tmp.name, cnf_tmp.name, cookie_file, header_file):
                try:
                    os.unlink(f)
                except OSError:
                    pass

    # ── Seleção de perfil pós-mTLS ───────────────────────────────────────────

    def _selecionar_perfil(
        self,
        sessao: "ProjudiSession",
        html: str,
        curl_bin: str,
        cookie_file: str,
        header_file: str,
        env: dict,
    ) -> str:
        """Seleciona automaticamente o perfil Advogado após login mTLS.

        O Projudi exibe uma tela de seleção de perfil quando o CPF tem mais de
        um login associado (ex.: Advogado + Assessor). Este método detecta os
        perfis disponíveis e seleciona o perfil Advogado (ou o primeiro
        disponível, caso não haja Advogado).

        Retorna o HTML da página pós-seleção de perfil.
        """
        # Extrair URL do PerfilController (inclui jsessionid + _tj)
        m_ctrl = re.search(
            r"new PerfilController\('([^']+)'",
            html,
        )
        if not m_ctrl:
            log.warning("A3 mTLS ▸ PerfilController não encontrado; pulando seleção.")
            return html

        logon_url_relativo = m_ctrl.group(1)
        # Montar URL absoluta na base projudicrt
        if logon_url_relativo.startswith("/"):
            logon_url = f"https://projudicrt.tjpr.jus.br{logon_url_relativo}"
        else:
            logon_url = logon_url_relativo

        # Extrair os perfis disponíveis: addLogon('Advogado', 'PR127088')
        perfis = re.findall(r"addLogon\('([^']+)',\s*'([^']+)'\)", html)
        log.debug("A3 mTLS ▸ perfis disponíveis: %s", perfis)

        # Preferir perfil Advogado; fallback para o primeiro
        perfil_id = None
        for tipo, login_id in perfis:
            if "advogado" in tipo.lower():
                perfil_id = login_id
                log.debug("A3 mTLS ▸ perfil selecionado: %s (%s)", tipo, login_id)
                break
        if not perfil_id and perfis:
            perfil_id = perfis[0][1]
            log.debug("A3 mTLS ▸ perfil padrão (primeiro): %s", perfil_id)

        if not perfil_id:
            log.warning("A3 mTLS ▸ nenhum perfil encontrado no HTML; pulando seleção.")
            return html

        # POST para selecionar o perfil
        _UA = (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        )
        result = subprocess.run(
            [
                curl_bin, "-s", "-L",
                "-c", cookie_file, "-b", cookie_file,
                "-D", header_file,
                "-H", f"User-Agent: {_UA}",
                "-H", "Content-Type: application/x-www-form-urlencoded",
                "--max-time", "20",
                "-d", f"_pLogin_ATC={perfil_id}&perfilAtivoID={perfil_id}",
                logon_url,
            ],
            env=env, capture_output=True, timeout=30,
        )

        if result.returncode != 0:
            log.warning(
                "A3 mTLS ▸ seleção de perfil retornou erro %d: %s",
                result.returncode,
                result.stderr.decode("latin-1", errors="replace")[:200],
            )
            return html

        novo_html = result.stdout.decode("latin-1", errors="replace")

        # Verificar se há erros na página
        if "errorMessages" in novo_html and "Erro geral" in novo_html:
            log.warning("A3 mTLS ▸ erro ao selecionar perfil, usando HTML anterior.")
            return html

        log.debug("A3 mTLS ▸ perfil selecionado com sucesso (postLogon=%s)",
                  "postLogon" in novo_html)

        # Atualizar cookies: persistentes do cookie jar + HttpOnly dos headers
        _carregar_cookies_curl(sessao, cookie_file)
        _carregar_cookies_headers(sessao, header_file, dominio_padrao="projudicrt.tjpr.jus.br")

        # Atualizar jsessionid se mudou após seleção de perfil
        m_jsess = re.search(r"jsessionid=([a-zA-Z0-9._-]{10,})", novo_html)
        if m_jsess:
            sessao._projudi_jsessionid = m_jsess.group(1)
            log.debug("A3 mTLS ▸ jsessionid pós-perfil: %.25s…", sessao._projudi_jsessionid)

        return novo_html

    # ── Estratégia 2: challenge-response PyKCS11 (fallback) ─────────────────

    def _autenticar_challenge_response(self) -> requests.Session:
        """Autentica via challenge-response na camada de aplicação.

        Fluxo:
        1. GET CERT_AUTH_URL sem client-cert → página com campo de desafio
        2. Localiza o desafio (nonce/hash) no HTML
        3. Assina o desafio com a chave privada do token via PyKCS11
        4. POST: certificado + assinatura + campos ocultos
        5. Verifica iframe userMainFrame na resposta

        Funciona apenas se o Projudi implementar challenge-response na
        camada de aplicação (não mTLS puro).
        """
        try:
            import PyKCS11
            from cryptography import x509 as cx509
        except ImportError as exc:
            raise RuntimeError(
                f"Dependência ausente ({exc}): pip install PyKCS11 cryptography"
            )

        # ── Abrir sessão PKCS#11 e fazer login ────────────────────────────
        lib = PyKCS11.PyKCS11Lib()
        lib.load(self.pkcs11_lib)
        slots = lib.getSlotList(tokenPresent=True)
        if not slots:
            raise RuntimeError("Nenhum token PKCS#11 detectado.")

        pkcs11_sessao = lib.openSession(slots[self.slot], PyKCS11.CKF_SERIAL_SESSION)
        try:
            try:
                pkcs11_sessao.login(self.pin, PyKCS11.CKU_USER)
            except PyKCS11.PyKCS11Error as _e:
                if getattr(_e, "value", None) == PyKCS11.CKR_USER_ALREADY_LOGGED_IN:
                    log.debug("PKCS11 token já logado (paralelismo) — reusando estado")
                else:
                    raise

            # ── Ler certificado e chave privada do token ───────────────────
            certs_obj = pkcs11_sessao.findObjects(
                [(PyKCS11.CKA_CLASS, PyKCS11.CKO_CERTIFICATE)]
            )
            if not certs_obj:
                raise RuntimeError("Nenhum certificado encontrado no token.")

            cert_der = _pkcs11_ler_cert_der(pkcs11_sessao, certs_obj[0], PyKCS11)

            # Para chave privada, precisamos estar logado. Se findObjects vier
            # vazio mesmo com cert presente, o login não está ativo nesta sessão
            # (paralelismo PKCS#11 pode bloquear acesso). Tentar logout+login.
            privkeys = pkcs11_sessao.findObjects(
                [(PyKCS11.CKA_CLASS, PyKCS11.CKO_PRIVATE_KEY)]
            )
            if not privkeys:
                # Fallback: forçar re-login limpando o estado primeiro
                try:
                    pkcs11_sessao.logout()
                except Exception:
                    pass
                try:
                    pkcs11_sessao.login(self.pin, PyKCS11.CKU_USER)
                except PyKCS11.PyKCS11Error as _e2:
                    if getattr(_e2, "value", None) != PyKCS11.CKR_USER_ALREADY_LOGGED_IN:
                        raise
                privkeys = pkcs11_sessao.findObjects(
                    [(PyKCS11.CKA_CLASS, PyKCS11.CKO_PRIVATE_KEY)]
                )
            if not privkeys:
                raise RuntimeError("Chave privada não encontrada no token.")
            privkey = privkeys[0]

            cert_b64 = base64.b64encode(cert_der).decode()

            # ── Iniciar sessão HTTP e carregar cookies básicos ─────────────
            sessao = _nova_sessao()
            sessao.get(BASE_URL, timeout=20)

            # ── GET na página de autenticação por certificado ──────────────
            log.debug("A3 challenge-response ▸ GET %s", CERT_AUTH_URL)
            try:
                r = sessao.get(CERT_AUTH_URL, timeout=30)
            except requests.exceptions.SSLError as exc:
                raise RuntimeError(
                    f"O Projudi exigiu mTLS no handshake TLS: {exc}\n"
                    "Esta estratégia (challenge-response) requer que a página "
                    "seja acessível sem client-cert no TLS."
                )

            soup = BeautifulSoup(r.text, "html.parser")

            # Verificar se já está autenticado (improvável sem cert)
            if soup.find("iframe", attrs={"name": "userMainFrame"}):
                sessao._projudi_html = r.text
                sessao._projudi_tj = _extrair_tj(r.text)
                log.info("✅ Login A3 (sem challenge) concluído")
                return sessao

            # ── Localizar campo de desafio no HTML ────────────────────────
            challenge = None
            challenge_field = None
            for fname in ["desafio", "challenge", "nonce", "token", "hash",
                          "data", "conteudo", "texto"]:
                el = soup.find("input", {"name": fname})
                if el and el.get("value"):
                    challenge = el["value"]
                    challenge_field = fname
                    log.debug("Challenge encontrado no campo '%s': %.30s…", fname, challenge)
                    break

            if not challenge:
                # Tenta em elementos de texto
                for sel in ["#desafio", "#challenge", "#nonce", ".challenge",
                            "[id*='desafio']", "[id*='challenge']"]:
                    el = soup.select_one(sel)
                    if el and el.get_text(strip=True):
                        challenge = el.get_text(strip=True)
                        challenge_field = sel
                        log.debug("Challenge em elemento '%s': %.30s…", sel, challenge)
                        break

            if not challenge:
                raise RuntimeError(
                    "Nenhum campo de challenge encontrado na página de autenticação.\n"
                    f"URL: {CERT_AUTH_URL}\n"
                    f"Status HTTP: {r.status_code}\n"
                    "Possíveis causas:\n"
                    "  • O Projudi requer mTLS (client-cert no TLS handshake)\n"
                    "  • A página redirecionou para Keycloak sem challenge-response\n"
                    "  • O fluxo de autenticação mudou"
                )

            # ── Assinar o desafio com a chave privada do token ─────────────
            log.debug("A3 challenge-response ▸ assinando challenge…")
            challenge_bytes = challenge.encode("utf-8")
            mech = PyKCS11.Mechanism(PyKCS11.CKM_SHA256_RSA_PKCS, None)
            signature_raw = pkcs11_sessao.sign(privkey, list(challenge_bytes), mech)
            signature_b64 = base64.b64encode(bytes(bytearray(signature_raw))).decode()

            # ── Coletar form action e campos ocultos ──────────────────────
            form = soup.find("form")
            form_action = CERT_AUTH_URL
            if form:
                action = form.get("action", "")
                if action:
                    form_action = (
                        action if action.startswith("http")
                        else f"{BASE_URL}{action}"
                    )

            data: dict = {}
            if form:
                for inp in form.find_all("input", {"type": "hidden"}):
                    name = inp.get("name")
                    if name:
                        data[name] = inp.get("value", "")

            # ── Adicionar campos de resposta (tenta vários nomes comuns) ──
            data.update({
                "resposta":    signature_b64,
                "assinatura":  signature_b64,
                "signature":   signature_b64,
                "certificado": cert_b64,
                "certificate": cert_b64,
            })
            if challenge_field:
                data.setdefault(challenge_field, challenge)

            # ── POST da resposta ───────────────────────────────────────────
            log.debug("A3 challenge-response ▸ POST %s", form_action)
            r_final = sessao.post(form_action, data=data, timeout=30)

            soup_final = BeautifulSoup(r_final.text, "html.parser")
            if not soup_final.find("iframe", attrs={"name": "userMainFrame"}):
                raise RuntimeError(
                    "Challenge assinado e enviado, mas o Projudi não autenticou.\n"
                    "Possíveis causas:\n"
                    "  • O formato da resposta esperado é diferente\n"
                    "  • O certificado A3 não está cadastrado no Projudi\n"
                    "  • A validade do certificado expirou"
                )

            sessao._projudi_html = r_final.text
            sessao._projudi_tj = _extrair_tj(r_final.text)
            log.info("✅ Login A3 (challenge-response) concluído")
            return sessao

        finally:
            try:
                pkcs11_sessao.logout()
                pkcs11_sessao.closeSession()
            except Exception:
                pass

    # ── (método removido: macOS Keychain — LibreSSL não suporta Keychain) ──────

        raise NotImplementedError(
            "Estratégia macOS Keychain removida — LibreSSL do /usr/bin/curl "
            "não suporta identidades Keychain. Use _autenticar_mtls_curl()."
        )


# ─────────────────────────────────────────────────────────────────────────────
# Utilitários auxiliares
# ─────────────────────────────────────────────────────────────────────────────

def _cmd_existe(cmd: str) -> bool:
    """Verifica se um comando existe no PATH ou é um caminho absoluto válido."""
    if os.path.isabs(cmd):
        return os.path.isfile(cmd) and os.access(cmd, os.X_OK)
    return (
        subprocess.run(
            ["which", cmd], capture_output=True, timeout=5
        ).returncode == 0
    )


def _carregar_cookies_curl(sessao: requests.Session, cookie_file: str) -> None:
    """Carrega cookies do formato Netscape (gerado por curl -c) na sessão.

    IMPORTANTE: cookies HttpOnly NO formato Netscape vêm com prefixo
    `#HttpOnly_` no campo domain (e.g., `#HttpOnly_eproc1g.tjsp.jus.br`).
    Antes essa função pulava tudo que começa com `#` — bug crítico que
    fazia perdermos PHPSESSID e outros cookies de sessão.
    """
    if not os.path.exists(cookie_file):
        return
    with open(cookie_file) as f:
        for line in f:
            line = line.rstrip("\n").rstrip("\r")
            if not line.strip():
                continue
            # Pular comentários puros, MAS aceitar #HttpOnly_<domain>
            if line.startswith("#") and not line.startswith("#HttpOnly_"):
                continue
            partes = line.split("\t")
            if len(partes) < 7:
                continue
            domain, _, path, _, _, name, value = partes[:7]
            # Remover prefixo HttpOnly do domain
            if domain.startswith("#HttpOnly_"):
                domain = domain[len("#HttpOnly_"):]
            try:
                sessao.cookies.set(
                    name, value,
                    domain=domain.lstrip("."),
                    path=path or "/",
                )
            except Exception:
                pass


def _carregar_cookies_headers(
    sessao: requests.Session,
    header_file: str,
    dominio_padrao: str = "projudicrt.tjpr.jus.br",
) -> None:
    """Carrega TODOS os cookies (incluindo HttpOnly) dos response headers.

    O curl com -D grava todos os response headers no arquivo, incluindo
    Set-Cookie. Aqui parseamos esses headers para capturar cookies HttpOnly
    que o curl NÃO salva no cookie jar (JSESSIONID, projudi-route, etc.).
    """
    if not os.path.exists(header_file):
        return

    try:
        with open(header_file, encoding="latin-1", errors="replace") as f:
            conteudo = f.read()
    except OSError:
        return

    # Parsear cada Set-Cookie: header
    for m in re.finditer(
        r"^Set-Cookie:\s*(.+)$", conteudo, re.IGNORECASE | re.MULTILINE
    ):
        cookie_str = m.group(1).strip()
        partes = [p.strip() for p in cookie_str.split(";")]
        if not partes:
            continue

        # Primeiro componente: name=value
        if "=" not in partes[0]:
            continue
        name, value = partes[0].split("=", 1)
        name = name.strip()
        value = value.strip()

        # Atributos adicionais
        path = "/"
        domain = dominio_padrao
        for atributo in partes[1:]:
            atributo_lower = atributo.lower()
            if atributo_lower.startswith("path="):
                path = atributo[5:].strip() or "/"
            elif atributo_lower.startswith("domain="):
                domain = atributo[7:].strip().lstrip(".")

        sessao.cookies.set(name, value, domain=domain, path=path)
        log.debug(
            "Cookie HttpOnly carregado: %s=%s… (domain=%s path=%s)",
            name, value[:10], domain, path,
        )
