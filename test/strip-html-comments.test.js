// postbuild strip-html-comments: Astro pages lose their comments, Next.js exports keep them.
// Regression: stripping React's <!--$--> Suspense markers broke hydration of the Kitchen To You
// demo at /demo/kitchentoyou/ (React error #418) — this test fails if that comes back.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { stripHtmlComments } = require('../scripts/strip-html-comments.cjs');

describe('strip-html-comments', () => {
  it('removes explanatory comments from Astro pages', () => {
    const r = stripHtmlComments('<main><!-- uitleg --><h1>Hoi</h1><!--[if IE]>x<![endif]--></main>');
    expect(r.skipped).toBe(false);
    expect(r.count).toBe(1);
    expect(r.html).toBe('<main><h1>Hoi</h1><!--[if IE]>x<![endif]--></main>');
  });

  it('keeps comments inside script, style and pre', () => {
    const html = '<script>var a = "<!-- x -->";</script><pre><!-- voorbeeld --></pre>';
    expect(stripHtmlComments(html).html).toBe(html);
  });

  it('leaves Next.js exports untouched so React can hydrate', () => {
    const next = '<script src="/demo/x/_next/static/chunks/a.js"></script><div hidden=""><!--$--><!--/$--></div>';
    const r = stripHtmlComments(next);
    expect(r.skipped).toBe(true);
    expect(r.html).toBe(next);
  });
});
