/**
 * YieldCacheService
 * Polls APIs every 5 minutes to keep yield data fresh
 */

import type { IAgentRuntime, Service } from "@elizaos/core";
import type { UnifiedPool } from "../providers";

interface CacheData {
  pools: UnifiedPool[];
  timestamp: string;
  prices: Map<string, number>;
}

export class YieldCacheService implements Service {
  name = "yield-cache";
  description = "Caches yield data and refreshes every 5 minutes";

  private cache: CacheData = {
    pools: [],
    timestamp: new Date(0).toISOString(),
    prices: new Map(),
  };

  private refreshInterval: NodeJS.Timeout | null = null;
  private isRefreshing = false;

  // Provider fetch functions (injected)
  private fetchRaydium: () => Promise<UnifiedPool[]>;
  private fetchOrca: () => Promise<UnifiedPool[]>;
  private fetchMarinade: () => Promise<UnifiedPool[]>;
  private fetchPrices: () => Promise<Map<string, number>>;

  constructor(
    fetchRaydium: () => Promise<UnifiedPool[]>,
    fetchOrca: () => Promise<UnifiedPool[]>,
    fetchMarinade: () => Promise<UnifiedPool[]>,
    fetchPrices: () => Promise<Map<string, number>>
  ) {
    this.fetchRaydium = fetchRaydium;
    this.fetchOrca = fetchOrca;
    this.fetchMarinade = fetchMarinade;
    this.fetchPrices = fetchPrices;
  }

  async initialize(_runtime: IAgentRuntime): Promise<void> {
    // Initial fetch
    await this.refreshCache();

    // Set up 5-minute polling
    this.refreshInterval = setInterval(() => {
      this.refreshCache().catch((err) => {
        console.error("Yield cache refresh failed:", err);
      });
    }, 5 * 60 * 1000); // 5 minutes
  }

  async stop(): Promise<void> {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private async refreshCache(): Promise<void> {
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    try {
      console.log("[YieldCache] Refreshing yield data...");

      const [raydiumPools, orcaPools, marinadePools, prices] = await Promise.all([
        this.fetchRaydium().catch((e) => {
          console.error("Raydium fetch failed:", e);
          return [];
        }),
        this.fetchOrca().catch((e) => {
          console.error("Orca fetch failed:", e);
          return [];
        }),
        this.fetchMarinade().catch((e) => {
          console.error("Marinade fetch failed:", e);
          return [];
        }),
        this.fetchPrices().catch((e) => {
          console.error("Price fetch failed:", e);
          return new Map();
        }),
      ]);

      const allPools: UnifiedPool[] = [
        ...raydiumPools,
        ...orcaPools,
        ...marinadePools,
      ];

      this.cache = {
        pools: allPools,
        timestamp: new Date().toISOString(),
        prices,
      };

      console.log(`[YieldCache] Cached ${allPools.length} pools from 3 protocols`);
    } finally {
      this.isRefreshing = false;
    }
  }

  getPools(): UnifiedPool[] {
    return this.cache.pools;
  }

  getPrices(): Map<string, number> {
    return this.cache.prices;
  }

  getLastUpdate(): string {
    return this.cache.timestamp;
  }

  // Calculate risk-adjusted APY (Sharpe-like ratio)
  calculateRiskAdjustedApy(pool: UnifiedPool): number {
    const riskMultiplier: Record<string, number> = {
      low: 1.0,
      medium: 0.7,
      high: 0.4,
    };
    return pool.apy * (riskMultiplier[pool.riskLevel] || 0.5);
  }

  // Sort pools by risk-adjusted APY
  getTopPools(limit = 10): UnifiedPool[] {
    const poolsWithScore = this.cache.pools.map((pool) => ({
      ...pool,
      riskAdjustedApy: this.calculateRiskAdjustedApy(pool),
    }));

    return poolsWithScore
      .sort((a, b) => b.riskAdjustedApy - a.riskAdjustedApy)
      .slice(0, limit);
  }

  // Filter pools by criteria
  filterPools(criteria: {
    minApy?: number;
    maxRisk?: "low" | "medium" | "high";
    minTvl?: number;
    tokens?: string[];
    protocol?: "Raydium" | "Orca" | "Marinade";
  }): UnifiedPool[] {
    return this.cache.pools.filter((pool) => {
      if (criteria.minApy && pool.apy < criteria.minApy) return false;
      if (criteria.maxRisk) {
        const riskOrder = { low: 1, medium: 2, high: 3 };
        if (riskOrder[pool.riskLevel] > riskOrder[criteria.maxRisk]) return false;
      }
      if (criteria.minTvl && pool.tvl < criteria.minTvl) return false;
      if (criteria.protocol && pool.protocol !== criteria.protocol) return false;
      if (criteria.tokens) {
        const hasAllTokens = criteria.tokens.every((t) =>
          pool.tokens.some((pt) => pt.toLowerCase().includes(t.toLowerCase()))
        );
        if (!hasAllTokens) return false;
      }
      return true;
    });
  }
}
