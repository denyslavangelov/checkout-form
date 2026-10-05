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
  const enabledCount = rules.filter(
    (rule: { enabled: boolean }) => rule.enabled,
  ).length;

  return (
    <s-page heading={String(appName)} inlineSize="base">
      <s-button slot="primary-action" variant="primary" href="/app/rules/new">
        Create rule
      </s-button>

      <s-section heading="Active rules">
        {rules.length === 0 ? (
          <s-banner tone="info" heading="No rules yet">
            <s-stack direction="block" gap="base">
              <s-paragraph>
                Create a rule to start filtering shipping rates. You can also
                add one from Settings → Shipping and delivery → Delivery
                customizations.
              </s-paragraph>
              <s-stack direction="inline" gap="base">
                <s-button href="/app/rules/new" variant="primary">
                  Create your first rule
                </s-button>
                <s-button href="/app/setup" variant="tertiary">
                  Setup guide
                </s-button>
              </s-stack>
            </s-stack>
          </s-banner>
        ) : (
          <s-stack direction="block" gap="base">
            <s-stack direction="inline" gap="base">
              <s-badge tone="info">
                {rules.length} rule{rules.length === 1 ? "" : "s"}
              </s-badge>
              <s-badge tone={enabledCount > 0 ? "success" : "neutral"}>
                {enabledCount} enabled
              </s-badge>
            </s-stack>

            {rules.map(
              (rule: {
                id: string;
                title: string;
                enabled: boolean;
                config: {
                  attributeKey: string;
                  matchMode: string;
                  caseSensitive: boolean;
                  alwaysShowTitles: string[];
                  missingAttributeBehavior: string;
                };
              }) => (
                <s-box
                  key={rule.id}
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="base"
                >
                  <s-stack direction="block" gap="base">
                    <s-stack
                      direction="inline"
                      gap="base"
                      justifyContent="space-between"
                    >
                      <s-stack direction="block" gap="small-100">
                        <s-stack direction="inline" gap="small">
                          <s-heading>{rule.title}</s-heading>
                          <s-badge
                            tone={rule.enabled ? "success" : "neutral"}
                          >
                            {rule.enabled ? "Enabled" : "Disabled"}
                          </s-badge>
                        </s-stack>
                        <s-paragraph>
                          Attribute{" "}
                          <s-text type="strong">
                            {rule.config.attributeKey}
                          </s-text>{" "}
                          · Match{" "}
                          <s-text type="strong">{rule.config.matchMode}</s-text>
                          {rule.config.caseSensitive
                            ? " · Case sensitive"
                            : ""}
                          {rule.config.alwaysShowTitles.length > 0
                            ? ` · Always show ${rule.config.alwaysShowTitles.length}`
                            : ""}
                        </s-paragraph>
                      </s-stack>
                      <s-stack direction="inline" gap="small">
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
                            variant="tertiary"
                            {...(busy ? { disabled: true } : {})}
                          >
                            Delete
                          </s-button>
                        </Form>
                      </s-stack>
                    </s-stack>
                  </s-stack>
                </s-box>
              ),
            )}
          </s-stack>
        )}
      </s-section>

      <s-section heading="How it works">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            {String(appName)} hides shipping rates that do not match a cart
            attribute set on your storefront. If the attribute is empty, every
            rate stays visible.
          </s-paragraph>

          <s-query-container>
            <s-grid
              gridTemplateColumns="@container (inline-size > 480px) 1fr 1fr, 1fr"
              gap="base"
            >
              <s-grid-item>
                <s-box
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <s-stack direction="block" gap="small">
                    <s-badge>Without {String(appName)}</s-badge>
                    <s-paragraph>
                      Customer chose Office Pickup, but checkout still shows
                      Office Pickup and Home Delivery.
                    </s-paragraph>
                  </s-stack>
                </s-box>
              </s-grid-item>
              <s-grid-item>
                <s-box
                  padding="base"
                  borderWidth="base"
                  borderRadius="base"
                  background="subdued"
                >
                  <s-stack direction="block" gap="small">
                    <s-badge tone="success">With {String(appName)}</s-badge>
                    <s-paragraph>
                      Attribute Shipping Method = Office Pickup. Home Delivery
                      is hidden; only Office Pickup remains.
                    </s-paragraph>
                  </s-stack>
                </s-box>
              </s-grid-item>
            </s-grid>
          </s-query-container>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Quick start">
        <s-stack direction="block" gap="base">
          <s-stack direction="block" gap="small">
            <s-paragraph>
              <s-text type="strong">1.</s-text> Create a rule with an attribute
              key and match mode
            </s-paragraph>
            <s-paragraph>
              <s-text type="strong">2.</s-text> Save the chosen rate title to
              that cart attribute before checkout
            </s-paragraph>
            <s-paragraph>
              <s-text type="strong">3.</s-text> Unmatched rates are hidden at
              Shopify checkout automatically
            </s-paragraph>
          </s-stack>
          <s-button href="/app/setup" variant="secondary">
            Open setup guide
          </s-button>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Defaults">
        <s-stack direction="block" gap="small">
          <s-box
            padding="small"
            borderWidth="base"
            borderRadius="base"
            background="subdued"
          >
            <s-stack direction="block" gap="small-100">
              <s-text type="small">Attribute key</s-text>
              <s-text type="strong">{defaults.attributeKey}</s-text>
            </s-stack>
          </s-box>
          <s-box
            padding="small"
            borderWidth="base"
            borderRadius="base"
            background="subdued"
          >
            <s-stack direction="block" gap="small-100">
              <s-text type="small">Match mode</s-text>
              <s-text type="strong">{defaults.matchMode}</s-text>
            </s-stack>
          </s-box>
        </s-stack>
      </s-section>

      <s-section slot="aside" heading="Out of scope">
        <s-paragraph>
          Does not replace Checkout, process payments, or book carriers. It only
          filters which rates are visible.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
