export function mockSeries(seed = 200) {
  const history = Array.from({ length: 30 }).map((_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString(),
    close: seed * (1 + Math.cos(i / 5) * 0.015 + i * 0.0009),
  }));
  const lastPrice = history[history.length - 1]?.close ?? seed;
  const prevClose = history[history.length - 2]?.close ?? lastPrice;
  return {
    lastPrice,
    prevClose,
    marketCap: seed * 900000000,
    volume: Math.floor(seed * 70000),
    history,
  };
}
