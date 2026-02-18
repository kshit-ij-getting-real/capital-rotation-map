import { buildIndiaTreemap } from '@/lib/treemap-data';
import { SizeMetricSchema, TimeframeSchema, UniverseModeSchema } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const Query = z.object({
  timeframe: TimeframeSchema.default('1D'),
  size: SizeMetricSchema.default('marketCap'),
  normalize: z.enum(['true', 'false']).default('false'),
  mode: UniverseModeSchema.default('etf'),
});

export async function GET(req: NextRequest) {
  const parsed = Query.parse({
    timeframe: req.nextUrl.searchParams.get('timeframe') ?? '1D',
    size: req.nextUrl.searchParams.get('size') ?? 'marketCap',
    normalize: req.nextUrl.searchParams.get('normalize') ?? 'false',
    mode: req.nextUrl.searchParams.get('mode') ?? 'etf',
  });

  const payload = await buildIndiaTreemap(parsed.timeframe, parsed.size, parsed.normalize === 'true', parsed.mode);
  return NextResponse.json(payload, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=120' } });
}
