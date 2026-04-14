/**
 * Orca Whirlpools Provider
 * Fetches concentrated liquidity pool data including fee rates, TVL, and estimated APR
 */

import type { Provider } from "@elizaos/core";

export interface OrcaPool {
  id: string;
  name: string;
  tokenA: string;
  tokenB: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  tvl: number;
  apy: number;
  volume24h: number;
  feeRate: number;
  riskLevel: "low" | "medium" | "high";
  concentrated: boolean;
}

// Orca Whirlpools API endpoints
const ORCA_API_BASE = "https://api.orca.so/v1";

export const orcaPoolsProvider: Provider = {
  name: "orca-pools",
  description: "Fetches Orca Whirlpools data including TVL, fees, and estimated APR",

  get: async (_runtime?: unknown, _message?: unknown, _state?: unknown) => {
    try {
      // Fetch whirlpools data
      const response = await fetch(`${ORCA_API_BASE}/whirlpool/list`);
      if (!response.ok) throw new Error(`Orca API error: ${response.status}`);
      const data = await response.json();

      const pools: OrcaPool[] = [];

      if (data?.whirlpools && Array.isArray(data.whirlpools)) {
        for (const pool of data.whirlpools.slice(0, 50)) {
          // Calculate estimated APY from fees and TVL
          const tvl = pool.tvl || 0;
          const fees24h = pool.fees24h || 0;
          const apy = tvl > 0 ? ((fees24h * 365) / tvl) * 100 : 0;

          // Determine risk level
          let riskLevel: "low" | "medium" | "high" = "medium";
          if (tvl < 500000) riskLevel = "high";
          else if (tvl > 5000000 && apy < 30) riskLevel = "low";

          pools.push({
            id: pool.address,
            name: `${pool.tokenA?.symbol || "?"}/${pool.tokenB?.symbol || "?"}`,
            tokenA: pool.tokenA?.mint,
            tokenB: pool.tokenB?.mint,
            tokenASymbol: pool.tokenA?.symbol,
            tokenBSymbol: pool.tokenB?.symbol,
            tvl,
            apy,
            volume24h: pool.volume24h || 0,
            feeRate: pool.feeRate || 0.0005,
            riskLevel,
            concentrated: true,
          });
        }
      }

      return {
        data: pools,
        protocol: "Orca",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Orca provider error:", error);
      return {
        data: [],
        protocol: "Orca",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  },
};

export default orcaPoolsProvider;
