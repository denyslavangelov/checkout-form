import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import {
  APP_NAME,
  defaultConfig,
  type MatchMode,
} from "../services/ship-match";
import {
  createShipMatchRule,
  getShipMatchRule,
  updateShipMatchRule,
} from "../services/ship-match.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const { id } = params;

  if (!id || id === "new") {
    return {
      isNew: true,
      title: `${APP_NAME} rule`,
      config: defaultConfig(),
    };
  }

  const gid = id.startsWith("gid://")
    ? id
    : `gid://shopify/DeliveryCustomization/${id}`;
  const rule = await getShipMatchRule(admin, gid);
  if (!rule) {
    throw new Response("Rule not found", { status: 404 });
  }

  return {
    isNew: false,
    id: rule.id,
    title: rule.title,
    config: rule.config,
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const title = String(formData.get("title") || `${APP_NAME} rule`).trim();
  const attributeKey = String(
    formData.get("attributeKey") || "Shipping Method",
  ).trim();
  const matchMode = (
    String(formData.get("matchMode") || "contains") === "exact"
      ? "exact"
      : "contains"
  ) as MatchMode;
  const enabled = formData.get("enabled") === "true";

  const config = defaultConfig({ attributeKey, matchMode, enabled });
  const { id } = params;

  if (!id || id === "new") {
    const result = await createShipMatchRule(admin, { title, config });
    if (result.errors.length) {
      return { errors: result.errors };
    }
    return redirect("/app");
  }

  const gid = id.startsWith("gid://")
    ? id
    : `gid://shopify/DeliveryCustomization/${id}`;
  const result = await updateShipMatchRule(admin, gid, { title, config });
  if (result.errors.length) {
    return { errors: result.errors };
  }
  return redirect("/app");
};

export default function RuleEditor() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const busy = navigation.state === "submitting";

  const [title, setTitle] = useState(data.title);
  const [attributeKey, setAttributeKey] = useState(data.config.attributeKey);
  const [matchMode, setMatchMode] = useState<MatchMode>(data.config.matchMode);
  const [enabled, setEnabled] = useState(data.config.enabled);

  useEffect(() => {
    setTitle(data.title);
    setAttributeKey(data.config.attributeKey);
    setMatchMode(data.config.matchMode);
    setEnabled(data.config.enabled);
  }, [data]);

  const errors =
    actionData && "errors" in actionData ? actionData.errors || [] : [];

  const saveRule = () => {
    submit(
      {
        title,
        attributeKey,
        matchMode,
        enabled: enabled ? "true" : "false",
      },
      { method: "post" },
    );
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    saveRule();
  };

  return (
    <form onSubmit={onSubmit}>
      <s-page heading={data.isNew ? "Create shipping filter rule" : "Edit rule"}>
        <s-link slot="breadcrumb-actions" href="/app">
          Dashboard
        </s-link>
        <s-button
          slot="primary-action"
          variant="primary"
          disabled={busy}
          onClick={saveRule}
        >
          {busy ? "Saving…" : data.isNew ? "Save rule" : "Save changes"}
        </s-button>

        {errors.length > 0 ? (
          <s-banner tone="critical" heading="Could not save rule">
            <ul>
              {errors.map((error: { message: string }, index: number) => (
                <li key={index}>{error.message}</li>
              ))}
            </ul>
          </s-banner>
        ) : null}

        <s-section heading="Rule settings">
          <s-stack direction="block" gap="base">
            <s-text-field
              label="Rule name"
              name="title"
              value={title}
              disabled={busy}
              onInput={(event: any) => setTitle(event.currentTarget.value)}
            />

            <s-text-field
              label="Cart attribute key"
              name="attributeKey"
              value={attributeKey}
              details="The cart attribute your storefront writes before checkout (for example Shipping Method)."
              disabled={busy}
              onInput={(event: any) =>
                setAttributeKey(event.currentTarget.value)
              }
            />

            <s-select
              label="Title match mode"
              name="matchMode"
              value={matchMode}
              disabled={busy}
              onChange={(event: any) =>
                setMatchMode(
                  event.currentTarget.value === "exact" ? "exact" : "contains",
                )
              }
            >
              <s-option value="contains">Contains (recommended)</s-option>
              <s-option value="exact">Exact match</s-option>
            </s-select>

            <s-checkbox
              label="Enabled"
              name="enabled"
              checked={enabled}
              disabled={busy}
              onChange={(event: any) =>
                setEnabled(Boolean(event.currentTarget.checked))
              }
            />

            <s-stack direction="inline" gap="base">
              <s-button variant="primary" disabled={busy} onClick={saveRule}>
                {busy ? "Saving…" : data.isNew ? "Save rule" : "Save changes"}
              </s-button>
              <s-button href="/app" variant="tertiary" disabled={busy}>
                Cancel
              </s-button>
            </s-stack>
          </s-stack>
        </s-section>

        <s-section heading="How matching works">
          <s-paragraph>
            At checkout, ShipMatch reads the cart attribute value and compares
            it to each shipping rate title. Non-matching rates are hidden. If
            the attribute is missing or nothing matches, all rates stay visible.
          </s-paragraph>
        </s-section>
      </s-page>
    </form>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
