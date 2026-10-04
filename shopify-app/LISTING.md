# ShipMatch — App Store listing draft

Use this copy in the Dev Dashboard / App Store listing. Position the app as a
**shipping-rate filter**, not as part of any specific checkout form.

## Name
ShipMatch

## Tagline
Show only the shipping rates that match a cart attribute at checkout.

## Short description
Hide unmatched delivery options so customers see the shipping method they already selected in your storefront or pickup widget.

## Full description

ShipMatch filters Shopify checkout shipping rates using a cart attribute.

**How it works**
1. Your theme, pickup app, or custom storefront writes a cart attribute (for example `Shipping Method`) with the preferred rate title.
2. The customer continues to Shopify checkout.
3. ShipMatch hides every shipping rate that does not match that attribute value.
4. With one rate left, Shopify selects it automatically.

**Built for**
- Pickup / locker widgets that choose a courier before checkout
- Custom storefronts that preselect delivery
- Merchants who want checkout rates to follow an earlier shipping choice

**Merchant controls**
- Cart attribute key
- Exact or contains matching
- Enable / disable per rule

ShipMatch does not replace Shopify checkout and does not process payments.

## Category / tags
Shipping and delivery · Checkout · Cart

## Pricing
Free (or set your plan before submit)

## Demo screencast script (record this)
1. Open ShipMatch dashboard → Create rule
2. Set attribute key `Shipping Method`, match mode Contains, enable
3. On storefront, set cart attribute via browser console / theme widget
4. Open checkout → only matching rate remains
5. Clear attribute → all rates return

## Reviewer test credentials
Provide a development store password + installed app access, plus:
- Product in cart
- At least 2 shipping rates with distinct titles
- Instructions to set cart attribute via `/cart/update.js`

## Privacy policy URL
`https://YOUR_HOSTED_APP_URL/privacy`

## Support email
`support@yourdomain.com` (replace before submit)
