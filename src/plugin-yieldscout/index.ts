/**
 * plugin-yieldscout
 * ElizaOS v2 plugin for Solana DeFi yield analysis
 * 
 * Fetches real-time yield data from:
 * - Raydium (pools, farms)
 * - Orca (whirlpools)
 * - Marinade (mSOL staking)
 * - Jupiter (token prices for IL calculations)
 */

import type { Plugin, IAgentRuntime } from "@elizaos/core";
import {
  raydiumPoolsProvider,
  orcaPoolsProvider,
  marinadeApyProvider,
  jupiterPriceProvider,
  type UnifiedPool,
} from "./providers";
import { YieldCacheService } from "./services";
import {
  scanYieldsAction,
  getPoolDetailAction,
  explainILRiskAction,
  compareProtocolsAction,
} from "./actions";

// Adapter functions to convert provider data to UnifiedPool format
async function fetchRaydiumPools(): Promise<UnifiedPool[]> {
  const result = await raydiumPoolsProvider.get();
  if (!result || typeof result !== "object" || !("data" in result)) return [];
  const data = (result as { data: unknown }).data;
  if (!Array.isArray(data)) return [];

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    protocol: "Raydium",
    type: "amm",
    tvl: p.tvl,
    apy: p.apy,
    volume24h: p.volume24h,
    feeRate: p.feeRate,
    riskLevel: p.riskLevel,
    tokens: [p.baseSymbol, p.quoteSymbol].filter(Boolean),
    concentrated: false,
  }));
}

async function fetchOrcaPools(): Promise<UnifiedPool[]> {
  const result = await orcaPoolsProvider.get();
  if (!result || typeof result !== "object" || !("data" in result)) return [];
  const data = (result as { data: unknown }).data;
  if (!Array.isArray(data)) return [];

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    protocol: "Orca",
    type: "clmm",
    tvl: p.tvl,
    apy: p.apy,
    volume24h: p.volume24h,
    feeRate: p.feeRate,
    riskLevel: p.riskLevel,
    tokens: [p.tokenASymbol, p.tokenBSymbol].filter(Boolean),
    concentrated: true,
  }));
}

async function fetchMarinadePools(): Promise<UnifiedPool[]> {
  const result = await marinadeApyProvider.get();
  if (!result || typeof result !== "object" || !("data" in result)) return [];
  const data = (result as { data: unknown }).data;
  if (!Array.isArray(data)) return [];

  return data.map((p) => ({
    id: p.id,
    name: p.name,
    protocol: "Marinade",
    type: "staking",
    tvl: p.tvl,
    apy: p.apy,
    riskLevel: "low",
    tokens: [p.token].filter(Boolean),
    description: p.description,
  }));
}

async function fetchJupiterPrices(): Promise<Map<string, number>> {
  const result = await jupiterPriceProvider.get();
  const prices = new Map<string, number>();

  if (!result || typeof result !== "object" || !("data" in result)) return prices;
  const data = (result as { data: unknown }).data;
  if (!Array.isArray(data)) return prices;

  for (const price of data) {
    if (price.symbol && price.priceUsd) {
      prices.set(price.symbol, price.priceUsd);
    }
  }

  return prices;
}

// Create cache service instance
let cacheService: YieldCacheService | null = null;

export const yieldScoutPlugin: Plugin = {
  name: "plugin-yieldscout",
  description: "Solana DeFi yield analysis - Raydium, Orca, Marinade, Jupiter",

  providers: [
    raydiumPoolsProvider,
    orcaPoolsProvider,
    marinadeApyProvider,
    jupiterPriceProvider,
  ],

  actions: [
    scanYieldsAction,
    getPoolDetailAction,
    explainILRiskAction,
    compareProtocolsAction,
  ],

  evaluators: [],

  // Initialize cache service when plugin loads
  async init(runtime: IAgentRuntime): Promise<void> {
    console.log("[YieldScout] Initializing plugin...");

    cacheService = new YieldCacheService(
      fetchRaydiumPools,
      fetchOrcaPools,
      fetchMarinadePools,
      fetchJupiterPrices
    );

    // Register as a service so actions can access it
    (runtime as unknown as { services: Map<string, unknown> }).services?.set(
      "yield-cache",
      cacheService
    );

    await cacheService.initialize(runtime);
    console.log("[YieldScout] Plugin initialized with cache service");
  },

  // Clean up on shutdown
  async stop(_runtime: IAgentRuntime): Promise<void> {
    if (cacheService) {
      await cacheService.stop();
      cacheService = null;
    }
    console.log("[YieldScout] Plugin stopped");
  },
};

// Export for direct use
export { YieldCacheService } from "./services";
export * from "./providers";
export * from "./actions";

export default yieldScoutPlugin;
