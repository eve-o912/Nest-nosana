/**
 * Jupiter Price Provider
 * Fetches real-time token prices for SPL tokens
 * Used to calculate USD value of pool holdings and IL risk
 */

import type { Provider } from "@elizaos/core";

export interface TokenPrice {
  mint: string;
  symbol: string;
  priceUsd: number;
}

const JUPITER_API_BASE = "https://api.jup.ag/price/v2";

// Common Solana token mints
const TOKEN_MINTS: Record<string, string> = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  ORCA: "orcaEKTdK7LKz57vaAYr9Q2VeHz83mLEpVoBw5m1T3z",
  mSOL: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3iZKk2fH2J7c9jJ",
  ETH: "7vfCXTUXx5WJV5JMH72JJsWk5Kz7TXwW4yH9dwz26e8J",
  WBTC: "3NZ9JMVBmGAqocybic2cDUJ9MhFQfGP8yQ9fNSmM5j6s",
};

export const jupiterPriceProvider: Provider = {
  name: "jupiter-prices",
  description: "Fetches real-time token prices from Jupiter",

  get: async (_runtime?: unknown, _message?: unknown, _state?: unknown) => {
    try {
      const tokenIds = Object.values(TOKEN_MINTS).join(",");
      const response = await fetch(`${JUPITER_API_BASE}?ids=${tokenIds}`);
      if (!response.ok) throw new Error(`Jupiter API error: ${response.status}`);
      const data = await response.json();

      const prices: TokenPrice[] = [];

      if (data?.data) {
        for (const [symbol, mint] of Object.entries(TOKEN_MINTS)) {
          const priceData = data.data[mint];
          if (priceData) {
            prices.push({
              mint,
              symbol,
              priceUsd: parseFloat(priceData.price) || 0,
            });
          }
        }
      }

      return {
        data: prices,
        protocol: "Jupiter",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Jupiter provider error:", error);
      return {
        data: [],
        protocol: "Jupiter",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  },
};

export function getTokenPrice(symbol: string, prices: TokenPrice[]): number {
  const mint = TOKEN_MINTS[symbol.toUpperCase()];
  if (!mint) return 0;
  const price = prices.find((p) => p.mint === mint);
  return price?.priceUsd || 0;
}

export default jupiterPriceProvider;
