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
    <s-page heading={appName}>
      <s-button
        slot="primary-action"
        variant="primary"
        href="/app/rules/new"
      >
        Create rule
      </s-button>

      <s-section heading="Hide unmatched shipping rates at checkout">
        <s-paragraph>
          {appName} keeps only the delivery options that match a cart attribute
          value. Use it with pickup widgets, custom storefronts, or any flow
          that writes a preferred shipping method to the cart before checkout.
        </s-paragraph>
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
            {rules.map((rule: {
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
                    Attribute:{" "}
                    <s-text type="strong">{rule.config.attributeKey}</s-text>
                    {" · "}
                    Match:{" "}
                    <s-text type="strong">{rule.config.matchMode}</s-text>
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
                        disabled={busy}
                      >
                        Delete
                      </s-button>
                    </Form>
                  </s-stack>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>

      <s-section slot="aside" heading="Quick start">
        <s-ordered-list>
          <s-list-item>Create a ShipMatch rule</s-list-item>
          <s-list-item>
            Set a cart attribute from your theme or storefront (see Setup guide)
          </s-list-item>
          <s-list-item>
            At checkout, only matching shipping rates remain
          </s-list-item>
        </s-ordered-list>
        <s-button href="/app/setup" variant="tertiary">
          Open setup guide
        </s-button>
      </s-section>

      <s-section slot="aside" heading="Defaults">
        <s-paragraph>
          Default attribute key:{" "}
          <s-text type="strong">{defaults.attributeKey}</s-text>
        </s-paragraph>
        <s-paragraph>
          Default match mode:{" "}
          <s-text type="strong">{defaults.matchMode}</s-text>
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
