/**
 * COMPARE_PROTOCOLS Action
 * Compares yield opportunities across Raydium, Orca, and Marinade
 */

import type { Action, IAgentRuntime, Memory } from "@elizaos/core";
import type { YieldCacheService } from "../services";
import type { UnifiedPool } from "../providers";

export const compareProtocolsAction: Action = {
  name: "COMPARE_PROTOCOLS",
  description: "Compare yield protocols (Raydium vs Orca vs Marinade)",
  similes: [
    "compare",
    "vs",
    "versus",
    "which is better",
    "raydium or orca",
    "best protocol",
    "should i use",
  ],

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content?.text?.toLowerCase() || "";
    const hasProtocol = text.includes("raydium") ||
                        text.includes("orca") ||
                        text.includes("marinade") ||
                        text.includes("protocol");
    const hasCompare = text.includes("compare") ||
                       text.includes("vs") ||
                       text.includes("versus") ||
                       text.includes("or") ||
                       text.includes("better") ||
                       text.includes("which");
    return hasProtocol && hasCompare;
  },

  handler: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content?.text?.toLowerCase() || "";

    const cacheService = runtime.services?.get("yield-cache") as YieldCacheService;
    if (!cacheService) {
      return {
        text: "Data service unavailable. Please try again later.",
        content: { error: "Service unavailable" },
      };
    }

    const allPools = cacheService.getPools();

    // Extract token pair from message
    let tokenFilter: string | null = null;
    const tokenMatch = text.match(/(sol|usdc|usdt|bonk|jup|ray|orca|msol|eth|btc)/i);
    if (tokenMatch) {
      tokenFilter = tokenMatch[1].toUpperCase();
    }

    // Aggregate by protocol
    const protocolStats: Record<string, {
      pools: UnifiedPool[];
      count: number;
      avgApy: number;
      maxApy: number;
      totalTvl: number;
      avgRisk: number;
    }> = {
      Raydium: { pools: [], count: 0, avgApy: 0, maxApy: 0, totalTvl: 0, avgRisk: 0 },
      Orca: { pools: [], count: 0, avgApy: 0, maxApy: 0, totalTvl: 0, avgRisk: 0 },
      Marinade: { pools: [], count: 0, avgApy: 0, maxApy: 0, totalTvl: 0, avgRisk: 0 },
    };

    for (const pool of allPools) {
      // Filter by token if specified
      if (tokenFilter && !pool.tokens.some((t) => t.toUpperCase().includes(tokenFilter!))) {
        continue;
      }

      const stats = protocolStats[pool.protocol];
      if (stats) {
        stats.pools.push(pool);
        stats.count++;
        stats.totalTvl += pool.tvl;
        stats.maxApy = Math.max(stats.maxApy, pool.apy);
      }
    }

    // Calculate averages
    for (const [protocol, stats] of Object.entries(protocolStats)) {
      if (stats.count > 0) {
        stats.avgApy = stats.pools.reduce((sum, p) => sum + p.apy, 0) / stats.count;
        const riskValues = { low: 1, medium: 2, high: 3 };
        stats.avgRisk = stats.pools.reduce((sum, p) => sum + riskValues[p.riskLevel], 0) / stats.count;
      }
    }

    // Find best pool per protocol
    const bestByProtocol: Record<string, UnifiedPool | null> = {
      Raydium: protocolStats.Raydium.pools.sort((a, b) => b.apy - a.apy)[0] || null,
      Orca: protocolStats.Orca.pools.sort((a, b) => b.apy - a.apy)[0] || null,
      Marinade: protocolStats.Marinade.pools.sort((a, b) => b.apy - a.apy)[0] || null,
    };

    const tokenContext = tokenFilter ? ` for ${tokenFilter}` : "";

    return {
      text: `**Protocol Comparison${tokenContext}**\n\n` +
        `📊 **Overview:**\n` +
        Object.entries(protocolStats)
          .filter(([_, s]) => s.count > 0)
          .map(([name, s]) =>
            `**${name}:** ${s.count} pools | Avg APY: ${s.avgApy.toFixed(1)}% | TVL: $${(s.totalTvl / 1000000).toFixed(1)}M`
          )
          .join("\n") +
        `\n\n🏆 **Top Opportunities by Protocol:**\n` +
        Object.entries(bestByProtocol)
          .filter(([_, p]) => p !== null)
          .map(([name, p]) =>
            `**${name}:** ${p!.name} - ${p!.apy.toFixed(1)}% APY (${p!.riskLevel} risk)`
          )
          .join("\n") +
        `\n\n💡 **Recommendations:**\n` +
        `${getProtocolRecommendation(protocolStats)}`,
      content: {
        protocolStats,
        bestByProtocol,
        tokenFilter,
      },
    };
  },

  examples: [
    [
      { user: "{{user1}}", content: { text: "Compare Raydium vs Orca for SOL/USDC" } },
      {
        user: "YieldScout",
        content: {
          text: "Here's the comparison between Raydium and Orca...",
          action: "COMPARE_PROTOCOLS",
        },
      },
    ],
    [
      { user: "{{user1}}", content: { text: "Which protocol is best for staking?" } },
      {
        user: "YieldScout",
        content: {
          text: "For pure staking, Marinade is purpose-built...",
          action: "COMPARE_PROTOCOLS",
        },
      },
    ],
  ],
};

function getProtocolRecommendation(stats: Record<string, { count: number; avgRisk: number; avgApy: number }>): string {
  const protocols = Object.entries(stats).filter(([_, s]) => s.count > 0);

  if (protocols.length === 0) return "No data available for comparison.";

  // Find lowest risk
  const lowestRisk = protocols.reduce((min, [name, s]) =>
    s.avgRisk < min.avgRisk ? { name, ...s } : min
  , { name: "", avgRisk: Infinity, avgApy: 0 });

  // Find highest APY
  const highestApy = protocols.reduce((max, [name, s]) =>
    s.avgApy > max.avgApy ? { name, ...s } : max
  , { name: "", avgRisk: 0, avgApy: 0 });

  if (lowestRisk.name === highestApy.name) {
    return `**${lowestRisk.name}** offers the best balance of high APY and manageable risk.`;
  }

  return `For **safety**: Choose ${lowestRisk.name} (lowest average risk).\n` +
         `For **yield**: Choose ${highestApy.name} (highest average APY at ${highestApy.avgApy.toFixed(1)}%).`;
}

export default compareProtocolsAction;
