import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useLoaderData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { APP_NAME, defaultConfig } from "../services/ship-match";
import {
  deleteShipMatchRule,
  listShipMatchRules,
} from "../services/ship-match.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const rules = await listShipMatchRules(admin);
  return { rules, appName: APP_NAME };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");
  const id = String(formData.get("id") || "");

  if (intent === "delete" && id) {
    await deleteShipMatchRule(admin, id);
  }

  return { ok: true };
};

export default function Dashboard() {
  const { rules, appName } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const busy = navigation.state !== "idle";
  const defaults = defaultConfig();

  return (
    <s-page heading={String(appName)} inlineSize="base">
      <s-button slot="primary-action" variant="primary" href="/app/rules/new">
        Create rule
      </s-button>

      <s-section heading="What this app does">
        <s-paragraph>
          When customers pick a delivery method before checkout (pickup point,
          courier office, or a custom storefront step), Shopify still shows
          every shipping rate. That is confusing.
        </s-paragraph>
        <s-paragraph>
          {String(appName)} is a Delivery Customization app: it reads a cart
          attribute and hides rates that do not match, so checkout shows only
          the method the customer already chose. If the attribute is empty, all
          rates stay visible.
        </s-paragraph>
      </s-section>

      <s-section heading="Example">
        <s-paragraph>
          Your store has two rates: Office Pickup ($3.50) and Home Delivery
          ($4.50).
        </s-paragraph>
        <s-paragraph>
          A customer picks office pickup on your storefront. Your theme writes
          cart attribute Shipping Method = Office Pickup, then sends them to
          checkout.
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>
            Without {String(appName)}: both rates appear at checkout
          </s-list-item>
          <s-list-item>
            With {String(appName)}: Home Delivery is hidden; only Office Pickup
            remains
          </s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Active rules">
        {rules.length === 0 ? (
          <s-banner tone="info" heading="No rules yet">
            <s-paragraph>
              Create a rule to start filtering shipping rates. You can also add
              one from Settings → Shipping and delivery → Delivery
              customizations.
            </s-paragraph>
            <s-button href="/app/rules/new" variant="primary">
              Create your first rule
            </s-button>
          </s-banner>
        ) : (
          <s-stack direction="block" gap="base">
            {rules.map(
              (rule: {
                id: string;
                title: string;
                enabled: boolean;
                config: { attributeKey: string; matchMode: string };
              }) => (
                <s-box
                  key={rule.id}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                >
                  <s-stack direction="block" gap="small">
                    <s-stack direction="inline" gap="base">
                      <s-heading>{rule.title}</s-heading>
                      <s-badge tone={rule.enabled ? "success" : "neutral"}>
                        {rule.enabled ? "Enabled" : "Disabled"}
                      </s-badge>
                    </s-stack>
                    <s-paragraph>
                      Attribute: {rule.config.attributeKey} · Match:{" "}
                      {rule.config.matchMode}
                    </s-paragraph>
                    <s-stack direction="inline" gap="base">
                      <s-button
                        href={`/app/rules/${rule.id.split("/").pop()}`}
                        variant="secondary"
                      >
                        Edit
                      </s-button>
                      <Form method="post">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={rule.id} />
                        <s-button
                          type="submit"
                          tone="critical"
                          {...(busy ? { disabled: true } : {})}
                        >
                          Delete
                        </s-button>
                      </Form>
                    </s-stack>
                  </s-stack>
                </s-box>
              ),
            )}
          </s-stack>
        )}
      </s-section>

      <s-section slot="aside" heading="Quick start">
        <s-ordered-list>
          <s-list-item>Create a rule (attribute key + match mode)</s-list-item>
          <s-list-item>
            On the storefront, save the chosen rate title to that cart
            attribute before checkout
          </s-list-item>
          <s-list-item>
            At Shopify checkout, unmatched rates are hidden automatically
          </s-list-item>
        </s-ordered-list>
        <s-button href="/app/setup" variant="tertiary">
          Open setup guide
        </s-button>
      </s-section>

      <s-section slot="aside" heading="What this app does not do">
        <s-paragraph>
          It does not replace Shopify Checkout, process payments, or book
          carriers. It only filters which shipping rates are visible.
        </s-paragraph>
      </s-section>

      <s-section slot="aside" heading="Defaults">
        <s-paragraph>
          Default attribute key: {defaults.attributeKey}
        </s-paragraph>
        <s-paragraph>Default match mode: {defaults.matchMode}</s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
