export type TreemapResponse = {
  app: 'india';
  updatedAt: string;
  timeframe: '1D' | '1W' | '1M';
  legend: { min: number; max: number };
  nodes: Array<{
    id: string;
    ticker: string;
    name: string;
    group: string;
    lastPrice: number;
    returns: { '1D': number; '1W': number; '1M': number };
    size: number;
    marketCap?: number;
    volume?: number;
    timestamp: string;
  }>;
};
