export function mockSeries(seed = 100) {
  const history = Array.from({ length: 30 }).map((_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString(),
    close: seed * (1 + Math.sin(i / 6) * 0.02 + i * 0.001),
  }));
  const lastPrice = history[history.length - 1]?.close ?? seed;
  const prevClose = history[history.length - 2]?.close ?? lastPrice;
  return {
    lastPrice,
    prevClose,
    marketCap: seed * 1_000_000_000,
    volume: Math.floor(seed * 100000),
    history,
  };
}
