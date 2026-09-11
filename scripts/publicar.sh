#!/bin/bash
# Cria o repositório no GitHub a partir desta pasta, sobe o código e grava a
# URL real de clone no ONBOARDING.md. Rodar uma vez, depois de `gh auth login`.
set -euo pipefail
cd "$(dirname "$0")/.."

gh auth status >/dev/null 2>&1 || { echo "Faça login primeiro: gh auth login"; exit 1; }

gh repo create hackathon-cidadania-2026 --public --source=. --remote=origin --push \
  --description "Hackathon da Cidadania OAB/PR 2026 — atendente virtual do Juizado Especial (MIT)"

url="$(gh repo view --json url -q .url)"
sed -i '' "s#https://github.com/EDUARDO_USUARIO/hackathon-cidadania-2026.git#${url}.git#" docs/ONBOARDING.md
git add docs/ONBOARDING.md
git commit -q -m "grava a URL real do repositório no onboarding" || true
git push -q origin main
echo "Publicado em: $url"
