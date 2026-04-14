/**
 * Raydium Pool Data Provider
 * Fetches pools, APY, TVL, volume from Raydium v3 API
 */

import type { Provider } from "@elizaos/core";

export interface RaydiumPool {
  id: string;
  name: string;
  baseMint: string;
  quoteMint: string;
  baseSymbol: string;
  quoteSymbol: string;
  tvl: number;
  apy: number;
  volume24h: number;
  feeRate: number;
  riskLevel: "low" | "medium" | "high";
}

const RAYDIUM_API_BASE = "https://api-v3.raydium.io";

export const raydiumPoolsProvider: Provider = {
  name: "raydium-pools",
  description: "Fetches Raydium liquidity pool data including APY, TVL, and volume",

  get: async (_runtime?: unknown, _message?: unknown, _state?: unknown) => {
    try {
      // Fetch pools list
      const poolsRes = await fetch(`${RAYDIUM_API_BASE}/pools/info/list`);
      if (!poolsRes.ok) throw new Error(`Raydium pools API error: ${poolsRes.status}`);
      const poolsData = await poolsRes.json();

      // Fetch farm info for APY data
      const farmRes = await fetch(`${RAYDIUM_API_BASE}/main/farm/info`);
      if (!farmRes.ok) throw new Error(`Raydium farm API error: ${farmRes.status}`);
      const farmData = await farmRes.json();

      // Process and merge data
      const pools: RaydiumPool[] = [];

      if (poolsData?.data?.data && Array.isArray(poolsData.data.data)) {
        for (const pool of poolsData.data.data.slice(0, 50)) {
          // Find matching farm for APY
          const farm = farmData?.data?.find((f: { poolId?: string }) => f.poolId === pool.id);
          const apy = farm?.apy || pool.apr24h || 0;

          // Determine risk level based on factors
          let riskLevel: "low" | "medium" | "high" = "medium";
          if (pool.tvl < 100000) riskLevel = "high";
          else if (pool.tvl > 10000000 && apy < 50) riskLevel = "low";

          pools.push({
            id: pool.id,
            name: `${pool.mintA?.symbol || "?"}/${pool.mintB?.symbol || "?"}`,
            baseMint: pool.mintA?.address,
            quoteMint: pool.mintB?.address,
            baseSymbol: pool.mintA?.symbol,
            quoteSymbol: pool.mintB?.symbol,
            tvl: pool.tvl || 0,
            apy: apy * 100, // Convert to percentage
            volume24h: pool.volume24h || 0,
            feeRate: pool.feeRate || 0.0025,
            riskLevel,
          });
        }
      }

      return {
        data: pools,
        protocol: "Raydium",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Raydium provider error:", error);
      return {
        data: [],
        protocol: "Raydium",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  },
};

export default raydiumPoolsProvider;
