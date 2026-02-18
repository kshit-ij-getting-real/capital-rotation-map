import { TreemapClient } from '@/components/treemap-client';
import { buildIndiaTreemap } from '@/lib/treemap-data';

export const revalidate = 300;

export default async function Page() {
  const data = await buildIndiaTreemap('1D', 'marketCap', false);
  return <TreemapClient initialData={data} />;
}
