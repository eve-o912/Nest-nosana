/**
 * SCAN_YIELDS Action
 * Fetches and ranks yield opportunities across protocols
 */

import type { Action, IAgentRuntime, Memory, State } from "@elizaos/core";
import type { YieldCacheService } from "../services";

export const scanYieldsAction: Action = {
  name: "SCAN_YIELDS",
  description: "Find and rank the best yield pools across Raydium, Orca, and Marinade",
  similes: [
    "find best yields",
    "show top pools",
    "best APY",
    "highest yield",
    "where should I put my SOL",
    "yield opportunities",
    "farming opportunities",
    "best farms",
  ],

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content?.text?.toLowerCase() || "";
    const keywords = [
      "yield", "apy", "farm", "pool", "stake", "earn", "best",
      "highest", "top", "where", "opportunities", "returns",
    ];
    return keywords.some((k) => text.includes(k));
  },

  handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const text = message.content?.text?.toLowerCase() || "";

    // Get cache service
    const cacheService = runtime.services?.get("yield-cache") as YieldCacheService;
    if (!cacheService) {
      return {
        text: "I'm still warming up my yield data. Please try again in a moment.",
        content: { error: "Cache not ready" },
      };
    }

    // Parse filters from message
    const filters: {
      limit?: number;
      maxRisk?: "low" | "medium" | "high";
      stablecoinOnly?: boolean;
      token?: string;
    } = { limit: 10 };

    // Check for risk preferences
    if (text.includes("safe") || text.includes("low risk")) filters.maxRisk = "low";
    if (text.includes("medium risk")) filters.maxRisk = "medium";

    // Check for stablecoin preference
    if (text.includes("stable") || text.includes("usdc") || text.includes("usdt")) {
      filters.stablecoinOnly = true;
    }

    // Check for specific token
    const tokenMatches = text.match(/(\d+)?\s*(sol|usdc|usdt|bonk|jup|ray|orca|msol|eth|btc)/i);
    if (tokenMatches) {
      filters.token = tokenMatches[2].toUpperCase();
    }

    // Get pools
    let pools = cacheService.getTopPools(filters.limit);

    // Apply filters
    if (filters.maxRisk) {
      pools = pools.filter((p) => {
        const riskOrder = { low: 1, medium: 2, high: 3 };
        return riskOrder[p.riskLevel] <= riskOrder[filters.maxRisk!];
      });
    }

    if (filters.stablecoinOnly) {
      pools = pools.filter((p) =>
        p.tokens.some((t) => t.toLowerCase().includes("usd"))
      );
    }

    if (filters.token) {
      pools = pools.filter((p) =>
        p.tokens.some((t) => t.toLowerCase().includes(filters.token!.toLowerCase()))
      );
    }

    // Build response context for LLM
    const poolsContext = pools.slice(0, 10).map((p, i) => ({
      rank: i + 1,
      name: p.name,
      protocol: p.protocol,
      apy: p.apy.toFixed(2) + "%",
      tvl: "$" + (p.tvl / 1000000).toFixed(2) + "M",
      risk: p.riskLevel,
      type: p.type,
    }));

    const lastUpdate = cacheService.getLastUpdate();
    const updateTime = new Date(lastUpdate).toLocaleTimeString();

    return {
      text: `Here are the top ${poolsContext.length} yield opportunities (updated ${updateTime}):\n\n${
        poolsContext
          .map(
            (p) =>
              `${p.rank}. **${p.name}** on ${p.protocol}\n   APY: ${p.apy} | TVL: ${p.tvl} | Risk: ${p.risk}`
          )
          .join("\n\n")
      }\n\nWould you like details on any specific pool, or a comparison between protocols?`,
      content: {
        pools: poolsContext,
        filters,
        timestamp: lastUpdate,
      },
    };
  },

  examples: [
    [
      { user: "{{user1}}", content: { text: "Find me the best yield pools" } },
      {
        user: "YieldScout",
        content: {
          text: "Here are the top 10 yield opportunities...",
          action: "SCAN_YIELDS",
        },
      },
    ],
    [
      { user: "{{user1}}", content: { text: "What are the safest stablecoin yields?" } },
      {
        user: "YieldScout",
        content: {
          text: "Here are the top low-risk stablecoin pools...",
          action: "SCAN_YIELDS",
        },
      },
    ],
  ],
};

export default scanYieldsAction;
