"""
tribunal_hosts.py — Tabela canônica de hosts/endpoints de TODOS os tribunais.

Fonte única de configuração de URLs. Os módulos pje_client/pje_auth,
eproc_client/eproc_auth, esaj_client/esaj_auth e projudi_client importam
daqui (mantendo seus nomes públicos antigos como alias de compatibilidade).

Status de cada entrada:
  "validado": True   — host confirmado em produção (testado com A3 real ou probe)
  "validado": False  — host derivado do padrão público do sistema; rodar
                       validar_hosts.py para confirmar DNS/HTTPS

Para adicionar um tribunal novo: adicionar a entrada na tabela do sistema
correspondente — registry, factory, auth e UI passam a enxergá-lo sozinhos.
"""

from __future__ import annotations

# ───────────────────────────────────────────────────────────────────────────
# PJe — Processo Judicial Eletrônico (CNJ)
#
# Campos:
#   nome          — exibição
#   host_1g/2g    — instâncias 1º/2º grau (host + path da app)
#   mni_endpoint  — SOAP MNI (consultarProcesso); wsdl = endpoint + "?wsdl"
#   pdpj          — True se o tribunal já migrou para o SSO PDPJ do CNJ
#   justica       — "estadual" | "federal" | "trabalho" | "eleitoral" | "superior"
# ───────────────────────────────────────────────────────────────────────────

def _pje(nome: str, host_1g: str, host_2g: str, *, pdpj: bool = True,
         justica: str = "estadual", mni: str | None = None,
         validado: bool = False) -> dict:
    return {
        "nome": nome,
        "host_1g": host_1g,
        "host_2g": host_2g,
        "mni_wsdl": (mni or host_1g + "/intercomunicacao") + "?wsdl",
        "mni_endpoint": mni or host_1g + "/intercomunicacao",
        "ssl_cert_path": "/ssoCertificado.seam",
        "pdpj": pdpj,
        "justica": justica,
        "validado": validado,
    }


PJE_HOSTS: dict[str, dict] = {
    # ── TJs estaduais (validados previamente no projeto) ────────────────────
    "tjrj":  _pje("TJRJ",  "https://tjrj.pje.jus.br/1g",      "https://tjrj.pje.jus.br/2g",      validado=True),
    "tjba":  _pje("TJBA",  "https://pje.tjba.jus.br/pje",     "https://pje2g.tjba.jus.br/pje",   validado=True),
    "tjmg":  _pje("TJMG",  "https://pje.tjmg.jus.br/pje",     "https://pjerecursal.tjmg.jus.br/pje", validado=True),
    "tjdft": _pje("TJDFT", "https://pje.tjdft.jus.br/pje",    "https://pje2i.tjdft.jus.br/pje",  validado=True),
    # TJGO usa o PJD (Processo Judicial Digital) — instância única
    "tjgo":  _pje("TJGO",  "https://pjd.tjgo.jus.br",         "https://pjd.tjgo.jus.br",         pdpj=False, validado=True),
    # ── TJs estaduais (probe 06/2026: HTTP 200) ─────────────────────────────
    "tjac":  _pje("TJAC",  "https://pje.tjac.jus.br",         "https://pje.tjac.jus.br",         validado=True),
    "tjap":  _pje("TJAP",  "https://pje.tjap.jus.br/1g",      "https://pje.tjap.jus.br/2g",      validado=True),
    "tjce":  _pje("TJCE",  "https://pje.tjce.jus.br/pje1grau", "https://pje.tjce.jus.br/pje2grau", validado=True),
    "tjes":  _pje("TJES",  "https://pje.tjes.jus.br/pje",     "https://pje.tjes.jus.br/pje2g",   validado=True),
    "tjma":  _pje("TJMA",  "https://pje.tjma.jus.br/pje",     "https://pje2.tjma.jus.br",        validado=True),
    "tjmt":  _pje("TJMT",  "https://pje.tjmt.jus.br/pje",     "https://pje2.tjmt.jus.br/pje2",   validado=True),
    "tjpa":  _pje("TJPA",  "https://pje.tjpa.jus.br/pje",     "https://pje.tjpa.jus.br/pje-2g",  validado=True),
    "tjpb":  _pje("TJPB",  "https://pje.tjpb.jus.br/pje",     "https://pje.tjpb.jus.br/pje2g",   validado=True),
    "tjpe":  _pje("TJPE",  "https://pje.tjpe.jus.br/1g",      "https://pje.tjpe.jus.br/2g",      validado=True),
    "tjpi":  _pje("TJPI",  "https://pje.tjpi.jus.br/1g",      "https://pje.tjpi.jus.br/2g",      validado=True),
    "tjrn":  _pje("TJRN",  "https://pje1g.tjrn.jus.br/pje",   "https://pje2g.tjrn.jus.br/pje",   validado=True),
    "tjro":  _pje("TJRO",  "https://pjepg.tjro.jus.br",       "https://pjesg.tjro.jus.br",       validado=True),
    "tjrr":  _pje("TJRR",  "https://pje.tjrr.jus.br/pje",     "https://pje.tjrr.jus.br/pje",     validado=True),
    # ── TJs com bloqueio por IP/VPN no probe (host existe; confirmar com A3) ─
    "tjal":  _pje("TJAL",  "https://pje.tjal.jus.br/1g",      "https://pje.tjal.jus.br/2g"),
    "tjam":  _pje("TJAM",  "https://pje.tjam.jus.br/pje",     "https://pje.tjam.jus.br/pje-2g"),
    # TJMS e TJSE não publicam PJe nesses hosts. O TJSE adotou eproc para
    # processos novos em 2025/2026 e está configurado em EPROC_HOSTS.
    # ── Justiça Militar estadual ────────────────────────────────────────────
    # TJM-SP migrou para o PJe (o manual ainda cita e-SAJ, mas o sistema
    # eletrônico atual é pje.tjmsp.jus.br — probe 06/2026: HTTP 200)
    "tjm-sp": _pje("TJM-SP", "https://pje.tjmsp.jus.br/pje-web", "https://pje.tjmsp.jus.br/pje-web",
                   justica="militar", validado=True),
    # ── Superiores ──────────────────────────────────────────────────────────
    "tst":   _pje("TST",   "https://pje.tst.jus.br/tst",      "https://pje.tst.jus.br/tst",     justica="superior"),
    "tse":   _pje("TSE",   "https://pje.tse.jus.br/pje",      "https://pje.tse.jus.br/pje",     justica="superior"),
    # ── TRFs (Justiça Federal) ──────────────────────────────────────────────
    "trf1":  _pje("TRF1",  "https://pje1g.trf1.jus.br/pje",   "https://pje2g.trf1.jus.br/pje",  justica="federal"),
    "trf3":  _pje("TRF3",  "https://pje1g.trf3.jus.br/pje",   "https://pje2g.trf3.jus.br/pje",  justica="federal"),
    "trf5":  _pje("TRF5",  "https://pje.trf5.jus.br/pje",     "https://pje.trf5.jus.br/pje",    justica="federal"),
    "trf6":  _pje("TRF6",  "https://pje1g.trf6.jus.br/pje",   "https://pje2g.trf6.jus.br/pje",  justica="federal"),
}

# TRTs 1–24 — PJe-JT: padrão uniforme pje.trt{N}.jus.br/{primeirograu,segundograu}
_TRT_REGIOES = {
    1: "RJ", 2: "SP (capital)", 3: "MG", 4: "RS", 5: "BA", 6: "PE", 7: "CE",
    8: "PA/AP", 9: "PR", 10: "DF/TO", 11: "AM/RR", 12: "SC", 13: "PB",
    14: "RO/AC", 15: "Campinas/SP", 16: "MA", 17: "ES", 18: "GO", 19: "AL",
    20: "SE", 21: "RN", 22: "PI", 23: "MT", 24: "MS",
}
for _n, _uf in _TRT_REGIOES.items():
    PJE_HOSTS[f"trt{_n}"] = _pje(
        f"TRT{_n} ({_uf})",
        f"https://pje.trt{_n}.jus.br/primeirograu",
        f"https://pje.trt{_n}.jus.br/segundograu",
        justica="trabalho",
    )

# TREs — PJe eleitoral: padrão pje.tre-{uf}.jus.br/pje (instância única)
_UFS = ["ac", "al", "ap", "am", "ba", "ce", "df", "es", "go", "ma", "mt",
        "ms", "mg", "pa", "pb", "pr", "pe", "pi", "rj", "rn", "rs", "ro",
        "rr", "sc", "sp", "se", "to"]
for _uf in _UFS:
    PJE_HOSTS[f"tre-{_uf}"] = _pje(
        f"TRE-{_uf.upper()}",
        f"https://pje.tre-{_uf}.jus.br/pje",
        f"https://pje.tre-{_uf}.jus.br/pje",
        justica="eleitoral",
    )


# ───────────────────────────────────────────────────────────────────────────
# eproc (TRF4 e migrados)
#
# Campos:
#   host_1g/2g              — instâncias
#   host_consulta_publica   — host público sem anti-bot (quando separado)
#   path_app                — caminho da app (default "/eproc")
#   prefixo_usuario         — prefixo do usuário no login com senha
# ───────────────────────────────────────────────────────────────────────────

EPROC_HOSTS: dict[str, dict] = {
    "tjsc": {
        "nome": "TJSC",
        "host_1g": "https://eproc1g.tjsc.jus.br",
        "host_2g": "https://eproc2g.tjsc.jus.br",
        # ATENÇÃO: eproc1g.tjsc.jus.br FAZ 302 REDIRECT para
        # eprocwebcon.tjsc.jus.br/consulta1g no endpoint público.
        # O eprocwebcon NÃO tem anti-bot. Usamos ele direto.
        "host_consulta_publica": "https://eprocwebcon.tjsc.jus.br/consulta1g",
        "prefixo_usuario": "SC",
        "validado": True,
    },
    "tjrs": {
        "nome": "TJRS",
        "host_1g": "https://eproc1g.tjrs.jus.br",
        "host_2g": "https://eproc2g.tjrs.jus.br",
        "prefixo_usuario": "RS",
        "validado": True,
    },
    "tjsp": {
        "nome": "TJSP (eproc novo)",
        "host_1g": "https://eproc1g.tjsp.jus.br",
        "host_2g": "https://eproc2g.tjsp.jus.br",
        "prefixo_usuario": "SP",
        "validado": True,
    },
    "trf4": {
        "nome": "TRF4",
        "host_1g": "https://eproc.trf4.jus.br",
        "host_2g": "https://eproc.trf4.jus.br",  # mesmo host
        "prefixo_usuario": "FED",
        "path_app": "/eproc2trf4",  # caminho específico
        "validado": True,
    },
    # ── Migrados recentes (padrão público — validar) ────────────────────────
    "trf2": {
        "nome": "TRF2",
        "host_1g": "https://eproc.jfrj.jus.br",
        "host_2g": "https://eproc.trf2.jus.br",
        "path_app": "/eproc",
        "prefixo_usuario": "FED",
        "validado": True,  # probe 07/2026: HTTP 200
    },
    # ── Seções Judiciárias Federais (1º grau) com eproc próprio ──────────────
    "jfes": {
        "nome": "JFES — Justiça Federal do Espírito Santo",
        "host_1g": "https://eproc.jfes.jus.br",
        "path_app": "/eproc",
        "prefixo_usuario": "FED",
        "validado": True,  # probe 07/2026: HTTP 200
    },
    "jfrj": {
        "nome": "JFRJ — Justiça Federal do Rio de Janeiro",
        "host_1g": "https://eproc.jfrj.jus.br",
        "path_app": "/eproc",
        "prefixo_usuario": "FED",
        "validado": True,  # probe 07/2026: HTTP 200
    },
    "trf6": {
        "nome": "TRF6",
        "host_1g": "https://eproc1g.trf6.jus.br",
        "host_2g": "https://eproc2g.trf6.jus.br",
        "prefixo_usuario": "FED",
        "validado": False,
    },
    "tjto": {
        "nome": "TJTO",
        "host_1g": "https://eproc1.tjto.jus.br",
        "host_2g": "https://eproc2.tjto.jus.br",
        "path_app": "/eprocV2_prod_1grau",
        "path_app_2g": "/eprocV2_prod_2grau",
        "prefixo_usuario": "TO",
        "validado": False,
    },
    "tjpr": {
        # TJPR começou a migração pro eproc (casos novos); Projudi continua
        # sendo o sistema principal do acervo. 2º grau ainda não tem host
        # eproc próprio (probe 06/2026) — usa o mesmo do 1º grau.
        "nome": "TJPR (eproc novo)",
        "host_1g": "https://eproc1g.tjpr.jus.br",
        "host_2g": "https://eproc1g.tjpr.jus.br",
        "prefixo_usuario": "PR",
        "validado": True,
    },
    "tjse": {
        # Fonte oficial do TJSE (07/2026): processos novos no eproc; o acervo
        # anterior continua disponível pela consulta processual legada.
        "nome": "TJSE (eproc novo)",
        "host_1g": "https://eproc1g.tjse.jus.br",
        "host_2g": "https://eproc1g.tjse.jus.br",
        "path_app": "/eproc",
        "validado": True,
    },
    "tjm-rs": {
        "nome": "TJM-RS (Justiça Militar RS)",
        "host_1g": "https://eproc1g.tjmrs.jus.br",
        "host_2g": "https://eproc2g.tjmrs.jus.br",
        "prefixo_usuario": "RS",
        "validado": True,  # probe 06/2026: HTTP 200
    },
    "jmu": {
        # e-Proc Nacional da JMU, hospedado pelo STM
        "nome": "JMU (Justiça Militar da União)",
        "host_1g": "https://eproc1g.stm.jus.br",
        "host_2g": "https://eproc2g.stm.jus.br",
        "path_app": "/eproc_1g_prod",
        "path_app_2g": "/eproc_2g_prod",
        "prefixo_usuario": "FED",
        "validado": True,  # probe 06/2026: HTTP 200
    },
}

# Paths de login (auth) — derivados de path_app
EPROC_LOGIN_CERT_PATH = "{app}/externo_controlador.php?acao=acessar_certificado"
EPROC_LOGIN_USER_PATH = "{app}/externo_controlador.php?acao=usuario_externo_logar"


def eproc_login_paths(codigo: str) -> dict:
    """Monta paths de login do eproc a partir do path_app do tribunal."""
    cfg = EPROC_HOSTS[codigo]
    app = cfg.get("path_app", "/eproc")
    return {
        "nome": cfg["nome"],
        "host_1g": cfg["host_1g"],
        "login_cert_path": EPROC_LOGIN_CERT_PATH.format(app=app),
        "login_user_path": EPROC_LOGIN_USER_PATH.format(app=app),
    }


# ───────────────────────────────────────────────────────────────────────────
# e-SAJ (Softplan)
#
# Campos:
#   host        — base da consulta (usado pelo client)
#   host_login  — base do login A3/senha quando diferente do host
# ───────────────────────────────────────────────────────────────────────────

ESAJ_HOSTS_TABELA: dict[str, dict] = {
    "tjsp":   {"nome": "TJSP",   "host": "https://esaj.tjsp.jus.br", "validado": True},
    "tjac":   {"nome": "TJAC",   "host": "https://esaj.tjac.jus.br", "validado": True},
    "tjal":   {"nome": "TJAL",   "host": "https://www2.tjal.jus.br", "validado": True},
    "tjam":   {"nome": "TJAM",   "host": "https://consultasaj.tjam.jus.br", "validado": True},
    "tjce":   {"nome": "TJCE",   "host": "https://esaj.tjce.jus.br", "validado": True},
    "tjms":   {"nome": "TJMS",   "host": "https://esaj.tjms.jus.br", "validado": True},
    "tjpb":   {"nome": "TJPB",   "host": "https://app.tjpb.jus.br", "validado": True},
    "tjpe":   {"nome": "TJPE",   "host": "https://www.tjpe.jus.br", "validado": True},
    "tjpi":   {"nome": "TJPI",   "host": "https://www.tjpi.jus.br", "validado": True},
    "tjrn":   {"nome": "TJRN",   "host": "https://esaj.tjrn.jus.br", "validado": True},
    "tjse":   {
        "nome": "TJSE (acervo legado)",
        "host": "https://www.tjse.jus.br/portal/consultas/nova-consulta-processual",
        "validado": True,
    },
    "tjma":   {"nome": "TJMA",   "host": "https://jurisconsult.tjma.jus.br", "validado": True},
    # ── Novos (validar) ─────────────────────────────────────────────────────
    "tjba":   {"nome": "TJBA",   "host": "https://esaj.tjba.jus.br", "validado": False},
    "tjro":   {"nome": "TJRO",   "host": "https://webapp.tjro.jus.br", "validado": False},
}
# Removidos da tabela e-SAJ (estavam classificados errado):
#   tjto → eproc (eproc1.tjto.jus.br é eproc, não e-SAJ)
#   tjrr → projudi (projudi.tjrr.jus.br é Projudi, não e-SAJ)
#   tjm-sp → pje (esaj.tjmsp.jus.br não existe; sistema atual é o PJe)


# ───────────────────────────────────────────────────────────────────────────
# Projudi
#
# O fluxo de auth A3 production-ready é específico do TJPR (projudi_auth.py).
# Demais estados compartilham o mesmo software com hosts próprios — cliente
# de consulta funciona; auth automática ainda não portada (auth_a3=False).
# ───────────────────────────────────────────────────────────────────────────

PROJUDI_HOSTS: dict[str, dict] = {
    "tjpr": {"nome": "TJPR", "host": "https://projudi.tjpr.jus.br",
             "host_a3": "https://projudicrt.tjpr.jus.br",
             "auth_a3": True, "validado": True},
    "tjam": {"nome": "TJAM", "host": "https://projudi.tjam.jus.br",
             "auth_a3": False, "validado": False},
    "tjgo": {"nome": "TJGO", "host": "https://projudi.tjgo.jus.br",
             "auth_a3": False, "validado": False},
    "tjmt": {"nome": "TJMT", "host": "https://projudi.tjmt.jus.br",
             "auth_a3": False, "validado": False},
    "tjrr": {"nome": "TJRR", "host": "https://projudi.tjrr.jus.br",
             "auth_a3": False, "validado": False},
}


# ───────────────────────────────────────────────────────────────────────────
# Sistemas próprios (sem cliente genérico) — portais de referência
# ───────────────────────────────────────────────────────────────────────────

PORTAIS_PROPRIOS: dict[str, dict] = {
    "stf":    {"nome": "STF", "portal": "https://portal.stf.jus.br"},
    "stj":    {"nome": "STJ", "portal": "https://processo.stj.jus.br/processo"},
    "stm":    {"nome": "STM", "portal": "https://www.stm.jus.br"},
    "tjm-mg": {"nome": "TJM-MG", "portal": "https://www.tjmmg.jus.br"},
}


def hosts_do_sistema(sistema: str) -> dict[str, dict]:
    """Tabela de hosts de um sistema ('pje', 'eproc', 'esaj', 'projudi')."""
    return {
        "pje": PJE_HOSTS,
        "eproc": EPROC_HOSTS,
        "esaj": ESAJ_HOSTS_TABELA,
        "projudi": PROJUDI_HOSTS,
    }.get(sistema, {})


def tem_cliente(codigo: str, sistema: str) -> bool:
    """True se o tribunal tem host configurado para o sistema dado."""
    return codigo.lower() in hosts_do_sistema(sistema)
