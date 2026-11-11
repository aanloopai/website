// Content-negotiation voor de homepage: Accept: text/markdown -> markdown-
// weergave (public/ai/home.md). Elk ander verzoek blijft ongemoeid (null).
// Geen-store + Vary: Accept zodat dit nooit de HTML in een CDN-cache vervangt.
export async function handleHomeMarkdown(request, env, url) {
  if (url.pathname !== '/' || (request.method !== 'GET' && request.method !== 'HEAD')) return null;
  if (!/text\/markdown/i.test(request.headers.get('accept') || '')) return null;
  if (!env.ASSETS) return null;
  const res = await env.ASSETS.fetch(new Request(new URL('/ai/home.md', url.origin).toString()));
  if (res.status !== 200) return null;
  return new Response(request.method === 'HEAD' ? null : res.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'no-store',
      Vary: 'Accept',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
