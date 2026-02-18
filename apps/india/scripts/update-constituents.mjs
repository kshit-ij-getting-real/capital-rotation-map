import fs from 'node:fs/promises';

const sourceUrl = process.env.INDIA_CONSTITUENTS_CSV_URL;
if (!sourceUrl) {
  console.error('Set INDIA_CONSTITUENTS_CSV_URL to fetch latest constituents CSV.');
  process.exit(1);
}

const res = await fetch(sourceUrl);
if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
const text = await res.text();

await fs.writeFile(new URL('../data/india-sectors.csv', import.meta.url), text, 'utf-8');
console.log('Updated apps/india/data/india-sectors.csv');
