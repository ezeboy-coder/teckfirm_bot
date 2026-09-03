export class PaystackError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "PaystackError";
  }
}

export class PaystackNotConfiguredError extends PaystackError {
  constructor() {
    super(
      "Paystack is not configured. Set PAYSTACK_SECRET_KEY to accept payments.",
      "PAYSTACK_NOT_CONFIGURED",
    );
    this.name = "PaystackNotConfiguredError";
  }
}
