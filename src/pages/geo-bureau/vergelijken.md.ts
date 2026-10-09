import type { APIRoute } from 'astro';
import { vergelijkenMd, MD_HEADERS } from '../../lib/geo-markdown';

export const GET: APIRoute = () => new Response(vergelijkenMd(), { headers: MD_HEADERS });
