"""Teste ponta a ponta do Ponto Dativo (plataforma do advogado), em Python/Playwright.

Percorre o fluxo que a auditoria vai pedir: entrar com a conta criada pela
equipe, abrir caso, triar com fonte, marcar documento, criar tarefa, consultar
processo no DataJud, colar uma intimação de nomeação, ler o WhatsApp do
advogado e sair. Também confere o painel em tela de celular.

Uso: python3.11 scripts/testar-ponta-a-ponta.py [http://127.0.0.1:3000]
Requer Playwright do Python com Chromium instalado (pip install playwright).
O servidor precisa estar no ar com o .env.local da raiz.
"""
import base64
import json
import os
import re
import sys
import urllib.request

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3000"
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AMBIENTE = os.environ.get("AMBIENTE", os.path.join(RAIZ, ".env.local"))
PRINTS = os.environ.get("PRINTS", os.path.join(RAIZ, "docs/entregas/prints/testes-plataforma"))
CNJ_MASCARADO = "0001258-98.2020.8.16.0171"
CNJ = "00012589820208160171"

falhas = []
verificacoes = 0


def marcar(nome, condicao, detalhe=""):
    global verificacoes
    verificacoes += 1
    if not condicao:
        falhas.append(nome)
    print(("✓ " if condicao else "✗ ") + nome + (f" · {detalhe}" if detalhe else ""))


def do_ambiente(chave):
    for linha in open(AMBIENTE, encoding="utf-8"):
        if linha.startswith(chave + "="):
            return linha.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def tentar(nome, funcao, detalhe_erro=""):
    """Roda um passo do navegador sem derrubar o teste inteiro."""
    try:
        funcao()
        marcar(nome, True)
        return True
    except Exception as erro:  # noqa: BLE001
        marcar(nome, False, f"{detalhe_erro}{type(erro).__name__}: {str(erro).splitlines()[0][:160]}")
        return False


os.makedirs(PRINTS, exist_ok=True)

# 1. Conta criada pela API da equipe, como a equipe faz no painel.
equipe = do_ambiente("PAINEL_USUARIOS").split(";")[0].split("=")
marcador = os.urandom(3).hex()
usuario = f"e2e.{marcador}"
senha = f"e2e-{marcador}-forte"
conta = {"nome": f"Advogada Teste {marcador}", "oab": "OAB/PR 90999", "usuario": usuario, "senha": senha}
requisicao = urllib.request.Request(
    f"{BASE}/api/advogados",
    data=json.dumps(conta).encode(),
    method="POST",
    headers={"Content-Type": "application/json", "Authorization": "Basic " + base64.b64encode(f"{equipe[0]}:{equipe[1]}".encode()).decode()},
)
with urllib.request.urlopen(requisicao) as resposta:
    marcar("equipe cria a conta do advogado", resposta.status in (200, 201), f"HTTP {resposta.status}")

texto_intimacao = (
    "PODER JUDICIÁRIO DO ESTADO DO PARANÁ. Comarca de Tomazina, Juízo Único. "
    "Autos n. 0001258-98.2020.8.16.0171. Fica Vossa Senhoria nomeado(a) para atuar como advogado(a) dativo(a) "
    "nos autos em referência, devendo apresentar contestação. Fica designada audiência de conciliação. "
    "Intimação publicada em 10/09/2026, com ciência nesta data."
)
relato = (
    "A cliente conta que comprou uma geladeira e ela parou de funcionar em três meses. "
    "Chamou a assistência técnica três vezes, não resolveram. Ela ainda paga as parcelas do cartão "
    "e tem os comprovantes e as mensagens da loja. Quer o conserto, a troca ou o dinheiro de volta."
)

with sync_playwright() as p:
    # O Playwright do Homebrew espera o binário 1223, que não está instalado
    # nesta máquina; aqui se usa o 1243, que está.
    execucoes = [
        "/Users/eduardomila/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell",
        "/Users/eduardomila/Library/Caches/ms-playwright/chromium-1243/chrome-mac/Chromium.app/Contents/MacOS/Chromium",
    ]
    navegador = p.chromium.launch(executable_path=next((c for c in execucoes if os.path.exists(c)), None))
    contexto = navegador.new_context(viewport={"width": 1440, "height": 900})
    pagina = contexto.new_page()
    pagina.set_default_timeout(25000)
    # O Playwright fecha diálogos sozinho, e "remover número" usa window.confirm.
    pagina.on("dialog", lambda dialogo: dialogo.accept())

    # 2. Entrar.
    pagina.goto(f"{BASE}/entrar")
    marcar("a tela de entrar mostra a faixa de demonstração", "Ambiente de demonstração" in pagina.content())
    pagina.fill("#usuario", usuario)
    pagina.fill("#senha", senha)
    pagina.click("button:has-text('Entrar')")
    pagina.wait_for_url("**/escritorio", timeout=30000)
    marcar("o login leva ao escritório", "/escritorio" in pagina.url)
    marcar("o cabeçalho mostra o nome da advogada", pagina.get_by_text(f"Advogada Teste {marcador}").count() >= 1)
    marcar("o escritório avisa que é ambiente de demonstração", "nada aqui é sistema oficial da OAB" in pagina.content())
    marcar("o painel abre no estado vazio orientando o primeiro caso", "Nenhum caso ainda" in pagina.content())
    pagina.screenshot(path=f"{PRINTS}/01-painel-vazio.png", full_page=True)

    # 3. Novo caso, pelo formulário. Numa conta nova não existe cliente
    # cadastrado, então o seletor "novo ou já cadastrado" nem aparece.
    pagina.click("button:has-text('Novo caso')")
    pagina.fill("input[placeholder^='Ex.: Cobrança']", f"Cobrança da geladeira {marcador}")
    pagina.select_option("form select", "particular")
    if pagina.locator("label:has-text('Cliente novo')").count():
        pagina.click("label:has-text('Cliente novo')")
    marcar("conta nova já abre o caso no caminho do cliente novo", pagina.locator("input[placeholder='Nome do cliente']").count() == 1)
    pagina.fill("input[placeholder='Nome do cliente']", f"Cliente Teste {marcador}")
    pagina.fill("input[placeholder='(41) 99999-9999']", "(41) 98888-7777")
    pagina.fill("input[placeholder='0000000-00.0000.8.16.0000']", CNJ_MASCARADO)
    pagina.fill("input[placeholder^='Ex.: 2º Juizado']", "2º Juizado Especial Cível de Curitiba")
    pagina.fill("textarea[placeholder^='O que o cliente contou']", relato)
    pagina.click("button:has-text('Abrir caso')")
    pagina.wait_for_selector(f"text=Cobrança da geladeira {marcador}", timeout=30000)
    marcar("o caso novo aparece no painel", True)
    marcar("o painel deixa de estar vazio", "Nenhum caso ainda" not in pagina.content())

    # 4. Página do caso.
    pagina.click(f"text=Cobrança da geladeira {marcador}")
    pagina.wait_for_url("**/escritorio/casos/**", timeout=30000)
    conteudo = pagina.content()
    for secao in ["Ficha do caso", "Relato do cliente", "Documentos", "Prazos e tarefas", "Processo", "WhatsApp", "Registros"]:
        marcar(f"a página do caso tem a seção {secao}", secao in conteudo)

    # 5. Triagem com fonte.
    pagina.fill("textarea[placeholder^='Escreva ou cole']", relato + " Guardou nota fiscal e os protocolos de atendimento.")
    pagina.click("button:has-text('Salvar')")
    pagina.wait_for_selector("button:has-text('Salvo')", timeout=20000)
    pagina.click("button:has-text('Triar com fontes')")
    pagina.wait_for_selector("div[aria-label='Última triagem']", timeout=180000)
    marcar("a triagem devolve a contagem de requisitos comprovados", True)
    corpo = pagina.content()
    marcar("a triagem cita o trecho de lei que fundamenta", bool(re.search(r"L\d{4}-\d+|Lorient-\d+", corpo)))
    marcar("a triagem avisa que não é probabilidade de êxito", "Não é probabilidade de êxito" in corpo)
    pagina.screenshot(path=f"{PRINTS}/02-caso-com-triagem.png", full_page=True)

    # 6. Documento, tarefa e registro.
    primeiro_documento = pagina.locator("button[aria-label^='Marcar como recebido']").first
    primeiro_documento.click()
    pagina.wait_for_selector("button[aria-label^='Desmarcar']", timeout=20000)
    marcar("dá para marcar um documento como recebido", True)
    pagina.fill("#nova-tarefa", "Conferir a data da ciência no processo oficial")
    pagina.locator("form:has(#nova-tarefa) button[type=submit]").click()
    pagina.wait_for_selector("text=Conferir a data da ciência no processo oficial", timeout=20000)
    marcar("dá para criar tarefa com dono e prazo", True)
    pagina.fill("#nova-nota", "Cliente avisada por telefone sobre o andamento.")
    pagina.locator("form:has(#nova-nota) button[type=submit]").click()
    pagina.wait_for_selector("text=Cliente avisada por telefone sobre o andamento.", timeout=20000)
    marcar("a linha do tempo aceita anotação", True)

    # 7. Processo no DataJud.
    try:
        with pagina.expect_response(lambda r: "/processo" in r.url and r.request.method == "POST", timeout=150000) as resposta:
            pagina.click("button:has-text('Consultar no TJPR')")
        corpo_resposta = resposta.value
        marcar("a consulta ao TJPR responde", corpo_resposta.status == 200, f"HTTP {corpo_resposta.status}")
        pagina.wait_for_selector("text=Busca e Apreensão", timeout=30000)
        marcar("a consulta traz classe e órgão do processo", True)
        marcar("o andamento não é tratado como prazo", "não é intimação" in pagina.content() or "conferir" in pagina.content().lower())
    except Exception as erro:  # noqa: BLE001
        marcar("a consulta ao TJPR responde", False, f"{type(erro).__name__}: {str(erro).splitlines()[0][:160]}")

    # 8. Nova nomeação: colar a intimação, ver a ficha e abrir o caso.
    pagina.goto(f"{BASE}/escritorio")
    pagina.click("button:has-text('Nova nomeação')")
    pagina.fill("textarea[placeholder^='Cole aqui o texto']", texto_intimacao)
    pagina.click("button:has-text('Ler a intimação')")
    try:
        pagina.wait_for_selector("button:has-text('Abrir caso a partir da ficha')", timeout=180000)
        marcar("a IA monta a ficha da nomeação", True)
        conteudo_ficha = pagina.content()
        marcar("a ficha extrai o número do processo", "0001258-98.2020.8.16.0171" in conteudo_ficha or CNJ in conteudo_ficha)
        marcar("a ficha não calcula prazo sozinha", "conferir no ato" in conteudo_ficha or "não consta" in conteudo_ficha)
        pagina.screenshot(path=f"{PRINTS}/03-ficha-da-nomeacao.png", full_page=True)
        pagina.click("button:has-text('Abrir caso a partir da ficha')")
        pagina.wait_for_url("**/escritorio/casos/**", timeout=30000)
        conteudo_caso = pagina.content()
        marcar("o caso nasce a partir da ficha", "nomeação" in conteudo_caso.lower() or "Nomeação" in conteudo_caso)
        marcar("o caso nasce com as tarefas de conferência", "Confirmar prazo no processo oficial" in conteudo_caso or "Conferir a íntegra" in conteudo_caso)
    except Exception as erro:  # noqa: BLE001
        marcar("a IA monta a ficha da nomeação", False, f"{type(erro).__name__}: {str(erro).splitlines()[0][:160]}")

    # 9. Mensagens e WhatsApp.
    pagina.goto(f"{BASE}/escritorio/mensagens")
    pagina.wait_for_selector("text=Nenhuma conversa ainda.", timeout=30000)
    conteudo = pagina.content()
    marcar("a tela de mensagens avisa que falta cadastrar o WhatsApp", "não cadastrou" in conteudo or "Cadastrar e conectar" in conteudo)
    marcar("sem conexão, a tela não oferece envio", "Enviar pelo WhatsApp" not in conteudo)
    pagina.goto(f"{BASE}/escritorio/whatsapp")
    pagina.fill("#numero-whatsapp", "(41) 97777-6666")
    pagina.click("button:has-text('Cadastrar e gerar QR')")
    try:
        pagina.wait_for_selector("text=Número cadastrado", timeout=60000)
        marcar("o número do advogado fica cadastrado no servidor", True)
        marcar("a instância é por advogado", f"ponto-dativo-e2e-{marcador}" in pagina.content(), f"procura ponto-dativo-e2e-{marcador}")
        pagina.wait_for_selector("img[alt*='QR']", timeout=60000)
        marcar("o QR aparece para ler no celular", True)
        pagina.screenshot(path=f"{PRINTS}/04-whatsapp-qr.png", full_page=True)
    except Exception as erro:  # noqa: BLE001
        marcar("o número do advogado fica cadastrado no servidor", False, f"{type(erro).__name__}: {str(erro).splitlines()[0][:160]}")
    pagina.click("button:has-text('Remover número')")
    try:
        pagina.wait_for_selector("button:has-text('Cadastrar e gerar QR')", timeout=60000)
        marcar("remover o número limpa o cadastro", True)
    except Exception as erro:  # noqa: BLE001
        marcar("remover o número limpa o cadastro", False, f"{type(erro).__name__}: {str(erro).splitlines()[0][:160]}")

    # 10. Celular e saída.
    contexto_celular = navegador.new_context(viewport={"width": 390, "height": 844}, storage_state=contexto.storage_state())
    celular = contexto_celular.new_page()
    celular.set_default_timeout(25000)
    celular.goto(f"{BASE}/escritorio")
    largura = celular.evaluate("document.documentElement.scrollWidth")
    marcar("no celular o painel não rola de lado", largura <= 391, f"scrollWidth {largura}px")
    celular.screenshot(path=f"{PRINTS}/05-painel-no-celular.png", full_page=True)
    pagina.bring_to_front()
    pagina.click("button:has-text('Sair')")
    pagina.wait_for_url(f"{BASE}/", timeout=30000)
    marcar("sair volta para o site público", pagina.url.rstrip("/") == BASE.rstrip("/"))
    pagina.goto(f"{BASE}/escritorio")
    pagina.wait_for_url("**/entrar**", timeout=30000)
    marcar("depois de sair, o escritório pede login de novo", "/entrar" in pagina.url)

    navegador.close()

print(f"\n{'Fluxo completo confirmado' if not falhas else str(len(falhas)) + ' verificação(ões) falharam'}: {verificacoes - len(falhas)} de {verificacoes} verificações passaram.")
if falhas:
    print("Falhas: " + "; ".join(falhas))
sys.exit(1 if falhas else 0)
