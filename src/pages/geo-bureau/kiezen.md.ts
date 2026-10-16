import type { APIRoute } from 'astro';
import { kiezenMd, MD_HEADERS } from '../../lib/geo-markdown';

export const GET: APIRoute = () => new Response(kiezenMd(), { headers: MD_HEADERS });
