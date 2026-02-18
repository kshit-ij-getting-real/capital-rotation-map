'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import type { TreemapResponse } from '@/lib/types';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

export function TreemapClient({ initialData }: { initialData: TreemapResponse }) {
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M'>(['1D','1W','1M'].includes(initialData.timeframe) ? (initialData.timeframe as '1D'|'1W'|'1M') : '1D');
  const [sizeMetric, setSizeMetric] = useState<'weight' | 'marketCap' | 'tradedValue'>('weight');
  const [search, setSearch] = useState('');
  const [showLabels, setShowLabels] = useState(true);
  const [normalize, setNormalize] = useState(false);
  const [data, setData] = useState(initialData);

  async function reload(nextTimeframe = timeframe, nextSize = sizeMetric, nextNormalize = normalize) {
    const res = await fetch(`/api/treemap?timeframe=${nextTimeframe}&size=${nextSize}&normalize=${nextNormalize}`);
    const json = await res.json();
    setData(json);
  }

  const option = useMemo(() => {
    const filtered = data.nodes.map((n) => ({
      ...n,
      value: [n.size, n.returns[timeframe]],
      name: n.ticker,
      itemStyle: search && n.ticker.toLowerCase().includes(search.toLowerCase()) ? { borderColor: '#facc15', borderWidth: 3 } : undefined,
    }));

    const grouped = Object.values(
      filtered.reduce<Record<string, any>>((acc, node) => {
        if (!acc[node.group]) acc[node.group] = { name: node.group, children: [] };
        acc[node.group].children.push(node);
        return acc;
      }, {}),
    );

    return {
      tooltip: {
        formatter: (p: any) => {
          const d = p.data;
          if (!d?.ticker) return d?.name ?? '';
          return `${d.ticker} - ${d.name}<br/>Group: ${d.group}<br/>Last: ${d.lastPrice.toFixed(2)}<br/>1D: ${d.returns['1D'].toFixed(2)}%<br/>1W: ${d.returns['1W'].toFixed(2)}%<br/>1M: ${d.returns['1M'].toFixed(2)}%<br/>Weight: ${d.size.toFixed(3)}<br/>Updated: ${new Date(d.timestamp).toLocaleString()}`;
        },
      },
      visualMap: {
        min: data.legend.min,
        max: data.legend.max,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 2,
        inRange: { color: ['#8b1d3b', '#263759', '#14532d'] },
      },
      series: [
        {
          type: 'treemap',
          roam: true,
          breadcrumb: { show: true },
          nodeClick: 'zoomToNode',
          upperLabel: { show: true, height: 20 },
          label: { show: showLabels, formatter: '{b}' },
          levels: [{ itemStyle: { borderColor: '#0b1220', gapWidth: 2 } }],
          data: grouped,
          visualDimension: 1,
          colorMappingBy: 'value',
          leafDepth: 2,
        },
      ],
    };
  }, [data, timeframe, search, showLabels]);

  return (
    <div className="container">
      <h2>Global Capital Rotation Map</h2>
      <p className="small">Last updated: {new Date(data.updatedAt).toLocaleString()}</p>
      <div className="panel controls">
        <select value={timeframe} onChange={(e) => { const v = e.target.value as any; setTimeframe(v); reload(v, sizeMetric, normalize); }}>
          <option>1D</option><option>1W</option><option>1M</option>
        </select>
        <select value={sizeMetric} onChange={(e) => { const v = e.target.value as any; setSizeMetric(v); reload(timeframe, v, normalize); }}>
          <option value="weight">Weight</option><option value="marketCap">Market cap</option><option value="tradedValue">Traded value</option>
        </select>
        <input placeholder="Search ticker" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label><input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} /> Show labels</label>
        <label><input type="checkbox" checked={normalize} onChange={(e) => { const n = e.target.checked; setNormalize(n); reload(timeframe, sizeMetric, n); }} /> Normalize by group</label>
      </div>
      <div className="small" style={{ marginBottom: 8 }}>Legend range: {data.legend.min.toFixed(2)}% to {data.legend.max.toFixed(2)}%</div>
      <div className="panel" style={{ height: '75vh' }}>
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />
      </div>
    </div>
  );
}
