import { z } from 'zod';

export const UniverseModeSchema = z.enum(['etf', 'stock']);
export type UniverseMode = z.infer<typeof UniverseModeSchema>;

export const DataProviderKindSchema = z.enum(['realtime', 'fallback']);
export type DataProviderKind = z.infer<typeof DataProviderKindSchema>;

export const TimeframeSchema = z.enum(['1D', '1W', '1M', '3M', 'YTD']);
export type IndiaTimeframe = z.infer<typeof TimeframeSchema>;

export const SizeMetricSchema = z.enum(['weight', 'marketCap', 'tradedValue']);
export type IndiaSizeMetric = z.infer<typeof SizeMetricSchema>;

export const ReturnsSchema = z.object({
  '1D': z.number(),
  '1W': z.number(),
  '1M': z.number(),
  '3M': z.number(),
  YTD: z.number(),
});

export const TreemapNodeSchema = z.object({
  id: z.string(),
  ticker: z.string(),
  name: z.string(),
  group: z.string(),
  lastPrice: z.number(),
  returns: ReturnsSchema,
  marketCap: z.number().optional(),
  volume: z.number().optional(),
  weight: z.number(),
  timestamp: z.string(),
});

export const TreemapSnapshotSchema = z.object({
  app: z.literal('india'),
  updatedAt: z.string(),
  sourceTimestamp: z.string(),
  mode: UniverseModeSchema,
  provider: DataProviderKindSchema,
  delayed: z.boolean(),
  nodes: z.array(TreemapNodeSchema),
});

export type TreemapSnapshot = z.infer<typeof TreemapSnapshotSchema>;

export type TreemapResponse = {
  app: 'india';
  updatedAt: string;
  sourceTimestamp: string;
  mode: UniverseMode;
  provider: DataProviderKind;
  delayed: boolean;
  timeframe: IndiaTimeframe;
  sizeMetric: IndiaSizeMetric;
  normalize: boolean;
  legend: { min: number; max: number };
  nodes: Array<z.infer<typeof TreemapNodeSchema> & { size: number }>;
};
