// @ts-check

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").CartDeliveryOptionsTransformRunResult} CartDeliveryOptionsTransformRunResult
 * @typedef {import("../generated/api").Operation} Operation
 */

/**
 * @typedef {{
 *   attributeKey?: string,
 *   matchMode?: "exact" | "contains",
 *   enabled?: boolean
 * }} Configuration
 */

/** @type {CartDeliveryOptionsTransformRunResult} */
const NO_CHANGES = { operations: [] };

/**
 * @param {string | null | undefined} value
 */
function normalize(value) {
  return (value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} optionTitle
 * @param {string} selectedTitle
 * @param {"exact" | "contains"} matchMode
 */
function titlesMatch(optionTitle, selectedTitle, matchMode) {
  const option = normalize(optionTitle);
  const selected = normalize(selectedTitle);
  if (!option || !selected) return false;

  if (matchMode === "exact") {
    return option === selected;
  }

  return (
    option === selected ||
    option.includes(selected) ||
    selected.includes(option)
  );
}

/**
 * Hide delivery options that do not match the cart attribute value.
 *
 * Merchants set a cart attribute (for example from a theme widget or custom
 * storefront). ShipMatch keeps only rates whose titles match that value.
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

  const matchMode =
    configuration.matchMode === "exact" ? "exact" : "contains";
  const selectedTitle = input.cart.attribute?.value?.trim();

  if (!selectedTitle) {
    return NO_CHANGES;
  }

  const options = input.cart.deliveryGroups.flatMap(
    (group) => group.deliveryOptions || [],
  );

  if (options.length === 0) {
    return NO_CHANGES;
  }

  const matching = options.filter((option) =>
    titlesMatch(option.title, selectedTitle, matchMode),
  );

  // Never hide every rate — leave Shopify defaults if nothing matches.
  if (matching.length === 0) {
    return NO_CHANGES;
  }

  const matchingHandles = new Set(matching.map((option) => option.handle));

  /** @type {Operation[]} */
  const operations = options
    .filter((option) => !matchingHandles.has(option.handle))
    .map((option) => ({
      deliveryOptionHide: {
        deliveryOptionHandle: option.handle,
      },
    }));

  return { operations };
}
