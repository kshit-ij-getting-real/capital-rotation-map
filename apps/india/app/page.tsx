import { TreemapClient } from '@/components/treemap-client';
import { buildIndiaTreemap } from '@/lib/treemap-data';

export const revalidate = 60;

export default async function Page() {
  const data = await buildIndiaTreemap('1D', 'marketCap', false, 'etf');
  return <TreemapClient initialData={data} />;
}
