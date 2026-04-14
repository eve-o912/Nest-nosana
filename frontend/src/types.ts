export interface Pool {
  id: string;
  name: string;
  protocol: 'Raydium' | 'Orca' | 'Marinade';
  type: 'amm' | 'clmm' | 'staking';
  tvl: number;
  apy: number;
  volume24h?: number;
  feeRate?: number;
  riskLevel: 'low' | 'medium' | 'high';
  tokens: string[];
  description?: string;
  concentrated?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  text: string;
  content?: {
    pools?: Pool[];
    error?: string;
  };
}

export type RiskLevel = 'all' | 'low' | 'medium' | 'high';
export type Protocol = 'all' | 'Raydium' | 'Orca' | 'Marinade';
