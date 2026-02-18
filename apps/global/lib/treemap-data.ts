import dataset from '@/data/etfs.json';
import { AssetInputSchema, computeAllReturns, computeSize, normalizeByGroup, returnRange, type SizeMetric, type Timeframe } from '@capital/core';
import { getCache, setPriceCache } from './cache';
import { fetchYahooSeries } from './data-sources/yahoo';
import { mockSeries } from './data-sources/mock';
import type { TreemapResponse } from './types';

const key = 'global:treemap:raw';

export async function refreshGlobalRaw() {
  const rows = await Promise.all(
    dataset.map(async (asset, idx) => {
      try {
        const source = process.env.DATA_PROVIDER === 'mock' ? mockSeries(100 + idx * 4) : await fetchYahooSeries(asset.ticker);
        return AssetInputSchema.parse({
          ticker: asset.ticker,
          name: asset.name,
          group: asset.region,
          bucket: asset.bucket,
          lastPrice: source.lastPrice,
          prevClose: source.prevClose,
          marketCap: source.marketCap,
          volume: source.volume,
          weight: asset.weight,
          history: source.history,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const fallback = mockSeries(95 + idx * 3);
        return AssetInputSchema.parse({
          ticker: asset.ticker,
          name: asset.name,
          group: asset.region,
          bucket: asset.bucket,
          lastPrice: fallback.lastPrice,
          prevClose: fallback.prevClose,
          marketCap: fallback.marketCap,
          volume: fallback.volume,
          weight: asset.weight,
          history: fallback.history,
          timestamp: new Date().toISOString(),
        });
      }
    }),
  );
  await setPriceCache(key, rows);
  return rows;
}

export async function buildGlobalTreemap(timeframe: Timeframe, sizeMetric: SizeMetric, normalize: boolean): Promise<TreemapResponse> {
  const raw = (await getCache<any[]>(key)) ?? (await refreshGlobalRaw());

  let nodes = raw.map((asset) => {
    const returns = computeAllReturns(asset);
    return {
      id: `${asset.group}:${asset.ticker}`,
      ticker: asset.ticker,
      name: asset.name,
      group: asset.group,
      bucket: asset.bucket,
      lastPrice: asset.lastPrice,
      returns,
      size: computeSize(asset, sizeMetric),
      marketCap: asset.marketCap,
      volume: asset.volume,
      timestamp: asset.timestamp,
    };
  });

  if (normalize) nodes = normalizeByGroup(nodes);
  const legend = returnRange(nodes.map((n) => n.returns[timeframe]));

  return {
    app: 'global',
    updatedAt: new Date().toISOString(),
    timeframe,
    legend,
    nodes,
  };
}
