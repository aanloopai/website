import type { APIRoute } from 'astro';
import { pillarMd, MD_HEADERS } from '../../lib/geo-markdown';

export const GET: APIRoute = () => new Response(pillarMd(), { headers: MD_HEADERS });
