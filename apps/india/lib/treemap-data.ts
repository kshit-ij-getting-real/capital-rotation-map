import fs from 'node:fs/promises';
import path from 'node:path';
import {
  AssetInputSchema,
  computeAllReturns,
  computeSize,
  normalizeByGroup,
  returnRange,
  type SizeMetric,
  type Timeframe,
} from '@capital/core';
import { z } from 'zod';
import { getCache, setSnapshotCache } from './cache';
import { getPriceProvider } from './data-sources/provider';
import { mockSeries } from './data-sources/mock';
import {
  SizeMetricSchema,
  TimeframeSchema,
  TreemapResponse,
  TreemapSnapshotSchema,
  UniverseModeSchema,
  type IndiaSizeMetric,
  type IndiaTimeframe,
  type TreemapSnapshot,
  type UniverseMode,
} from './types';

const snapshotKey = (mode: UniverseMode) => `india:treemap:snapshot:${mode}`;

const UniverseRowSchema = z.object({
  ticker: z.string().min(1),
  name: z.string().min(1),
  sector: z.string().min(1),
  weight: z.coerce.number().default(1),
});

type UniverseRow = z.infer<typeof UniverseRowSchema>;

async function readCsv(fileName: string): Promise<UniverseRow[]> {
  const content = await fs.readFile(path.join(process.cwd(), `data/${fileName}`), 'utf-8');
  const lines = content.split('\n').map((line) => line.trim()).filter(Boolean);
  const [headerLine, ...rows] = lines;
  if (!headerLine) return [];
  const headers = headerLine.split(',').map((col) => col.trim());

  return rows.map((line) => {
    const parts = line.split(',').map((col) => col.trim());
    const base = Object.fromEntries(headers.map((col, idx) => [col, parts[idx] ?? '']));
    return UniverseRowSchema.parse(base);
  });
}

export async function readUniverse(mode: UniverseMode): Promise<UniverseRow[]> {
  const file = mode === 'etf' ? 'india_etf_universe.csv' : 'india_universe.csv';
  return readCsv(file);
}

export async function refreshIndiaSnapshot(mode: UniverseMode): Promise<TreemapSnapshot> {
  const universe = await readUniverse(mode);
  const provider = getPriceProvider();

  const rows = await Promise.all(
    universe.map(async (asset, idx) => {
      try {
        const source = await provider.fetchSeries(asset.ticker);
        return AssetInputSchema.parse({
          ticker: asset.ticker,
          name: asset.name,
          group: asset.sector,
          lastPrice: source.lastPrice,
          prevClose: source.prevClose,
          marketCap: source.marketCap,
          volume: source.volume,
          weight: asset.weight || 1,
          history: source.history,
          timestamp: new Date().toISOString(),
        });
      } catch {
        const fallback = mockSeries(180 + idx * 6);
        return AssetInputSchema.parse({
          ticker: asset.ticker,
          name: asset.name,
          group: asset.sector,
          lastPrice: fallback.lastPrice,
          prevClose: fallback.prevClose,
          marketCap: fallback.marketCap,
          volume: fallback.volume,
          weight: asset.weight || 1,
          history: fallback.history,
          timestamp: new Date().toISOString(),
        });
      }
    }),
  );

  const now = new Date().toISOString();
  const snapshot: TreemapSnapshot = TreemapSnapshotSchema.parse({
    app: 'india',
    updatedAt: now,
    sourceTimestamp: now,
    mode,
    provider: provider.kind,
    delayed: provider.delayed,
    nodes: rows.map((asset) => ({
      id: `${asset.group}:${asset.ticker}`,
      ticker: asset.ticker,
      name: asset.name,
      group: asset.group,
      lastPrice: asset.lastPrice,
      returns: computeAllReturns(asset),
      marketCap: asset.marketCap,
      volume: asset.volume,
      weight: asset.weight ?? 1,
      timestamp: asset.timestamp,
    })),
  });

  await setSnapshotCache(snapshotKey(mode), snapshot);
  return snapshot;
}

export async function getSnapshot(mode: UniverseMode): Promise<TreemapSnapshot | null> {
  const cached = await getCache<TreemapSnapshot>(snapshotKey(mode));
  return cached ? TreemapSnapshotSchema.parse(cached) : null;
}

export async function buildIndiaTreemap(
  timeframe: IndiaTimeframe,
  sizeMetric: IndiaSizeMetric,
  normalize: boolean,
  mode: UniverseMode,
): Promise<TreemapResponse> {
  const safeTimeframe = TimeframeSchema.parse(timeframe) as Timeframe;
  const safeSizeMetric = SizeMetricSchema.parse(sizeMetric) as SizeMetric;
  const safeMode = UniverseModeSchema.parse(mode);

  const snapshot = (await getSnapshot(safeMode)) ?? (await refreshIndiaSnapshot(safeMode));
  let nodes = snapshot.nodes.map((asset) => ({
    ...asset,
    size: computeSize(
      AssetInputSchema.parse({
        ticker: asset.ticker,
        name: asset.name,
        group: asset.group,
        lastPrice: asset.lastPrice,
        marketCap: asset.marketCap,
        volume: asset.volume,
        weight: asset.weight,
        history: [],
        timestamp: asset.timestamp,
      }),
      safeSizeMetric,
    ),
  }));

  if (normalize) nodes = normalizeByGroup(nodes);

  return {
    app: 'india',
    updatedAt: snapshot.updatedAt,
    sourceTimestamp: snapshot.sourceTimestamp,
    mode: snapshot.mode,
    provider: snapshot.provider,
    delayed: snapshot.delayed,
    timeframe: safeTimeframe,
    sizeMetric: safeSizeMetric,
    normalize,
    legend: returnRange(nodes.map((n) => n.returns[safeTimeframe])),
    nodes,
  };
}
