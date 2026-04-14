# plugin-yieldscout

ElizaOS v2 plugin for Solana DeFi yield analysis.

## Features

- **Real-time yield data** from Raydium, Orca, and Marinade Finance
- **APY, TVL, volume** tracking across protocols
- **Impermanent loss risk** assessment
- **Protocol comparison** (Raydium vs Orca vs Marinade)
- **5-minute cache** for instant responses

## Providers

| Provider | Source | Data |
|----------|--------|------|
| `raydiumPoolsProvider` | Raydium v3 API | Pools, farms, APY |
| `orcaPoolsProvider` | Orca Whirlpools | CLMM pools, fees |
| `marinadeApyProvider` | Marinade API | mSOL staking APY |
| `jupiterPriceProvider` | Jupiter Price API | Token prices for IL calc |

## Actions

| Action | Description | Triggers |
|--------|-------------|----------|
| `SCAN_YIELDS` | Find best yield pools | "best yields", "top pools", "highest APY" |
| `GET_POOL_DETAIL` | Pool analytics | "tell me about", "pool details" |
| `EXPLAIN_IL_RISK` | Impermanent loss education | "impermanent loss", "IL risk" |
| `COMPARE_PROTOCOLS` | Protocol comparison | "compare", "vs", "which is better" |

## Usage

```typescript
import { yieldScoutPlugin } from "./plugin-yieldscout";

// In your character file:
{
  "plugins": ["plugin-yieldscout"]
}
```

## API Endpoints

The plugin exposes a cache service that can be queried via HTTP:

- `GET /api/yields` - Get all cached pools
- `POST /api/chat` - Send message to agent
- `GET /api/health` - Health check

## Architecture

```
User Chat → ElizaOS Runtime → Action → Providers Fetch Data → Cache → LLM → Response
                  ↑                                        ↓
                  └────────── Cache Service (5-min poll) ←─┘
```
