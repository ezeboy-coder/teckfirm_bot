export type PaystackInitializeInput = {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl?: string;
  metadata: Record<string, string>;
};

export type PaystackInitializeResult = {
  authorizationUrl: string;
  reference: string;
  accessCode: string;
};

export type PaystackVerifyResult = {
  status: string;
  amount: number;
  currency: string;
  reference: string;
  id: number | null;
  channel: string | null;
  paidAt: string | null;
  gatewayResponse: string | null;
};
