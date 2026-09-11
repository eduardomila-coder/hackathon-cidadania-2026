#!/bin/bash
# Convida colegas como colaboradores (permissão de escrita) no repositório.
# Uso: ./scripts/convidar.sh usuario-github-1 usuario-github-2
set -euo pipefail
[ $# -ge 1 ] || { echo "Uso: $0 usuario-github [outro-usuario...]"; exit 1; }
for u in "$@"; do
  gh api -X PUT "repos/{owner}/{repo}/collaborators/$u" -f permission=push >/dev/null
  echo "convite enviado: $u"
done
