import { describe, expect, it } from 'vitest';
import { computeReturn, normalizeByGroup } from './index';

describe('computeReturn', () => {
  const history = [
    { close: 100 },
    { close: 102 },
    { close: 103 },
    { close: 104 },
    { close: 106 },
    { close: 108 },
  ];

  it('uses prevClose for 1D when available', () => {
    expect(computeReturn(history, '1D', 105)).toBeCloseTo(2.8571, 3);
  });

  it('calculates weekly return by lookback', () => {
    expect(computeReturn(history, '1W')).toBeCloseTo(8, 4);
  });

  it('calculates quarterly return by lookback with short history fallback', () => {
    expect(computeReturn(history, '3M')).toBeCloseTo(8, 4);
  });

  it('calculates ytd return from first in-year point', () => {
    const year = new Date().getUTCFullYear();
    const ytdHistory = [
      { close: 90, date: `${year - 1}-12-29T00:00:00.000Z` },
      { close: 100, date: `${year}-01-02T00:00:00.000Z` },
      { close: 110, date: `${year}-03-01T00:00:00.000Z` },
    ];
    expect(computeReturn(ytdHistory, 'YTD')).toBeCloseTo(10, 4);
  });

  it('returns 0 for invalid base', () => {
    expect(computeReturn([{ close: 0 }], '1M')).toBe(0);
  });
});

describe('normalizeByGroup', () => {
  it('normalizes each group to total 1', () => {
    const rows = normalizeByGroup([
      { group: 'A', size: 2 },
      { group: 'A', size: 2 },
      { group: 'B', size: 4 },
      { group: 'B', size: 1 },
    ]);

    const sumA = rows.filter((r) => r.group === 'A').reduce((a, b) => a + b.size, 0);
    const sumB = rows.filter((r) => r.group === 'B').reduce((a, b) => a + b.size, 0);

    expect(sumA).toBeCloseTo(1, 5);
    expect(sumB).toBeCloseTo(1, 5);
  });
});
