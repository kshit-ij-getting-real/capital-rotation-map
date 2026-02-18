import { refreshIndiaSnapshot } from '@/lib/treemap-data';
import { UniverseModeSchema } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

function isIndiaMarketHours(date = new Date()) {
  const india = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = india.getDay();
  if (day === 0 || day === 6) return false;
  const mins = india.getHours() * 60 + india.getMinutes();
  return mins >= 9 * 60 && mins <= 15 * 60 + 45;
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get('force') === '1';
  const mode = UniverseModeSchema.safeParse(req.nextUrl.searchParams.get('mode') ?? 'etf').success
    ? (req.nextUrl.searchParams.get('mode') as 'etf' | 'stock')
    : 'etf';

  const shouldSkip = !force && !isIndiaMarketHours() && req.nextUrl.searchParams.get('cadence') !== 'offhours';
  if (shouldSkip) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'outside_market_hours' });
  }

  const modes: Array<'etf' | 'stock'> = mode === 'etf' ? ['etf', 'stock'] : [mode];
  const snapshots = await Promise.all(modes.map((m) => refreshIndiaSnapshot(m)));
  return NextResponse.json({
    ok: true,
    refreshed: snapshots.map((snapshot) => ({ mode: snapshot.mode, count: snapshot.nodes.length, delayed: snapshot.delayed })),
    updatedAt: new Date().toISOString(),
  });
}
