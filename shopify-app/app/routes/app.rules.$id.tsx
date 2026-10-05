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
  type ContainsDirection,
  type MatchMode,
  type MissingAttributeBehavior,
} from "../services/ship-match";
import {
  createShipMatchRule,
  getShipMatchRule,
  updateShipMatchRule,
} from "../services/ship-match.server";

function parseMatchMode(value: string): MatchMode {
  if (value === "exact" || value === "starts_with") return value;
  return "contains";
}

function parseContainsDirection(value: string): ContainsDirection {
  if (
    value === "attribute_in_title" ||
    value === "title_in_attribute" ||
    value === "either"
  ) {
    return value;
  }
  return "either";
}

function parseMissingBehavior(value: string): MissingAttributeBehavior {
  return value === "keep_always_show" ? "keep_always_show" : "show_all";
}

function titlesToText(titles: string[]) {
  return titles.join("\n");
}

function textToTitles(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

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
  const matchMode = parseMatchMode(String(formData.get("matchMode") || ""));
  const containsDirection = parseContainsDirection(
    String(formData.get("containsDirection") || ""),
  );
  const caseSensitive = formData.get("caseSensitive") === "true";
  const alwaysShowTitles = textToTitles(
    String(formData.get("alwaysShowTitles") || ""),
  );
  const missingAttributeBehavior = parseMissingBehavior(
    String(formData.get("missingAttributeBehavior") || ""),
  );
  const enabled = formData.get("enabled") === "true";

  const config = defaultConfig({
    attributeKey,
    matchMode,
    containsDirection,
    caseSensitive,
    alwaysShowTitles,
    missingAttributeBehavior,
    enabled,
  });
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
  const [containsDirection, setContainsDirection] = useState<ContainsDirection>(
    data.config.containsDirection,
  );
  const [caseSensitive, setCaseSensitive] = useState(
    data.config.caseSensitive,
  );
  const [alwaysShowTitles, setAlwaysShowTitles] = useState(
    titlesToText(data.config.alwaysShowTitles),
  );
  const [missingAttributeBehavior, setMissingAttributeBehavior] =
    useState<MissingAttributeBehavior>(data.config.missingAttributeBehavior);
  const [enabled, setEnabled] = useState(data.config.enabled);

  useEffect(() => {
    setTitle(data.title);
    setAttributeKey(data.config.attributeKey);
    setMatchMode(data.config.matchMode);
    setContainsDirection(data.config.containsDirection);
    setCaseSensitive(data.config.caseSensitive);
    setAlwaysShowTitles(titlesToText(data.config.alwaysShowTitles));
    setMissingAttributeBehavior(data.config.missingAttributeBehavior);
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
        containsDirection,
        caseSensitive: caseSensitive ? "true" : "false",
        alwaysShowTitles,
        missingAttributeBehavior,
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

        <s-section heading="Basics">
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

            <s-checkbox
              label="Rule enabled"
              name="enabled"
              checked={enabled}
              disabled={busy}
              onChange={(event: any) =>
                setEnabled(Boolean(event.currentTarget.checked))
              }
            />
          </s-stack>
        </s-section>

        <s-section heading="Matching">
          <s-stack direction="block" gap="base">
            <s-select
              label="Title match mode"
              name="matchMode"
              value={matchMode}
              disabled={busy}
              onChange={(event: any) =>
                setMatchMode(parseMatchMode(event.currentTarget.value))
              }
            >
              <s-option value="contains">Contains (recommended)</s-option>
              <s-option value="starts_with">Starts with</s-option>
              <s-option value="exact">Exact match</s-option>
            </s-select>

            {matchMode === "contains" ? (
              <s-select
                label="Contains direction"
                name="containsDirection"
                value={containsDirection}
                details="Controls which string must appear inside the other."
                disabled={busy}
                onChange={(event: any) =>
                  setContainsDirection(
                    parseContainsDirection(event.currentTarget.value),
                  )
                }
              >
                <s-option value="either">
                  Either way (attribute ↔ title)
                </s-option>
                <s-option value="attribute_in_title">
                  Attribute value must appear in rate title
                </s-option>
                <s-option value="title_in_attribute">
                  Rate title must appear in attribute value
                </s-option>
              </s-select>
            ) : null}

            <s-checkbox
              label="Case sensitive matching"
              name="caseSensitive"
              checked={caseSensitive}
              details="Off by default — Office Pickup matches office pickup."
              disabled={busy}
              onChange={(event: any) =>
                setCaseSensitive(Boolean(event.currentTarget.checked))
              }
            />
          </s-stack>
        </s-section>

        <s-section heading="Exceptions">
          <s-stack direction="block" gap="base">
            <s-text-area
              label="Always show these rate titles"
              name="alwaysShowTitles"
              value={alwaysShowTitles}
              rows={4}
              details="One title per line (or comma-separated). These rates are never hidden — useful for Local Pickup."
              disabled={busy}
              onInput={(event: any) =>
                setAlwaysShowTitles(event.currentTarget.value)
              }
            />

            <s-select
              label="When cart attribute is missing"
              name="missingAttributeBehavior"
              value={missingAttributeBehavior}
              disabled={busy}
              onChange={(event: any) =>
                setMissingAttributeBehavior(
                  parseMissingBehavior(event.currentTarget.value),
                )
              }
            >
              <s-option value="show_all">
                Show all rates (safe default)
              </s-option>
              <s-option value="keep_always_show">
                Hide all except always-show titles
              </s-option>
            </s-select>
          </s-stack>
        </s-section>

        <s-section heading="Save">
          <s-stack direction="inline" gap="base">
            <s-button variant="primary" disabled={busy} onClick={saveRule}>
              {busy ? "Saving…" : data.isNew ? "Save rule" : "Save changes"}
            </s-button>
            <s-button href="/app" variant="tertiary" disabled={busy}>
              Cancel
            </s-button>
          </s-stack>
        </s-section>

        <s-section slot="aside" heading="How matching works">
          <s-paragraph>
            At checkout, ShipMatch reads the cart attribute and compares it to
            each shipping rate title. Non-matching rates are hidden. If nothing
            matches, all rates stay visible so checkout is never empty.
          </s-paragraph>
        </s-section>

        <s-section slot="aside" heading="Tips">
          <s-unordered-list>
            <s-list-item>
              Use Contains when storefront values are shorter than rate titles
            </s-list-item>
            <s-list-item>
              Add Local Pickup to always-show if it should stay available
            </s-list-item>
            <s-list-item>
              Attribute values must match the rate titles in Settings → Shipping
              and delivery
            </s-list-item>
          </s-unordered-list>
        </s-section>
      </s-page>
    </form>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
