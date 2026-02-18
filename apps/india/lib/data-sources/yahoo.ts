import yahooFinance from 'yahoo-finance2';
import { z } from 'zod';

const QuoteSchema = z.object({
  regularMarketPrice: z.number().optional(),
  regularMarketPreviousClose: z.number().optional(),
  regularMarketVolume: z.number().optional(),
  marketCap: z.number().optional(),
});

export async function fetchYahooSeries(ticker: string) {
  const quote = QuoteSchema.parse(await yahooFinance.quote(ticker));
  const now = new Date();
  const start = new Date(now);
  start.setMonth(start.getMonth() - 2);
  const history = await yahooFinance.historical(ticker, { period1: start, period2: now, interval: '1d' });

  return {
    lastPrice: quote.regularMarketPrice ?? 0,
    prevClose: quote.regularMarketPreviousClose ?? 0,
    marketCap: quote.marketCap,
    volume: quote.regularMarketVolume,
    history: history.filter((h) => typeof h.close === 'number').map((h) => ({ date: h.date.toISOString(), close: h.close as number })),
  };
}
