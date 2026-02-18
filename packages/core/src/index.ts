import { z } from 'zod';

export const HistoryPointSchema = z.object({
  date: z.string(),
  close: z.number(),
});

export const AssetInputSchema = z.object({
  ticker: z.string(),
  name: z.string(),
  group: z.string(),
  bucket: z.string().optional(),
  lastPrice: z.number(),
  prevClose: z.number().optional(),
  marketCap: z.number().optional(),
  volume: z.number().optional(),
  weight: z.number().optional(),
  history: z.array(HistoryPointSchema),
  timestamp: z.string(),
});

export type AssetInput = z.infer<typeof AssetInputSchema>;
export type Timeframe = '1D' | '1W' | '1M' | '3M' | 'YTD';
export type SizeMetric = 'weight' | 'marketCap' | 'tradedValue';

export function pickLookbackIndex(historyLength: number, timeframe: Timeframe): number {
  if (historyLength < 2) return 0;
  const offset = timeframe === '1D' ? 1 : timeframe === '1W' ? 5 : timeframe === '1M' ? 21 : timeframe === '3M' ? 63 : 0;
  if (timeframe === 'YTD') return 0;
  return Math.max(0, historyLength - 1 - offset);
}

export function computeReturn(history: Array<{ close: number; date?: string }>, timeframe: Timeframe, prevClose?: number): number {
  if (!history.length) return 0;
  const last = history[history.length - 1]?.close ?? 0;
  if (!last) return 0;

  if (timeframe === '1D' && prevClose && prevClose !== 0) {
    return ((last - prevClose) / prevClose) * 100;
  }

  if (timeframe === 'YTD') {
    const year = new Date().getUTCFullYear();
    const ytd = history.find((point) => {
      if (!point.date) return false;
      return new Date(point.date).getUTCFullYear() === year;
    });
    const base = ytd?.close ?? history[0]?.close;
    if (!base || base === 0) return 0;
    return ((last - base) / base) * 100;
  }

  const idx = pickLookbackIndex(history.length, timeframe);
  const base = history[idx]?.close;
  if (!base || base === 0) return 0;

  return ((last - base) / base) * 100;
}

export function computeAllReturns(asset: AssetInput): Record<Timeframe, number> {
  return {
    '1D': computeReturn(asset.history, '1D', asset.prevClose),
    '1W': computeReturn(asset.history, '1W'),
    '1M': computeReturn(asset.history, '1M'),
    '3M': computeReturn(asset.history, '3M'),
    YTD: computeReturn(asset.history, 'YTD'),
  };
}

export function computeSize(asset: AssetInput, sizeMetric: SizeMetric): number {
  if (sizeMetric === 'weight') return asset.weight ?? 1;
  if (sizeMetric === 'marketCap') return asset.marketCap ?? asset.weight ?? 1;
  return (asset.lastPrice || 0) * (asset.volume || 0) || asset.weight || 1;
}

export function normalizeByGroup<T extends { group: string; size: number }>(rows: T[]): T[] {
  const sums = new Map<string, number>();
  for (const row of rows) sums.set(row.group, (sums.get(row.group) ?? 0) + row.size);
  return rows.map((row) => ({
    ...row,
    size: row.size / (sums.get(row.group) || 1),
  }));
}

export function returnRange(values: number[]): { min: number; max: number } {
  if (!values.length) return { min: -5, max: 5 };
  const absMax = Math.max(...values.map((v) => Math.abs(v)), 1);
  return { min: -absMax, max: absMax };
}
