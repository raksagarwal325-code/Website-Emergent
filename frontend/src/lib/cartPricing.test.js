import { isItemOnRequest, computeCartTotals } from "./cartPricing";

describe("isItemOnRequest", () => {
  test("returns true for missing / null / undefined price", () => {
    expect(isItemOnRequest({ price: null, quantity: 1 })).toBe(true);
    expect(isItemOnRequest({ price: undefined, quantity: 1 })).toBe(true);
    expect(isItemOnRequest({ quantity: 1 })).toBe(true);
  });

  test("returns true for zero and negative prices", () => {
    expect(isItemOnRequest({ price: 0, quantity: 1 })).toBe(true);
    expect(isItemOnRequest({ price: -50, quantity: 1 })).toBe(true);
  });

  test("returns true for non-numeric prices", () => {
    expect(isItemOnRequest({ price: "abc", quantity: 1 })).toBe(true);
    expect(isItemOnRequest({ price: NaN, quantity: 1 })).toBe(true);
  });

  test("returns true when product is explicitly on_request even with a positive price", () => {
    expect(isItemOnRequest({ price: 1000, price_display: "on_request", quantity: 1 })).toBe(true);
  });

  test("returns false for a genuine positive numeric price", () => {
    expect(isItemOnRequest({ price: 1500, quantity: 1 })).toBe(false);
    expect(isItemOnRequest({ price: "2500", quantity: 1 })).toBe(false);
    expect(isItemOnRequest({ price: 999.5, quantity: 2 })).toBe(false);
  });

  test("returns true for null / undefined item", () => {
    expect(isItemOnRequest(null)).toBe(true);
    expect(isItemOnRequest(undefined)).toBe(true);
  });
});

describe("computeCartTotals — empty basket", () => {
  test("empty cart has no priced/on-request items and zero total", () => {
    const t = computeCartTotals([]);
    expect(t.cartTotal).toBe(0);
    expect(t.hasPricedItems).toBe(false);
    expect(t.hasOnRequestItems).toBe(false);
    expect(t.pricedItems).toEqual([]);
    expect(t.onRequestItems).toEqual([]);
  });
});

describe("computeCartTotals — all priced items", () => {
  test("sums quantity × price across positive-priced items", () => {
    const cart = [
      { product_id: "a", price: 1500, quantity: 2 },
      { product_id: "b", price: 800, quantity: 1 },
    ];
    const t = computeCartTotals(cart);
    expect(t.cartTotal).toBe(3800);
    expect(t.hasPricedItems).toBe(true);
    expect(t.hasOnRequestItems).toBe(false);
  });
});

describe("computeCartTotals — all price-on-request items", () => {
  test("cart of only zero-price items: total = 0 and hasPricedItems is false", () => {
    const cart = [
      { product_id: "a", price: 0, quantity: 1 },
      { product_id: "b", price: 0, quantity: 3 },
    ];
    const t = computeCartTotals(cart);
    expect(t.cartTotal).toBe(0);
    expect(t.hasPricedItems).toBe(false);
    expect(t.hasOnRequestItems).toBe(true);
    expect(t.onRequestItems).toHaveLength(2);
  });

  test("cart of only missing-price items behaves the same", () => {
    const cart = [
      { product_id: "a", price: null, quantity: 1 },
      { product_id: "b", quantity: 2 }, // no price key at all
    ];
    const t = computeCartTotals(cart);
    expect(t.cartTotal).toBe(0);
    expect(t.hasPricedItems).toBe(false);
    expect(t.hasOnRequestItems).toBe(true);
  });

  test("cart of price_display=on_request (regardless of stored price) is all-on-request", () => {
    const cart = [
      { product_id: "a", price: 999, price_display: "on_request", quantity: 1 },
    ];
    const t = computeCartTotals(cart);
    expect(t.cartTotal).toBe(0);
    expect(t.hasPricedItems).toBe(false);
    expect(t.hasOnRequestItems).toBe(true);
  });
});

describe("computeCartTotals — mixed basket", () => {
  const cart = [
    { product_id: "priced-1", price: 2500, quantity: 2 },        // 5000
    { product_id: "on-req-1", price: 0, quantity: 1 },           // excluded
    { product_id: "priced-2", price: 1200, quantity: 1 },        // 1200
    { product_id: "on-req-2", price: null, quantity: 3 },        // excluded
    { product_id: "on-req-3", price: 500, price_display: "on_request", quantity: 1 }, // excluded
  ];

  test("total sums ONLY the positive-priced items", () => {
    const t = computeCartTotals(cart);
    expect(t.cartTotal).toBe(6200);
  });

  test("both flags true so UI can render 'Some products are priced on request.'", () => {
    const t = computeCartTotals(cart);
    expect(t.hasPricedItems).toBe(true);
    expect(t.hasOnRequestItems).toBe(true);
  });

  test("pricedItems and onRequestItems partition the cart", () => {
    const t = computeCartTotals(cart);
    expect(t.pricedItems.map((i) => i.product_id)).toEqual(["priced-1", "priced-2"]);
    expect(t.onRequestItems.map((i) => i.product_id)).toEqual(["on-req-1", "on-req-2", "on-req-3"]);
  });
});

describe("computeCartTotals — regression: quantity edge cases", () => {
  test("missing quantity is treated as 0, not NaN", () => {
    const t = computeCartTotals([{ product_id: "a", price: 1000 }]);
    expect(t.cartTotal).toBe(0);
    expect(Number.isNaN(t.cartTotal)).toBe(false);
  });

  test("large quantity multiplied correctly", () => {
    const t = computeCartTotals([{ product_id: "a", price: 250, quantity: 40 }]);
    expect(t.cartTotal).toBe(10000);
  });
});
