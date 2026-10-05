export const FUNCTION_HANDLE = "ship-match";
export const APP_NAME = "ShipMatch";
export const METAFIELD_NAMESPACE = "$app:ship-match";
export const METAFIELD_KEY = "function-configuration";
export const DEFAULT_ATTRIBUTE_KEY = "Shipping Method";

export type MatchMode = "exact" | "contains" | "starts_with";
export type ContainsDirection =
  | "either"
  | "attribute_in_title"
  | "title_in_attribute";
export type MissingAttributeBehavior = "show_all" | "keep_always_show";

export type ShipMatchConfig = {
  attributeKey: string;
  matchMode: MatchMode;
  /** How contains matching compares attribute ↔ rate title. Ignored for exact/starts_with. */
  containsDirection: ContainsDirection;
  caseSensitive: boolean;
  /**
   * Rate titles that are never hidden (exact normalized match against the rate title).
   * Useful for Local Pickup / Store Pickup that should always stay available.
   */
  alwaysShowTitles: string[];
  /**
   * When the cart attribute is missing/empty:
   * - show_all: leave all rates (default)
   * - keep_always_show: hide everything except always-show titles (if any)
   */
  missingAttributeBehavior: MissingAttributeBehavior;
  enabled: boolean;
};

function parseMatchMode(value: unknown): MatchMode {
  if (value === "exact" || value === "starts_with") return value;
  return "contains";
}

function parseContainsDirection(value: unknown): ContainsDirection {
  if (
    value === "attribute_in_title" ||
    value === "title_in_attribute" ||
    value === "either"
  ) {
    return value;
  }
  return "either";
}

function parseMissingBehavior(value: unknown): MissingAttributeBehavior {
  return value === "keep_always_show" ? "keep_always_show" : "show_all";
}

function parseTitleList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function defaultConfig(
  overrides: Partial<ShipMatchConfig> = {},
): ShipMatchConfig {
  return {
    attributeKey: DEFAULT_ATTRIBUTE_KEY,
    matchMode: "contains",
    containsDirection: "either",
    caseSensitive: false,
    alwaysShowTitles: [],
    missingAttributeBehavior: "show_all",
    enabled: true,
    ...overrides,
    matchMode: parseMatchMode(overrides.matchMode ?? "contains"),
    containsDirection: parseContainsDirection(
      overrides.containsDirection ?? "either",
    ),
    caseSensitive: Boolean(overrides.caseSensitive),
    alwaysShowTitles: parseTitleList(
      overrides.alwaysShowTitles ?? [],
    ),
    missingAttributeBehavior: parseMissingBehavior(
      overrides.missingAttributeBehavior ?? "show_all",
    ),
    enabled: overrides.enabled !== false,
  };
}

/** Normalize a raw metafield JSON object into a typed config. */
export function configFromRaw(raw: Record<string, unknown> = {}): ShipMatchConfig {
  return defaultConfig({
    attributeKey:
      typeof raw.attributeKey === "string" && raw.attributeKey.trim()
        ? raw.attributeKey.trim()
        : DEFAULT_ATTRIBUTE_KEY,
    matchMode: parseMatchMode(raw.matchMode),
    containsDirection: parseContainsDirection(raw.containsDirection),
    caseSensitive: Boolean(raw.caseSensitive),
    alwaysShowTitles: parseTitleList(raw.alwaysShowTitles),
    missingAttributeBehavior: parseMissingBehavior(
      raw.missingAttributeBehavior,
    ),
    enabled: raw.enabled !== false,
  });
}

export function configToMetafieldValue(config: ShipMatchConfig) {
  // Top-level keys must include GraphQL input variables (attributeKey).
  return JSON.stringify({
    attributeKey: config.attributeKey,
    matchMode: config.matchMode,
    containsDirection: config.containsDirection,
    caseSensitive: config.caseSensitive,
    alwaysShowTitles: config.alwaysShowTitles,
    missingAttributeBehavior: config.missingAttributeBehavior,
    enabled: config.enabled,
  });
}
