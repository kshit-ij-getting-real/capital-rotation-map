import { refreshIndiaRaw } from '@/lib/treemap-data';
import { NextRequest, NextResponse } from 'next/server';

function isIndiaMarketHours(date = new Date()) {
  const india = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = india.getDay();
  if (day === 0 || day === 6) return false;
  const mins = india.getHours() * 60 + india.getMinutes();
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get('force') === '1';
  if (!force && !isIndiaMarketHours()) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'outside_market_hours' });
  }

  const data = await refreshIndiaRaw();
  return NextResponse.json({ ok: true, count: data.length, updatedAt: new Date().toISOString() });
}
