/**
 * GET_POOL_DETAIL Action
 * Provides detailed information about a specific pool
 */

import type { Action, IAgentRuntime, Memory } from "@elizaos/core";
import type { YieldCacheService } from "../services";

export const getPoolDetailAction: Action = {
  name: "GET_POOL_DETAIL",
  description: "Get detailed information about a specific yield pool",
  similes: [
    "tell me more about",
    "details on",
    "info for",
    "pool details",
    "explain this pool",
    "is this pool good",
  ],

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content?.text?.toLowerCase() || "";
    const hasPoolRef = text.match(/(pool|farm|raydium|orca|marinade)/);
    const wantsDetail = text.match(/(detail|more|info|tell|explain|about|is.*good)/);
    return !!(hasPoolRef && wantsDetail);
  },

  handler: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content?.text?.toLowerCase() || "";

    const cacheService = runtime.services?.get("yield-cache") as YieldCacheService;
    if (!cacheService) {
      return {
        text: "Cache service not available. Please try again later.",
        content: { error: "Service unavailable" },
      };
    }

    // Try to extract pool name from message
    const pools = cacheService.getPools();
    let matchedPool = pools.find((p) =>
      text.toLowerCase().includes(p.name.toLowerCase()) ||
      text.toLowerCase().includes(p.protocol.toLowerCase())
    );

    // If no specific match, use the first mentioned pool or highest APY
    if (!matchedPool) {
      const topPools = cacheService.getTopPools(5);
      matchedPool = topPools[0];
    }

    if (!matchedPool) {
      return {
        text: "I couldn't find information about that pool. Try scanning yields first with 'find best yields'.",
        content: { error: "Pool not found" },
      };
    }

    // Calculate impermanent loss risk for AMM pools
    const ilRisk = matchedPool.type === "amm" || matchedPool.type === "clmm"
      ? estimateILRisk(matchedPool)
      : null;

    const prices = cacheService.getPrices();
    const tokenA = matchedPool.tokens[0];
    const tokenB = matchedPool.tokens[1];

    const priceA = tokenA ? prices.get(tokenA) || 0 : 0;
    const priceB = tokenB ? prices.get(tokenB) || 0 : 0;

    return {
      text: `**${matchedPool.name}** on ${matchedPool.protocol}\n\n` +
        `📊 **Metrics:**\n` +
        `• APY: ${matchedPool.apy.toFixed(2)}%\n` +
        `• TVL: $${(matchedPool.tvl / 1000000).toFixed(2)}M\n` +
        `• Risk Level: ${matchedPool.riskLevel.toUpperCase()}\n` +
        (matchedPool.volume24h ? `• 24h Volume: $${(matchedPool.volume24h / 1000000).toFixed(2)}M\n` : "") +
        (matchedPool.feeRate ? `• Fee Rate: ${(matchedPool.feeRate * 100).toFixed(3)}%\n` : "") +
        `\n🔍 **Analysis:**\n` +
        `${matchedPool.description || `This is a ${matchedPool.type.toUpperCase()} pool on ${matchedPool.protocol}.`} ` +
        `${ilRisk ? `\n\n⚠️ **Impermanent Loss Risk:** ${ilRisk}` : ""}\n\n` +
        `Want to compare this with another protocol?`,
      content: {
        pool: matchedPool,
        ilRisk,
        prices: { [tokenA]: priceA, [tokenB]: priceB },
      },
    };
  },

  examples: [
    [
      { user: "{{user1}}", content: { text: "Tell me more about the SOL-USDC pool on Raydium" } },
      {
        user: "YieldScout",
        content: {
          text: "Here are the details for SOL-USDC on Raydium...",
          action: "GET_POOL_DETAIL",
        },
      },
    ],
  ],
};

// Helper to estimate IL risk
function estimateILRisk(pool: { tokens: string[]; apy: number; tvl: number }): string {
  const hasStable = pool.tokens.some((t) =>
    t.toLowerCase().includes("usd") || t.toLowerCase().includes("dai")
  );
  const hasVolatile = pool.tokens.some((t) =>
    t.toLowerCase().includes("sol") ||
    t.toLowerCase().includes("bonk") ||
    t.toLowerCase().includes("eth") ||
    t.toLowerCase().includes("btc")
  );

  if (hasStable && hasVolatile) {
    return "HIGH - This is a volatile/stable pair. If SOL moves significantly vs USDC, you could face 5-15% IL over 3 months.";
  } else if (!hasStable) {
    return "MEDIUM - Both assets are volatile. Correlation may reduce IL, but price divergence still possible.";
  } else {
    return "LOW - Stable pair (e.g., USDC/USDT). Minimal IL risk, but lower APY reflects this.";
  }
}

export default getPoolDetailAction;
