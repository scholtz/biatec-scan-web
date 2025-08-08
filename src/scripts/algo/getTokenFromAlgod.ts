import { Algodv2 } from "algosdk";
import { AssetParams } from "../../types/algorand";

export const getTokenFromAlgod = async (
  assetId: bigint,
  algod: Algodv2
): Promise<AssetParams | null> => {
  if (typeof window === "undefined") {
    return null; // Ensure this runs only in the browser
  }
  // wait 100 ms to ensure Algod is ready
  await new Promise((resolve) => setTimeout(resolve, 100));
  const token = await algod.getAssetByID(assetId).do();
  if (!token || !token.params) {
    throw new Error(`Token with ID ${assetId} not found`);
  }

  const params: AssetParams = {
    name: token.params.name ?? "Unknown Asset",
    unitName: token.params.unitName ?? "",
    total: Number(token.params.total),
    decimals: token.params.decimals,
  };
  localStorage.setItem(`asset_${assetId.toString()}`, JSON.stringify(params));
  return params;
};
