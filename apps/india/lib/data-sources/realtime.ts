import { z } from 'zod';
import type { PriceSeries } from './types';

const QuoteSchema = z.object({
  price: z.number(),
  previous_close: z.number().optional(),
});

const TimeSeriesSchema = z.object({
  values: z.array(z.object({ datetime: z.string(), close: z.string() })).optional(),
});

export async function fetchTwelveDataSeries(symbol: string): Promise<PriceSeries> {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) {
    throw new Error('TWELVE_DATA_API_KEY is required for realtime provider');
  }

  const mappedSymbol = symbol.replace('.NS', '') + ':NSE';
  const quoteRes = await fetch(`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(mappedSymbol)}&apikey=${key}`, {
    next: { revalidate: 0 },
  });

  if (!quoteRes.ok) throw new Error(`TwelveData quote failed with status ${quoteRes.status}`);
  const quoteJson = await quoteRes.json();
  const quote = QuoteSchema.parse(quoteJson);

  const seriesRes = await fetch(
    `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(mappedSymbol)}&interval=1day&outputsize=260&apikey=${key}`,
    { next: { revalidate: 0 } },
  );
  if (!seriesRes.ok) throw new Error(`TwelveData time_series failed with status ${seriesRes.status}`);
  const seriesJson = await seriesRes.json();
  const series = TimeSeriesSchema.parse(seriesJson);

  const history = (series.values ?? [])
    .slice()
    .reverse()
    .map((row) => ({ date: new Date(row.datetime).toISOString(), close: Number(row.close) }))
    .filter((row) => Number.isFinite(row.close));

  return {
    lastPrice: quote.price,
    prevClose: quote.previous_close ?? history.at(-2)?.close ?? quote.price,
    history,
  };
}
