
/**
 * Payment provider abstraction. "manual" covers cash/transfer/check recorded by staff.
 * "mock" simulates an online gateway for local development. To integrate a Tunisian gateway
 * (Konnect, Flouci, ClicToPay…) implement PaymentProvider and register it in PROVIDERS; the
 * checkout flow (src/app/dashboard/finance) only talks to this interface.
 */
export type CheckoutRequest = { invoiceId: string; amount: number; currency: string; description: string; payerEmail?: string };
export type CheckoutResult = { status: "COMPLETED" | "PENDING" | "FAILED"; providerRef: string; redirectUrl?: string };

export interface PaymentProvider {
  key: string;
  label: string;
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
}

const mockProvider: PaymentProvider = {
  key: "mock",
  label: "Paiement en ligne (démo)",
  async createCheckout(req) {
    // Simulates an instant successful card payment.
    return { status: "COMPLETED", providerRef: `MOCK-${req.invoiceId.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}` };
  },
};

const PROVIDERS: Record<string, PaymentProvider> = { mock: mockProvider };

/** Throws for unknown keys: a typo must never silently select the auto-success mock. */
export function getPaymentProvider(key = process.env.PAYMENT_PROVIDER ?? "mock"): PaymentProvider {
  const provider = PROVIDERS[key];
  if (!provider) throw new Error(`Unknown payment provider "${key}"`);
  return provider;
}
