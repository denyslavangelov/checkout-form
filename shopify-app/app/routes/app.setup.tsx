import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { DEFAULT_ATTRIBUTE_KEY } from "../services/ship-match";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return { attributeKey: DEFAULT_ATTRIBUTE_KEY };
};

export default function SetupGuide() {
  const { attributeKey } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Setup guide" inlineSize="base">
      <s-section heading="Goal">
        <s-paragraph>
          ShipMatch keeps Shopify checkout shipping rates aligned with a
          delivery choice the customer made earlier on your storefront. Your
          theme or widget writes a cart attribute; ShipMatch hides every rate
          that does not match that value.
        </s-paragraph>
      </s-section>

      <s-section heading="Example">
        <s-paragraph>
          Rates in Shopify: Office Pickup and Home Delivery.
        </s-paragraph>
        <s-paragraph>
          Customer chooses office pickup → storefront sets {attributeKey} =
          Office Pickup → at checkout only Office Pickup is shown. Home Delivery
          is hidden.
        </s-paragraph>
      </s-section>

      <s-section heading="1. Create a ShipMatch rule">
        <s-paragraph>
          From the dashboard, create a rule and choose the cart attribute key
          your storefront will write (default: {attributeKey}). Use match mode
          Exact for full rate titles, or Contains for partial matches.
        </s-paragraph>
      </s-section>

      <s-section heading="2. Write the cart attribute before checkout">
        <s-paragraph>
          When a customer selects a delivery option in your theme, pickup
          widget, or custom storefront, save the exact shipping rate title (as
          shown in Settings → Shipping and delivery) to the cart:
        </s-paragraph>
        <s-box
          padding="base"
          borderWidth="base"
          borderRadius="base"
          background="subdued"
        >
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
{`fetch('/cart/update.js', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    attributes: {
      '${attributeKey}': 'Office Pickup'
    }
  })
});`}
          </pre>
        </s-box>
        <s-paragraph>
          The attribute value should match (or be contained in) the shipping
          rate title shown at checkout.
        </s-paragraph>
      </s-section>

      <s-section heading="3. Send the customer to checkout">
        <s-paragraph>
          Redirect to /checkout. ShipMatch hides every rate that does not match
          the attribute value, so Shopify selects the remaining option.
        </s-paragraph>
      </s-section>

      <s-section heading="4. Verify">
        <s-unordered-list>
          <s-list-item>
            Open /cart.js and confirm the attribute is present
          </s-list-item>
          <s-list-item>
            Confirm rate titles in Settings → Shipping and delivery match your
            attribute values
          </s-list-item>
          <s-list-item>
            Complete a test checkout and confirm only the intended rate appears
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
