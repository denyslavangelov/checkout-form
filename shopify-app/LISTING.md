# ShipMatch — App Store listing copy

Paste this into the Partner Dashboard / App Store listing.
Keep the app framed as a **checkout shipping filter** (Delivery Customization).
Do not market it as a checkout form, courier API, or payment app.

---

## App name
ShipMatch

## Subtitle (tagline) — max ~100 characters
Keep checkout shipping rates in sync with the delivery method customers already chose.

## App introduction / short description — max ~200 characters
ShipMatch hides shipping rates that do not match a cart attribute, so checkout shows only the delivery option the customer selected earlier on your storefront.

## Detailed description

**The problem**

Many stores let customers choose how they want to receive an order *before* Shopify checkout — for example:

- pickup point / parcel locker widgets
- courier office selectors
- “delivery method” steps on the cart or product page
- custom storefronts that preselect a rate

Shopify checkout still shows **every** available shipping rate. That creates confusion: the customer already chose “Speedy office pickup,” but checkout also offers address rates, other couriers, or unrelated methods.

**What ShipMatch does**

ShipMatch is a **Delivery Customization** app. It reads a cart attribute (for example `Shipping Method`) and **hides** checkout shipping rates that do not match that value.

If one matching rate remains, Shopify selects it automatically. If the attribute is missing or empty, ShipMatch does nothing — all rates stay visible.

**Example**

Your store has two Shopify shipping rates:

- `Office Pickup` — $3.50  
- `Home Delivery` — $4.50  

A customer uses your storefront pickup widget and chooses office pickup. Your theme saves:

`cart attribute "Shipping Method" = "Office Pickup"`

Then they continue to Shopify checkout.

- **Without ShipMatch:** checkout shows both Office Pickup and Home Delivery.  
- **With ShipMatch:** Home Delivery is hidden; only Office Pickup remains (and is selected).

If the customer never set the attribute, both rates still appear as usual.

**How merchants use it**

1. Install ShipMatch and create a rule (attribute key + match mode).
2. On the storefront, when the customer picks a delivery option, save the matching shipping rate title to a cart attribute (theme script, pickup app, or custom storefront).
3. Customer goes to normal Shopify checkout.
4. ShipMatch filters rates so only the intended method is shown.

**What ShipMatch is not**

- Not a replacement for Shopify Checkout
- Not a payment app
- Not a carrier / courier booking integration
- Does not change product prices or cart line items

It only controls **which shipping rates are visible** at checkout, based on a value your store already wrote to the cart.

**Merchant controls**

- Cart attribute key (default: `Shipping Method`)
- Match mode: exact title match or “contains”
- Enable / disable each rule

**Built for**

Merchants who already collect a shipping preference before checkout and need Shopify’s rate list to respect that choice.

---

## Category
Shipping and delivery

## Search terms / tags
shipping rates, delivery customization, hide shipping methods, pickup point, cart attribute, checkout shipping, preselect shipping

---

## App Store “About the app” / feature bullets (optional)

- Filter checkout shipping rates using a cart attribute
- Exact or partial (contains) title matching
- Works with any theme or widget that can call `/cart/update.js`
- Simple rule editor in the Shopify admin
- No change to Shopify’s native checkout UI

---

## Demo store / reviewer instructions

Provide these notes in the App Store submission “testing instructions” field:

```
App purpose
-----------
ShipMatch hides checkout shipping rates that do not match a cart attribute.
It uses Shopify’s Delivery Customization Function API.

Test store prep
---------------
1. Install ShipMatch on this development store.
2. Ensure at least TWO shipping rates exist (Settings → Shipping and delivery),
   with clearly different titles, e.g.:
   - "Office Pickup"
   - "Home Delivery"
3. Create a ShipMatch rule:
   - Attribute key: Shipping Method
   - Match mode: Contains
   - Enabled: Yes

How to test filtering
---------------------
1. Add any product to the cart.
2. In the storefront browser console (or a temporary theme snippet), run:

fetch('/cart/update.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'same-origin',
  body: JSON.stringify({
    attributes: { 'Shipping Method': 'Office Pickup' }
  })
}).then(() => { window.location.href = '/checkout'; });

3. At checkout, only the rate whose title matches "Office Pickup" should remain.
4. Clear the attribute (set it to "") and return to checkout — all rates should appear again.

Expected result
---------------
With the attribute set, unmatched rates are hidden.
With no attribute, checkout behaves like a normal Shopify store.

Notes
-----
ShipMatch does not replace checkout and does not process payments.
It only filters delivery options via Delivery Customization.
```

---

## Privacy policy URL
`https://YOUR_HOSTED_APP_URL/privacy`

## Support email
Replace before submit: `support@yourdomain.com`

## Pricing
Free (or configure your plan in the listing before submit)

---

## Screencast script (2–3 minutes)

1. Show ShipMatch app home → explain in one sentence: “This filters checkout shipping rates from a cart attribute.”
2. Create a rule: attribute `Shipping Method`, match `Contains`, enable.
3. Show Shipping settings with 2+ rate titles.
4. On the storefront, set the cart attribute (console or widget) and open checkout.
5. Show only the matching rate visible.
6. Clear the attribute → show all rates again.
7. End: “ShipMatch keeps checkout rates aligned with the customer’s earlier delivery choice.”
