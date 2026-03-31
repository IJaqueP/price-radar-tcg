#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
WEBHOOK_PATH="${WEBHOOK_PATH:-/api/shopify/webhooks/products/update}"
SHOP_DOMAIN="${SHOP_DOMAIN:-dev-store.myshopify.com}"
TOPIC="${TOPIC:-products/update}"

if [[ ! -f ".env" ]]; then
  echo "ERROR: No se encontró backend/.env."
  exit 1
fi

SECRET="${SHOPIFY_WEBHOOK_SECRET:-}"
if [[ -z "$SECRET" ]]; then
  SECRET="$(grep '^SHOPIFY_WEBHOOK_SECRET=' .env | head -1 | cut -d= -f2- | tr -d '\r')"
fi

if [[ -z "$SECRET" ]]; then
  echo "ERROR: Falta SHOPIFY_WEBHOOK_SECRET (env o backend/.env)."
  echo "Agrega en .env: SHOPIFY_WEBHOOK_SECRET=tu_secret"
  exit 1
fi

TEST_ID="${TEST_ID:-$RANDOM$RANDOM}"
PRODUCT_ID="${PRODUCT_ID:-9000000000}"
VARIANT_ID="${VARIANT_ID:-$((9000000000 + TEST_ID % 100000))}"
SKU="${SKU:-WEBHOOK-TEST-${TEST_ID}}"
TITLE="${TITLE:-Webhook Sync Test ${TEST_ID}}"
PRICE="${PRICE:-19990.00}"
STOCK="${STOCK:-7}"

PAYLOAD=$(cat <<JSON
{
  "id": ${PRODUCT_ID},
  "admin_graphql_api_id": "gid://shopify/Product/${PRODUCT_ID}",
  "title": "${TITLE}",
  "status": "active",
  "product_type": "Sealed Pokemon TCG",
  "vendor": "Oasis Games",
  "variants": [
    {
      "id": ${VARIANT_ID},
      "admin_graphql_api_id": "gid://shopify/ProductVariant/${VARIANT_ID}",
      "title": "Default Title",
      "sku": "${SKU}",
      "price": "${PRICE}",
      "inventory_quantity": ${STOCK}
    }
  ]
}
JSON
)

SIGNATURE=$(printf '%s' "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

echo "Enviando webhook firmado a ${BASE_URL}${WEBHOOK_PATH}"
echo "Topic: ${TOPIC}"
echo "SKU: ${SKU}"

RESPONSE=$(curl -sS -X POST "${BASE_URL}${WEBHOOK_PATH}" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: ${TOPIC}" \
  -H "X-Shopify-Shop-Domain: ${SHOP_DOMAIN}" \
  -H "X-Shopify-Hmac-Sha256: ${SIGNATURE}" \
  --data "$PAYLOAD")

echo "Respuesta webhook:"
echo "$RESPONSE" | node.exe -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{console.log(JSON.stringify(JSON.parse(s),null,2))}catch(_){console.log(s)}})"

echo ""
echo "Tip validación BD (opcional):"
echo "SELECT shopify_id, variant_id, title, shopify_sku, inventory_quantity, current_price, last_synced_at"
echo "FROM shopify_products"
echo "WHERE variant_id = 'gid://shopify/ProductVariant/${VARIANT_ID}';"
