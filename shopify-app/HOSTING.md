# ShipMatch hosting (Fly.io)

Production URL: `https://shipmatch.fly.dev`

## One-time setup

```bash
# Install Fly CLI (if needed)
curl -L https://fly.io/install.sh | sh
export PATH="$HOME/.fly/bin:$PATH"

fly auth login
cd shopify-app
bash scripts/deploy-fly.sh
```

This script:
1. Creates the Fly app + SQLite volume
2. Sets Shopify secrets (`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SCOPES`, `SHOPIFY_APP_URL`)
3. Deploys the web app
4. Updates `shopify.app.shipmatch.toml` URLs
5. Runs `shopify app deploy` so Partner Dashboard points at Fly

## After deploy — install on a store

1. Open [Dev Dashboard](https://dev.shopify.com) → Shipmatch
2. Use **Install** / test on your development store  
   (no more `localhost refused to connect`)

## Local development

Keep using:

```bash
npm run dev -- --config shipmatch
```

`automatically_update_urls_on_dev = true` temporarily overrides URLs to the Cloudflare tunnel while `app dev` runs.
