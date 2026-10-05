# ShipMatch

Shopify **Delivery Customization** app that keeps checkout shipping rates in sync
with a delivery method the customer already chose on the storefront (pickup
point, courier office selector, custom storefront step, etc.).

It reads a cart attribute and hides unmatched rates. It does **not** replace
Shopify Checkout, process payments, or book carriers.

This is a **standalone shipping filter** for App Store distribution (public /
unlisted). Listing copy for reviewers: [`LISTING.md`](./LISTING.md).

## Why public distribution?

Shopify only allows Delivery Customization Functions on non-Plus stores when the app is a **public App Store app**. Custom distribution apps require Plus for Functions.

## Features

- Delivery Customization function (`ship-match`)
- Merchant UI to create/edit rules
- Configurable cart attribute key
- Exact or contains title matching
- Setup guide for theme / storefront integration
- Public privacy policy page at `/privacy`

## Setup (new Partner app)

### 1. Delete the old app (required)

In [Dev Dashboard](https://dev.shopify.com/dashboard):

1. Open organization **Agility Ltd.**
2. Open **checkout-form-extension**
3. **Settings → Delete app**

Do not reuse that client ID.

### 2. Install dependencies

```bash
cd shopify-app
npm install
```

### 3. Create a new public app

```bash
npx shopify app config link
```

- Create a **new** app named **ShipMatch**
- In Dev Dashboard → **Distribution**: choose **Public** (not Custom)
- Complete Partner app registration fee if prompted ($19)

### 4. Develop on a development store

```bash
npm run dev
```

Install on a **dev store**, create a rule, test checkout filtering.

### 5. Host the web app

Host this React Router app (Fly, Render, Railway, etc.), set:

- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SCOPES`
- `SHOPIFY_APP_URL`
- `DATABASE_URL` (Postgres recommended for production)

Update `application_url`, auth redirect URLs, and privacy URL in `shopify.app.toml`, then:

```bash
npm run deploy
```

### 6. App Store submission (unlisted is fine)

1. Fill listing from [`LISTING.md`](./LISTING.md)
2. Add screenshots + demo screencast
3. Set privacy URL to `https://YOUR_HOST/privacy`
4. Submit for review
5. After approval, keep **Limited visibility / unlisted** if you only want install-via-link

## Theme integration (merchant-facing)

```js
fetch('/cart/update.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    attributes: {
      'Shipping Method': 'Standard Shipping' // must match rate title
    }
  })
}).then(() => {
  window.location.href = '/checkout';
});
```

## Local function tests

```bash
npm run test:function
```

## Scopes

- `read_delivery_customizations`
- `write_delivery_customizations`

## Expiring offline tokens

New public apps must use **expiring offline access tokens**. This app enables
`future.expiringOfflineAccessTokens` in `app/shopify.server.ts`.

If the admin UI shows `GraphQL Client: Forbidden` / HTTP 403, clear sessions and
re-open the app from `shopify app dev` so a fresh expiring token is issued.
