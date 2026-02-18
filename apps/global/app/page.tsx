import { TreemapClient } from '@/components/treemap-client';
import { buildGlobalTreemap } from '@/lib/treemap-data';

export const revalidate = 300;

export default async function Page() {
  const data = await buildGlobalTreemap('1D', 'weight', false);
  return <TreemapClient initialData={data} />;
}
