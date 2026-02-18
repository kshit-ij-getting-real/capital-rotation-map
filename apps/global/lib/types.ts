export type TreemapResponse = {
  app: 'global';
  updatedAt: string;
  timeframe: '1D' | '1W' | '1M' | '3M' | 'YTD';
  legend: { min: number; max: number };
  nodes: Array<{
    id: string;
    ticker: string;
    name: string;
    group: string;
    bucket?: string;
    lastPrice: number;
    returns: { '1D': number; '1W': number; '1M': number; '3M': number; YTD: number };
    size: number;
    marketCap?: number;
    volume?: number;
    timestamp: string;
  }>;
};
