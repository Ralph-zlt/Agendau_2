#!/usr/bin/env bash
# ============================================================================
# Deploy de produção do DayVet na Vercel
# ----------------------------------------------------------------------------
# POR QUÊ existe: o deploy pela integração Git está BLOQUEADO no projeto
#   ("commit author doesn't have permission to create deployments"), porque a
#   conta Vercel não tem Login Connection com o GitHub. Enquanto isso não for
#   resolvido no painel, este script publica pelo CLI a partir de um artefato
#   já montado.
#
# O QUE faz:
#   1. monta o artefato em /tmp/dayvet-vercel-build (fora de ~/Público, sem .git);
#   2. usa um vercel.json local sem build (os arquivos já estão prontos) e sem
#      cleanUrls — o cleanUrls redirecionava /dayvet/ e quebrava os <script src>
#      relativos;
#   3. publica em produção e confere as URLs principais.
#
# USO:  ./scripts/deploy-vercel.sh
# PRÉ-REQUISITO: `vercel whoami` respondendo e .vercel/project.json presente.
# ============================================================================
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SAIDA="/tmp/dayvet-vercel-build"

echo "→ montando artefato em $SAIDA"
rm -rf "$SAIDA"
mkdir -p "$SAIDA/dayvet"
cp "$RAIZ/site/index.html" "$SAIDA/index.html"
cp "$RAIZ/dayvet/index.html" "$RAIZ/dayvet/styles.css" "$RAIZ/dayvet/regras.js" \
   "$RAIZ/dayvet/script.js" "$RAIZ/dayvet/config.js" "$SAIDA/dayvet/"

cat > "$SAIDA/vercel.json" <<'JSON'
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "echo artefato pre-construido por scripts/deploy-vercel.sh",
  "outputDirectory": ".",
  "framework": null,
  "trailingSlash": true
}
JSON

mkdir -p "$SAIDA/.vercel"
cp "$RAIZ/.vercel/project.json" "$SAIDA/.vercel/project.json"

echo "→ publicando em produção"
cd "$SAIDA"
vercel deploy --prod --yes

echo
echo "→ conferindo https://agendau-2.vercel.app"
falhou=0
for caminho in / /dayvet/ /dayvet/config.js /dayvet/script.js /dayvet/regras.js /dayvet/styles.css; do
    codigo="$(curl -s -o /dev/null -w '%{http_code}' "https://agendau-2.vercel.app$caminho")"
    printf '  %-22s %s\n' "$caminho" "$codigo"
    [ "$codigo" = "200" ] || falhou=1
done

if [ "$falhou" -ne 0 ]; then
    echo "FALHA: alguma URL não respondeu 200" >&2
    exit 1
fi
echo "OK: artefato publicado e servido."
echo "Verificação funcional: node tests/publicado.mjs https://agendau-2.vercel.app/dayvet/"
