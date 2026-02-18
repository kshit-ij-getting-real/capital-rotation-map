import { refreshGlobalRaw } from '@/lib/treemap-data';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const data = await refreshGlobalRaw();
  return NextResponse.json({ ok: true, count: data.length, updatedAt: new Date().toISOString() });
}
