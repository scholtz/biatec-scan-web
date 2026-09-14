// src/swap/routers/index.ts - The router registry. Adding a new aggregator
// means implementing `SwapRouter` in a sibling module and appending it here;
// the quote orchestration, execution and UI are all driven off this list.
import type { SwapRouter } from "../types";
import { biatecSwapRouter } from "./biatec";
import { folksRouter } from "./folks";
import { haystackRouter } from "./haystack";

export const swapRouters: readonly SwapRouter[] = [
  biatecSwapRouter,
  folksRouter,
  haystackRouter,
];

export function getSwapRouter(id: string): SwapRouter | undefined {
  return swapRouters.find((router) => router.id === id);
}
