"""
tribunal_base.py — Interface abstrata comum para todos os clientes de tribunal.

Todo cliente concreto (ProJudiClient, EprocClient, PJeClient, ESAJClient)
deve estender TribunalClient e implementar os métodos abstratos conforme
o sistema processual usado pelo tribunal.

Métodos com `raise NotImplementedError` são opcionais — o registry/UI
verifica via `features` quais o cliente realmente implementa.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional


class TribunalClient(ABC):
    """Classe base para todos os clientes de tribunal."""

    # Sub-classes devem definir
    SISTEMA = "?"          # "projudi", "esaj", "pje", "eproc"
    CODIGO_TRIBUNAL = "?"  # "tjpr", "tjsc", "tjsp", etc.

    @property
    @abstractmethod
    def autenticado(self) -> bool:
        """True se há sessão ativa."""
        ...

    # ── Carteira do advogado ────────────────────────────────────────────────

    def listar_carteira(self, pagina: int = 1, por_pagina: int = 50) -> dict:
        """Lista processos da carteira do advogado logado.

        Retorna:
            {
              "total": int,
              "pagina": int,
              "tem_mais": bool,
              "processos": [
                {"numero_cnj": "...", "processo_key": "...", "classe": "...", ...}
              ]
            }
        """
        raise NotImplementedError(f"{self.__class__.__name__} não implementa listar_carteira")

    # ── Busca por CPF/CNPJ ──────────────────────────────────────────────────

    def buscar_cpf(self, cpf_ou_cnpj: str) -> dict:
        """Busca processos onde a pessoa figura como parte.

        Retorna:
            {
              "documento": "...",
              "processos": [{"numero_cnj": "...", "processo_key": "...", ...}],
              "total": int
            }
        """
        raise NotImplementedError(f"{self.__class__.__name__} não implementa buscar_cpf")

    # ── Busca por número CNJ ────────────────────────────────────────────────

    def buscar_processo(self, numero_cnj: str) -> dict:
        """Busca um processo pelo número CNJ.

        Retorna {processo: {numero_cnj, processo_key, ...}, encontrado: bool}
        """
        raise NotImplementedError(f"{self.__class__.__name__} não implementa buscar_processo")

    def listar_movimentos(self, numero_cnj: str) -> dict:
        """Lista movimentos/eventos de um processo via portal do tribunal.

        Retorna:
            {
              "encontrado": bool,
              "numero": "...",
              "tribunal": "...",
              "contexto": {classe, orgao, partes, valor_causa, data_ajuizamento, ...},
              "movimentos": [{"dataHora": "ISO", "nome": "descrição", "tipo": "..."}],
              "qtd_movimentos": int,
              "processo_key": "<hash para listar_pecas>"
            }
        """
        raise NotImplementedError(f"{self.__class__.__name__} não implementa listar_movimentos")

    # ── Peças / Documentos ──────────────────────────────────────────────────

    def listar_pecas(self, processo_key: str) -> list[dict]:
        """Lista peças/documentos de um processo.

        Retorna [{tipo, titulo, data, paginas, acesso, documento_key, disponivel}, ...]
        """
        raise NotImplementedError(f"{self.__class__.__name__} não implementa listar_pecas")

    def baixar_peca(self, documento_key: str) -> bytes:
        """Baixa o conteúdo binário (geralmente PDF) de uma peça."""
        raise NotImplementedError(f"{self.__class__.__name__} não implementa baixar_peca")

    # ── Habilitação provisória (acesso à íntegra dos autos) ─────────────────

    def verificar_habilitacao_necessaria(self, processo_key: str) -> dict:
        """Verifica se o processo precisa de habilitação provisória para liberar peças.

        Retorna {precisa_habilitar: bool, habilitacao_key: str|None, pecas_visiveis: int}
        """
        return {"precisa_habilitar": False, "habilitacao_key": None, "pecas_visiveis": 0}

    def habilitar_acesso_provisorio(self, processo_key: str) -> dict:
        """Aceita Termo de Responsabilidade para acessar íntegra dos autos.
        Retorna {ok, mensagem, pecas_apos}
        """
        raise NotImplementedError(f"{self.__class__.__name__} não implementa habilitar_acesso_provisorio")

    # ── Info do advogado ────────────────────────────────────────────────────

    def info_advogado(self) -> dict:
        """Dados do advogado logado (nome, OAB, etc)."""
        raise NotImplementedError(f"{self.__class__.__name__} não implementa info_advogado")
