import { AssetParams } from "../../types/algorand";

const cache = new Map<string, AssetParams>();
export const getTokenFromLocalStorage = (
  assetId: bigint
): AssetParams | null => {
  if (typeof window === "undefined") {
    return null; // Ensure this runs only in the browser
  }
  if (assetId === 0n) {
    const defaultToken: AssetParams = {
      name: "Algorand",
      unitName: "ALGO",
      total: 10000000000n,
      decimals: 6,
    };
    return defaultToken;
  }
  if (cache.has(assetId.toString())) {
    return cache.get(assetId.toString()) || null;
  }

  const token = localStorage.getItem(`asset_${assetId.toString()}`);
  if (!token) {
    return null; // Token not found in localStorage
  }
  const parsedToken = JSON.parse(token) as AssetParams;
  cache.set(assetId.toString(), parsedToken);
  return parsedToken;
};
