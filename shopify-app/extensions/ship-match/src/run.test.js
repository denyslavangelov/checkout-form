import { describe, it, expect } from "vitest";
import { run } from "./run";

const rates = [
  { handle: "a", title: "Standard Shipping" },
  { handle: "b", title: "Express Shipping" },
  { handle: "c", title: "Local Pickup" },
];

describe("ship-match", () => {
  it("returns no operations when cart attribute is missing", () => {
    const result = run({
      cart: {
        attribute: null,
        deliveryGroups: [{ deliveryOptions: rates.slice(0, 2) }],
      },
      deliveryCustomization: {
        metafield: {
          jsonValue: { attributeKey: "Shipping Method", matchMode: "contains" },
        },
      },
    });

    expect(result).toEqual({ operations: [] });
  });

  it("hides non-matching rates in contains mode", () => {
    const result = run({
      cart: {
        attribute: { value: "Standard" },
        deliveryGroups: [{ deliveryOptions: rates.slice(0, 2) }],
      },
      deliveryCustomization: {
        metafield: {
          jsonValue: { matchMode: "contains", enabled: true },
        },
      },
    });

    expect(result.operations).toEqual([
      { deliveryOptionHide: { deliveryOptionHandle: "b" } },
    ]);
  });

  it("requires exact title match in exact mode", () => {
    const result = run({
      cart: {
        attribute: { value: "Standard" },
        deliveryGroups: [
          {
            deliveryOptions: [
              { handle: "a", title: "Standard Shipping" },
              { handle: "b", title: "Standard" },
            ],
          },
        ],
      },
      deliveryCustomization: {
        metafield: {
          jsonValue: { matchMode: "exact", enabled: true },
        },
      },
    });

    expect(result.operations).toEqual([
      { deliveryOptionHide: { deliveryOptionHandle: "a" } },
    ]);
  });

  it("matches starts_with mode", () => {
    const result = run({
      cart: {
        attribute: { value: "Express" },
        deliveryGroups: [{ deliveryOptions: rates.slice(0, 2) }],
      },
      deliveryCustomization: {
        metafield: {
          jsonValue: { matchMode: "starts_with", enabled: true },
        },
      },
    });

    expect(result.operations).toEqual([
      { deliveryOptionHide: { deliveryOptionHandle: "a" } },
    ]);
  });

  it("supports attribute_in_title contains direction", () => {
    const result = run({
      cart: {
        attribute: { value: "Standard Shipping Extra" },
        deliveryGroups: [{ deliveryOptions: rates.slice(0, 2) }],
      },
      deliveryCustomization: {
        metafield: {
          jsonValue: {
            matchMode: "contains",
            containsDirection: "attribute_in_title",
            enabled: true,
          },
        },
      },
    });

    // Attribute is longer than titles, so attribute_in_title matches nothing
    // → fail-safe show all.
    expect(result).toEqual({ operations: [] });
  });

  it("keeps always-show titles visible", () => {
    const result = run({
      cart: {
        attribute: { value: "Standard" },
        deliveryGroups: [{ deliveryOptions: rates }],
      },
      deliveryCustomization: {
        metafield: {
          jsonValue: {
            matchMode: "contains",
            alwaysShowTitles: ["Local Pickup"],
            enabled: true,
          },
        },
      },
    });

    expect(result.operations).toEqual([
      { deliveryOptionHide: { deliveryOptionHandle: "b" } },
    ]);
  });

  it("can hide all except always-show when attribute is missing", () => {
    const result = run({
      cart: {
        attribute: null,
        deliveryGroups: [{ deliveryOptions: rates }],
      },
      deliveryCustomization: {
        metafield: {
          jsonValue: {
            missingAttributeBehavior: "keep_always_show",
            alwaysShowTitles: ["Local Pickup"],
            enabled: true,
          },
        },
      },
    });

    expect(result.operations).toEqual([
      { deliveryOptionHide: { deliveryOptionHandle: "a" } },
      { deliveryOptionHide: { deliveryOptionHandle: "b" } },
    ]);
  });

  it("respects case sensitivity", () => {
    const result = run({
      cart: {
        attribute: { value: "standard" },
        deliveryGroups: [
          {
            deliveryOptions: [
              { handle: "a", title: "Standard" },
              { handle: "b", title: "Express" },
            ],
          },
        ],
      },
      deliveryCustomization: {
        metafield: {
          jsonValue: {
            matchMode: "exact",
            caseSensitive: true,
            enabled: true,
          },
        },
      },
    });

    // No exact case-sensitive match → fail-safe show all
    expect(result).toEqual({ operations: [] });
  });

  it("returns no operations when enabled is false", () => {
    const result = run({
      cart: {
        attribute: { value: "Standard" },
        deliveryGroups: [{ deliveryOptions: rates.slice(0, 2) }],
      },
      deliveryCustomization: {
        metafield: { jsonValue: { enabled: false, matchMode: "exact" } },
      },
    });

    expect(result).toEqual({ operations: [] });
  });
});
