// Cart pricing helpers — pure functions so they can be unit-tested without a
// React runtime. A cart line is "price on request" when its stored price is
// missing / zero / non-numeric, OR the product was configured with
// price_display === "on_request".

export const isItemOnRequest = (item) => {
  if (!item) return true;
  if (item.price_display === "on_request") return true;
  const n = Number(item.price);
  return !Number.isFinite(n) || n <= 0;
};

export const computeCartTotals = (cart = []) => {
  const pricedItems = cart.filter((i) => !isItemOnRequest(i));
  const onRequestItems = cart.filter(isItemOnRequest);
  const cartTotal = pricedItems.reduce(
    (s, i) => s + Number(i.price) * Number(i.quantity || 0),
    0,
  );
  return {
    pricedItems,
    onRequestItems,
    cartTotal,
    hasPricedItems: pricedItems.length > 0,
    hasOnRequestItems: onRequestItems.length > 0,
  };
};
