export function calculateSmmPrice(quantity: number, pricePer1000Amount: number): number {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error('invalid_quantity');
  if (!Number.isInteger(pricePer1000Amount) || pricePer1000Amount < 0) {
    throw new Error('invalid_price');
  }
  return Math.ceil((quantity * pricePer1000Amount) / 1_000);
}

export function isValidSmmQuantity(
  quantity: number,
  minimum: number,
  maximum: number,
  step: number
): boolean {
  return (
    Number.isInteger(quantity) &&
    quantity >= minimum &&
    quantity <= maximum &&
    step > 0 &&
    (quantity - minimum) % step === 0
  );
}
