/**
 * Export all yield data providers
 */

export { raydiumPoolsProvider, type RaydiumPool } from "./raydium";
export { orcaPoolsProvider, type OrcaPool } from "./orca";
export { marinadeApyProvider, type MarinadeStakeInfo } from "./marinade";
export { jupiterPriceProvider, getTokenPrice, type TokenPrice } from "./jupiter";

// Unified pool type for cross-protocol comparison
export interface UnifiedPool {
  id: string;
  name: string;
  protocol: "Raydium" | "Orca" | "Marinade";
  type: "amm" | "clmm" | "staking";
  tvl: number;
  apy: number;
  volume24h?: number;
  feeRate?: number;
  riskLevel: "low" | "medium" | "high";
  tokens: string[];
  description?: string;
  concentrated?: boolean;
}
