import type { APIRoute } from 'astro';
import { GEO_REGIOS } from '../../data/geo-regios';
import { regioMd, MD_HEADERS } from '../../lib/geo-markdown';

export function getStaticPaths() {
  return GEO_REGIOS.map((r) => ({ params: { regio: r.slug }, props: { regio: r } }));
}

export const GET: APIRoute = ({ props }) => new Response(regioMd(props.regio), { headers: MD_HEADERS });
