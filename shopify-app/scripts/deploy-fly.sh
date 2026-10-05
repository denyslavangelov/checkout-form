#!/usr/bin/env bash
# Deploy ShipMatch web app to Fly.io and point Shopify URLs at it.
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="$HOME/.fly/bin:$PATH"

APP_NAME="${FLY_APP_NAME:-shipmatch}"
APP_URL="https://${APP_NAME}.fly.dev"
CONFIG="${SHOPIFY_CONFIG:-shipmatch}"

if ! fly auth whoami >/dev/null 2>&1; then
  echo "Not logged in to Fly. Run: fly auth login"
  exit 1
fi

# Create app if missing
if ! fly apps list -q 2>/dev/null | grep -qx "$APP_NAME"; then
  echo "Creating Fly app: $APP_NAME"
  fly apps create "$APP_NAME" --org personal || fly apps create "$APP_NAME"
fi

# Ensure volume exists (SQLite persistence)
if ! fly volumes list -a "$APP_NAME" 2>/dev/null | grep -q shipmatch_data; then
  echo "Creating volume shipmatch_data in fra..."
  fly volumes create shipmatch_data --app "$APP_NAME" --region fra --size 1 -y
fi

# Pull Shopify credentials (do not echo secret)
eval "$(npx shopify app env show --config "$CONFIG" | awk -F= '
  /^[[:space:]]*SHOPIFY_/ || /^[[:space:]]*SCOPES=/ {
    key=$1; sub(/^[[:space:]]+/, "", key);
    val=substr($0, index($0,"=")+1);
    gsub(/"/, "\\\"", val);
    print "export " key "=\"" val "\""
  }')"

fly secrets set \
  SHOPIFY_API_KEY="$SHOPIFY_API_KEY" \
  SHOPIFY_API_SECRET="$SHOPIFY_API_SECRET" \
  SCOPES="$SCOPES" \
  SHOPIFY_APP_URL="$APP_URL" \
  DATABASE_URL="file:/data/prod.sqlite" \
  --app "$APP_NAME"

echo "Deploying to $APP_URL ..."
fly deploy --app "$APP_NAME" --config fly.toml

# Patch Shopify app URLs in toml
python3 - <<PY
from pathlib import Path
path = Path("shopify.app.${CONFIG}.toml") if Path("shopify.app.${CONFIG}.toml").exists() else Path("shopify.app.toml")
# Prefer shipmatch config
for candidate in ["shopify.app.shipmatch.toml", "shopify.app.toml"]:
    p = Path(candidate)
    if p.exists() and "8183cfa1a8072d54ecb1ce6bbc45007c" in p.read_text():
        path = p
        break
text = path.read_text()
text = text.replace('application_url = "https://localhost"', f'application_url = "{APP_URL}"')
text = text.replace('https://localhost/auth/callback', f'{APP_URL}/auth/callback')
text = text.replace('https://localhost/auth/shopify/callback', f'{APP_URL}/auth/shopify/callback')
text = text.replace('https://localhost/api/auth/callback', f'{APP_URL}/api/auth/callback')
# if already patched with another host, force APP_URL
import re
text = re.sub(r'application_url = "https://[^"]+"', f'application_url = "{APP_URL}"', text, count=1)
path.write_text(text)
print(f"Updated {path} → {APP_URL}")
PY

echo "Pushing Shopify app config..."
npx shopify app deploy --config "$CONFIG" --force

echo ""
echo "✅ Hosted at: $APP_URL"
echo "Install from Dev Dashboard, or open:"
echo "  https://admin.shopify.com/?organization_id=&no_redirect=true#/apps"
echo "Or use the app install link from Partner / Dev Dashboard."
