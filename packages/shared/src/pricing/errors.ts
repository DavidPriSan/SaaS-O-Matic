export class PricingInputError extends Error {
  constructor(
    readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = 'PricingInputError';
  }
}
