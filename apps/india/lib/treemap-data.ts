import fs from 'node:fs/promises';
import path from 'node:path';
import { AssetInputSchema, computeAllReturns, computeSize, normalizeByGroup, returnRange, type SizeMetric, type Timeframe } from '@capital/core';
import { getCache, setPriceCache } from './cache';
import { fetchYahooSeries } from './data-sources/yahoo';
import { mockSeries } from './data-sources/mock';
import type { TreemapResponse } from './types';

const key = 'india:treemap:raw';

type Seed = { ticker: string; name: string; sector: string; weight: string };

async function readSeed(): Promise<Seed[]> {
  const content = await fs.readFile(path.join(process.cwd(), 'data/india-sectors.csv'), 'utf-8');
  const [head, ...rows] = content.trim().split('\n');
  const cols = head.split(',');
  return rows.map((line) => {
    const parts = line.split(',');
    return Object.fromEntries(cols.map((c, i) => [c, parts[i]])) as Seed;
  });
}

export async function refreshIndiaRaw() {
  const seed = await readSeed();
  const rows = await Promise.all(
    seed.map(async (asset, idx) => {
      try {
        const source = process.env.DATA_PROVIDER === 'mock' ? mockSeries(220 + idx * 5) : await fetchYahooSeries(asset.ticker);
        return AssetInputSchema.parse({
          ticker: asset.ticker,
          name: asset.name,
          group: asset.sector,
          lastPrice: source.lastPrice,
          prevClose: source.prevClose,
          marketCap: source.marketCap,
          volume: source.volume,
          weight: Number(asset.weight) || 1,
          history: source.history,
          timestamp: new Date().toISOString(),
        });
      } catch {
        const fallback = mockSeries(200 + idx * 4);
        return AssetInputSchema.parse({
          ticker: asset.ticker,
          name: asset.name,
          group: asset.sector,
          lastPrice: fallback.lastPrice,
          prevClose: fallback.prevClose,
          marketCap: fallback.marketCap,
          volume: fallback.volume,
          weight: Number(asset.weight) || 1,
          history: fallback.history,
          timestamp: new Date().toISOString(),
        });
      }
    }),
  );
  await setPriceCache(key, rows);
  return rows;
}

export async function buildIndiaTreemap(timeframe: Timeframe, sizeMetric: SizeMetric, normalize: boolean): Promise<TreemapResponse> {
  const raw = (await getCache<any[]>(key)) ?? (await refreshIndiaRaw());
  let nodes = raw.map((asset) => {
    const returns = computeAllReturns(asset);
    return {
      id: `${asset.group}:${asset.ticker}`,
      ticker: asset.ticker,
      name: asset.name,
      group: asset.group,
      lastPrice: asset.lastPrice,
      returns,
      size: computeSize(asset, sizeMetric),
      marketCap: asset.marketCap,
      volume: asset.volume,
      timestamp: asset.timestamp,
    };
  });

  if (normalize) nodes = normalizeByGroup(nodes);

  return {
    app: 'india',
    updatedAt: new Date().toISOString(),
    timeframe,
    legend: returnRange(nodes.map((n) => n.returns[timeframe])),
    nodes,
  };
}
