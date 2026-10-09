import type { APIRoute } from 'astro';
import { GEO_SBI_SECTOREN } from '../../../data/geo-sbi-sectoren';
import { sectorMd, MD_HEADERS } from '../../../lib/geo-markdown';

export function getStaticPaths() {
  return GEO_SBI_SECTOREN.map((s) => ({ params: { sector: s.slug }, props: { sector: s } }));
}

export const GET: APIRoute = ({ props }) => new Response(sectorMd(props.sector), { headers: MD_HEADERS });
