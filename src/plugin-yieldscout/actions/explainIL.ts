/**
 * EXPLAIN_IL_RISK Action
 * Explains impermanent loss risk for a specific pool or general education
 */

import type { Action, IAgentRuntime, Memory } from "@elizaos/core";
import type { YieldCacheService } from "../services";

export const explainILRiskAction: Action = {
  name: "EXPLAIN_IL_RISK",
  description: "Explain impermanent loss risk for liquidity pools",
  similes: [
    "what is impermanent loss",
    "il risk",
    "explain il",
    "is il worth it",
    "impermanent loss calculator",
    "divergence loss",
    "will i lose money",
    "lp risk",
  ],

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = message.content?.text?.toLowerCase() || "";
    return text.includes("impermanent") ||
           text.includes("il risk") ||
           (text.includes("il") && text.includes("loss")) ||
           text.includes("divergence loss") ||
           text.includes("lp risk");
  },

  handler: async (runtime: IAgentRuntime, message: Memory) => {
    const text = message.content?.text?.toLowerCase() || "";

    const cacheService = runtime.services?.get("yield-cache") as YieldCacheService;

    // Check if asking about a specific pool
    const pools = cacheService?.getPools() || [];
    const mentionedPool = pools.find((p) =>
      text.toLowerCase().includes(p.name.toLowerCase())
    );

    if (mentionedPool) {
      // Calculate specific IL scenario
      const apy = mentionedPool.apy;
      const estimatedIL = calculateILEstimate(mentionedPool.tokens);

      const breakEvenDays = estimatedIL > 0
        ? Math.ceil((estimatedIL / apy) * 365)
        : 0;

      return {
        text: `**Impermanent Loss Analysis: ${mentionedPool.name}**\n\n` +
          `📉 **What is IL?**\n` +
          `Impermanent loss occurs when the price ratio of your pooled tokens changes. ` +
          `If one token rises/falls vs the other, you end up with less value than if you'd just held the tokens separately.\n\n` +
          `💰 **For ${mentionedPool.name}:**\n` +
          `• Pool APY: ${apy.toFixed(2)}%\n` +
          `• Estimated 3-month IL: ~${estimatedIL.toFixed(1)}%\n` +
          `• Break-even timeframe: ~${breakEvenDays} days\n\n` +
          `🧮 **Calculation:**\n` +
          `If Token A moves 2x vs Token B, IL ≈ 5.7%.\n` +
          `If Token A moves 3x vs Token B, IL ≈ 13.4%.\n\n` +
          `✅ **Bottom line:** ${apy > estimatedIL * 4
            ? "This APY should comfortably cover IL risk over time."
            : apy > estimatedIL * 2
              ? "This could work if prices don't diverge too much."
              : "High IL risk relative to APY - consider carefully."
          }`,
        content: { pool: mentionedPool, ilEstimate: estimatedIL },
      };
    }

    // General IL education
    return {
      text: `**Understanding Impermanent Loss (IL)**\n\n` +
        `📖 **Definition:**\n` +
        `IL is the temporary loss of funds experienced by liquidity providers when the price of their deposited tokens changes compared to when they deposited them.\n\n` +
        `📊 **How it works:**\n` +
        `1. You deposit equal $ value of Token A and Token B\n` +
        `2. If Token A 2x in price while Token B stays flat:\n` +
        `   - Your position rebalances (you have less Token A, more Token B)\n` +
        `   - IL ≈ 5.7% relative to just holding\n` +
        `3. The "impermanent" part: if prices return to original ratio, IL disappears\n\n` +
        `⚖️ **Risk Levels by Pool Type:**\n` +
        `• Stable pairs (USDC/USDT): ~0% IL risk, but low APY\n` +
        `• Correlated pairs (SOL/mSOL): Low IL risk, moderate APY\n` +
        `• Volatile/Stable (SOL/USDC): High IL risk, high APY\n` +
        `• Volatile/Volatile (SOL/BONK): Medium-High IL, highest APY\n\n` +
        `💡 **Ask me about a specific pool** (e.g., "What is IL risk for SOL-USDC on Raydium?") for detailed calculations.`,
      content: { educational: true },
    };
  },

  examples: [
    [
      { user: "{{user1}}", content: { text: "What is impermanent loss?" } },
      {
        user: "YieldScout",
        content: {
          text: "Impermanent loss is the temporary loss of funds...",
          action: "EXPLAIN_IL_RISK",
        },
      },
    ],
    [
      { user: "{{user1}}", content: { text: "Is the IL risk worth it for SOL-USDC at 47% APY?" } },
      {
        user: "YieldScout",
        content: {
          text: "At 47% APY, you'd need SOL to move significantly...",
          action: "EXPLAIN_IL_RISK",
        },
      },
    ],
  ],
};

// Estimate IL based on token pair composition
function calculateILEstimate(tokens: string[]): number {
  const hasStable = tokens.some((t) =>
    t.toLowerCase().includes("usd") || t.toLowerCase().includes("dai")
  );
  const hasVolatile = tokens.some((t) =>
    t.toLowerCase().includes("sol") ||
    t.toLowerCase().includes("bonk") ||
    t.toLowerCase().includes("eth") ||
    t.toLowerCase().includes("btc")
  );
  const hasMeme = tokens.some((t) =>
    t.toLowerCase().includes("bonk") || t.toLowerCase().includes("doge")
  );

  if (hasMeme) return 15; // Meme coins can 5-10x or collapse
  if (hasStable && hasVolatile) return 8; // SOL/USDC type pairs
  if (!hasStable && hasVolatile) return 5; // SOL/ETH type pairs
  return 1; // Stable pairs
}

export default explainILRiskAction;
