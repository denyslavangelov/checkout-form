import { describe, it, expect } from "vitest";
import { run } from "./run";

describe("ship-match", () => {
  it("returns no operations when cart attribute is missing", () => {
    const result = run({
      cart: {
        attribute: null,
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
        deliveryGroups: [
          {
            deliveryOptions: [
              { handle: "a", title: "Standard Shipping" },
              { handle: "b", title: "Express Shipping" },
            ],
          },
        ],
      },
      deliveryCustomization: {
        metafield: {
          jsonValue: { matchMode: "contains", enabled: true },
        },
      },
    });

    expect(result.operations).toEqual([
      {
        deliveryOptionHide: { deliveryOptionHandle: "b" },
      },
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
      {
        deliveryOptionHide: { deliveryOptionHandle: "a" },
      },
    ]);
  });

  it("returns no operations when enabled is false", () => {
    const result = run({
      cart: {
        attribute: { value: "Standard" },
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
        metafield: { jsonValue: { enabled: false, matchMode: "exact" } },
      },
    });

    expect(result).toEqual({ operations: [] });
  });
});
