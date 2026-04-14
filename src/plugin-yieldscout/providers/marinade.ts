/**
 * Marinade Finance Provider
 * Fetches mSOL staking APY, validator stats, and liquid staking metrics
 */

import type { Provider } from "@elizaos/core";

export interface MarinadeStakeInfo {
  id: string;
  name: string;
  apy: number;
  tvl: number;
  type: "staking";
  token: "mSOL";
  riskLevel: "low";
  description: string;
}

const MARINADE_API_BASE = "https://api.marinade.finance";

export const marinadeApyProvider: Provider = {
  name: "marinade-apy",
  description: "Fetches Marinade Finance mSOL staking APY and TVL",

  get: async (_runtime?: unknown, _message?: unknown, _state?: unknown) => {
    try {
      // Fetch 1-year APY data
      const apyRes = await fetch(`${MARINADE_API_BASE}/msol/apy/1y`);
      if (!apyRes.ok) throw new Error(`Marinade APY API error: ${apyRes.status}`);
      const apyData = await apyRes.json();

      // Fetch TVL data
      const tvlRes = await fetch(`${MARINADE_API_BASE}/tvl`);
      const tvlData = tvlRes.ok ? await tvlRes.json() : { tvl: 0 };

      const stakeInfo: MarinadeStakeInfo = {
        id: "marinade-msol",
        name: "Marinade mSOL Staking",
        apy: apyData.apy || 0,
        tvl: tvlData.tvl || 0,
        type: "staking",
        token: "mSOL",
        riskLevel: "low", // Staking is generally low risk
        description: "Liquid staking SOL via Marinade Finance. Receive mSOL while earning staking rewards.",
      };

      return {
        data: [stakeInfo],
        protocol: "Marinade",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Marinade provider error:", error);
      return {
        data: [],
        protocol: "Marinade",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  },
};

export default marinadeApyProvider;
