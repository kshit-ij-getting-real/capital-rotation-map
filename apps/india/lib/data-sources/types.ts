export type PriceSeries = {
  lastPrice: number;
  prevClose: number;
  marketCap?: number;
  volume?: number;
  history: Array<{ date: string; close: number }>;
};

export type PriceProvider = {
  kind: 'realtime' | 'fallback';
  delayed: boolean;
  fetchSeries: (ticker: string) => Promise<PriceSeries>;
};
