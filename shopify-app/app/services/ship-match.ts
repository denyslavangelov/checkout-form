export const FUNCTION_HANDLE = "ship-match";
export const APP_NAME = "ShipMatch";
export const METAFIELD_NAMESPACE = "$app:ship-match";
export const METAFIELD_KEY = "function-configuration";
export const DEFAULT_ATTRIBUTE_KEY = "Shipping Method";

export type MatchMode = "exact" | "contains";

export type ShipMatchConfig = {
  attributeKey: string;
  matchMode: MatchMode;
  enabled: boolean;
};

export function defaultConfig(
  overrides: Partial<ShipMatchConfig> = {},
): ShipMatchConfig {
  return {
    attributeKey: DEFAULT_ATTRIBUTE_KEY,
    matchMode: "contains",
    enabled: true,
    ...overrides,
  };
}

export function configToMetafieldValue(config: ShipMatchConfig) {
  // Top-level keys must include GraphQL input variables (attributeKey).
  return JSON.stringify({
    attributeKey: config.attributeKey,
    matchMode: config.matchMode,
    enabled: config.enabled,
  });
}
