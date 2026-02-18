import { fetchTwelveDataSeries } from './realtime';
import { fetchYahooSeries } from './yahoo';
import type { PriceProvider } from './types';

export function getPriceProvider(): PriceProvider {
  if (process.env.TWELVE_DATA_API_KEY) {
    return {
      kind: 'realtime',
      delayed: false,
      fetchSeries: fetchTwelveDataSeries,
    };
  }

  return {
    kind: 'fallback',
    delayed: true,
    fetchSeries: fetchYahooSeries,
  };
}
