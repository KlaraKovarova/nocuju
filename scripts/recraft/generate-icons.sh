#!/usr/bin/env bash
# Generates category icons for nocuju.cz via Recraft API.
# Usage: RECRAFT_API_KEY=xxx bash scripts/recraft/generate-icons.sh
# Never commit the API key.

set -euo pipefail

API="https://external.api.recraft.ai/v1/images/generations"
KEY="${RECRAFT_API_KEY:-$recraft}"
OUT="public/generated"
SIZE="1024x1024"
STYLE="digital_illustration"

if [ -z "$KEY" ]; then
  echo "ERROR: RECRAFT_API_KEY not set" >&2
  exit 1
fi

generate() {
  local name="$1"
  local prompt="$2"
  local dir="$OUT/$name"
  mkdir -p "$dir"

  echo "Generating $name …"
  local resp
  resp=$(curl -s -X POST "$API" \
    -H "Authorization: Bearer $KEY" \
    -H "Content-Type: application/json" \
    -d "{\"prompt\": $(echo "$prompt" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read().strip()))'), \"style\": \"$STYLE\", \"size\": \"$SIZE\", \"n\": 1}")

  local url credits image_id
  url=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['url'])")
  credits=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('credits','?'))")
  image_id=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data'][0]['image_id'])")

  echo "  → credits remaining: $credits | image_id: $image_id"
  curl -sL "$url" -o "$dir/${name}-raw.png"

  cat > "$dir/.meta.json" <<META
{
  "prompt": "$prompt",
  "style": "$STYLE",
  "size": "$SIZE",
  "recraft_image_id": "$image_id",
  "credits_remaining_after": $credits,
  "issue": "NOC-84"
}
META

  echo "  Saved: $dir/${name}-raw.png"
}

generate "icon-utulna" "Czech wooden mountain hut icon, flat minimal illustration on cream background, dark forest green triangular roof, warm honey-colored log walls, small square window with cross pane, chimney, centered composition, clear alpine outdoor atmosphere, no text, no people, no photorealism"

generate "icon-nouzove" "Open-sided lean-to emergency shelter icon, flat minimal illustration on cream background, slanted wooden plank roof, two rough pole supports, small campfire below, pine forest background suggestion, clear and recognizable shape, no text, no people, muted earth and green tones"

generate "icon-voda" "Mountain spring water source icon, flat minimal illustration on cream background, clear cool water welling from between mossy rocks, blue water drop shape above, simple and symbolic, forest green and slate blue tones, no text, no people, clean editorial style"

echo ""
echo "Done. Check public/generated/icon-*/  for results."
