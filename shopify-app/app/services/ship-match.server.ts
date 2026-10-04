import {
  DEFAULT_ATTRIBUTE_KEY,
  FUNCTION_HANDLE,
  METAFIELD_KEY,
  METAFIELD_NAMESPACE,
  configToMetafieldValue,
  defaultConfig,
  type ShipMatchConfig,
} from "./ship-match";

export type AdminGraphql = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

export async function listShipMatchRules(admin: AdminGraphql) {
  const response = await admin.graphql(
    `#graphql
      query listShipMatchRules {
        deliveryCustomizations(first: 50) {
          nodes {
            id
            title
            enabled
            metafield(namespace: "$app:ship-match", key: "function-configuration") {
              jsonValue
            }
          }
        }
      }`,
  );
  const json = await response.json();
  const nodes = json.data?.deliveryCustomizations?.nodes || [];

  return nodes.map((node: any) => {
    const raw = node.metafield?.jsonValue || {};
    return {
      id: node.id as string,
      title: node.title as string,
      enabled: Boolean(node.enabled),
      config: defaultConfig({
        attributeKey: raw.attributeKey || DEFAULT_ATTRIBUTE_KEY,
        matchMode: raw.matchMode === "exact" ? "exact" : "contains",
        enabled: raw.enabled !== false,
      }),
    };
  });
}

export async function getShipMatchRule(admin: AdminGraphql, id: string) {
  const response = await admin.graphql(
    `#graphql
      query getShipMatchRule($id: ID!) {
        deliveryCustomization(id: $id) {
          id
          title
          enabled
          metafield(namespace: "$app:ship-match", key: "function-configuration") {
            jsonValue
          }
        }
      }`,
    { variables: { id } },
  );
  const json = await response.json();
  const node = json.data?.deliveryCustomization;
  if (!node) return null;

  const raw = node.metafield?.jsonValue || {};
  return {
    id: node.id as string,
    title: node.title as string,
    enabled: Boolean(node.enabled),
    config: defaultConfig({
      attributeKey: raw.attributeKey || DEFAULT_ATTRIBUTE_KEY,
      matchMode: raw.matchMode === "exact" ? "exact" : "contains",
      enabled: raw.enabled !== false,
    }),
  };
}

export async function createShipMatchRule(
  admin: AdminGraphql,
  input: { title: string; config: ShipMatchConfig },
) {
  const response = await admin.graphql(
    `#graphql
      mutation createShipMatchRule($input: DeliveryCustomizationInput!) {
        deliveryCustomizationCreate(deliveryCustomization: $input) {
          deliveryCustomization { id enabled title }
          userErrors { message field }
        }
      }`,
    {
      variables: {
        input: {
          functionHandle: FUNCTION_HANDLE,
          title: input.title,
          enabled: input.config.enabled,
          metafields: [
            {
              namespace: METAFIELD_NAMESPACE,
              key: METAFIELD_KEY,
              type: "json",
              value: configToMetafieldValue(input.config),
            },
          ],
        },
      },
    },
  );
  const json = await response.json();
  return {
    rule: json.data?.deliveryCustomizationCreate?.deliveryCustomization,
    errors: json.data?.deliveryCustomizationCreate?.userErrors || [],
  };
}

export async function updateShipMatchRule(
  admin: AdminGraphql,
  id: string,
  input: { title: string; config: ShipMatchConfig },
) {
  const response = await admin.graphql(
    `#graphql
      mutation updateShipMatchRule($id: ID!, $input: DeliveryCustomizationInput!) {
        deliveryCustomizationUpdate(id: $id, deliveryCustomization: $input) {
          deliveryCustomization { id enabled title }
          userErrors { message field }
        }
      }`,
    {
      variables: {
        id,
        input: {
          title: input.title,
          enabled: input.config.enabled,
          metafields: [
            {
              namespace: METAFIELD_NAMESPACE,
              key: METAFIELD_KEY,
              type: "json",
              value: configToMetafieldValue(input.config),
            },
          ],
        },
      },
    },
  );
  const json = await response.json();
  return {
    rule: json.data?.deliveryCustomizationUpdate?.deliveryCustomization,
    errors: json.data?.deliveryCustomizationUpdate?.userErrors || [],
  };
}

export async function deleteShipMatchRule(admin: AdminGraphql, id: string) {
  const response = await admin.graphql(
    `#graphql
      mutation deleteShipMatchRule($id: ID!) {
        deliveryCustomizationDelete(id: $id) {
          deletedId
          userErrors { message }
        }
      }`,
    { variables: { id } },
  );
  const json = await response.json();
  return {
    deletedId: json.data?.deliveryCustomizationDelete?.deletedId,
    errors: json.data?.deliveryCustomizationDelete?.userErrors || [],
  };
}
