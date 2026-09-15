// src/swap/errors.ts - Error helpers shared by the swap engine and the UI.
// Routers throw `SwapRouterError` with a machine-readable code so the UI can
// translate it (swap.routerErrors.<code>) instead of showing English text.

export type SwapRouterErrorCode =
  | "noRoute"
  | "emptyQuote"
  | "belowMinimum"
  | "noTransactions"
  | "amountTooLarge"
  | "apiError"
  | "cancelled";

export class SwapRouterError extends Error {
  constructor(
    public readonly code: SwapRouterErrorCode,
    /** Optional technical detail appended to the translated message. */
    public readonly detail?: string
  ) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "SwapRouterError";
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}
