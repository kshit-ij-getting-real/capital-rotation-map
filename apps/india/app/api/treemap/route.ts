import { buildIndiaTreemap } from '@/lib/treemap-data';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const Query = z.object({
  timeframe: z.enum(['1D', '1W', '1M']).default('1D'),
  size: z.enum(['weight', 'marketCap', 'tradedValue']).default('marketCap'),
  normalize: z.enum(['true', 'false']).default('false'),
});

export async function GET(req: NextRequest) {
  const parsed = Query.parse({
    timeframe: req.nextUrl.searchParams.get('timeframe') ?? '1D',
    size: req.nextUrl.searchParams.get('size') ?? 'marketCap',
    normalize: req.nextUrl.searchParams.get('normalize') ?? 'false',
  });

  const payload = await buildIndiaTreemap(parsed.timeframe, parsed.size, parsed.normalize === 'true');
  return NextResponse.json(payload, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=300' } });
}
