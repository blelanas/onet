
import { ActionError } from "@api/lib/actions";

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

/**
 * The mock settles every checkout, so in production it is refused unless the deployment is an
 * explicit demo (ALLOW_MOCK_PAYMENTS=true); otherwise invoices could be "paid" for free.
 */
export function mockPaymentsAllowed(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV !== "production" || env.ALLOW_MOCK_PAYMENTS === "true";
}

/** Throws for unknown keys: a typo must never silently select the auto-success mock. */
export function getPaymentProvider(key = process.env.PAYMENT_PROVIDER ?? "mock"): PaymentProvider {
  const provider = PROVIDERS[key];
  if (!provider) throw new Error(`Unknown payment provider "${key}"`);
  if (provider === mockProvider && !mockPaymentsAllowed()) {
    console.error("[payments] mock provider refused in production (set ALLOW_MOCK_PAYMENTS=true for a demo deployment)");
    throw new ActionError("errors.unexpected");
  }
  return provider;
}
