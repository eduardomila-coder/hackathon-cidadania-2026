"""Confere o endereço público esperando a hidratação antes de digitar.

O defeito antigo era a página chegar morta pelo túnel. Digitar antes de o React
hidratar também parece falha sem ser: o React devolve o campo ao estado inicial
e o botão fica desabilitado. Aqui se espera o React assumir o campo (marca
__reactProps no nó) antes de preencher. Não cria conta nem altera nada: usa
credencial inexistente de propósito.

Uso: python3.11 checar-publico.py [endereço] [rodadas]
"""
import os
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "https://habeastitas.eduardomila.adv.br"
RODADAS = int(sys.argv[2]) if len(sys.argv) > 2 else 1
EXECUTAVEIS = [
    "/Users/eduardomila/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell",
    "/Users/eduardomila/Library/Caches/ms-playwright/chromium-1243/chrome-mac/Chromium.app/Contents/MacOS/Chromium",
]
HIDRATOU = "!!Object.keys(document.querySelector('#usuario')).find(k => k.startsWith('__reactProps'))"

falhas = []


def conferir(nome, ok, detalhe=""):
    if not ok:
        falhas.append(nome)
    print(("✓ " if ok else "✗ ") + nome + (f" · {detalhe}" if detalhe else ""))


with sync_playwright() as p:
    navegador = p.chromium.launch(executable_path=next((c for c in EXECUTAVEIS if os.path.exists(c)), None))
    for rodada in range(1, RODADAS + 1):
        pagina = navegador.new_context(viewport={"width": 1280, "height": 900}).new_page()
        pagina.set_default_timeout(45000)
        pagina.goto(BASE + "/entrar", wait_until="load")
        try:
            pagina.wait_for_function(HIDRATOU, timeout=45000)
            hidratou = True
        except Exception as erro:  # noqa: BLE001
            hidratou = False
            conferir(f"rodada {rodada}: React assume a página", False, str(erro).splitlines()[0][:100])
        if not hidratou:
            break
        conferir(f"rodada {rodada}: a tela de entrar está no endereço público", "Entrar" in pagina.content())
        conferir(f"rodada {rodada}: a faixa de demonstração aparece", "nada aqui é sistema oficial da OAB" in pagina.content())
        pagina.fill("#usuario", "nao-existe-teste")
        pagina.fill("#senha", "senha-errada-123")
        conferir(f"rodada {rodada}: campo digitado liga o botão", pagina.is_enabled("button:has-text('Entrar')"))
        try:
            pagina.click("button:has-text('Entrar')", timeout=15000)
            pagina.wait_for_selector(".pd-entrar-erro", timeout=20000)
            conferir(f"rodada {rodada}: API respondeu o erro de credencial", True)
        except Exception as erro:  # noqa: BLE001
            conferir(f"rodada {rodada}: API respondeu o erro de credencial", False, str(erro).splitlines()[0][:100])
        pagina.screenshot(path="/tmp/checagem-publica-entrar.png", full_page=True)
    navegador.close()

print(f"\n{'Endereço público ok' if not falhas else str(len(falhas)) + ' falha(s)'}")
sys.exit(1 if falhas else 0)
