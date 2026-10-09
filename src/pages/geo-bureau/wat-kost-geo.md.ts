import type { APIRoute } from 'astro';
import { watKostMd, MD_HEADERS } from '../../lib/geo-markdown';

export const GET: APIRoute = () => new Response(watKostMd(), { headers: MD_HEADERS });
