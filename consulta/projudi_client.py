"""
Cliente HTTP autenticado para o Projudi TJPR.

Após obter uma sessão autenticada via projudi_auth.py, use este módulo
para navegar no sistema: listar carteira, buscar processos, listar peças
e baixar documentos.

Uso:
    from projudi_auth import ProJudiAuth2FA
    from projudi_client import ProJudiClient

    sessao  = ProJudiAuth2FA(cpf, senha, totp_secret).autenticar()
    cliente = ProJudiClient(sessao)

    carteira  = cliente.listar_carteira()
    pecas     = cliente.listar_pecas(carteira[0]["processo_key"])
    pdf_bytes = cliente.baixar_peca(pecas[0]["documento_key"])
"""

from __future__ import annotations

import json
import logging
import re
from typing import Optional
from urllib.parse import urlencode, urljoin, urlparse, parse_qs

import requests
from bs4 import BeautifulSoup, Tag

log = logging.getLogger(__name__)

BASE_URL = "https://projudi.tjpr.jus.br"
_PROJUDI = f"{BASE_URL}/projudi"


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _abs(path: str) -> str:
    """Garante URL absoluta."""
    if path.startswith("http"):
        return path
    return urljoin(BASE_URL, path)


def _extrair_tj(html: str) -> Optional[str]:
    m = re.search(r"[?&]_tj=([a-zA-Z0-9]+)", html)
    return m.group(1) if m else None


def _tabela_para_lista(tabela: Tag) -> list[dict]:
    """Converte uma <table> HTML em lista de dicts usando o <thead> como chave."""
    if not tabela:
        return []

    headers = [
        th.get_text(strip=True).lower().replace(" ", "_")
        for th in tabela.select("thead th, thead td")
    ]
    if not headers:
        # Tenta primeira linha como cabeçalho
        primeira = tabela.find("tr")
        if primeira:
            headers = [
                td.get_text(strip=True).lower().replace(" ", "_")
                for td in primeira.find_all(["th", "td"])
            ]

    rows = []
    for tr in tabela.select("tbody tr"):
        cells = tr.find_all(["td", "th"])
        if not cells:
            continue
        row: dict = {}
        for i, td in enumerate(cells):
            key = headers[i] if i < len(headers) else f"col_{i}"
            # Texto limpo
            row[key] = td.get_text(separator=" ", strip=True)
            # Links dentro da célula (para extrair processo_key, documento_key etc.)
            links = td.find_all("a", href=True)
            if links:
                row[f"_{key}_href"] = links[0]["href"]
        rows.append(row)
    return rows


def _extrair_key_da_url(url: str, param: str) -> Optional[str]:
    """Extrai um parâmetro específico de uma URL do Projudi."""
    try:
        qs = parse_qs(urlparse(url).query)
        vals = qs.get(param) or qs.get(param.lower())
        return vals[0] if vals else None
    except Exception:
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Cliente principal
# ─────────────────────────────────────────────────────────────────────────────

class ProJudiClient:
    """Cliente para operações no Projudi com sessão autenticada.

    O software Projudi é o mesmo em TJPR, TJAM, TJGO, TJMT e TJRR — só muda
    o host (tribunal_hosts.PROJUDI_HOSTS). O fluxo de autenticação A3
    automática só está portado para o TJPR (projudi_auth.py); nos demais a
    sessão precisa vir autenticada por outro caminho.

    Parâmetros
    ----------
    sessao : requests.Session
        Sessão obtida de ProJudiAuth2FA.autenticar() ou ProJudiAuthA3.autenticar().
        Deve ter os atributos _projudi_html e _projudi_tj injetados.
    tribunal : str
        Código do tribunal Projudi (default "tjpr").
    """

    SISTEMA = "projudi"
    CODIGO_TRIBUNAL = "tjpr"

    def __init__(self, sessao: requests.Session, tribunal: str = "tjpr") -> None:
        from tribunal_hosts import PROJUDI_HOSTS
        tribunal = tribunal.lower()
        if tribunal not in PROJUDI_HOSTS:
            raise ValueError(
                f"Tribunal '{tribunal}' não é Projudi. Disponíveis: {sorted(PROJUDI_HOSTS)}"
            )
        self.CODIGO_TRIBUNAL = tribunal
        self._s = sessao
        # _tj token — necessário em quase todas as URLs do Projudi
        self._tj: Optional[str] = getattr(sessao, "_projudi_tj", None)
        self._html_home: str = getattr(sessao, "_projudi_html", "")
        # Base URL: o atributo da sessão tem precedência (no TJPR o fluxo A3
        # usa projudicrt.tjpr.jus.br; o 2FA usa projudi.tjpr.jus.br)
        self._base_url: str = (
            getattr(sessao, "_projudi_base_url", None)
            or PROJUDI_HOSTS[tribunal]["host"]
        )

        if not self._tj:
            raise ValueError(
                "Sessão sem _tj token. Use sessao = Auth(...).autenticar() "
                "e passe o objeto retornado."
            )

    @property
    def autenticado(self) -> bool:
        """True se há sessão PROJUDI ativa (tem _tj + cookie de sessão)."""
        if not self._tj:
            return False
        # Verifica cookie JSESSIONID ou outros indicadores do PROJUDI
        cookies = self._s.cookies
        return any(
            c.lower().startswith("jsessionid") or "projudi" in c.lower()
            for c in cookies.keys()
        ) or bool(self._html_home)

    # ── Utilitários internos ─────────────────────────────────────────────────

    def _abs(self, path: str) -> str:
        """Garante URL absoluta usando o base_url da sessão."""
        if path.startswith("http"):
            return path
        return urljoin(self._base_url, path)

    def _get(self, path: str, **params) -> requests.Response:
        """GET com _tj automático e tratamento de erros."""
        params.setdefault("_tj", self._tj)
        url = self._abs(path)
        if "?" not in url:
            url += "?" + urlencode(params)
        else:
            url += "&" + urlencode(params)
        r = self._s.get(url, timeout=30)
        r.raise_for_status()
        # Atualiza _tj se vier um novo na resposta
        novo_tj = _extrair_tj(r.text)
        if novo_tj:
            self._tj = novo_tj
        return r

    def _post(self, path: str, data: dict, **params) -> requests.Response:
        params.setdefault("_tj", self._tj)
        url = self._abs(path) + "?" + urlencode(params)
        r = self._s.post(url, data=data, timeout=30)
        r.raise_for_status()
        novo_tj = _extrair_tj(r.text)
        if novo_tj:
            self._tj = novo_tj
        return r

    def _soup(self, r: requests.Response) -> BeautifulSoup:
        return BeautifulSoup(r.text, "html.parser")

    # ── Carteira do advogado ─────────────────────────────────────────────────

    def listar_carteira(self, pagina: int = 1) -> dict:
        """Lista os processos da carteira do advogado logado.

        Retorna dict com:
            processos : list[dict]  — cada item tem numero_cnj, classe,
                                      orgao, fase, data_ultima_mov,
                                      processo_key (para baixar peças)
            total     : int         — total de registros
            pagina    : int         — página atual
            tem_mais  : bool        — há próximas páginas
        """
        log.debug("Listando carteira (página %d)…", pagina)

        # Para sessões A3 (projudicrt), usar processosAdvogado.do
        # Para sessões 2FA (projudi), usar advogado.do?actionType=listarProcessos
        if "projudicrt" in self._base_url:
            return self._listar_carteira_a3(pagina)
        else:
            return self._listar_carteira_2fa(pagina)

    def _listar_carteira_a3(self, pagina: int = 1) -> dict:
        """Carteira via sessão A3 (projudicrt.tjpr.jus.br).

        Fluxo:
        1. Carrega mesa do advogado (mesaAdvogado.do) para obter o link
           correto de processosAdvogado.do com o _tj atualizado.
        2. Segue esse link para obter a tabela de processos.
        """
        # Passo 1: Carregar a mesa do advogado para obter o link atualizado
        mesa_url = self._abs("/projudi/usuario/mesaAdvogado.do")
        r_mesa = self._s.get(
            f"{mesa_url}?actionType=listaInicio&_tj={self._tj}",
            timeout=30,
        )
        soup_mesa = BeautifulSoup(r_mesa.text, "html.parser")

        # Atualizar _tj da resposta da mesa
        novo_tj = _extrair_tj(r_mesa.text)
        if novo_tj:
            self._tj = novo_tj

        # Passo 2: Encontrar o link de processosAdvogado.do na página
        proc_url = None
        proc_tj = None
        for a in soup_mesa.find_all("a", href=True):
            href = a["href"]
            if "processosAdvogado.do" in href:
                proc_url = href
                m_tj = re.search(r"[?&]_tj=([a-zA-Z0-9]+)", href)
                if m_tj:
                    proc_tj = m_tj.group(1)
                break

        if proc_url:
            log.debug("Carteira A3 ▸ link processosAdvogado encontrado, _tj=%.20s…", proc_tj or "N/A")
            full_proc_url = self._abs(proc_url)
        else:
            # Fallback: construir URL diretamente com o _tj atual
            log.debug("Carteira A3 ▸ link não encontrado na mesa, usando _tj atual")
            full_proc_url = (
                self._abs("/projudi/processosAdvogado.do")
                + f"?grauProcesso=1G&flagProcesso=A&_tj={self._tj}"
            )

        # Passo 3: Buscar a lista de processos
        r = self._s.get(full_proc_url, timeout=30)
        r.raise_for_status()

        # Atualizar _tj da resposta
        novo_tj = _extrair_tj(r.text)
        if novo_tj:
            self._tj = novo_tj

        soup = BeautifulSoup(r.text, "html.parser")
        processos = self._parsear_carteira_result_table(soup, r.text)

        # Tentar obter total de processos
        total = 0
        m_total = re.search(r"Ativos[:\s]*(\d+)", r_mesa.text)
        if m_total:
            total = int(m_total.group(1))

        return {
            "processos": processos,
            "total": total or len(processos),
            "pagina": pagina,
            "tem_mais": False,  # processosAdvogado.do retorna tudo de uma vez
        }

    def _listar_carteira_2fa(self, pagina: int = 1) -> dict:
        """Carteira via sessão 2FA (projudi.tjpr.jus.br).

        O Projudi 2FA serve os processos via processosAdvogado.do (mesmo endpoint
        do A3) — o link aparece na mesa do advogado igual ao fluxo A3.
        """
        return self._listar_carteira_a3(pagina)

    def _parsear_carteira_result_table(self, soup: BeautifulSoup, html: str) -> list[dict]:
        """Parseia a tabela resultTable do processosAdvogado.do (sessão A3).

        Estrutura da tabela:
          - Linha cabeçalho (5 células): Processo|Partes|Dt Distribuição|Dt. Arquiv.|Classe
          - Linha processo  (10 células): checkbox|numero_cnj|partes_resumo|tipo1|nome1|...|data|classe
          - Linhas de partes extras (2 células): tipo|nome
          - Linha separadora (1 célula)
        """
        resultado = []

        tabela = soup.find("table", class_="resultTable")
        if not tabela:
            log.warning("Tabela resultTable não encontrada no HTML.")
            return []

        rows = tabela.find_all("tr")
        for row in rows:
            cells = row.find_all(["td", "th"])
            # Identificar linha de processo: tem 9+ células e a segunda tem número CNJ
            if len(cells) < 9:
                continue

            # Célula 1: número CNJ + link para o processo
            cnj_cell = cells[1]
            numero_cnj = cnj_cell.get_text(strip=True)

            # Verificar se parece número CNJ (formato NNNNNNN-DD.AAAA.J.TT.OOOO)
            if not re.match(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}", numero_cnj):
                continue

            # Extrair processo_key do link na célula CNJ
            # O link tem formato: /projudi/processo.do?_tj=CHAVE_LONGA
            processo_key = None
            for a in cnj_cell.find_all("a", href=True):
                href = a["href"]
                m_proc = re.search(r"processo\.do\?.*_tj=([a-zA-Z0-9]+)", href)
                if m_proc:
                    processo_key = m_proc.group(1)
                    break

            # Célula 2: partes (resumo compacto)
            partes_texto = cells[2].get_text(strip=True) if len(cells) > 2 else ""

            # Últimas células: data distribuição e classe processual
            data_dist = cells[-2].get_text(strip=True) if len(cells) >= 2 else ""
            classe = cells[-1].get_text(strip=True) if len(cells) >= 1 else ""

            # Limpar data: pegar apenas YYYY-MM-DD
            m_data = re.search(r"\d{4}-\d{2}-\d{2}", data_dist)
            data_dist = m_data.group(0) if m_data else data_dist

            resultado.append({
                "numero_cnj": numero_cnj,
                "classe": classe.strip(),
                "orgao": "",  # não disponível nesta view
                "fase": "Ativo",
                "data_ultima_mov": data_dist,
                "partes": partes_texto,
                "processo_key": processo_key,
            })

        return resultado

    def _parsear_carteira(self, soup: BeautifulSoup, html: str) -> list[dict]:
        """Parseia a tabela de processos da carteira (formato 2FA/legado)."""
        resultado = []

        # A tabela de processos no Projudi geralmente tem id "listaProcessos"
        # ou class "listagem" / "resultTable"
        tabela = (
            soup.find("table", {"id": "listaProcessos"})
            or soup.find("table", {"class": re.compile(r"lista|resultTable", re.I)})
            or soup.find("table")
        )

        if not tabela:
            log.warning("Tabela de carteira não encontrada no HTML.")
            return []

        # Tentar parsear como resultTable se for o formato A3
        rows_test = tabela.find_all("tr")
        if rows_test and len(rows_test[1].find_all(["td", "th"])) >= 9 if len(rows_test) > 1 else False:
            return self._parsear_carteira_result_table(soup, html)

        rows = _tabela_para_lista(tabela)

        for row in rows:
            # Extrair processo_key dos links da linha
            processo_key = None
            for k, v in row.items():
                if k.endswith("_href") and v:
                    pk = _extrair_key_da_url(v, "processo_key")
                    if pk:
                        processo_key = pk
                        break

            # Normalizar campos comuns (o Projudi pode variar os nomes de coluna)
            numero = (
                row.get("número") or row.get("numero") or
                row.get("número_do_processo") or row.get("processo") or ""
            )
            classe = (
                row.get("classe") or row.get("tipo") or ""
            )
            orgao = (
                row.get("órgão") or row.get("orgao") or
                row.get("vara") or row.get("comarca") or ""
            )
            fase = (
                row.get("fase") or row.get("situação") or row.get("situacao") or ""
            )
            data_mov = (
                row.get("última_movimentação") or row.get("ultima_movimentacao") or
                row.get("data") or row.get("data_da_última_movimentação") or ""
            )

            partes = (
                row.get("partes") or row.get("partes_resumo") or row.get("polo_ativo_/_polo_passivo") or row.get("polo_ativo/polo_passivo") or ""
            )

            resultado.append({
                "numero_cnj": numero.strip(),
                "classe": classe.strip(),
                "orgao": orgao.strip(),
                "fase": fase.strip(),
                "data_ultima_mov": data_mov.strip(),
                "partes": partes.strip(),
                "processo_key": processo_key,
                "_raw": row,  # linha original para depuração
            })

        return resultado

    # ── Busca de processo por número CNJ ────────────────────────────────────

    def buscar_processo(self, numero_cnj: str) -> Optional[dict]:
        """Busca um processo específico pelo número CNJ.

        Primeiro procura na carteira (0 requisições extras para processos
        do advogado). Se não encontrar, faz busca via formulário POST.

        Retorna dict com dados do processo incluindo processo_key,
        ou None se não encontrado.
        """
        numero_limpo = re.sub(r"[^\d.-]", "", numero_cnj.strip())
        log.debug("Buscando processo %s…", numero_limpo)

        # Estratégia 1: buscar na carteira do advogado (mais rápido)
        try:
            carteira = self.listar_carteira()
            for proc in carteira.get("processos", []):
                if proc.get("numero_cnj") == numero_limpo:
                    log.debug("Processo %s encontrado na carteira", numero_limpo)
                    return proc
        except Exception as e:
            log.debug("Falha ao buscar na carteira: %s", e)

        # Estratégia 2: busca via formulário POST
        log.debug("Processo não encontrado na carteira, buscando via formulário…")

        path = "/projudi/processo/buscaProcessosQualquerInstancia.do"

        # POST com o número CNJ no campo correto
        form_data = {
            "instanciaSuperior": "false",
            "page": "1",
            "filtroAdvogado": "qualquerAdvogado",
            "numeroProcesso": numero_limpo,
            "flagNumeroProcessoUnico": "true",
        }
        r = self._post(path, data=form_data, actionType="pesquisar")
        soup = self._soup(r)

        # Tentar parsear como resultTable (formato A3) primeiro
        processos = self._parsear_carteira_result_table(soup, r.text)
        if not processos:
            processos = self._parsear_carteira(soup, r.text)
        if not processos:
            return None

        # Retornar o primeiro resultado
        proc = processos[0]
        proc["numero_cnj"] = proc.get("numero_cnj") or numero_limpo
        return proc

    # ── Movimentos (substituto do DataJud) ──────────────────────────────────

    def listar_movimentos(self, numero_cnj: str) -> dict:
        """Lista TODOS os movimentos do processo (com ou sem documento)."""
        numero_limpo = re.sub(r"[^\d]", "", numero_cnj)
        # 1) Resolver processo_key via busca
        proc = self.buscar_processo(numero_cnj)
        if not proc:
            return {
                "encontrado": False, "numero": numero_cnj,
                "tribunal": self.CODIGO_TRIBUNAL,
                "erro": "processo não encontrado na carteira/busca",
            }
        processo_key = proc.get("processo_key") or proc.get("_tj")
        if not processo_key:
            return {
                "encontrado": False, "numero": numero_cnj,
                "tribunal": self.CODIGO_TRIBUNAL,
                "erro": "processo encontrado mas sem chave de acesso",
            }
        # 2) Abrir página do processo e parsear tabela de movimentações
        try:
            proc_url = f"{self._abs('/projudi/processo.do')}?_tj={processo_key}"
            r = self._s.get(proc_url, timeout=30)
            r.raise_for_status()
            html_proc = r.text
            novo_tj = _extrair_tj(html_proc)
            if novo_tj and novo_tj != processo_key:
                self._tj = novo_tj
            soup_proc = BeautifulSoup(html_proc, "html.parser")
            # Localizar tabela de movimentações
            mov_table: Optional[Tag] = None
            for t in soup_proc.find_all("table"):
                rows_t = t.find_all("tr")
                if not rows_t:
                    continue
                heads = [th.get_text(strip=True) for th in rows_t[0].find_all(["th", "td"])]
                if any(h in heads for h in ["Seq.", "Data", "Evento"]):
                    mov_table = t
                    break
            movimentos = []
            if mov_table:
                for row in mov_table.find_all("tr")[1:]:  # pular header
                    cells = row.find_all(["td", "th"])
                    if len(cells) < 4:
                        continue
                    seq = cells[1].get_text(strip=True) if len(cells) > 1 else ""
                    data_raw = cells[2].get_text(strip=True) if len(cells) > 2 else ""
                    evento = cells[3].get_text(" ", strip=True) if len(cells) > 3 else ""
                    if not evento:
                        continue
                    # Data: YYYY-MM-DD HH:MM
                    m_data = re.match(r"(\d{4}-\d{2}-\d{2})\s*(\d{2}:\d{2})?", data_raw)
                    if m_data:
                        d, h = m_data.groups()
                        data_iso = f"{d}T{h or '00:00'}:00"
                    else:
                        data_iso = data_raw
                    movimentos.append({
                        "dataHora": data_iso,
                        "nome": evento[:300],
                        "tipo": f"Movimento {seq}" if seq else "Movimento",
                        "_seq": seq,
                    })
            movimentos.sort(key=lambda m: m.get("dataHora", ""), reverse=True)
            contexto = {
                "numero_cnj": proc.get("numero_cnj") or numero_limpo,
                "classe": proc.get("classe", ""),
                "orgaoJulgador": proc.get("orgao", "") or proc.get("orgaoJulgador", ""),
                "autor": proc.get("autor", ""),
                "reu": proc.get("reu", ""),
                "fase": proc.get("fase", ""),
            }
            return {
                "encontrado": True,
                "numero": numero_cnj,
                "tribunal": self.CODIGO_TRIBUNAL,
                "contexto": contexto,
                "movimentos": movimentos,
                "qtd_movimentos": len(movimentos),
                "processo_key": processo_key,
            }
        except Exception as e:
            log.exception("PROJUDI listar_movimentos falhou")
            return {
                "encontrado": False, "numero": numero_cnj,
                "tribunal": self.CODIGO_TRIBUNAL, "erro": str(e),
            }

    # ── Peças / documentos do processo ──────────────────────────────────────

    def listar_pecas(self, processo_key: str) -> list[dict]:
        """Lista as peças (documentos) de um processo.

        Parâmetro
        ---------
        processo_key : str
            Chave interna do Projudi (obtida via listar_carteira ou buscar_processo).
            Para sessões A3, esta é a chave longa extraída do link processo.do?_tj=CHAVE.

        Retorna lista de dicts com:
            documento_key  : str  — chave para download
            tipo           : str  — tipo do documento (sentença, petição etc.)
            titulo         : str  — título/nome do documento
            data           : str  — data de juntada
            paginas        : str  — número de páginas
            visibilidade   : str  — público / sigiloso
            disponivel     : bool — se pode ser baixado com este perfil
        """
        log.debug("Listando peças do processo_key=%s…", processo_key)
        if "projudicrt" in self._base_url:
            return self._listar_pecas_a3(processo_key)
        else:
            return self._listar_pecas_2fa(processo_key)

    def _listar_pecas_a3(self, processo_key: str) -> list[dict]:
        """Lista peças via sessão A3 (projudicrt.tjpr.jus.br).

        Fluxo confirmado em produção:
        1. Carrega processo.do?_tj=<processo_key> para obter a tabela de movimentações.
        2. Parseia a tabela de movimentações procurando linhas com links
           para movimentacaoArquivoDocumento.do?_tj=CHAVE.
        3. Cada um desses links aponta para um documento associado a um movimento.
        4. O `documento_key` retornado é o `_tj` de movimentacaoArquivoDocumento.do.
        5. Para baixar, `baixar_peca()` segue: movimentacaoArquivoDocumento → arquivo.do → PDF.
        """
        # Passo 1: Carregar página do processo
        proc_url = f"{self._abs('/projudi/processo.do')}?_tj={processo_key}"
        r = self._s.get(proc_url, timeout=30)
        r.raise_for_status()
        html_proc = r.text

        # Atualizar _tj da resposta
        novo_tj = _extrair_tj(html_proc)
        if novo_tj and novo_tj != processo_key:
            self._tj = novo_tj

        # Passo 2: Encontrar tabela de movimentações (tem colunas "Seq.", "Data", "Evento")
        soup_proc = BeautifulSoup(html_proc, "html.parser")
        mov_table: Optional[Tag] = None
        for t in soup_proc.find_all("table"):
            rows_t = t.find_all("tr")
            if not rows_t:
                continue
            heads = [th.get_text(strip=True) for th in rows_t[0].find_all(["th","td"])]
            if any(h in heads for h in ["Seq.", "Data", "Evento"]):
                mov_table = t
                log.debug(
                    "Peças A3 ▸ tabela de movimentações: %d linhas", len(rows_t)
                )
                break

        resultado = []

        # Passo 3: Parsear movimentos com arquivo associado
        if mov_table:
            for row in mov_table.find_all("tr"):
                row_html = str(row)
                if "movimentacaoArquivoDocumento" not in row_html:
                    continue

                cells = row.find_all(["td","th"])

                # Extrair URL completo do arquivo (com _tj)
                m_arq = re.search(
                    r"(/projudi/processo/movimentacaoArquivoDocumento\.do\?_tj=[a-zA-Z0-9]+)",
                    row_html
                )
                if not m_arq:
                    continue
                arq_path = m_arq.group(1)
                doc_key = re.search(r"_tj=([a-zA-Z0-9]+)", arq_path)
                doc_key_val = doc_key.group(1) if doc_key else None

                # Metadados da linha
                seq = cells[1].get_text(strip=True) if len(cells) > 1 else ""
                data = cells[2].get_text(strip=True) if len(cells) > 2 else ""
                evento = cells[3].get_text(strip=True) if len(cells) > 3 else ""
                movido_por = cells[4].get_text(strip=True) if len(cells) > 4 else ""

                # Limpar data (pegar só YYYY-MM-DD HH:MM)
                m_data = re.match(r"(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2})", data)
                data_fmt = m_data.group(1) if m_data else data[:19]

                # Limpar evento (pode ter texto extra após \n ou palavras-chave)
                evento_limpo = re.split(
                    r"\n|Cumprimento de|Para\s+[A-Z]|Ref\. ao evento", evento
                )[0].strip()

                # Inferir tipo a partir do evento
                el = evento_limpo.upper()
                if "SENTENÇA" in el or "JULGAMENTO" in el:
                    tipo_inf = "Sentença"
                elif "DECISÃO" in el or "DECISAO" in el:
                    tipo_inf = "Decisão"
                elif "DESPACHO" in el:
                    tipo_inf = "Despacho"
                elif "CONTESTAÇÃO" in el or "CONTESTACAO" in el:
                    tipo_inf = "Contestação"
                elif "EMBARGOS" in el:
                    tipo_inf = "Embargos"
                elif "RECURSO" in el or "APELAÇÃO" in el:
                    tipo_inf = "Recurso"
                elif "CITAÇÃO" in el or "INTIMAÇÃO" in el or "INTIMACAO" in el:
                    tipo_inf = "Citação/Intimação"
                elif "LAUDO" in el or "PERÍCIA" in el or "PERICIA" in el:
                    tipo_inf = "Laudo"
                elif "INICIAL" in el or "PETIÇÃO INICIAL" in el:
                    tipo_inf = "Petição Inicial"
                elif "PETIÇÃO" in el or "PETICAO" in el or "JUNTADA" in el:
                    tipo_inf = "Petição"
                else:
                    tipo_inf = "Documento"

                resultado.append({
                    "documento_key": doc_key_val,
                    "tipo": tipo_inf,
                    "titulo": evento_limpo,
                    "data": data_fmt,
                    "paginas": "",
                    "visibilidade": "Público",
                    "disponivel": doc_key_val is not None,
                    "_download_url": arq_path,
                    "_seq": seq,
                    "_movido_por": movido_por,
                })

        log.debug("Peças A3 ▸ %d documento(s) encontrado(s) na tabela de movimentações", len(resultado))
        return resultado

    def verificar_habilitacao_necessaria(self, processo_key: str) -> dict:
        """Verifica se o processo exige habilitação provisória (íntegra dos autos).

        Retorna dict:
            precisa_habilitar : bool
            habilitacao_key   : str | None
            pecas_visiveis    : int — peças já visíveis sem habilitação
        """
        proc_url = f"{self._abs('/projudi/processo.do')}?_tj={processo_key}"
        r = self._s.get(proc_url, timeout=30)
        r.raise_for_status()
        html = r.text

        novo_tj = _extrair_tj(html)
        if novo_tj and novo_tj != processo_key:
            self._tj = novo_tj

        hab_key = self._tem_botao_habilitacao(html)

        soup = BeautifulSoup(html, "html.parser")
        mov_links = len([
            True for tag in soup.find_all(True)
            if "movimentacaoArquivoDocumento" in str(tag)
        ])

        return {
            "precisa_habilitar": hab_key is not None,
            "habilitacao_key": hab_key,
            "pecas_visiveis": mov_links // 2,  # cada link aparece ~2x no HTML
        }

    def _listar_pecas_2fa(self, processo_key: str) -> list[dict]:
        """Lista peças via sessão 2FA (projudi.tjpr.jus.br).

        O portal 2FA usa a mesma página processo.do com links
        movimentacaoArquivoDocumento — estrutura idêntica ao A3.
        """
        return self._listar_pecas_a3(processo_key)

    def _parsear_documentos(
        self, soup: BeautifulSoup, processo_key: str
    ) -> list[dict]:
        """Parseia a listagem de documentos/peças do processo.

        Tenta múltiplas estratégias para encontrar a tabela correta:
        1. Tabelas que contêm links de download (downloadDocumento).
        2. Tabelas identificadas por id/class com "documento", "lista", "resultTable".
        3. Qualquer tabela com >= 3 colunas.
        """
        resultado = []

        # Estratégia 1: tabelas com links de download
        tabelas_candidatas: list[Tag] = []
        for t in soup.find_all("table"):
            html_t = str(t)
            if (
                "downloadDocumento" in html_t
                or "exibirDocumento" in html_t
                or "documento_key" in html_t
                or "docKey" in html_t
            ):
                tabelas_candidatas.append(t)

        # Estratégia 2: por id/class
        if not tabelas_candidatas:
            for t in [
                soup.find("table", {"id": re.compile(r"documento|peca|lista", re.I)}),
                soup.find("table", {"class": re.compile(r"documento|lista|resultTable", re.I)}),
            ]:
                if t and t not in tabelas_candidatas:
                    tabelas_candidatas.append(t)  # type: ignore[arg-type]

        # Estratégia 3: qualquer tabela com >= 3 colunas (exceto a primeira que costuma ser nav)
        if not tabelas_candidatas:
            for t in soup.find_all("table"):
                rows_t = t.find_all("tr")
                if len(rows_t) > 1:
                    max_cols = max(
                        (len(r.find_all(["td", "th"])) for r in rows_t[:4]),
                        default=0,
                    )
                    if max_cols >= 3:
                        tabelas_candidatas.append(t)
                        break

        for tabela in tabelas_candidatas:
            rows = _tabela_para_lista(tabela)
            for row in rows:
                # Extrair documento_key e URL de download dos links da linha
                doc_key: Optional[str] = None
                download_url: Optional[str] = None
                for k, v in row.items():
                    if not k.endswith("_href") or not v:
                        continue
                    # Tentar extrair documento_key como parâmetro
                    dk = _extrair_key_da_url(v, "documento_key")
                    if dk:
                        doc_key = dk
                        download_url = v
                        break
                    # Fallback: qualquer URL de download
                    if "downloadDocumento" in v or "exibirDocumento" in v:
                        download_url = v
                        m_id = re.search(
                            r"(?:documento_key|docId|id|key)=([a-zA-Z0-9_-]+)", v
                        )
                        if m_id:
                            doc_key = m_id.group(1)
                        break

                tipo = (
                    row.get("tipo") or row.get("tipo_de_documento")
                    or row.get("espécie") or row.get("especie") or ""
                )
                titulo = (
                    row.get("documento") or row.get("título") or row.get("titulo")
                    or row.get("descrição") or row.get("descricao")
                    or row.get("nome") or row.get("peça") or ""
                )
                data = (
                    row.get("data") or row.get("data_de_juntada")
                    or row.get("data_juntada") or row.get("data/hora")
                    or row.get("dt._juntada") or ""
                )
                paginas = (
                    row.get("páginas") or row.get("paginas")
                    or row.get("qtd_págs") or row.get("págs.") or row.get("págs") or ""
                )
                visib = (
                    row.get("visibilidade") or row.get("nível_de_sigilo")
                    or row.get("sigilo") or row.get("acesso") or "Público"
                )

                # Ignorar linhas cabeçalho ou sem conteúdo
                if not (tipo or titulo or doc_key):
                    continue

                resultado.append({
                    "documento_key": doc_key,
                    "tipo": tipo.strip(),
                    "titulo": titulo.strip(),
                    "data": data.strip(),
                    "paginas": paginas.strip(),
                    "visibilidade": visib.strip(),
                    "disponivel": doc_key is not None,
                    "_download_url": download_url,
                    "_raw": row,
                })

            if resultado:
                return resultado

        return resultado

    # ── Download de peça (PDF) ───────────────────────────────────────────────

    def baixar_peca(self, documento_key: str) -> bytes:
        """Baixa uma peça processual e retorna os bytes do PDF.

        Parâmetro
        ---------
        documento_key : str
            Chave do documento obtida via listar_pecas().
            Para sessões A3: `_tj` de movimentacaoArquivoDocumento.do.
            Para sessões 2FA: `documento_key` numérico.

        Raises
        ------
        RuntimeError  : se o download falhar ou o conteúdo não for PDF.
        """
        log.debug("Baixando documento_key=%s…", documento_key[:40])

        # Ambos os portais (A3 e 2FA) usam o mesmo fluxo:
        # movimentacaoArquivoDocumento.do?_tj=<key> → arquivo.do → PDF
        return self._baixar_peca_a3(documento_key)

    def _baixar_peca_a3(self, documento_key: str) -> bytes:
        """Fluxo A3: movimentacaoArquivoDocumento.do → arquivo.do → PDF/mídia.

        Casos tratados:
        - PDF normal: movimentacaoArquivoDocumento → arquivo.do → PDF
        - Gravação de audiência: arquivo.do retorna video/webm — retorna os bytes
        - Sigilo Absoluto: HTML sem link → RuntimeError descritivo
        - Download bloqueado (judicial/inclusão indevida): link <strike> → RuntimeError
        - Sessão expirada: HTML de erro → RuntimeError
        """
        # Passo 1: Chamar movimentacaoArquivoDocumento.do para obter o link de arquivo.do
        arq_url = (
            self._abs("/projudi/processo/movimentacaoArquivoDocumento.do")
            + f"?_tj={documento_key}"
        )
        r1 = self._s.get(arq_url, timeout=30)
        r1.raise_for_status()

        ct1 = r1.headers.get("Content-Type", "")

        # Verificar se a resposta já é PDF (download direto)
        if "pdf" in ct1 or b"%PDF" in r1.content[:10]:
            log.info("Documento baixado diretamente: %d bytes", len(r1.content))
            return r1.content

        if "html" not in ct1:
            # Pode ser outra mídia (vídeo, etc.) entregue diretamente
            log.info("Documento baixado (não-PDF/HTML): ct=%s, %d bytes", ct1, len(r1.content))
            return r1.content

        # Passo 2: Parsear HTML para encontrar o link arquivo.do
        soup1 = BeautifulSoup(r1.text, "html.parser")
        body_text = soup1.get_text(separator=" ", strip=True)

        # ── Detectar acesso restrito (Sigilo Absoluto) ──────────────────────
        if (
            "Restrição na Visualização" in r1.text
            or "Sigilo Absoluto" in r1.text
            or "sigilo_absoluto" in r1.text.lower()
        ):
            raise RuntimeError(
                "Documento com acesso restrito (Sigilo Absoluto). "
                "Este documento não pode ser visualizado com o perfil atual."
            )

        # ── Detectar download bloqueado (link riscado / alerta judicial) ────
        # PROJUDI usa <strike> + javascript:alert(...) quando download é vetado
        bloqueio_js = re.search(
            r"javascript:alert\('Não é permitido fazer o download desse arquivo",
            r1.text
        )
        strike_tags = soup1.find_all("strike")
        if bloqueio_js or (
            strike_tags
            and any("arquivo" in str(s).lower() or ".pdf" in str(s).lower()
                    for s in strike_tags)
        ):
            raise RuntimeError(
                "Download bloqueado por determinação judicial ou inclusão indevida. "
                "Este documento não pode ser baixado."
            )

        arquivo_link: Optional[str] = None
        for a in soup1.find_all("a", href=True):
            href = a["href"]
            if "arquivo.do" in href and "javascript:" not in href:
                arquivo_link = href
                break

        # Também tentar via regex (para links em onclick ou JS não-bloqueados)
        if not arquivo_link:
            m_arq = re.search(r"/projudi/arquivo\.do\?_tj=[a-zA-Z0-9]+", r1.text)
            if m_arq:
                arquivo_link = m_arq.group(0)

        if not arquivo_link:
            # Verificar se é erro de sessão
            if "inacessível" in body_text or "não é válido" in body_text:
                raise RuntimeError(
                    "Sessão expirada ou link de documento inválido. "
                    "Recarregue as peças do processo para atualizar os links."
                )
            # Erro genérico com debug HTML
            html_debug = r1.text.replace("\n", " ").replace("\r", "")
            raise RuntimeError(
                f"Link de download não encontrado (status={r1.status_code}, "
                f"{len(r1.text)} bytes). HTML: {html_debug[:800]}"
            )

        # Passo 3: Baixar o arquivo em arquivo.do
        arquivo_url = self._abs(arquivo_link)
        r2 = self._s.get(arquivo_url, timeout=60, stream=True)
        r2.raise_for_status()

        ct2 = r2.headers.get("Content-Type", "")

        # PDF
        if "pdf" in ct2 or b"%PDF" in r2.content[:10]:
            log.info(
                "Documento A3 baixado: %d bytes PDF (arquivo=%s)",
                len(r2.content), arquivo_link[:60]
            )
            return r2.content

        # Vídeo de audiência (webm, mp4, etc.)
        if any(v in ct2 for v in ("video/", "audio/", "webm", "mp4", "ogg")):
            log.info(
                "Gravação de audiência baixada: %d bytes (%s)",
                len(r2.content), ct2
            )
            return r2.content

        # Outros tipos aceitos (zip, imagens, etc.)
        if len(r2.content) > 0:
            log.info(
                "Documento baixado (tipo=%s): %d bytes",
                ct2, len(r2.content)
            )
            return r2.content

        raise RuntimeError(
            f"arquivo.do retornou conteúdo vazio (Content-Type={ct2}). "
            f"Link: {arquivo_link[:80]}"
        )

    def _baixar_peca_2fa(self, documento_key: str) -> bytes:
        """Fluxo 2FA: downloadDocumentoOriginal.do → PDF."""
        endpoints = [
            "/documento/downloadDocumentoOriginal.do",
            "/documento/downloadDocumento.do",
            "/documento/exibirDocumento.do",
        ]
        last_error: Optional[str] = None
        for endpoint in endpoints:
            try:
                url = (
                    f"{self._abs(endpoint)}"
                    f"?documento_key={documento_key}"
                    f"&_tj={self._tj}"
                )
                r = self._s.get(url, timeout=60, stream=True)

                if r.status_code == 404:
                    continue

                r.raise_for_status()

                content_type = r.headers.get("Content-Type", "")
                if "pdf" in content_type or "octet-stream" in content_type:
                    conteudo = r.content
                    if not conteudo:
                        last_error = "Resposta vazia do servidor."
                        continue
                    log.info(
                        "Documento %s baixado: %d bytes", documento_key, len(conteudo)
                    )
                    return conteudo

                if "html" in content_type:
                    soup = BeautifulSoup(r.text, "html.parser")
                    erro = soup.find("div", {"class": re.compile(r"erro|error", re.I)})
                    last_error = (
                        erro.get_text(strip=True) if erro else "Documento não disponível"
                    )
                    continue

            except requests.HTTPError as e:
                last_error = str(e)
                log.debug("Endpoint %s retornou %s", endpoint, e)
                continue

        raise RuntimeError(
            f"Não foi possível baixar o documento {documento_key}. "
            + (f"Último erro: {last_error}. " if last_error else "")
            + "Verifique se o nível de acesso permite o download desta peça."
        )

    # ── Busca por CPF / CNPJ ────────────────────────────────────────────────

    def buscar_por_cpf_cnpj(self, cpf_cnpj: str, max_paginas: int = 100) -> list[dict]:
        """Busca processos pelo CPF/CNPJ — TODAS as páginas via POST do form.

        Mecanismo descoberto por engenharia reversa do JS do PROJUDI:
            javascript:document.forms['buscaProcessosQualquerInstanciaForm']
              ['processoPageNumber'].value = 'N';
              ...
              .submit();

        Ou seja, paginação é por POST do MESMO form com:
            processoPageNumber=N  (1, 2, 3, ...)
            processoPageSize=20   (ou 50, 100 conforme select)
            processoSortColumn=dataRecebimento
            processoSortOrder=ASC
        """
        doc_limpo = re.sub(r"\D", "", cpf_cnpj.strip())
        log.info("PROJUDI ▸ buscando CPF/CNPJ=%s", doc_limpo)

        path = "/projudi/processo/buscaProcessosQualquerInstancia.do"

        todos: list[dict] = []
        keys_vistas: set[str] = set()
        # PROJUDI sempre devolve 20/página independente do que você pede
        page_size = 20
        total_declarado: Optional[int] = None

        for pagina in range(1, max_paginas + 1):
            form_data = {
                "instanciaSuperior": "false",
                "filtroAdvogado": "qualquerAdvogado",
                "cpfCnpj": doc_limpo,
                "flagNumeroProcessoUnico": "false",
                "processoPageNumber": str(pagina),
                "processoPageSize": "20",
                "processoPageSizeOptions": "20",
                "processoSortColumn": "dataRecebimento",
                "processoSortOrder": "ASC",
            }
            try:
                r = self._post(path, data=form_data, actionType="pesquisar")
            except Exception as e:
                log.warning("PROJUDI ▸ página %d falhou: %s", pagina, e)
                break

            soup = self._soup(r)
            processos = self._parsear_carteira_result_table(soup, r.text)
            if not processos:
                processos = self._parsear_carteira(soup, r.text)

            # Total declarado pelo servidor (na primeira página)
            if pagina == 1:
                # PROJUDI mostra como "X processos encontrados" ou "Página N de M"
                m_total = re.search(
                    r"(\d+)\s*(?:processos?\s*encontrados?|registros?)", r.text, re.I)
                if m_total:
                    total_declarado = int(m_total.group(1))
                    log.info("PROJUDI ▸ total declarado: %d", total_declarado)
                else:
                    # Fallback: procurar "Página 1 de N"
                    m_pag = re.search(r"P[áa]gina\s+\d+\s+de\s+(\d+)", r.text, re.I)
                    if m_pag:
                        total_declarado = int(m_pag.group(1)) * 20
                        log.info("PROJUDI ▸ total estimado por páginas: ~%d", total_declarado)

            # Filtrar duplicados + ignorar linhas "Nenhum registro encontrado"
            novos = []
            for p in processos:
                raw = p.get("_raw") or {}
                raw_str = json.dumps(raw) if isinstance(raw, dict) else str(raw)
                # Pular linhas que são mensagem de "sem resultados" do PROJUDI
                if any(kw in raw_str.lower() for kw in ["nenhum registro", "nenhum processo", "sem resultados"]):
                    continue
                k = p.get("processo_key") or p.get("numero_cnj") or str(p)[:80]
                if k not in keys_vistas:
                    keys_vistas.add(k)
                    novos.append(p)
            todos.extend(novos)

            log.info("PROJUDI ▸ página %d: %d na resp, %d novos, total=%d/%s",
                     pagina, len(processos), len(novos), len(todos),
                     total_declarado or "?")

            # Critérios de parada (em ordem):
            # 1. Já alcançamos o total declarado pelo servidor
            if total_declarado and len(todos) >= total_declarado:
                log.info("PROJUDI ▸ alcançado total declarado (%d) → fim", total_declarado)
                break
            # 2. Página retornou ZERO processos (esgotou)
            if not processos:
                log.info("PROJUDI ▸ página %d vazia → fim", pagina)
                break
            # 3. Página inteira só com duplicados (servidor repetindo)
            if not novos:
                log.info("PROJUDI ▸ página %d sem novos → fim", pagina)
                break

        log.info("PROJUDI ▸ busca CPF/CNPJ concluída: %d processos (esperado: %s)",
                 len(todos), total_declarado or "?")
        return todos

    def _achar_link_proxima_pagina(self, soup: BeautifulSoup, pagina_atual: int) -> Optional[str]:
        """Procura no HTML o link de 'próxima página' do PROJUDI.

        O PROJUDI usa diferentes formatos em diferentes telas. Detecta:
          - <a href="?...&pagina=N+1">Próxima</a>
          - <a class="infraPagAtual">...</a>
          - botão "Avançar"
          - links com texto numérico ou ">>"
        """
        proxima_num = pagina_atual + 1

        # Estratégia 1: link com texto "Próxima" / "Avançar" / ">>"
        for a in soup.find_all("a", href=True):
            txt = (a.get_text() or "").strip().lower()
            href = a["href"]
            if any(kw in txt for kw in ["próxim", "proxim", "avançar", "avancar", ">>"]):
                return href

        # Estratégia 2: link com pagina=N+1 ou page=N+1
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if re.search(rf"[?&](?:pagina|page|paginaAtual|nrPagina)={proxima_num}\b", href):
                return href

        # Estratégia 3: form de paginação com onchange (PROJUDI usa select às vezes)
        for sel in soup.find_all("select"):
            name = (sel.get("name") or "").lower()
            if "pagina" in name or "page" in name:
                # tem dropdown de página - construir URL manual
                for opt in sel.find_all("option"):
                    val = opt.get("value", "")
                    if val == str(proxima_num):
                        # achou opção pra próxima página
                        log.debug("PROJUDI ▸ paginação via <select name=%s>", name)
                        return None  # não retorna URL — significa que precisaria submit form

        # Estratégia 4: input type=hidden com pagina + form submit
        for inp in soup.find_all("input", {"name": re.compile(r"(?i)pagina|page", re.I)}):
            log.debug("PROJUDI ▸ paginação via input hidden name=%s", inp.get("name"))
            # Aqui retornamos None — precisaria refazer POST com novo valor
            return None

        return None

    # Alias para satisfazer a interface TribunalClient.buscar_cpf()
    def buscar_cpf(self, cpf_ou_cnpj: str) -> dict:
        """Alias com retorno em dict (interface TribunalClient)."""
        doc = re.sub(r"\D", "", cpf_ou_cnpj.strip())
        processos = self.buscar_por_cpf_cnpj(doc)
        return {
            "documento": doc,
            "processos": processos,
            "total": len(processos),
        }

    # ── Habilitação provisória (íntegra dos autos) ──────────────────────────

    def habilitar_acesso_provisorio(self, processo_key: str) -> dict:
        """Aceita o Termo de Responsabilidade para acessar a íntegra dos autos.

        Em processos onde o advogado não é o procurador cadastrado, o PROJUDI
        exige aceitar um Termo de Responsabilidade antes de liberar os documentos.
        Este método detecta o botão "Acesso à íntegra dos autos" e submete o
        formulário automaticamente com termoAceito=true.

        Parâmetro
        ---------
        processo_key : str
            Chave do processo (obtida via listar_carteira ou buscar_processo).

        Retorna dict:
            ok              : bool
            habilitacao_key : str | None — _tj usado no habilitacaoProvisoria
            pecas_apos      : int        — peças encontradas após habilitação
            mensagem        : str
        """
        # ── Passo 1: Carregar página do processo ──────────────────────────────
        proc_url = f"{self._abs('/projudi/processo.do')}?_tj={processo_key}"
        r_proc = self._s.get(proc_url, timeout=30)
        r_proc.raise_for_status()
        html_proc = r_proc.text

        novo_tj = _extrair_tj(html_proc)
        if novo_tj and novo_tj != processo_key:
            self._tj = novo_tj

        # ── Passo 2: Detectar botão habilitacaoProvisoria ─────────────────────
        m_hab = re.search(
            r"habilitacaoProvisoria\.do\?_tj=([a-zA-Z0-9]+)",
            html_proc,
        )
        if not m_hab:
            # Não há botão — verificar quantas peças já existem
            pecas = self._listar_pecas_a3(processo_key)
            return {
                "ok": False,
                "habilitacao_key": None,
                "pecas_apos": len(pecas),
                "mensagem": (
                    "Botão 'Acesso à íntegra dos autos' não encontrado. "
                    f"{len(pecas)} peça(s) já disponíveis sem habilitação."
                ),
            }

        hab_key = m_hab.group(1)
        log.debug("habilitacaoProvisoria _tj encontrado: %.40s…", hab_key)

        # ── Passo 3: Carregar página do Termo de Responsabilidade ─────────────
        hab_url = self._abs("/projudi/processo/habilitacaoProvisoria.do") + f"?_tj={hab_key}"
        r_hab = self._s.get(hab_url, timeout=30)
        r_hab.raise_for_status()

        soup_hab = BeautifulSoup(r_hab.text, "html.parser")

        # ── Passo 4: Extrair campos do formulário ─────────────────────────────
        form = soup_hab.find("form")
        if not form:
            raise RuntimeError("Formulário do Termo de Responsabilidade não encontrado.")

        action = form.get("action", "/projudi/processo/habilitacaoProvisoria.do?actionType=salvar")
        post_data: dict = {}
        for inp in form.find_all(["input", "select", "textarea"]):
            name = inp.get("name", "")
            val = inp.get("value", "")
            itype = inp.get("type", "")
            if not name or itype == "button":
                continue
            post_data[name] = val

        # Aceitar o termo
        post_data["termoAceito"] = "true"

        # ── Passo 4.5: CAPTCHA é do advogado, não nosso ───────────────────────
        # O termo de acesso provisório é protegido por reCAPTCHA. Aqui o Escritório
        # Dativo para: quem resolve o desafio é a pessoa, no navegador dela, como o
        # tribunal quis. Não há serviço de quebra de CAPTCHA neste projeto — a
        # ferramenta assiste o advogado, não se passa por ele.
        if re.search(r'data-sitekey="', r_hab.text or ""):
            raise RuntimeError(
                "O PROJUDI pede o CAPTCHA do termo de acesso provisório neste processo. "
                f"Abra {hab_url} no seu navegador, aceite o termo e volte: a consulta "
                "segue normalmente depois disso."
            )

        log.debug(
            "Submetendo Termo: action=%s, numeroProcesso=%s",
            action, post_data.get("numeroProcesso", "?"),
        )

        # ── Passo 5: POST do formulário ───────────────────────────────────────
        post_url = self._abs(action)
        r_post = self._s.post(post_url, data=post_data, timeout=30)
        r_post.raise_for_status()

        # Atualizar _tj da resposta
        novo_tj2 = _extrair_tj(r_post.text)
        if novo_tj2:
            self._tj = novo_tj2

        # ── Passo 6: Verificar se deu certo e contar peças ────────────────────
        soup_post = BeautifulSoup(r_post.text, "html.parser")
        texto_post = soup_post.get_text(separator=" ", strip=True)

        # Erro de CAPTCHA: checar lista de erros (não só a presença do script enterprise.js)
        erros_list = soup_post.find("ul", id="ulMensErros")
        if erros_list:
            erros_txt = erros_list.get_text(strip=True).lower()
            if "captcha" in erros_txt or "recaptcha" in erros_txt:
                raise RuntimeError(
                    "O PROJUDI exigiu resolução de CAPTCHA para este processo. "
                    "Acesse manualmente pelo navegador e aceite o Termo de Responsabilidade."
                )
            if erros_txt:
                raise RuntimeError(f"PROJUDI retornou erro: {erros_list.get_text(strip=True)[:200]}")

        # Erro genérico (fallback)
        erro_el = soup_post.find(class_=re.compile(r"erro|error|mensagem-erro", re.I))
        if erro_el and "captcha" in erro_el.get_text(strip=True).lower():
            raise RuntimeError(
                "O PROJUDI exigiu resolução de CAPTCHA para este processo. "
                "Acesse manualmente pelo navegador e aceite o Termo de Responsabilidade."
            )

        # Contar peças disponíveis após habilitação
        pecas_apos = self._listar_pecas_a3(processo_key)
        n_pecas = len(pecas_apos)

        log.info(
            "Habilitação provisória concluída: %d peça(s) disponíveis após aceite.",
            n_pecas,
        )
        return {
            "ok": True,
            "habilitacao_key": hab_key,
            "pecas_apos": n_pecas,
            "mensagem": (
                f"Termo de Responsabilidade aceito. {n_pecas} peça(s) disponíveis."
            ),
        }

    def _tem_botao_habilitacao(self, html_proc: str) -> Optional[str]:
        """Detecta o botão habilitacaoProvisoriaButton e retorna o _tj, ou None."""
        m = re.search(r"habilitacaoProvisoria\.do\?_tj=([a-zA-Z0-9]+)", html_proc)
        return m.group(1) if m else None

    # ── Informações do advogado logado ──────────────────────────────────────

    def info_advogado(self) -> dict:
        """Retorna informações do advogado logado (nome, OAB, email, etc.)."""
        path = "/projudi/usuario/advogado.do"
        r = self._get(path, actionType="visualizar")
        soup = self._soup(r)

        dados = {}

        # Campos de perfil — varia conforme versão do Projudi
        for label_tag in soup.find_all(["label", "th", "td"],
                                        string=re.compile(r"nome|oab|email|cpf", re.I)):
            label = label_tag.get_text(strip=True).lower()
            valor_tag = (
                label_tag.find_next_sibling()
                or label_tag.find_next(["input", "span", "td"])
            )
            if valor_tag:
                val = valor_tag.get("value") or valor_tag.get_text(strip=True)
                if val:
                    dados[label.rstrip(":").strip()] = val

        # Fallback: extrair do HTML da home
        if not dados and self._html_home:
            m = re.search(r"Bem.vindo[,\s]+([A-ZÁÉÍÓÚÀÈÌÒÙ][^<\n]+)", self._html_home)
            if m:
                dados["nome"] = m.group(1).strip()

        return dados

    # ── Extrato de texto de PDF ──────────────────────────────────────────────

    @staticmethod
    def extrair_texto_pdf(pdf_bytes: bytes) -> str:
        """Extrai o texto de um PDF para análise com IA.

        Tenta pdfplumber primeiro (mais preciso), depois pymupdf (fitz).
        Instale: pip install pdfplumber  ou  pip install pymupdf
        """
        # Tentativa 1: pdfplumber
        try:
            import pdfplumber
            import io
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                partes = []
                for pg in pdf.pages:
                    texto = pg.extract_text()
                    if texto:
                        partes.append(texto)
                return "\n\n".join(partes)
        except ImportError:
            pass
        except Exception as e:
            log.warning("pdfplumber falhou: %s", e)

        # Tentativa 2: pymupdf (fitz)
        try:
            import fitz  # pymupdf
            import io
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            partes = [pg.get_text() for pg in doc]
            return "\n\n".join(partes)
        except ImportError:
            pass
        except Exception as e:
            log.warning("pymupdf falhou: %s", e)

        raise RuntimeError(
            "Nenhuma biblioteca de extração de PDF disponível. "
            "Instale: pip install pdfplumber"
        )
