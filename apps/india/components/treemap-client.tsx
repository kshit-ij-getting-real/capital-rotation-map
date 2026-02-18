'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import type { IndiaSizeMetric, IndiaTimeframe, TreemapResponse, UniverseMode } from '@/lib/types';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

const timeframes: IndiaTimeframe[] = ['1D', '1W', '1M', '3M', 'YTD'];

function shortName(name: string, max = 28) {
  return name.length <= max ? name : `${name.slice(0, max - 1)}…`;
}

export function TreemapClient({ initialData }: { initialData: TreemapResponse }) {
  const [timeframe, setTimeframe] = useState<IndiaTimeframe>(initialData.timeframe);
  const [sizeMetric, setSizeMetric] = useState<IndiaSizeMetric>(initialData.sizeMetric);
  const [search, setSearch] = useState('');
  const [showLabels, setShowLabels] = useState(true);
  const [normalize, setNormalize] = useState(initialData.normalize);
  const [mode, setMode] = useState<UniverseMode>(initialData.mode);
  const [view, setView] = useState<'treemap' | 'table'>('treemap');
  const [data, setData] = useState(initialData);

  async function reload(next: { timeframe?: IndiaTimeframe; size?: IndiaSizeMetric; normalize?: boolean; mode?: UniverseMode } = {}) {
    const nextTimeframe = next.timeframe ?? timeframe;
    const nextSize = next.size ?? sizeMetric;
    const nextNormalize = next.normalize ?? normalize;
    const nextMode = next.mode ?? mode;

    const res = await fetch(`/api/treemap?timeframe=${nextTimeframe}&size=${nextSize}&normalize=${nextNormalize}&mode=${nextMode}`);
    setData(await res.json());
  }

  const filteredNodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...data.nodes].sort((a, b) => b.returns[timeframe] - a.returns[timeframe]);
    return q
      ? sorted.filter((node) => node.ticker.toLowerCase().includes(q) || node.name.toLowerCase().includes(q) || node.group.toLowerCase().includes(q))
      : sorted;
  }, [data.nodes, search, timeframe]);

  const option = useMemo(() => {
    const grouped = Object.values(
      filteredNodes.reduce<Record<string, { name: string; children: Array<Record<string, unknown>> }>>((acc, node) => {
        if (!acc[node.group]) acc[node.group] = { name: node.group, children: [] };
        acc[node.group].children.push({
          ...node,
          value: [node.size, node.returns[timeframe]],
          name: node.ticker,
        });
        return acc;
      }, {}),
    );

    return {
      tooltip: {
        formatter: (p: { data?: any }) => {
          const d = p.data;
          if (!d?.ticker) return d?.name ?? '';
          return [
            `<b>${d.ticker}</b> (${d.name})`,
            `Sector: ${d.group}`,
            `Last: ${Number(d.lastPrice).toFixed(2)}`,
            `${timeframe}: ${Number(d.returns[timeframe]).toFixed(2)}%`,
            `1D: ${Number(d.returns['1D']).toFixed(2)}% | 1W: ${Number(d.returns['1W']).toFixed(2)}%`,
            `1M: ${Number(d.returns['1M']).toFixed(2)}% | 3M: ${Number(d.returns['3M']).toFixed(2)}% | YTD: ${Number(d.returns['YTD']).toFixed(2)}%`,
            `Size metric: ${Number(d.size).toFixed(3)}`,
            `Timestamp: ${new Date(d.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
          ].join('<br/>');
        },
      },
      visualMap: {
        min: data.legend.min,
        max: data.legend.max,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 2,
        inRange: { color: ['#7f1d1d', '#1e293b', '#14532d'] },
      },
      series: [
        {
          type: 'treemap',
          roam: true,
          breadcrumb: { show: true },
          nodeClick: 'zoomToNode',
          upperLabel: { show: true, height: 20 },
          label: {
            show: showLabels,
            formatter: (params: { data?: any }) => {
              const d = params.data;
              if (!d?.ticker) return d?.name ?? '';
              return `{line1|${d.ticker}}\n{line2|(${shortName(d.name)})}`;
            },
            rich: {
              line1: { fontSize: 11, fontWeight: 700, lineHeight: 14 },
              line2: { fontSize: 9, color: '#cbd5e1', lineHeight: 12 },
            },
          },
          levels: [{ itemStyle: { borderColor: '#0b1220', gapWidth: 2 } }],
          data: grouped,
          visualDimension: 1,
          leafDepth: 2,
        },
      ],
    };
  }, [data.legend.max, data.legend.min, filteredNodes, showLabels, timeframe]);

  return (
    <div className="container">
      <h2>India Sector Rotation Map</h2>
      <p className="small timestamp">Last updated: {new Date(data.updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
      {data.delayed ? <p className="badge">Data may be delayed</p> : null}
      <div className="panel controls">
        <select value={mode} onChange={(e) => { const v = e.target.value as UniverseMode; setMode(v); reload({ mode: v }); }}>
          <option value="etf">ETF universe</option>
          <option value="stock">Sector → stock universe</option>
        </select>
        <select value={timeframe} onChange={(e) => { const v = e.target.value as IndiaTimeframe; setTimeframe(v); reload({ timeframe: v }); }}>
          {timeframes.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
        </select>
        <select value={sizeMetric} onChange={(e) => { const v = e.target.value as IndiaSizeMetric; setSizeMetric(v); reload({ size: v }); }}>
          <option value="weight">Weight</option><option value="marketCap">Market cap</option><option value="tradedValue">Traded value</option>
        </select>
        <input placeholder="Search ticker/sector/name" value={search} onChange={(e) => setSearch(e.target.value)} />
        <label><input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} /> Show labels</label>
        <label><input type="checkbox" checked={normalize} onChange={(e) => { const n = e.target.checked; setNormalize(n); reload({ normalize: n }); }} /> Normalize by sector</label>
        <select value={view} onChange={(e) => setView(e.target.value as 'treemap' | 'table')}>
          <option value="treemap">Treemap view</option>
          <option value="table">Table view</option>
        </select>
      </div>
      <div className="small" style={{ marginBottom: 8 }}>Legend range: {data.legend.min.toFixed(2)}% to {data.legend.max.toFixed(2)}%</div>
      {view === 'treemap' ? (
        <div className="panel" style={{ height: '72vh' }}>
          <ReactECharts option={option} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />
        </div>
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ticker</th><th>Name</th><th>Sector</th><th>Last</th><th>{timeframe}</th><th>1D</th><th>1W</th><th>1M</th><th>3M</th><th>YTD</th><th>Size</th>
              </tr>
            </thead>
            <tbody>
              {filteredNodes.map((node) => (
                <tr key={node.id}>
                  <td>{node.ticker}</td><td>{node.name}</td><td>{node.group}</td><td>{node.lastPrice.toFixed(2)}</td><td>{node.returns[timeframe].toFixed(2)}%</td>
                  <td>{node.returns['1D'].toFixed(2)}%</td><td>{node.returns['1W'].toFixed(2)}%</td><td>{node.returns['1M'].toFixed(2)}%</td><td>{node.returns['3M'].toFixed(2)}%</td><td>{node.returns['YTD'].toFixed(2)}%</td><td>{node.size.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
