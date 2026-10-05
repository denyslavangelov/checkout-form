// @ts-check

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").CartDeliveryOptionsTransformRunResult} CartDeliveryOptionsTransformRunResult
 * @typedef {import("../generated/api").Operation} Operation
 */

/**
 * @typedef {"exact" | "contains" | "starts_with"} MatchMode
 * @typedef {"either" | "attribute_in_title" | "title_in_attribute"} ContainsDirection
 * @typedef {"show_all" | "keep_always_show"} MissingAttributeBehavior
 *
 * @typedef {{
 *   attributeKey?: string,
 *   matchMode?: MatchMode,
 *   containsDirection?: ContainsDirection,
 *   caseSensitive?: boolean,
 *   alwaysShowTitles?: string[],
 *   missingAttributeBehavior?: MissingAttributeBehavior,
 *   enabled?: boolean
 * }} Configuration
 */

/** @type {CartDeliveryOptionsTransformRunResult} */
const NO_CHANGES = { operations: [] };

/**
 * @param {string | null | undefined} value
 * @param {boolean} caseSensitive
 */
function normalize(value, caseSensitive) {
  const cleaned = (value || "").replace(/\s+/g, " ").trim();
  return caseSensitive ? cleaned : cleaned.toLowerCase();
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function parseTitleList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

/**
 * @param {string} optionTitle
 * @param {string} selectedTitle
 * @param {MatchMode} matchMode
 * @param {ContainsDirection} containsDirection
 * @param {boolean} caseSensitive
 */
function titlesMatch(
  optionTitle,
  selectedTitle,
  matchMode,
  containsDirection,
  caseSensitive,
) {
  const option = normalize(optionTitle, caseSensitive);
  const selected = normalize(selectedTitle, caseSensitive);
  if (!option || !selected) return false;

  if (matchMode === "exact") {
    return option === selected;
  }

  if (matchMode === "starts_with") {
    return option.startsWith(selected) || selected.startsWith(option);
  }

  // contains
  if (containsDirection === "attribute_in_title") {
    return option.includes(selected);
  }
  if (containsDirection === "title_in_attribute") {
    return selected.includes(option);
  }

  return (
    option === selected ||
    option.includes(selected) ||
    selected.includes(option)
  );
}

/**
 * @param {string} optionTitle
 * @param {string[]} alwaysShowTitles
 * @param {boolean} caseSensitive
 */
function isAlwaysShown(optionTitle, alwaysShowTitles, caseSensitive) {
  const option = normalize(optionTitle, caseSensitive);
  if (!option) return false;
  return alwaysShowTitles.some(
    (title) => normalize(title, caseSensitive) === option,
  );
}

/**
 * Hide delivery options that do not match the cart attribute value.
 *
 * @param {RunInput} input
 * @returns {CartDeliveryOptionsTransformRunResult}
 */
export function run(input) {
  /** @type {Configuration} */
  let configuration = {};
  try {
    configuration =
      /** @type {Configuration} */ (
        input?.deliveryCustomization?.metafield?.jsonValue
      ) || {};
  } catch {
    configuration = {};
  }

  if (configuration.enabled === false) {
    return NO_CHANGES;
  }

  /** @type {MatchMode} */
  const matchMode =
    configuration.matchMode === "exact" ||
    configuration.matchMode === "starts_with"
      ? configuration.matchMode
      : "contains";
  /** @type {ContainsDirection} */
  const containsDirection =
    configuration.containsDirection === "attribute_in_title" ||
    configuration.containsDirection === "title_in_attribute"
      ? configuration.containsDirection
      : "either";
  const caseSensitive = Boolean(configuration.caseSensitive);
  const alwaysShowTitles = parseTitleList(configuration.alwaysShowTitles);
  /** @type {MissingAttributeBehavior} */
  const missingAttributeBehavior =
    configuration.missingAttributeBehavior === "keep_always_show"
      ? "keep_always_show"
      : "show_all";

  const selectedTitle = input.cart.attribute?.value?.trim();

  const options = input.cart.deliveryGroups.flatMap(
    (group) => group.deliveryOptions || [],
  );

  if (options.length === 0) {
    return NO_CHANGES;
  }

  /**
   * @param {(option: { handle: any, title?: string | null }) => boolean} keepPredicate
   * @returns {CartDeliveryOptionsTransformRunResult}
   */
  function hideUnless(keepPredicate) {
    /** @type {Operation[]} */
    const operations = options
      .filter((option) => !keepPredicate(option))
      .map((option) => ({
        deliveryOptionHide: {
          deliveryOptionHandle: option.handle,
        },
      }));
    return { operations };
  }

  if (!selectedTitle) {
    if (missingAttributeBehavior === "keep_always_show") {
      if (alwaysShowTitles.length === 0) {
        return NO_CHANGES;
      }
      return hideUnless((option) =>
        isAlwaysShown(option.title, alwaysShowTitles, caseSensitive),
      );
    }
    return NO_CHANGES;
  }

  const matching = options.filter(
    (option) =>
      isAlwaysShown(option.title, alwaysShowTitles, caseSensitive) ||
      titlesMatch(
        option.title,
        selectedTitle,
        matchMode,
        containsDirection,
        caseSensitive,
      ),
  );

  // Never hide every rate — leave Shopify defaults if nothing matches.
  if (matching.length === 0) {
    return NO_CHANGES;
  }

  const matchingHandles = new Set(matching.map((option) => option.handle));
  return hideUnless((option) => matchingHandles.has(option.handle));
}
