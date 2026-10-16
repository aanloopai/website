import data from '../../data/ai-radar-2026-10.json';

export const GET = () =>
  new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
  });
